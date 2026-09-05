import type { DataRequirement } from "./reverseEngineeringOrchestrator";
import type { AgentResult } from "./agentRuntime";
import type { WorkingMemoryConflict } from "./workingMemory";

export type BrainActionType =
  | "research"
  | "verify"
  | "cross_check"
  | "resolve_conflict"
  | "request_missing_data"
  | "recalculate";

export interface BrainAction {
  id: string;
  type: BrainActionType;
  target: string;
  reason: string;
  priority: DataRequirement["priority"];
  dependsOn: string[];
  status: "pending" | "completed" | "blocked";
  expectedOutput?: string[];
}

function priority(value: DataRequirement["priority"]): DataRequirement["priority"] {
  return value;
}

export function deriveBrainActions(
  requirements: DataRequirement[],
  results: AgentResult[],
  conflicts: WorkingMemoryConflict[],
): BrainAction[] {
  const byRequirement = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const actions: BrainAction[] = [];

  for (const result of results) {
    const requirement = byRequirement.get(result.requirementId);
    if (!requirement || result.status === "unavailable") continue;

    const missing = [...new Set(result.validation.missing)];
    if (result.status === "error") {
      actions.push({
        id: `action:research:${requirement.id}`,
        type: "research",
        target: requirement.dataType,
        reason: result.error ?? "La ejecución terminó con error.",
        priority: priority(requirement.priority),
        dependsOn: [requirement.id],
        status: "pending",
        expectedOutput: [requirement.dataType, "evidence", "validation"],
      });
    }

    for (const item of missing) {
      const isEvidence = /evidence|fuente|source/i.test(item);
      actions.push({
        id: `action:${isEvidence ? "cross_check" : "request_missing_data"}:${requirement.id}:${item}`,
        type: isEvidence ? "cross_check" : "request_missing_data",
        target: item,
        reason: `Falta ${item} para completar ${requirement.dataType}.`,
        priority: requirement.priority === "critical" ? "critical" : requirement.priority === "high" ? "high" : "normal",
        dependsOn: [requirement.id],
        status: "pending",
        expectedOutput: isEvidence ? ["evidence", "source", "confidence"] : [item],
      });
    }
  }

  for (const conflict of conflicts) {
    actions.push({
      id: `action:resolve_conflict:${conflict.key}`,
      type: "resolve_conflict",
      target: conflict.key,
      reason: conflict.reason,
      priority: "high",
      dependsOn: conflict.requirementIds,
      status: "pending",
      expectedOutput: ["resolved_claim", "authoritative_evidence", "confidence"],
    });
  }

  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  });
}
