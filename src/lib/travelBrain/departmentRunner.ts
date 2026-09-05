import type { CanonicalTripContext } from "./tripContext";
import type { ResolvedDestination } from "./destinationResolver";
import type { ResearchPlan, ResearchResult } from "./researchOrchestrator";
import { createDepartment, type DepartmentReport } from "./departments";
import type { ReverseEngineeringPlan } from "./reverseEngineeringOrchestrator";
import { executeAgents, type AgentResult } from "./agentRuntime";

export interface DepartmentExecution { results: ResearchResult[]; reports: DepartmentReport[]; availableDomains: string[]; unavailableDomains: string[]; }

function statusForAgents(items: AgentResult[]): DepartmentReport["status"] {
  if (!items.length) return "unavailable";
  if (items.every((r) => r.status === "unavailable")) return "unavailable";
  if (items.some((r) => r.status === "error")) return items.every((r) => r.status === "error") ? "error" : "partial";
  if (items.some((r) => r.status === "partial")) return "partial";
  return "ready";
}

/**
 * Executes the reverse-engineered requirement graph once, globally.
 * This is intentional: requirements may depend on requirements owned by another
 * department (e.g. transport -> destination), so department-local execution
 * would incorrectly report valid dependencies as missing.
 */
export async function runDepartments(
  plan: ResearchPlan,
  context: CanonicalTripContext,
  locations: ResolvedDestination[],
  reversePlan?: ReverseEngineeringPlan,
): Promise<DepartmentExecution> {
  if (!reversePlan) {
    return { results: [], reports: [], availableDomains: [], unavailableDomains: plan.selectedDomains };
  }

  const agentResults = await executeAgents(reversePlan.requirements, reversePlan.agents, context, locations, []);
  const byDomain = new Map<string, AgentResult[]>();
  for (const result of agentResults) {
    const list = byDomain.get(result.domain) ?? [];
    list.push(result);
    byDomain.set(result.domain, list);
  }

  const results: ResearchResult[] = [];
  const reports: DepartmentReport[] = [];
  const available = new Set<string>();
  const unavailable = new Set<string>();

  for (const task of plan.tasks) {
    const items = byDomain.get(task.domain) ?? [];
    const department = createDepartment(task.domain);
    const requirements = reversePlan.requirements.filter((r) => r.domain === task.domain);
    const agents = reversePlan.agents.filter((a) => a.domain === task.domain);
    const subtasks = requirements.map((r) => ({ id: r.id, question: r.question, priority: r.priority, dataType: r.dataType, agentId: r.agentId }));
    const status = statusForAgents(items);
    const findings = items.flatMap((r) => r.data === undefined ? [] : Array.isArray(r.data) ? r.data : [r.data]);
    const evidence = items.flatMap((r) => r.evidence ?? []);
    const unresolved = items.flatMap((r) => r.error ? [r.error] : r.validation.issues);
    const report: DepartmentReport = {
      domain: task.domain,
      objective: department.mission(context, task).objective,
      subtasks,
      findings,
      evidence,
      unresolved: [...new Set(unresolved)],
      conflicts: [],
      status,
      agentResults: items,
    };
    reports.push(report);
    results.push({
      task,
      status,
      data: { findings, requirements, agents, agentResults: items },
      evidence: evidence as ResearchResult["evidence"],
      error: report.unresolved.length ? report.unresolved.join("; ") : undefined,
    });
    if (status === "ready" || status === "partial") available.add(task.domain);
    if (status === "unavailable") unavailable.add(task.domain);
  }

  return { results, reports, availableDomains: [...available], unavailableDomains: [...unavailable] };
}
