import type { ResearchDomain, ResearchResult, ResearchTask } from "./researchOrchestrator";
import type { DepartmentReport } from "./departments";
import type { CapabilityAudit } from "./capabilityAudit";

export type SupervisorPriority = "critical" | "high" | "normal";

export interface SupervisorRecommendation {
  id: string;
  priority: SupervisorPriority;
  domain?: ResearchDomain;
  problem: string;
  requestedChange: string;
  reason: string;
}

export interface OrchestratorUpdate {
  generatedAt: string;
  cycle: number;
  completedDomains: ResearchDomain[];
  partialDomains: ResearchDomain[];
  unavailableDomains: ResearchDomain[];
  errorDomains: ResearchDomain[];
  unresolved: string[];
  conflicts: string[];
  departmentReports: DepartmentReport[];
  capabilityAudit: CapabilityAudit;
  recommendations: SupervisorRecommendation[];
}

/**
 * Creates the machine-readable handoff from Travel Brain to the external
 * supervisor (the architect/AI reviewing the system). The supervisor does
 * not execute providers: it reviews progress, gaps, conflicts, capability
 * access and recovery needs, then returns implementation direction for the
 * next cycle.
 */
export function buildOrchestratorUpdate(
  results: ResearchResult[],
  tasks: ResearchTask[],
  unresolved: string[],
  departmentReports: DepartmentReport[] = [],
  cycle = 1,
  capabilityAudit?: CapabilityAudit,
): OrchestratorUpdate {
  const byDomain = new Map<ResearchDomain, ResearchResult[]>();
  for (const result of results) {
    const current = byDomain.get(result.task.domain) ?? [];
    current.push(result);
    byDomain.set(result.task.domain, current);
  }

  const completedDomains = [...byDomain.entries()]
    .filter(([, items]) => items.length > 0 && items.every((item) => item.status === "ready"))
    .map(([domain]) => domain);
  const partialDomains = [...byDomain.entries()]
    .filter(([, items]) => items.some((item) => item.status === "partial" || item.status === "needs_review"))
    .map(([domain]) => domain);
  const errorDomains = [...byDomain.entries()]
    .filter(([, items]) => items.some((item) => item.status === "error"))
    .map(([domain]) => domain);
  const unavailableDomains = [...byDomain.entries()]
    .filter(([, items]) => items.length > 0 && items.every((item) => item.status === "unavailable"))
    .map(([domain]) => domain);

  const conflicts = departmentReports.flatMap((report) => report.conflicts.map((conflict) => `${report.domain}: ${conflict}`));
  const recommendations: SupervisorRecommendation[] = [];

  for (const domain of errorDomains) {
    recommendations.push({
      id: `recover:${domain}`,
      priority: "high",
      domain,
      problem: `El departamento ${domain} tiene una ejecución con error.`,
      requestedChange: "Aislar el fallo, conservar el resto del estado y ejecutar una recuperación específica del dominio.",
      reason: "Un proveedor fallido no debe bloquear ni ocultar resultados válidos de otros departamentos.",
    });
  }

  for (const domain of partialDomains) {
    recommendations.push({
      id: `review:${domain}`,
      priority: "high",
      domain,
      problem: `El departamento ${domain} solo tiene información parcial o necesita revisión.`,
      requestedChange: "Identificar qué subresultado falta y lanzar una misión de seguimiento dirigida, sin reconstruir todo el viaje.",
      reason: "La arquitectura debe evolucionar mediante investigación incremental y no perder evidencia ya validada.",
    });
  }

  for (const task of tasks) {
    if (!byDomain.has(task.domain)) {
      recommendations.push({
        id: `missing:${task.domain}`,
        priority: task.priority === "critical" ? "critical" : "normal",
        domain: task.domain,
        problem: `La tarea ${task.domain} está en el plan pero todavía no tiene informe de ejecución.`,
        requestedChange: "Determinar si debe ejecutarse, quedar explícitamente pendiente o marcarse como no disponible con una razón factual.",
        reason: "El estado del Travel Brain debe representar la realidad y no confundir ausencia de ejecución con disponibilidad.",
      });
    }
  }

  if (capabilityAudit) {
    for (const request of capabilityAudit.accessRequests) {
      recommendations.push({
        id: `access:${request.domain}:${request.capability}`,
        priority: request.priority === "critical" ? "critical" : request.priority === "high" ? "high" : "normal",
        domain: request.domain,
        problem: `La capacidad ${request.capability} de ${request.domain} no está operativa.`,
        requestedChange: request.requestedFromCeo,
        reason: `Se requiere acceso/capacidad ${request.accessKind}; proveedores candidatos: ${request.providerCandidates.join(", ")}.`,
      });
    }
  }

  if (unresolved.length) {
    recommendations.push({
      id: "context:unresolved",
      priority: "critical",
      problem: "El contexto del viajero contiene elementos no resueltos.",
      requestedChange: "Conservarlos como incertidumbres explícitas y solicitar resolución o investigación antes de tomar decisiones que dependan de ellos.",
      reason: "Ninguna dependencia debe inventar datos para completar silenciosamente una misión.",
    });
  }

  if (conflicts.length) {
    recommendations.push({
      id: "crosscheck:conflicts",
      priority: "critical",
      problem: "Los departamentos han producido información potencialmente contradictoria.",
      requestedChange: "Activar una fase de verificación cruzada y devolver la decisión al orquestador solo después de resolver o declarar la contradicción.",
      reason: "La función diferencial del Travel Brain es hacer que las piezas encajen, no simplemente agregarlas.",
    });
  }

  const audit = capabilityAudit ?? {
    generatedAt: new Date().toISOString(),
    operational: [],
    partial: [],
    blocked: [],
    failed: [],
    notExercised: [],
    accessRequests: [],
    items: [],
  } satisfies CapabilityAudit;

  return {
    generatedAt: new Date().toISOString(),
    cycle,
    completedDomains,
    partialDomains,
    unavailableDomains,
    errorDomains,
    unresolved,
    conflicts,
    departmentReports,
    capabilityAudit: audit,
    recommendations,
  };
}
