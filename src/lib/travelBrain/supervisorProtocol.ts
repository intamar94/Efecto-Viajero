import type { ResearchDomain, ResearchResult, ResearchTask } from "./researchOrchestrator";
import type { DepartmentReport } from "./departments";
import type { CapabilityAudit } from "./capabilityAudit";
import type { NeuralCycle } from "./neuralOrchestrator";

export type SupervisorPriority = "critical" | "high" | "normal";
export type SupervisorDecisionKind = "continue" | "retry" | "crosscheck" | "request-capability" | "wait";

export interface SupervisorRecommendation {
  id: string;
  priority: SupervisorPriority;
  domain?: ResearchDomain;
  problem: string;
  requestedChange: string;
  reason: string;
}

export interface SupervisorDecision {
  id: string;
  kind: SupervisorDecisionKind;
  priority: SupervisorPriority;
  requirementId?: string;
  domain?: ResearchDomain;
  action: string;
  reason: string;
  sourceSignals: string[];
}

export interface SupervisorMemory {
  cycle: number;
  learned: string[];
  inhibited: string[];
  activeFollowUps: string[];
  unresolvedCount: number;
  readiness: "ready" | "degraded" | "blocked";
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
  neuralCycles: NeuralCycle[];
  memory: SupervisorMemory;
  decisions: SupervisorDecision[];
  recommendations: SupervisorRecommendation[];
}

/**
 * Operational supervisor handoff. Neural signals are treated as state:
 * learning signals strengthen completed paths, inhibition/error signals create
 * targeted recovery or cross-check decisions, and follow-ups become the
 * explicit agenda for the next orchestration cycle.
 */
export function buildOrchestratorUpdate(
  results: ResearchResult[],
  tasks: ResearchTask[],
  unresolved: string[],
  departmentReports: DepartmentReport[] = [],
  cycle = 1,
  capabilityAudit?: CapabilityAudit,
  neuralCycles: NeuralCycle[] = [],
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
  const decisions: SupervisorDecision[] = [];
  const latestNeural = neuralCycles.at(-1);

  // The supervisor's short-term memory is derived from all neural cycles, not
  // just the final department aggregate. This preserves what the atomic layer
  // actually learned or rejected during execution.
  const learned = neuralCycles.flatMap((c) => c.signals
    .filter((s) => s.kind === "learning")
    .map((s) => `${s.requirementId}: ${s.reason}`));
  const inhibited = neuralCycles.flatMap((c) => c.signals
    .filter((s) => s.kind === "inhibition" || s.kind === "error")
    .map((s) => `${s.requirementId}: ${s.reason}`));
  const activeFollowUps = neuralCycles.flatMap((c) => c.followUps.map((f) => f.id));

  for (const domain of errorDomains) {
    decisions.push({
      id: `decision:recover:${domain}`,
      kind: "retry",
      priority: "high",
      domain,
      action: `Reintentar únicamente las misiones fallidas de ${domain}, conservando las salidas válidas.`,
      reason: "El error es localizable por dominio; no es necesario reiniciar el viaje completo.",
      sourceSignals: neuralCycles.flatMap((c) => c.signals.filter((s) => s.kind === "error").map((s) => s.requirementId)),
    });
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
    decisions.push({
      id: `decision:review:${domain}`,
      kind: "crosscheck",
      priority: "high",
      domain,
      action: `Investigar solo los subresultados incompletos de ${domain} y cruzarlos con la evidencia existente.`,
      reason: "Una salida parcial debe producir una misión dirigida, no una reconstrucción completa.",
      sourceSignals: neuralCycles.flatMap((c) => c.signals.filter((s) => s.kind === "inhibition").map((s) => s.requirementId)),
    });
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
      decisions.push({
        id: `decision:missing:${task.domain}`,
        kind: "continue",
        priority: task.priority === "critical" ? "critical" : "normal",
        domain: task.domain,
        action: `Evaluar la tarea ${task.domain} antes de cerrar el estado del viaje.`,
        reason: "Una tarea planificada sin resultado no equivale a una capacidad disponible.",
        sourceSignals: [],
      });
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
      decisions.push({
        id: `decision:access:${request.domain}:${request.capability}`,
        kind: "request-capability",
        priority: request.priority === "critical" ? "critical" : request.priority === "high" ? "high" : "normal",
        domain: request.domain,
        action: request.requestedFromCeo,
        reason: `La capacidad requiere ${request.accessKind}; candidatos: ${request.providerCandidates.join(", ")}.`,
        sourceSignals: [],
      });
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

  if (latestNeural?.followUps.length) {
    for (const followUp of latestNeural.followUps) {
      decisions.push({
        id: `decision:followup:${followUp.id}`,
        kind: "continue",
        priority: followUp.priority,
        requirementId: followUp.id,
        domain: followUp.domain,
        action: followUp.question,
        reason: followUp.reason,
        sourceSignals: [followUp.parentRequirementId],
      });
    }
  }

  if (unresolved.length) {
    decisions.push({
      id: "decision:unresolved",
      kind: "wait",
      priority: "critical",
      action: "No cerrar decisiones que dependan de datos no resueltos; mantenerlos como bloqueos explícitos.",
      reason: "La incertidumbre debe propagarse como estado, no convertirse en una suposición.",
      sourceSignals: [],
    });
    recommendations.push({
      id: "context:unresolved",
      priority: "critical",
      problem: "El contexto del viajero contiene elementos no resueltos.",
      requestedChange: "Conservarlos como incertidumbres explícitas y solicitar resolución o investigación antes de tomar decisiones que dependan de ellos.",
      reason: "Ninguna dependencia debe inventar datos para completar silenciosamente una misión.",
    });
  }

  if (conflicts.length) {
    decisions.push({
      id: "decision:crosscheck:conflicts",
      kind: "crosscheck",
      priority: "critical",
      action: "Activar verificación cruzada antes de permitir que una contradicción llegue al plan final.",
      reason: "Las piezas deben encajar mediante evidencia, no por agregación ciega.",
      sourceSignals: [],
    });
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

  const readiness: SupervisorMemory["readiness"] =
    unresolved.length || conflicts.length || errorDomains.length ? "blocked" :
    partialDomains.length || unavailableDomains.length || decisions.some((d) => d.kind === "request-capability") ? "degraded" : "ready";

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
    neuralCycles,
    memory: {
      cycle,
      learned: [...new Set(learned)],
      inhibited: [...new Set(inhibited)],
      activeFollowUps: [...new Set(activeFollowUps)],
      unresolvedCount: unresolved.length,
      readiness,
    },
    decisions,
    recommendations,
  };
}
