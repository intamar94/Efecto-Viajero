import { deconstructTripText } from "./tripDeconstructor";
import { buildCanonicalTripContext, type CanonicalTripContext } from "./tripContext";
import { analyzeTrip } from "./researchOrchestrator";
import { createBrainState, updateBrainState, type BrainBlocker, type BrainPhase, type BrainState } from "./brainState";
import { deriveBrainActions, type BrainAction } from "./brainActions";
import { resolveWorkingMemoryConflicts, type ConflictClaim } from "./conflictResolver";
import { decideNextAction } from "./decisionEngine";
import { buildChangeSet } from "./changeSet";
import { optimizePlanningState } from "./optimizer";
import { buildMarketingDesignBrief } from "./marketingDesignNeuron";
import { buildDesignSystemBrief } from "./designSystemNeuron";
import { buildCreativeDepartmentPlan } from "./creativeDepartment";
import { auditCreativeAgents } from "./creativeAuditEngine";
import { attachCreativeAuditToPlan } from "./creativeAuditBridge";
import { collectCreativeAuditSources } from "./creativeAuditSource";
import { createConflictAwareBrainActionExecutor } from "./conflictActionExecutor";
import { buildImplementationQueue } from "./implementationWorker";
import { verifyCreativeReport } from "./verificationWorker";
import { absorbAgentResults } from "./workingMemory";
import { snapshotBrain } from "./persistentMemory";
import { createSupabaseBrainMemoryStore } from "./supabaseMemoryStore";
import type { AgentResult } from "./agentRuntime";
import type { AccesibilidadViaje, ModoPlanificacion, PresupuestoViaje } from "@/lib/types";

export interface BrainInput { text: string; fechaSalida?: string; fechaRegreso?: string; presupuesto?: number; moneda?: string; presupuestoTipo?: PresupuestoViaje["tipo"]; presupuestoFlexible?: boolean; adultos?: number; ninos?: number; edadesNinos?: number[]; bebes?: number; personasMayores?: number; mascotas?: number; accesibilidad?: AccesibilidadViaje; modoPlanificacion?: ModoPlanificacion; origen?: string; interests?: string[]; food?: string[]; transport?: string[]; constraints?: string[]; destinations?: string[]; }
export interface BrainRun { context: CanonicalTripContext; deconstructed: ReturnType<typeof deconstructTripText>; analysis: Awaited<ReturnType<typeof analyzeTrip>>; brain: BrainState; }
const MAX_CONTROL_CYCLES = 6;

type Analysis = Awaited<ReturnType<typeof analyzeTrip>>;
function buildBlockers(analysis: Analysis): BrainBlocker[] {
  return [
    ...analysis.unresolved.map(target => ({ id: `unresolved:${target}`, type: "missing-data" as const, target, reason: target, severity: "high" as const })),
    ...analysis.unavailableDomains.map(target => ({ id: `provider:${target}`, type: "provider" as const, target, reason: `La capacidad ${target} no está disponible en esta ejecución.`, severity: "high" as const })),
    ...analysis.workingMemory.conflicts.map(conflict => ({ id: `conflict:${conflict.key}`, type: "conflict" as const, target: conflict.key, reason: conflict.reason, severity: "high" as const }))
  ];
}
function phaseFor(action: BrainAction | null | undefined, blockers: BrainBlocker[], complete: boolean): BrainPhase {
  if (complete) return "complete";
  if (blockers.some(b => b.severity === "critical")) return "blocked";
  if (!action) return blockers.length ? "blocked" : "complete";
  if (action.type === "resolve_conflict") return "resolving";
  if (["research", "verify", "cross_check"].includes(action.type)) return "researching";
  if (action.type === "request_missing_data") return "blocked";
  if (action.type === "recalculate") return "applying";
  return "deciding";
}
function markValidatedActions(actions: BrainAction[], results: AgentResult[]) {
  const validated = new Set(results.filter(result => result.status === "ready" && result.validation.valid).flatMap(result => [result.dataType, result.requirementId]));
  const pending: BrainAction[] = [];
  const completed: BrainAction[] = [];
  for (const action of actions) {
    if (["research", "verify", "cross_check"].includes(action.type) && validated.has(action.target)) completed.push({ ...action, status: "completed" });
    else pending.push(action);
  }
  return { pending, completed };
}
function score(results: AgentResult[], requirements: Analysis["reverseEngineering"]["requirements"]) { return requirements.length ? requirements.filter(r => results.some(result => result.requirementId === r.id && result.validation.valid)).length / requirements.length : 1; }
function confidence(results: AgentResult[]) { return results.length ? results.reduce((sum, result) => sum + (result.confidence === "high" ? 1 : result.confidence === "medium" ? .7 : .4), 0) / results.length : 0; }
function canConverge(state: BrainState, requirements: Analysis["reverseEngineering"]["requirements"]) {
  const critical = requirements.filter(requirement => requirement.priority === "critical");
  const allCriticalValid = critical.every(requirement => state.results.some(result => result.requirementId === requirement.id && result.status === "ready" && result.validation.valid));
  return allCriticalValid && state.pendingActions.length === 0 && !state.blockers.some(blocker => blocker.severity === "critical");
}

