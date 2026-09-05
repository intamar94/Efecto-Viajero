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
import type { AccesibilidadViaje, ModoPlanificacion, PresupuestoViaje } from "@/lib/types";

export interface BrainInput {
  text: string; fechaSalida?: string; fechaRegreso?: string; presupuesto?: number; moneda?: string;
  presupuestoTipo?: PresupuestoViaje["tipo"]; presupuestoFlexible?: boolean; adultos?: number; ninos?: number;
  edadesNinos?: number[]; bebes?: number; personasMayores?: number; mascotas?: number;
  accesibilidad?: AccesibilidadViaje; modoPlanificacion?: ModoPlanificacion; origen?: string;
  interests?: string[]; food?: string[]; transport?: string[]; constraints?: string[]; destinations?: string[];
}

export interface BrainRun {
  context: CanonicalTripContext;
  deconstructed: ReturnType<typeof deconstructTripText>;
  analysis: Awaited<ReturnType<typeof analyzeTrip>>;
  brain: BrainState;
}

const MAX_CONTROL_CYCLES = 3;

function buildBlockers(analysis: Awaited<ReturnType<typeof analyzeTrip>>): BrainBlocker[] {
  const blockers: BrainBlocker[] = [];
  for (const unresolved of analysis.unresolved) blockers.push({ id: `unresolved:${unresolved}`, type: "missing-data", target: unresolved, reason: unresolved, severity: "high" });
  for (const domain of analysis.unavailableDomains) blockers.push({ id: `provider:${domain}`, type: "provider", target: domain, reason: `La capacidad ${domain} no está disponible en esta ejecución.`, severity: "high" });
  for (const conflict of analysis.workingMemory.conflicts) blockers.push({ id: `conflict:${conflict.key}`, type: "conflict", target: conflict.key, reason: conflict.reason, severity: "high" });
  return blockers;
}

function phaseFor(action: BrainAction | null, blockers: BrainBlocker[], complete: boolean): BrainPhase {
  if (complete) return "complete";
  if (blockers.some((blocker) => blocker.severity === "critical")) return "blocked";
  if (!action) return blockers.length ? "blocked" : "complete";
  if (action.type === "resolve_conflict") return "resolving";
  if (["research", "verify", "cross_check", "request_missing_data"].includes(action.type)) return "researching";
  if (action.type === "recalculate") return "applying";
  return "deciding";
}

function markValidatedActions(actions: BrainAction[], results: Awaited<ReturnType<typeof analyzeTrip>>["departmentReports"][number]["agentResults"]): { pending: BrainAction[]; completed: BrainAction[] } {
  const validatedTargets = new Set(results.filter((result) => result.status === "ready" && result.validation.valid).map((result) => result.dataType));
  const pending: BrainAction[] = [];
  const completed: BrainAction[] = [];
  for (const action of actions) {
    if (validatedTargets.has(action.target) && action.type === "research") completed.push({ ...action, status: "completed" });
    else pending.push(action);
  }
  return { pending, completed };
}

