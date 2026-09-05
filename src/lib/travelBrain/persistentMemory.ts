import type { BrainState } from "./brainState";

export interface PersistedBrainSnapshot {
  runId: string;
  context: BrainState["context"];
  facts: BrainState["facts"];
  evidence: BrainState["evidence"];
  decisions: BrainState["decisions"];
  conflicts: BrainState["conflicts"];
  updatedAt: string;
}

export interface BrainMemoryStore {
  save(snapshot: PersistedBrainSnapshot): Promise<void>;
  load(runId: string): Promise<PersistedBrainSnapshot | null>;
  findRelevant(context: BrainState["context"]): Promise<PersistedBrainSnapshot[]>;
}

export function snapshotBrain(state: BrainState): PersistedBrainSnapshot {
  return {
    runId: state.runId,
    context: state.context,
    facts: state.facts,
    evidence: state.evidence,
    decisions: state.decisions,
    conflicts: state.conflicts,
    updatedAt: state.updatedAt,
  };
}

/**
 * In-memory adapter for local execution. Production persistence is deliberately
 * injected so the brain never depends directly on a specific database.
 */
export class InMemoryBrainMemoryStore implements BrainMemoryStore {
  private readonly snapshots = new Map<string, PersistedBrainSnapshot>();

  async save(snapshot: PersistedBrainSnapshot): Promise<void> {
    this.snapshots.set(snapshot.runId, snapshot);
  }

  async load(runId: string): Promise<PersistedBrainSnapshot | null> {
    return this.snapshots.get(runId) ?? null;
  }

  async findRelevant(context: BrainState["context"]): Promise<PersistedBrainSnapshot[]> {
    const destinations = new Set(context.destinations.map((item) => item.toLowerCase()));
    return [...this.snapshots.values()].filter((snapshot) =>
      snapshot.context.destinations.some((item) => destinations.has(item.toLowerCase())),
    );
  }
}
