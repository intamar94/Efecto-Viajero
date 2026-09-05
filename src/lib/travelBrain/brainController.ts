import { deconstructTripText } from "./tripDeconstructor";
import { buildCanonicalTripContext, type CanonicalTripContext } from "./tripContext";
import { analyzeTrip } from "./researchOrchestrator";
import { createBrainState, updateBrainState, type BrainBlocker, type BrainState } from "./brainState";
import { deriveBrainActions } from "./brainActions";
import { resolveWorkingMemoryConflicts, type ConflictClaim } from "./conflictResolver";
import { decideNextAction, type BrainDecision } from "./decisionEngine";
import { buildChangeSet } from "./changeSet";
import { optimizePlanningState } from "./optimizer";
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

function buildBlockers(analysis: Awaited<ReturnType<typeof analyzeTrip>>): BrainBlocker[] {
  const blockers: BrainBlocker[] = [];
  for (const unresolved of analysis.unresolved) blockers.push({ id: `unresolved:${unresolved}`, type: "missing-data", target: unresolved, reason: unresolved, severity: "high" });
  for (const domain of analysis.unavailableDomains) blockers.push({ id: `provider:${domain}`, type: "provider", target: domain, reason: `La capacidad ${domain} no está disponible en esta ejecución.`, severity: "high" });
  for (const conflict of analysis.workingMemory.conflicts) blockers.push({ id: `conflict:${conflict.key}`, type: "conflict", target: conflict.key, reason: conflict.reason, severity: "high" });
  return blockers;
}

function buildBrainState(context: CanonicalTripContext, analysis: Awaited<ReturnType<typeof analyzeTrip>>): BrainState {
  const requirements = analysis.reverseEngineering.requirements;
  const agents = analysis.reverseEngineering.agents;
  const results = analysis.departmentReports.flatMap((report) => report.agentResults);
  const evidence = results.flatMap((result) => result.evidence ?? []);
  const completed = requirements.filter((requirement) => results.some((result) => result.requirementId === requirement.id));
  const validated = results.filter((result) => result.status === "ready" && result.validation.valid);
  const completeness = requirements.length ? completed.length / requirements.length : 1;
  const confidence = results.length ? results.reduce((sum, result) => sum + (result.confidence === "high" ? 1 : result.confidence === "medium" ? .7 : .4), 0) / results.length : 0;
  const brain = createBrainState({ runId: `brain:${Date.now()}`, context, requirements, agents });
  const actions = deriveBrainActions(requirements, results, analysis.workingMemory.conflicts);
  const claims = new Map<string, ConflictClaim>();
  for (const result of results) claims.set(result.requirementId, { requirementId: result.requirementId, value: result.data, evidence: result.evidence ?? [] });
  const conflictResolutions = resolveWorkingMemoryConflicts(analysis.workingMemory.conflicts, claims);
  const decision: BrainDecision = decideNextAction(context, actions, results, conflictResolutions);
  const optimization = optimizePlanningState(context, actions);
  const initial = updateBrainState(brain, {
    phase: analysis.workingMemory.conflicts.length ? "resolving" : actions.length ? "deciding" : validated.length > 0 && validated.length === results.length ? "complete" : "validating",
    results, facts: analysis.workingMemory.facts, evidence, conflicts: analysis.workingMemory.conflicts,
    decisions: analysis.workingMemory.decisions, pendingActions: actions, blockers: buildBlockers(analysis),
    decision, optimization, cycles: analysis.neuralCycles.length, completeness, confidence,
  });
  const changeSet = buildChangeSet(undefined, initial, "Estado inicial materializado por BrainController.");
  return updateBrainState(initial, { changeSets: [changeSet] });
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