function buildBrainState(context: CanonicalTripContext, analysis: Awaited<ReturnType<typeof analyzeTrip>>): BrainState {
  const requirements = analysis.reverseEngineering.requirements;
  const agents = analysis.reverseEngineering.agents;
  const results = analysis.departmentReports.flatMap((report) => report.agentResults);
  const evidence = results.flatMap((result) => result.evidence ?? []);
  const completed = requirements.filter((requirement) => results.some((result) => result.requirementId === requirement.id));
  const completeness = requirements.length ? completed.length / requirements.length : 1;
  const confidence = results.length ? results.reduce((sum, result) => sum + (result.confidence === "high" ? 1 : result.confidence === "medium" ? .7 : .4), 0) / results.length : 0;
  const brain = createBrainState({ runId: `brain:${Date.now()}`, context, requirements, agents });
  const derivedActions = deriveBrainActions(requirements, results, analysis.workingMemory.conflicts);
  const actionState = markValidatedActions(derivedActions, results);
  const claims = new Map<string, ConflictClaim>();
  for (const result of results) claims.set(result.requirementId, { requirementId: result.requirementId, value: result.data, evidence: result.evidence ?? [] });
  const conflictResolutions = resolveWorkingMemoryConflicts(analysis.workingMemory.conflicts, claims);
  const decision: BrainDecision = decideNextAction(context, actionState.pending, results, conflictResolutions);
  const optimization = optimizePlanningState(context, actionState.pending);
  const blockers = buildBlockers(analysis);
  const initial = updateBrainState(brain, {
    phase: phaseFor(decision.action, blockers, !decision.action && !analysis.unresolved.length && !analysis.workingMemory.conflicts.length),
    results, facts: analysis.workingMemory.facts, evidence, conflicts: analysis.workingMemory.conflicts,
    decisions: analysis.workingMemory.decisions, pendingActions: actionState.pending, completedActions: actionState.completed,
    blockers, decision, optimization, cycles: analysis.neuralCycles.length, completeness, confidence,
  });

  let state = initial;
  const controlCycles = [] as BrainState["controlCycles"];
  for (let cycle = 1; cycle <= MAX_CONTROL_CYCLES; cycle++) {
    const currentDecision = state.decision ?? decideNextAction(context, state.pendingActions, state.results, conflictResolutions);
    if (!currentDecision.action) {
      controlCycles.push({ cycle, phase: "complete", decisionId: currentDecision.id, outcome: "converged", reason: currentDecision.rationale, createdAt: new Date().toISOString() });
      state = updateBrainState(state, { phase: "complete", terminationReason: "converged", controlCycles });
      break;
    }
    const action = currentDecision.action;
    const directlySatisfied = state.results.some((result) => result.status === "ready" && result.validation.valid && result.dataType === action.target);
    const outcome = directlySatisfied ? "completed" : "waiting";
    const reason = directlySatisfied ? `La acción ${action.type} quedó satisfecha por un resultado validado.` : `La acción ${action.type} requiere ejecución adicional; el controlador no inventa una ejecución externa.`;
    controlCycles.push({ cycle, phase: phaseFor(action, state.blockers, false), decisionId: currentDecision.id, selectedActionId: action.id, selectedActionType: action.type, selectedTarget: action.target, outcome, reason, createdAt: new Date().toISOString() });
    if (directlySatisfied) {
      const completedAction = { ...action, status: "completed" as const };
      const pendingActions = state.pendingActions.filter((item) => item.id !== action.id);
      const completedActions = [...state.completedActions, completedAction];
      const nextDecision = decideNextAction(context, pendingActions, state.results, conflictResolutions);
      state = updateBrainState(state, { phase: phaseFor(nextDecision.action, state.blockers, !nextDecision.action), pendingActions, completedActions, decision: nextDecision, controlCycles });
      continue;
    }
    state = updateBrainState(state, { phase: phaseFor(action, state.blockers, false), terminationReason: "max-cycles", controlCycles });
    break;
  }

  const changeSet = buildChangeSet(undefined, state, "Estado inicial materializado y recorrido por BrainController.");
  const finalState = updateBrainState(state, { changeSets: [...state.changeSets, changeSet] });
  const marketingDesign = buildMarketingDesignBrief(finalState);
  const designSystem = buildDesignSystemBrief(finalState);
  const creativeDepartment = buildCreativeDepartmentPlan(updateBrainState(finalState, { marketingDesign, designSystem }));
  return updateBrainState(finalState, { marketingDesign, designSystem, creativeDepartment } as Partial<BrainState>);
}

export async function runBrain(input: BrainInput): Promise<BrainRun> {
  const text = input.text.trim();
  if (!text) throw new Error("Falta la descripción del viaje.");
  const context = buildCanonicalTripContext({
    text, fechaSalida: input.fechaSalida, fechaRegreso: input.fechaRegreso, presupuesto: input.presupuesto,
    moneda: input.moneda, presupuestoTipo: input.presupuestoTipo, presupuestoFlexible: input.presupuestoFlexible,
    adultos: input.adultos, ninos: input.ninos, edadesNinos: input.edadesNinos, bebes: input.bebes,
    personasMayores: input.personasMayores, mascotas: input.mascotas, accesibilidad: input.accesibilidad,
    modoPlanificacion: input.modoPlanificacion ?? "completo", origin: input.origen, interests: input.interests,
    food: input.food, transport: input.transport, constraints: input.constraints, destinations: input.destinations,
  });
  const deconstructed = deconstructTripText(text);
  const analysis = await analyzeTrip(text, context);
  const brain = buildBrainState(context, analysis);
  return { context, deconstructed, analysis, brain };
}
