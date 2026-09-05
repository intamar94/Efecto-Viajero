import { deconstructTripText } from "./tripDeconstructor";
import { buildCanonicalTripContext, type CanonicalTripContext } from "./tripContext";
import { analyzeTrip } from "./researchOrchestrator";
import { createBrainState, updateBrainState, type BrainBlocker, type BrainPhase, type BrainState } from "./brainState";
import { deriveBrainActions, type BrainAction } from "./brainActions";
import { resolveWorkingMemoryConflicts, type ConflictClaim } from "./conflictResolver";
import { decideNextAction, type BrainDecision } from "./decisionEngine";
import { buildChangeSet } from "./changeSet";
import { optimizePlanningState } from "./optimizer";
import { buildMarketingDesignBrief } from "./marketingDesignNeuron";
import { buildDesignSystemBrief } from "./designSystemNeuron";
import { buildCreativeDepartmentPlan } from "./creativeDepartment";
import { auditCreativeAgents } from "./creativeAuditEngine";
import { attachCreativeAuditToPlan } from "./creativeAuditBridge";
import { collectCreativeAuditSources } from "./creativeAuditSource";
import { createBrainActionExecutor } from "./actionExecutor";
import { buildImplementationQueue } from "./implementationWorker";
import { verifyCreativeReport } from "./verificationWorker";
import { absorbAgentResults } from "./workingMemory";
import type { AccesibilidadViaje, ModoPlanificacion, PresupuestoViaje } from "@/lib/types";

export interface BrainInput { text: string; fechaSalida?: string; fechaRegreso?: string; presupuesto?: number; moneda?: string; presupuestoTipo?: PresupuestoViaje["tipo"]; presupuestoFlexible?: boolean; adultos?: number; ninos?: number; edadesNinos?: number[]; bebes?: number; personasMayores?: number; mascotas?: number; accesibilidad?: AccesibilidadViaje; modoPlanificacion?: ModoPlanificacion; origen?: string; interests?: string[]; food?: string[]; transport?: string[]; constraints?: string[]; destinations?: string[]; }
export interface BrainRun { context: CanonicalTripContext; deconstructed: ReturnType<typeof deconstructTripText>; analysis: Awaited<ReturnType<typeof analyzeTrip>>; brain: BrainState; }
const MAX_CONTROL_CYCLES = 3;

function buildBlockers(analysis: Awaited<ReturnType<typeof analyzeTrip>>): BrainBlocker[] { return [...analysis.unresolved.map((target) => ({ id: `unresolved:${target}`, type: "missing-data" as const, target, reason: target, severity: "high" as const })), ...analysis.unavailableDomains.map((target) => ({ id: `provider:${target}`, type: "provider" as const, target, reason: `La capacidad ${target} no está disponible en esta ejecución.`, severity: "high" as const })), ...analysis.workingMemory.conflicts.map((conflict) => ({ id: `conflict:${conflict.key}`, type: "conflict" as const, target: conflict.key, reason: conflict.reason, severity: "high" as const }))]; }
function phaseFor(action: BrainAction | null, blockers: BrainBlocker[], complete: boolean): BrainPhase { if (complete) return "complete"; if (blockers.some((blocker) => blocker.severity === "critical")) return "blocked"; if (!action) return blockers.length ? "blocked" : "complete"; if (action.type === "resolve_conflict") return "resolving"; if (["research", "verify", "cross_check", "request_missing_data"].includes(action.type)) return "researching"; if (action.type === "recalculate") return "applying"; return "deciding"; }
function markValidatedActions(actions: BrainAction[], results: Awaited<ReturnType<typeof analyzeTrip>>["departmentReports"][number]["agentResults"]): { pending: BrainAction[]; completed: BrainAction[] } { const validatedTargets = new Set(results.filter((result) => result.status === "ready" && result.validation.valid).map((result) => result.dataType)); const pending: BrainAction[] = []; const completed: BrainAction[] = []; for (const action of actions) { if (validatedTargets.has(action.target) && action.type === "research") completed.push({ ...action, status: "completed" }); else pending.push(action); } return { pending, completed }; }

