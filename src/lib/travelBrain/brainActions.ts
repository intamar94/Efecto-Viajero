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

const priorityRank: Record<DataRequirement["priority"], number> = { critical: 4, high: 3, normal: 2, background: 1 };
function priority(value: DataRequirement["priority"]): DataRequirement["priority"] { return value; }
function hasValidResult(result?: AgentResult) { return Boolean(result && result.status === "ready" && result.validation.valid); }
function actionStatus(requirement: DataRequirement, resultByRequirement: Map<string, AgentResult>): BrainAction["status"] {
  return requirement.dependsOn.some((id) => !hasValidResult(resultByRequirement.get(id))) ? "blocked" : "pending";
}
function actionForRequirement(requirement: DataRequirement, result: AgentResult | undefined, resultByRequirement: Map<string, AgentResult>): BrainAction | null {
  if (hasValidResult(result)) return null;
  const status = actionStatus(requirement, resultByRequirement);
  const type: BrainActionType = result?.validation.issues.some((issue) => /valid/i.test(issue)) ? "verify" : "research";
  return {
    id: `action:${type}:${requirement.id}`,
    type,
    target: requirement.dataType,
    reason: result?.error ?? result?.validation.issues.join("; ") ?? `El requisito ${requirement.dataType} todavía no tiene un resultado validado.`,
    priority: priority(requirement.priority),
    dependsOn: requirement.dependsOn,
    status,
    expectedOutput: [requirement.dataType, "evidence", "validation"],
  };
}

export function deriveBrainActions(requirements: DataRequirement[], results: AgentResult[], conflicts: WorkingMemoryConflict[]): BrainAction[] {
  const resultByRequirement = new Map(results.map((result) => [result.requirementId, result]));
  const actions: BrainAction[] = [];

  for (const requirement of requirements) {
    const result = resultByRequirement.get(requirement.id);
    const action = actionForRequirement(requirement, result, resultByRequirement);
    if (action) actions.push(action);

    if (result && result.status !== "unavailable") {
      for (const item of new Set(result.validation.missing)) {
        const evidence = /evidence|fuente|source/i.test(item);
        const validation = /valid/i.test(item);
        actions.push({
          id: `action:${evidence ? "cross_check" : validation ? "verify" : "research"}:${requirement.id}:${item}`,
          type: evidence ? "cross_check" : validation ? "verify" : "research",
          target: requirement.dataType,
          reason: `Falta ${item} para completar ${requirement.dataType}.`,
          priority: priority(requirement.priority),
          dependsOn: requirement.dependsOn,
          status: actionStatus(requirement, resultByRequirement),
          expectedOutput: evidence ? ["evidence", "source", "confidence"] : [requirement.dataType, "validation"],
        });
      }
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
      status: conflict.requirementIds.every((id) => hasValidResult(resultByRequirement.get(id))) ? "pending" : "blocked",
      expectedOutput: ["resolved_claim", "authoritative_evidence", "confidence"],
    });
  }

  const seen = new Set<string>();
  return actions
    .filter((action) => { if (seen.has(action.id)) return false; seen.add(action.id); return true; })
    .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
}
