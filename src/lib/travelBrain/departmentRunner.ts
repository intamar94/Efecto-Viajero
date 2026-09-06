import type { CanonicalTripContext } from "./tripContext";
import type { ResolvedDestination } from "./destinationResolver";
import type { ResearchPlan, ResearchResult } from "./researchOrchestrator";
import { createDepartment, type DepartmentReport } from "./departments";
import type { ReverseEngineeringPlan } from "./reverseEngineeringOrchestrator";
import { executeAgents, type AgentResult } from "./agentRuntime";
import { runNeuralOrchestration } from "./neuralOrchestrator";
import { absorbAgentResults, absorbNeuralCycle, createWorkingMemory, type WorkingMemory } from "./workingMemory";

export interface DepartmentExecution { results: ResearchResult[]; reports: DepartmentReport[]; availableDomains: string[]; unavailableDomains: string[]; neuralCycles: Awaited<ReturnType<typeof runNeuralOrchestration>>["cycles"]; workingMemory: WorkingMemory; }
function statusForAgents(items: AgentResult[]): DepartmentReport["status"] { if (!items.length) return "unavailable"; if (items.every(r => r.status === "unavailable")) return "unavailable"; if (items.some(r => r.status === "error")) return items.every(r => r.status === "error") ? "error" : "partial"; if (items.some(r => r.status === "partial")) return "partial"; return "ready"; }

export async function runDepartments(plan: ResearchPlan, context: CanonicalTripContext, locations: ResolvedDestination[], reversePlan?: ReverseEngineeringPlan): Promise<DepartmentExecution> {
  const workingMemory = createWorkingMemory();
  if (!reversePlan) return { results: [], reports: [], availableDomains: [], unavailableDomains: plan.selectedDomains, neuralCycles: [], workingMemory };
  const execution = await runNeuralOrchestration(reversePlan.requirements, reversePlan.agents, context, locations, async (pending, pendingAgents, executionContext, executionLocations) => {
    const results = await executeAgents(pending, pendingAgents, executionContext, executionLocations, [], workingMemory);
    absorbAgentResults(workingMemory, results);
    return results;
  });
  for (const cycle of execution.cycles) absorbNeuralCycle(workingMemory, cycle);

  const results: ResearchResult[] = [];
  const reports: DepartmentReport[] = [];
  const available = new Set<string>();
  const unavailable = new Set<string>();
  for (const task of plan.tasks) {
    const items = execution.results.filter(result => result.domain === task.domain);
    const department = createDepartment(task.domain);
    const requirements = execution.requirements.filter(r => r.domain === task.domain);
    const agents = execution.agents.filter(a => a.domain === task.domain);
    const subtasks = requirements.map(r => ({ id: r.id, question: r.question, priority: r.priority, dataType: r.dataType, agentId: r.agentId }));
    const status = statusForAgents(items);
    const findings = items.flatMap(r => r.data === undefined ? [] : Array.isArray(r.data) ? r.data : [r.data]);
    const evidence = items.flatMap(r => r.evidence ?? []);
    const unresolved = items.flatMap(r => r.error ? [r.error] : r.validation.issues);
    const conflicts = workingMemory.conflicts.filter(c => c.requirementIds.some(id => requirements.some(r => r.id === id))).map(c => c.reason);
    const report: DepartmentReport = { domain: task.domain, objective: department.mission(context, task).objective, subtasks, findings, evidence, unresolved: [...new Set(unresolved)], conflicts, status, agentResults: items };
    reports.push(report);
    results.push({ task, status, data: { findings, requirements, agents, agentResults: items }, evidence: evidence as ResearchResult["evidence"], error: report.unresolved.length ? report.unresolved.join("; ") : undefined });
    if (status === "ready" || status === "partial") available.add(task.domain);
    if (status === "unavailable") unavailable.add(task.domain);
  }
  return { results, reports, availableDomains: [...available], unavailableDomains: [...unavailable], neuralCycles: execution.cycles, workingMemory };
}
