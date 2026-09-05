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

function scoreAction(action: BrainAction): number {
  const priority = action.priority === "critical" ? 1 : action.priority === "high" ? .8 : action.priority === "normal" ? .5 : .25;
  const typeWeight = action.type === "resolve_conflict" ? 1.1 : action.type === "cross_check" ? 1 : action.type === "request_missing_data" ? .9 : .8;
  return priority * typeWeight;
}

export function decideNextAction(
  context: CanonicalTripContext,
  actions: BrainAction[],
  results: AgentResult[],
  conflicts: ConflictResolution[],
): BrainDecision {
  const pending = actions.filter((action) => action.status === "pending");
  const unresolvedConflicts = conflicts.filter((conflict) => conflict.status === "unresolved");
  const ranked = [...pending].sort((a, b) => scoreAction(b) - scoreAction(a));
  const next = ranked[0] ?? null;

  if (unresolvedConflicts.length) {
    const conflictAction = pending.find((action) => action.type === "resolve_conflict");
    return {
      id: `decision:${Date.now()}`,
      action: conflictAction ?? next,
      rationale: "Existe al menos un conflicto sin resolver; debe priorizarse antes de consolidar una decisión final.",
      confidence: .95,
      alternatives: ranked.slice(1, 4),
      blockingIssues: unresolvedConflicts.map((conflict) => conflict.conflictId),
      reversible: true,
    };
  }

  if (!next) {
    return {
      id: `decision:${Date.now()}`,
      action: null,
      rationale: results.length ? "No quedan acciones pendientes derivadas del estado actual." : "Todavía no existen resultados suficientes para decidir.",
      confidence: results.length ? .8 : 0,
      alternatives: [],
      blockingIssues: [],
      reversible: true,
    };
  }

  return {
    id: `decision:${Date.now()}`,
    action: next,
    rationale: `Se prioriza ${next.type} sobre ${next.target} por prioridad y necesidad de cerrar incertidumbre.`,
    confidence: Math.min(.95, .55 + scoreAction(next) * .35),
    alternatives: ranked.slice(1, 4),
    blockingIssues: [],
    reversible: next.type !== "request_missing_data",
  };
}