async function buildBrainState(context: CanonicalTripContext, analysis: Awaited<ReturnType<typeof analyzeTrip>>): Promise<BrainState> {
  const requirements = analysis.reverseEngineering.requirements;
  const agents = analysis.reverseEngineering.agents;
  let results = analysis.departmentReports.flatMap((report) => report.agentResults);
  const brain = createBrainState({ runId: `brain:${Date.now()}`, context, requirements, agents });
  let derivedActions = deriveBrainActions(requirements, results, analysis.workingMemory.conflicts);
  let actionState = markValidatedActions(derivedActions, results);
  let claims = new Map<string, ConflictClaim>(results.map((result) => [result.requirementId, { requirementId: result.requirementId, value: result.data, evidence: result.evidence ?? [] }]));
  let conflictResolutions = resolveWorkingMemoryConflicts(analysis.workingMemory.conflicts, claims);
  let blockers = buildBlockers(analysis);
  let decision = decideNextAction(context, actionState.pending, results, conflictResolutions);
  let state = updateBrainState(brain, { phase: phaseFor(decision.action, blockers, !decision.action && !analysis.unresolved.length && !analysis.workingMemory.conflicts.length), results, facts: analysis.workingMemory.facts, evidence: results.flatMap((result) => result.evidence ?? []), conflicts: analysis.workingMemory.conflicts, decisions: analysis.workingMemory.decisions, pendingActions: actionState.pending, completedActions: actionState.completed, blockers, decision, optimization: optimizePlanningState(context, actionState.pending), cycles: analysis.neuralCycles.length, completeness: requirements.length ? requirements.filter((requirement) => results.some((result) => result.requirementId === requirement.id && result.validation.valid)).length / requirements.length : 1, confidence: results.length ? results.reduce((sum, result) => sum + (result.confidence === "high" ? 1 : result.confidence === "medium" ? .7 : .4), 0) / results.length : 0 });

  const executor = createBrainActionExecutor({ locations: analysis.locations });
  const controlCycles = [...state.controlCycles];
  for (let cycle = 1; cycle <= MAX_CONTROL_CYCLES; cycle++) {
    decision = state.decision ?? decideNextAction(context, state.pendingActions, state.results, conflictResolutions);
    const action = decision.action;
    if (!action) { controlCycles.push({ cycle, phase: "complete", decisionId: decision.id, outcome: "converged", reason: decision.rationale, createdAt: new Date().toISOString() }); state = updateBrainState(state, { phase: "complete", terminationReason: "converged", controlCycles }); break; }
    const execution = await executor.execute(state, action);
    const merged = new Map(state.results.map((result) => [result.requirementId, result]));
    execution.results.forEach((result) => merged.set(result.requirementId, result));
    results = [...merged.values()];
    absorbAgentResults(analysis.workingMemory, execution.results);
    derivedActions = deriveBrainActions(requirements, results, analysis.workingMemory.conflicts);
    actionState = markValidatedActions(derivedActions, results);
    claims = new Map(results.map((result) => [result.requirementId, { requirementId: result.requirementId, value: result.data, evidence: result.evidence ?? [] }]));
    conflictResolutions = resolveWorkingMemoryConflicts(analysis.workingMemory.conflicts, claims);
    blockers = [...state.blockers, ...analysis.workingMemory.conflicts.filter((conflict) => !state.blockers.some((b) => b.target === conflict.key)).map((conflict) => ({ id: `conflict:${conflict.key}`, type: "conflict" as const, target: conflict.key, reason: conflict.reason, severity: "high" as const }))];
    const executedAction = execution.execution.status === "executed";
    controlCycles.push({ cycle, phase: phaseFor(action, blockers, false), decisionId: decision.id, selectedActionId: action.id, selectedActionType: action.type, selectedTarget: action.target, outcome: executedAction ? "completed" : execution.execution.status === "failed" ? "blocked" : "waiting", reason: execution.execution.reason, createdAt: new Date().toISOString() });
    const nextDecision = decideNextAction(context, actionState.pending, results, conflictResolutions);
    state = updateBrainState(state, { phase: phaseFor(nextDecision.action, blockers, !nextDecision.action), results, facts: analysis.workingMemory.facts, evidence: results.flatMap((result) => result.evidence ?? []), conflicts: analysis.workingMemory.conflicts, pendingActions: actionState.pending, completedActions: actionState.completed, decision: nextDecision, completeness: requirements.length ? requirements.filter((requirement) => results.some((result) => result.requirementId === requirement.id && result.validation.valid)).length / requirements.length : 1, confidence: results.length ? results.reduce((sum, result) => sum + (result.confidence === "high" ? 1 : result.confidence === "medium" ? .7 : .4), 0) / results.length : 0, executionHistory: [...state.executionHistory, execution.execution], cycles: analysis.neuralCycles.length + cycle, controlCycles });
    if (!executedAction) { state = updateBrainState(state, { terminationReason: "max-cycles" }); break; }
  }

  const changeSet = buildChangeSet(undefined, state, "Estado materializado y acciones ejecutables procesadas por BrainController.");
  const finalState = updateBrainState(state, { changeSets: [...state.changeSets, changeSet] });
  const marketingDesign = buildMarketingDesignBrief(finalState);
  const designSystem = buildDesignSystemBrief(finalState);
  const baseCreativeState = updateBrainState(finalState, { marketingDesign, designSystem });
  const sourceFiles = collectCreativeAuditSources();
  const creativeAudit = auditCreativeAgents({ state: baseCreativeState, sourceFiles });
  const creativeDepartment = attachCreativeAuditToPlan(buildCreativeDepartmentPlan(updateBrainState(baseCreativeState, { creativeAudit })), creativeAudit);
  const implementationTasks = buildImplementationQueue(creativeDepartment.instructions, creativeAudit.findings);
  const verificationResults = verifyCreativeReport(baseCreativeState, creativeAudit, sourceFiles);
  return updateBrainState(finalState, { marketingDesign, designSystem, creativeAudit, creativeDepartment, implementationTasks, verificationResults });
}

export async function runBrain(input: BrainInput): Promise<BrainRun> {
  const text = input.text.trim(); if (!text) throw new Error("Falta la descripción del viaje.");
  const context = buildCanonicalTripContext({ text, fechaSalida: input.fechaSalida, fechaRegreso: input.fechaRegreso, presupuesto: input.presupuesto, moneda: input.moneda, presupuestoTipo: input.presupuestoTipo, presupuestoFlexible: input.presupuestoFlexible, adultos: input.adultos, ninos: input.ninos, edadesNinos: input.edadesNinos, bebes: input.bebes, personasMayores: input.personasMayores, mascotas: input.mascotas, accesibilidad: input.accesibilidad, modoPlanificacion: input.modoPlanificacion ?? "completo", origin: input.origen, interests: input.interests, food: input.food, transport: input.transport, constraints: input.constraints, destinations: input.destinations });
  const deconstructed = deconstructTripText(text);
  const analysis = await analyzeTrip(text, context);
  const brain = await buildBrainState(context, analysis);
  return { context, deconstructed, analysis, brain };
}
