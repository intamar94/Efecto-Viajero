import type { BrainAction } from "./brainActions";
import type { ConflictResolution } from "./conflictResolver";
import type { CanonicalTripContext } from "./tripContext";
import type { AgentResult } from "./agentRuntime";

export interface BrainDecision {
  id: string;
  action: BrainAction | null;
  rationale: string;
  confidence: number;
  alternatives: BrainAction[];
  blockingIssues: string[];
  reversible: boolean;
}

const priorityWeight: Record<BrainAction["priority"], number> = { critical: 1, high: .8, normal: .5, background: .2 };
const typeWeight: Record<BrainAction["type"], number> = { resolve_conflict: 1.25, cross_check: 1.1, verify: 1.05, research: 1, request_missing_data: .95, recalculate: .9 };
function resultFor(action: BrainAction, results: AgentResult[]) { return results.find((result) => result.requirementId === action.dependsOn[0] || result.dataType === action.target); }
function dependencyReady(action: BrainAction, results: AgentResult[]) { return action.dependsOn.every((id) => results.some((result) => result.requirementId === id && ["ready", "partial"].includes(result.status) && result.validation.valid)); }
function impact(action: BrainAction, context: CanonicalTripContext): number {
  let score = 0;
  if (["requirements", "laws", "emergency"].includes(action.target)) score += .5;
  if (context.accessibility.requiereAccesibilidad && /access|accessible|family|elder/i.test(action.target)) score += .35;
  if (context.budget.importe !== undefined && /price|cost|budget|expense/i.test(action.target)) score += .3;
  if (context.dates.start && context.dates.end && /schedule|opening|duration|weather|route/i.test(action.target)) score += .2;
  return score;
}
function scoreAction(action: BrainAction, context: CanonicalTripContext, results: AgentResult[]): number {
  const result = resultFor(action, results);
  const uncertainty = result ? (result.status === "error" ? .5 : result.validation.missing.length ? .35 : .15) : .45;
  const unlock = Math.min(.35, action.dependsOn.length * .08);
  return priorityWeight[action.priority] * typeWeight[action.type] + uncertainty + unlock + impact(action, context);
}

export function decideNextAction(context: CanonicalTripContext, actions: BrainAction[], results: AgentResult[], conflicts: ConflictResolution[]): BrainDecision {
  const unresolvedConflicts = conflicts.filter((conflict) => conflict.status === "unresolved");
  const executable = actions.filter((action) => action.status === "pending" && dependencyReady(action, results));
  const blocked = actions.filter((action) => action.status === "blocked");
  const ranked = [...executable].sort((a, b) => scoreAction(b, context, results) - scoreAction(a, context, results));
  const next = ranked[0] ?? null;

  if (unresolvedConflicts.length) {
    const conflictAction = ranked.find((action) => action.type === "resolve_conflict") ?? null;
    if (conflictAction) return { id: `decision:${Date.now()}`, action: conflictAction, rationale: "Existe un conflicto con impacto potencial; se resuelve antes de consolidar el plan.", confidence: .92, alternatives: ranked.filter((a) => a.id !== conflictAction.id).slice(0, 4), blockingIssues: unresolvedConflicts.map((c) => c.conflictId), reversible: true };
  }

  if (!next) {
    return {
      id: `decision:${Date.now()}`,
      action: null,
      rationale: blocked.length ? "No hay una acción ejecutable: las siguientes dependen de información o resultados todavía no disponibles." : results.length ? "No quedan acciones ejecutables pendientes en el estado actual." : "Todavía no existen resultados suficientes para decidir.",
      confidence: blocked.length ? .45 : results.length ? .82 : 0,
      alternatives: [],
      blockingIssues: blocked.map((action) => action.id),
      reversible: true,
    };
  }

  const bestScore = scoreAction(next, context, results);
  return {
    id: `decision:${Date.now()}`,
    action: next,
    rationale: `Se prioriza ${next.type} sobre ${next.target}: prioridad, incertidumbre, impacto para el viajero y capacidad de desbloquear dependencias.`,
    confidence: Math.min(.97, .5 + bestScore * .22),
    alternatives: ranked.slice(1, 5),
    blockingIssues: [],
    reversible: next.type !== "request_missing_data",
  };
}
