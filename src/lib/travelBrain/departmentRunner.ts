import type { CanonicalTripContext } from "./tripContext";
import type { ResolvedDestination } from "./destinationResolver";
import type { ResearchPlan, ResearchResult } from "./researchOrchestrator";
import { createDepartment, type DepartmentReport } from "./departments";
import type { ReverseEngineeringPlan } from "./reverseEngineeringOrchestrator";
import { executeAgents, type AgentResult } from "./agentRuntime";
import { buildNeuralCycle, materializeFollowUpRequirements, type NeuralCycle } from "./neuralOrchestrator";
import { absorbAgentResults, absorbNeuralCycle, createWorkingMemory, type WorkingMemory } from "./workingMemory";

export interface DepartmentExecution { results: ResearchResult[]; reports: DepartmentReport[]; availableDomains: string[]; unavailableDomains: string[]; neuralCycles: NeuralCycle[]; workingMemory: WorkingMemory; }
function statusForAgents(items: AgentResult[]): DepartmentReport["status"] { if (!items.length) return "unavailable"; if (items.every((r) => r.status === "unavailable")) return "unavailable"; if (items.some((r) => r.status === "error")) return items.every((r) => r.status === "error") ? "error" : "partial"; if (items.some((r) => r.status === "partial")) return "partial"; return "ready"; }

/** Executes the requirement graph while maintaining a shared blackboard of facts, evidence and conflicts. */
export async function runDepartments(plan: ResearchPlan, context: CanonicalTripContext, locations: ResolvedDestination[], reversePlan?: ReverseEngineeringPlan): Promise<DepartmentExecution> {
  const workingMemory = createWorkingMemory();
  if (!reversePlan) return { results: [], reports: [], availableDomains: [], unavailableDomains: plan.selectedDomains, neuralCycles: [], workingMemory };
  let requirements = [...reversePlan.requirements]; let agents = [...reversePlan.agents]; const allResults = new Map<string, AgentResult>(); const neuralCycles: NeuralCycle[] = [];
  for (let cycle = 1; cycle <= 3; cycle++) {
    const pending = requirements.filter((r) => !allResults.has(r.id)); if (!pending.length) break;
    const resultWave = await executeAgents(pending, agents.filter((a) => pending.some((r) => r.agentId === a.id)), context, locations, [], workingMemory);
    resultWave.forEach((r) => allResults.set(r.requirementId, r)); absorbAgentResults(workingMemory, resultWave);
    const neural = buildNeuralCycle(pending, resultWave, cycle); neuralCycles.push(neural); absorbNeuralCycle(workingMemory, neural);
    const next = materializeFollowUpRequirements(neural.followUps, requirements, agents); if (next.requirements.length === requirements.length) break;
    requirements = next.requirements; agents = next.agents;
  }
  const agentResults = [...allResults.values()]; const byDomain = new Map<string, AgentResult[]>();
  for (const result of agentResults) byDomain.set(result.domain, [...(byDomain.get(result.domain) ?? []), result]);
  const results: ResearchResult[] = []; const reports: DepartmentReport[] = []; const available = new Set<string>(); const unavailable = new Set<string>();
  for (const task of plan.tasks) {
    const items = byDomain.get(task.domain) ?? []; const department = createDepartment(task.domain); const taskRequirements = requirements.filter((r) => r.domain === task.domain); const taskAgents = agents.filter((a) => a.domain === task.domain);
    const subtasks = taskRequirements.map((r) => ({ id: r.id, question: r.question, priority: r.priority, dataType: r.dataType, agentId: r.agentId })); const status = statusForAgents(items);
    const findings = items.flatMap((r) => r.data === undefined ? [] : Array.isArray(r.data) ? r.data : [r.data]); const evidence = items.flatMap((r) => r.evidence ?? []); const unresolved = items.flatMap((r) => r.error ? [r.error] : r.validation.issues);
    const report: DepartmentReport = { domain: task.domain, objective: department.mission(context, task).objective, subtasks, findings, evidence, unresolved: [...new Set(unresolved)], conflicts: workingMemory.conflicts.filter((c) => c.requirementIds.some((id) => taskRequirements.some((r) => r.id === id))), status, agentResults: items };
    reports.push(report); results.push({ task, status, data: { findings, requirements: taskRequirements, agents: taskAgents, agentResults: items }, evidence: evidence as ResearchResult["evidence"], error: report.unresolved.length ? report.unresolved.join("; ") : undefined });
    if (status === "ready" || status === "partial") available.add(task.domain); if (status === "unavailable") unavailable.add(task.domain);
  }
  return { results, reports, availableDomains: [...available], unavailableDomains: [...unavailable], neuralCycles, workingMemory };
}
