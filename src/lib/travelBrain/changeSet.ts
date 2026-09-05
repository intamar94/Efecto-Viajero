import type { BrainState } from "./brainState";

export interface BrainChange {
  node: string;
  previous: unknown;
  next: unknown;
  reason: string;
}

export interface ChangeSet {
  id: string;
  reason: string;
  changes: BrainChange[];
  affectedNodes: string[];
  invalidatedFacts: string[];
  preserve: string[];
  recompute: string[];
}

function nodeKey(value: unknown): string {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function buildChangeSet(previous: BrainState | undefined, current: BrainState, reason: string): ChangeSet {
  const changes: BrainChange[] = [];
  const previousFacts = new Map((previous?.facts ?? []).map((fact) => [fact.key, fact.value]));
  for (const fact of current.facts) {
    const before = previousFacts.get(fact.key);
    if (before !== undefined && nodeKey(before) !== nodeKey(fact.value)) {
      changes.push({ node: fact.key, previous: before, next: fact.value, reason });
    }
  }

  const affected = new Set<string>(changes.map((change) => change.node));
  for (const action of current.pendingActions) {
    if (action.status === "pending") affected.add(action.target);
  }

  const invalidatedFacts = changes.map((change) => change.node);
  const recompute = [...affected].filter((node) =>
    node.includes("budget") || node.includes("expense") || node.includes("transport") || node.includes("accommodation") || node.includes("itinerary") || node.includes("compatibility"),
  );

  return {
    id: `changeset:${Date.now()}`,
    reason,
    changes,
    affectedNodes: [...affected],
    invalidatedFacts,
    preserve: current.facts.map((fact) => fact.key).filter((key) => !affected.has(key)),
    recompute,
  };
}

export function applyDeltaPlan(changeSet: ChangeSet, state: BrainState): BrainState {
  const invalidated = new Set(changeSet.invalidatedFacts);
  state.facts = state.facts.filter((fact) => !invalidated.has(fact.key));
  state.pendingActions = state.pendingActions.map((action) =>
    changeSet.recompute.includes(action.target) && action.status === "completed"
      ? { ...action, status: "pending" }
      : action,
  );
  state.updatedAt = new Date().toISOString();
  return state;
}
