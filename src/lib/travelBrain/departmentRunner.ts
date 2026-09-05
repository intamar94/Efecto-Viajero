import type { CanonicalTripContext } from "./tripContext";
import type { ResolvedDestination } from "./destinationResolver";
import type { ResearchPlan, ResearchResult, ResearchTask } from "./researchOrchestrator";
import { createDepartment, type DepartmentReport } from "./departments";
import type { ReverseEngineeringPlan } from "./reverseEngineeringOrchestrator";

export interface DepartmentExecution { results: ResearchResult[]; reports: DepartmentReport[]; availableDomains: string[]; unavailableDomains: string[]; }
function terminal(result: ResearchResult | undefined) { return Boolean(result && ["ready", "partial", "needs_review", "unavailable", "error"].includes(result.status)); }
function dependencyBlocked(task: ResearchTask, results: Map<string, ResearchResult>) { return task.dependsOn.find((dependency) => { const result = results.get(dependency); return result?.status === "error" || result?.status === "unavailable"; }); }
function blockedResult(task: ResearchTask, failedDependency: string): ResearchResult { return { task, status: "unavailable", data: { reason: `Bloqueado por dependencia no disponible: ${failedDependency}` }, error: `Dependencia no disponible: ${failedDependency}` }; }

/** Schedules managers in topological waves and injects atomic requirements + agent specs. */
export async function runDepartments(plan: ResearchPlan, context: CanonicalTripContext, locations: ResolvedDestination[], reversePlan?: ReverseEngineeringPlan): Promise<DepartmentExecution> {
  const pending = new Map(plan.tasks.map((task) => [task.id, task]));
  const results = new Map<string, ResearchResult>();
  const reports: DepartmentReport[] = [];
  while (pending.size) {
    const ready = [...pending.values()].filter((task) => task.dependsOn.every((dependency) => terminal(results.get(dependency))));
    if (!ready.length) {
      for (const task of pending.values()) { const error = "Dependency graph contains a cycle or unresolved prerequisite."; reports.push({ domain: task.domain, objective: `Investigar ${task.domain} dentro del contexto completo del viaje.`, subtasks: [], findings: [], evidence: [], unresolved: [error], conflicts: [], status: "error", error }); results.set(task.id, { task, status: "error", error }); }
      break;
    }
    const executable: ResearchTask[] = [];
    for (const task of ready) {
      const failedDependency = dependencyBlocked(task, results);
      if (failedDependency) { const result = blockedResult(task, failedDependency); results.set(task.id, result); reports.push({ domain: task.domain, objective: `Investigar ${task.domain} dentro del contexto completo del viaje.`, subtasks: [], findings: [], evidence: [], unresolved: [result.error ?? "Dependencia no disponible"], conflicts: [], status: "unavailable", error: result.error }); pending.delete(task.id); }
      else executable.push(task);
    }
    if (executable.length) {
      const wave = await Promise.all(executable.map(async (task) => {
        const department = createDepartment(task.domain);
        const dependencyResults = task.dependsOn.flatMap((id) => { const result = results.get(id); return result ? [result] : []; });
        const requirements = reversePlan?.requirements.filter((r) => r.domain === task.domain) ?? [];
        const agents = reversePlan?.agents.filter((a) => a.domain === task.domain) ?? [];
        const mission = department.mission(context, task, dependencyResults, requirements, agents);
        const subtasks = department.organize(mission);
        const report = await department.execute(mission, subtasks, locations);
        return { task, report, result: { task, status: report.status, data: { findings: report.findings, dependencyResults, requirements, agents: report.agentResults }, evidence: report.evidence as ResearchResult["evidence"], error: report.error } as ResearchResult };
      }));
      for (const item of wave) { results.set(item.task.id, item.result); reports.push(item.report); pending.delete(item.task.id); }
    }
  }
  const availableDomains = [...results.values()].filter((r) => r.status === "ready" || r.status === "partial").map((r) => r.task.domain);
  const unavailableDomains = [...results.values()].filter((r) => r.status === "unavailable").map((r) => r.task.domain);
  return { results: [...results.values()], reports, availableDomains, unavailableDomains };
}
