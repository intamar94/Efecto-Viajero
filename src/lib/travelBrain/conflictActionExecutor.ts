import type { BrainState } from "./brainState";
import type { BrainAction } from "./brainActions";
import { resolveConflict, type ConflictClaim } from "./conflictResolver";
import { createBrainActionExecutor, type BrainActionExecutor, type BrainExecutionCycle, type BrainExecutionDependencies } from "./actionExecutor";

export function createConflictAwareBrainActionExecutor(dependencies: BrainExecutionDependencies): BrainActionExecutor {
  const base = createBrainActionExecutor(dependencies);
  return {
    async execute(state: BrainState, action: BrainAction): Promise<BrainExecutionCycle> {
      if (action.type !== "resolve_conflict") return base.execute(state, action);
      const now = new Date().toISOString();
      const conflict = state.conflicts.find((item) => item.key === action.target);
      if (!conflict) return { cycle: state.controlCycles.length + 1, action, execution: { actionId: action.id, actionType: action.type, target: action.target, status: "failed", reason: "El conflicto ya no existe en la memoria de trabajo.", resultIds: [], createdAt: now }, results: [] };
      const claims: ConflictClaim[] = conflict.requirementIds.flatMap((id) => {
        const result = state.results.find((item) => item.requirementId === id);
        return result ? [{ requirementId: id, value: result.data, evidence: result.evidence ?? [] }] : [];
      });
      const resolution = resolveConflict(conflict, claims);
      return { cycle: state.controlCycles.length + 1, action, execution: { actionId: action.id, actionType: action.type, target: action.target, status: resolution.status === "resolved" ? "executed" : "failed", reason: resolution.rationale, resultIds: claims.map((claim) => claim.requirementId), createdAt: now }, results: [] };
    },
  };
}
