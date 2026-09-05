import type { CanonicalTripContext } from "./tripContext";
import type { DataRequirement, AgentSpec } from "./reverseEngineeringOrchestrator";
import type { AgentResult } from "./agentRuntime";
import type { EvidenceRef } from "./researchOrchestrator";
import type { WorkingMemory } from "./workingMemory";
import type { BrainAction } from "./brainActions";
import type { BrainDecision } from "./decisionEngine";
import type { ChangeSet } from "./changeSet";
import type { OptimizationResult } from "./optimizer";

export type BrainPhase =
  | "understanding" | "planning" | "researching" | "validating" | "resolving"
  | "deciding" | "applying" | "optimizing" | "complete" | "blocked";

export interface BrainBlocker {
  id: string;
  type: "missing-data" | "conflict" | "provider" | "validation" | "system";
  target: string;
  reason: string;
  severity: "high" | "critical";
}

export interface BrainControlCycle {
  cycle: number;
  phase: BrainPhase;
  decisionId: string;
  selectedActionId?: string;
  selectedActionType?: BrainAction["type"];
  selectedTarget?: string;
  outcome: "completed" | "blocked" | "waiting" | "converged";
  reason: string;
  createdAt: string;
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
  decision?: BrainDecision;
  changeSets: ChangeSet[];
  optimization?: OptimizationResult;
  controlCycles: BrainControlCycle[];
  terminationReason?: "converged" | "blocked" | "max-cycles";
  cycles: number;
  completeness: number;
  confidence: number;
  updatedAt: string;
}

export function createBrainState(input: { runId: string; context: CanonicalTripContext; requirements?: DataRequirement[]; agents?: AgentSpec[] }): BrainState {
  return {
    runId: input.runId, phase: "understanding", context: input.context,
    requirements: input.requirements ?? [], agents: input.agents ?? [], results: [], facts: [], evidence: [],
    conflicts: [], decisions: [], pendingActions: [], completedActions: [], blockers: [], changeSets: [],
    optimization: undefined, controlCycles: [], terminationReason: undefined,
    cycles: 0, completeness: 0, confidence: 0, updatedAt: new Date().toISOString(),
  };
}

export function updateBrainState(state: BrainState, patch: Partial<Omit<BrainState, "runId">>): BrainState {
  Object.assign(state, patch, { updatedAt: new Date().toISOString() });
  return state;
}