async function buildBrainState(context: CanonicalTripContext, analysis: Analysis): Promise<BrainState> {
  const requirements = analysis.reverseEngineering.requirements;
  const agents = analysis.reverseEngineering.agents;
  let results: AgentResult[] = analysis.departmentReports.flatMap(report => (report.agentResults ?? []) as AgentResult[]);
  const brain = createBrainState({ runId: `brain:${Date.now()}`, context, requirements, agents });
  let actionState = markValidatedActions(deriveBrainActions(requirements, results, analysis.workingMemory.conflicts), results);
  let claims = new Map<string, ConflictClaim>(results.map(result => [result.requirementId, { requirementId: result.requirementId, value: result.data, evidence: result.evidence ?? [] }]));
  let conflictResolutions = resolveWorkingMemoryConflicts(analysis.workingMemory.conflicts, claims);
  let blockers = buildBlockers(analysis);
  let decision = decideNextAction(context, actionState.pending, results, conflictResolutions);
  let state = updateBrainState(brain, { phase: phaseFor(decision.action, blockers, false), results, facts: analysis.workingMemory.facts, evidence: results.flatMap(r => r.evidence ?? []), conflicts: analysis.workingMemory.conflicts, decisions: analysis.workingMemory.decisions, pendingActions: actionState.pending, completedActions: actionState.completed, blockers, decision, optimization: optimizePlanningState(context, actionState.pending), cycles: analysis.neuralCycles.length, completeness: score(results, requirements), confidence: confidence(results) });

  const executor = createConflictAwareBrainActionExecutor({ locations: analysis.locations });
  const controlCycles = [...state.controlCycles];
  for (let cycle = 1; cycle <= MAX_CONTROL_CYCLES; cycle++) {
    decision = state.decision ?? decideNextAction(context, state.pendingActions, state.results, conflictResolutions);
    const action = decision.action;
    if (!action) {
      const converged = canConverge(state, requirements);
      const reason = converged ? "Todos los requisitos críticos están validados y no quedan acciones bloqueantes." : "El cerebro no puede continuar sin nueva evidencia o intervención; se conserva el estado para recuperación.";
      controlCycles.push({ cycle, phase: converged ? "complete" : "blocked", decisionId: decision.id, outcome: converged ? "converged" : "blocked", reason, createdAt: new Date().toISOString() });
      state = updateBrainState(state, { phase: converged ? "complete" : "blocked", terminationReason: converged ? "converged" : "blocked", controlCycles });
      break;
    }
    if (action.status === "blocked") {
      controlCycles.push({ cycle, phase: "blocked", decisionId: decision.id, selectedActionId: action.id, selectedActionType: action.type, selectedTarget: action.target, outcome: "blocked", reason: action.reason, createdAt: new Date().toISOString() });
      state = updateBrainState(state, { phase: "blocked", terminationReason: "blocked", controlCycles });
      break;
    }
    const execution = await executor.execute(state, action);
    const merged = new Map(state.results.map(result => [result.requirementId, result]));
    for (const result of execution.results) merged.set(result.requirementId, result);
    results = [...merged.values()];
    absorbAgentResults(analysis.workingMemory, execution.results);
    actionState = markValidatedActions(deriveBrainActions(requirements, results, analysis.workingMemory.conflicts), results);
    claims = new Map(results.map(result => [result.requirementId, { requirementId: result.requirementId, value: result.data, evidence: result.evidence ?? [] }]));
    conflictResolutions = resolveWorkingMemoryConflicts(analysis.workingMemory.conflicts, claims);
    blockers = buildBlockers({ ...analysis, workingMemory: analysis.workingMemory });
    const executed = execution.execution.status === "executed";
    const waiting = execution.execution.status === "waiting";
    controlCycles.push({ cycle, phase: phaseFor(action, blockers, false), decisionId: decision.id, selectedActionId: action.id, selectedActionType: action.type, selectedTarget: action.target, outcome: executed ? "completed" : waiting ? "waiting" : "blocked", reason: execution.execution.reason, createdAt: new Date().toISOString() });
    const nextDecision = decideNextAction(context, actionState.pending, results, conflictResolutions);
    state = updateBrainState(state, { phase: phaseFor(nextDecision.action, blockers, false), results, facts: analysis.workingMemory.facts, evidence: results.flatMap(r => r.evidence ?? []), conflicts: analysis.workingMemory.conflicts, pendingActions: actionState.pending, completedActions: actionState.completed, decision: nextDecision, completeness: score(results, requirements), confidence: confidence(results), executionHistory: [...state.executionHistory, execution.execution], cycles: analysis.neuralCycles.length + cycle, controlCycles });
    if (!executed) {
      const terminal = waiting && action.type === "request_missing_data" ? "blocked" : cycle >= MAX_CONTROL_CYCLES ? "max-cycles" : undefined;
      if (terminal) { state = updateBrainState(state, { terminationReason: terminal }); break; }
    }
  }

  const finalState = updateBrainState(state, { changeSets: [...state.changeSets, buildChangeSet(undefined, state, "Estado materializado y acciones ejecutables procesadas por BrainController.")] });
  const marketingDesign = buildMarketingDesignBrief(finalState);
  const designSystem = buildDesignSystemBrief(finalState);
  const baseCreativeState = updateBrainState(finalState, { marketingDesign, designSystem });
  const sourceFiles = collectCreativeAuditSources();
  const creativeAudit = auditCreativeAgents({ state: baseCreativeState, sourceFiles });
  const creativeDepartment = attachCreativeAuditToPlan(buildCreativeDepartmentPlan(updateBrainState(baseCreativeState, { creativeAudit })), creativeAudit);
  const implementationTasks = buildImplementationQueue(creativeDepartment.instructions, creativeAudit.findings);
  const verificationResults = verifyCreativeReport(baseCreativeState, creativeAudit, sourceFiles);
  const completeState = updateBrainState(finalState, { marketingDesign, designSystem, creativeAudit, creativeDepartment, implementationTasks, verificationResults });
  const memoryStore = createSupabaseBrainMemoryStore();
  if (memoryStore) { try { await memoryStore.save(snapshotBrain(completeState)); } catch (error) { console.warn("Brain memory persistence unavailable", error); } }
  return completeState;
}

export async function runBrain(input: BrainInput): Promise<BrainRun> {
  const text = input.text.trim();
  if (!text) throw new Error("Falta la descripción del viaje.");
  const context = buildCanonicalTripContext({ text, fechaSalida: input.fechaSalida, fechaRegreso: input.fechaRegreso, presupuesto: input.presupuesto, moneda: input.moneda, presupuestoTipo: input.presupuestoTipo, presupuestoFlexible: input.presupuestoFlexible, adultos: input.adultos, ninos: input.ninos, edadesNinos: input.edadesNinos, bebes: input.bebes, personasMayores: input.personasMayores, mascotas: input.mascotas, accesibilidad: input.accesibilidad, modoPlanificacion: input.modoPlanificacion ?? "completo", origin: input.origen, interests: input.interests, food: input.food, transport: input.transport, constraints: input.constraints, destinations: input.destinations });
  const deconstructed = deconstructTripText(text);
  const analysis = await analyzeTrip(text, context);
  const brain = await buildBrainState(context, analysis);
  return { context, deconstructed, analysis, brain };
}
