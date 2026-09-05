import type { BrainState } from "./brainState";
import type { PersistedBrainSnapshot } from "./persistentMemory";

/** Reintroduces relevant long-term facts without overwriting fresh run state. */
export function hydrateBrainStateFromMemory(state: BrainState, snapshots: PersistedBrainSnapshot[]): BrainState {
  const facts = new Map(state.facts.map((fact) => [fact.key, fact]));
  for (const snapshot of snapshots) for (const fact of snapshot.facts) {
    const current = facts.get(fact.key);
    if (!current || fact.confidence > current.confidence || fact.updatedAt > current.updatedAt) facts.set(fact.key, fact);
  }
  const evidence = [...state.evidence, ...snapshots.flatMap((snapshot) => snapshot.evidence)];
  const evidenceKeys = new Set<string>();
  const uniqueEvidence = evidence.filter((item) => { const key = `${item.source}|${item.checkedAt}`; if (evidenceKeys.has(key)) return false; evidenceKeys.add(key); return true; });
  return { ...state, facts: [...facts.values()], evidence: uniqueEvidence, decisions: [...state.decisions, ...snapshots.flatMap((snapshot) => snapshot.decisions)], conflicts: [...state.conflicts, ...snapshots.flatMap((snapshot) => snapshot.conflicts)] };
}
