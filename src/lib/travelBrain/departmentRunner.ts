import type { CanonicalTripContext } from "./tripContext";
import type { ResolvedDestination } from "./destinationResolver";
import type { ResearchPlan, ResearchResult, ResearchTask } from "./researchOrchestrator";
import { createDepartment, type DepartmentReport } from "./departments";

export interface DepartmentExecution {
  results: ResearchResult[];
  reports: DepartmentReport[];
  availableDomains: string[];
  unavailableDomains: string[];
}

function terminal(result: ResearchResult | undefined) {
  return Boolean(result && ["ready", "partial", "needs_review", "unavailable", "error"].includes(result.status));
}

function dependencyBlocked(task: ResearchTask, results: Map<string, ResearchResult>) {
  const failed = task.dependsOn.find((dependency) => {
    const result = results.get(dependency);
    return result?.status === "error" || result?.status === "unavailable";
  });
  return failed;
}

function blockedResult(task: ResearchTask, failedDependency: string): ResearchResult {
  return {
    task,
    status: "unavailable",
    data: { reason: `Bloqueado por dependencia no disponible: ${failedDependency}` },
    error: `Dependencia no disponible: ${failedDependency}`,
  };
}

/**
 * The orchestrator's execution boundary. Tasks are scheduled in topological waves:
 * independent departments run in parallel, dependent departments wait for their
 * prerequisites, and a failed prerequisite blocks only its dependent branch.
 */
export async function runDepartments(plan: ResearchPlan, context: CanonicalTripContext, locations: ResolvedDestination[]): Promise<DepartmentExecution> {
  const pending = new Map(plan.tasks.map((task) => [task.id, task]));
  const results = new Map<string, ResearchResult>();
  const reports: DepartmentReport[] = [];

  while (pending.size) {
    const ready = [...pending.values()].filter((task) => task.dependsOn.every((dependency) => terminal(results.get(dependency))));

    if (!ready.length) {
      for (const task of pending.values()) {
        const report: DepartmentReport = {
          domain: task.domain,
          objective: `Investigar ${task.domain} dentro del contexto completo del viaje.`,
          subtasks: [],
          findings: [],
          evidence: [],
          unresolved: ["No se pudo resolver el grafo de dependencias."],
          conflicts: [],
          status: "error",
          error: "Dependency graph contains a cycle or unresolved prerequisite.",
        };
        reports.push(report);
        results.set(task.id, { task, status: "error", error: report.error });
      }
      break;
    }

    const executable: ResearchTask[] = [];
    for (const task of ready) {
      const failedDependency = dependencyBlocked(task, results);
      if (failedDependency) {
        const result = blockedResult(task, failedDependency);
        results.set(task.id, result);
        reports.push({
          domain: task.domain,
          objective: `Investigar ${task.domain} dentro del contexto completo del viaje.`,
          subtasks: [],
          findings: [],
          evidence: [],
          unresolved: [result.error ?? "Dependencia no disponible"],
          conflicts: [],
          status: "unavailable",
          error: result.error,
        });
        pending.delete(task.id);
      } else {
        executable.push(task);
      }
    }

    if (executable.length) {
      const wave = await Promise.all(executable.map(async (task) => {
        const department = createDepartment(task.domain);
        const dependencyResults = task.dependsOn.flatMap((id) => {
          const result = results.get(id);
          return result ? [result] : [];
        });
        const mission = department.mission(context, task, dependencyResults);
        const subtasks = department.organize(mission);
        const report = await department.execute(mission, subtasks, locations);
        const result: ResearchResult = {
          task,
          status: report.status,
          data: { findings: report.findings, dependencyResults },
          evidence: report.evidence as ResearchResult["evidence"],
          error: report.error,
        };
        return { task, report, result };
      }));

      for (const item of wave) {
        results.set(item.task.id, item.result);
        reports.push(item.report);
        pending.delete(item.task.id);
      }
    }
  }

  const availableDomains = [...results.values()].filter((result) => result.status === "ready" || result.status === "partial").map((result) => result.task.domain);
  const unavailableDomains = [...results.values()].filter((result) => result.status === "unavailable").map((result) => result.task.domain);

  return { results: [...results.values()], reports, availableDomains, unavailableDomains };
}
