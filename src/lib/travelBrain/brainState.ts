import type { CanonicalTripContext } from "./tripContext";
import type { DataRequirement, AgentSpec } from "./reverseEngineeringOrchestrator";
import type { AgentResult } from "./agentRuntime";
import type { EvidenceRef } from "./researchOrchestrator";
import type { WorkingMemory } from "./workingMemory";

export type BrainPhase =
  | "understanding"
  | "planning"
  | "researching"
  | "validating"
  | "resolving"
  | "deciding"
  | "applying"
  | "complete"
  | "blocked";

export interface BrainAction {
  id: string;
  type: "research" | "verify" | "cross_check" | "resolve_conflict" | "request_missing_data" | "recalculate";
  target: string;
  reason: string;
  priority: "critical" | "high" | "normal" | "background";
  dependsOn: string[];
  status: "pending" | "completed" | "blocked";
}

export interface BrainBlocker {
  id: string;
  type: "missing-data" | "conflict" | "provider" | "validation" | "system";
  target: string;
  reason: string;
  severity: "high" | "critical";
}

export interface BrainState {
  runId: string;
  phase: BrainPhase;
  context: CanonicalTripContext;
  requirements: DataRequirement[];
  agents: AgentSpec[];
  results: AgentResult[];
  facts: WorkingMemory["facts"];
  evidence: EvidenceRef[];
  conflicts: WorkingMemory["conflicts"];
  decisions: WorkingMemory["decisions"];
  pendingActions: BrainAction[];
  completedActions: BrainAction[];
  blockers: BrainBlocker[];
  cycles: number;
  completeness: number;
  confidence: number;
  updatedAt: string;
}

export function createBrainState(input: {
  runId: string;
  context: CanonicalTripContext;
  requirements?: DataRequirement[];
  agents?: AgentSpec[];
}): BrainState {
  return {
    runId: input.runId,
    phase: "understanding",
    context: input.context,
    requirements: input.requirements ?? [],
    agents: input.agents ?? [],
    results: [],
    facts: [],
    evidence: [],
    conflicts: [],
    decisions: [],
    pendingActions: [],
    completedActions: [],
    blockers: [],
    cycles: 0,
    completeness: 0,
    confidence: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function updateBrainState(state: BrainState, patch: Partial<Omit<BrainState, "runId">>): BrainState {
  Object.assign(state, patch, { updatedAt: new Date().toISOString() });
  return state;
}
