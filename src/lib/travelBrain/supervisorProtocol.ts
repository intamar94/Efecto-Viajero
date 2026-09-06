import type { ResearchDomain, ResearchResult, ResearchTask } from "./researchOrchestrator";
import type { DepartmentReport } from "./departments";
import type { CapabilityAudit } from "./capabilityAudit";
import type { NeuralCycle } from "./neuralOrchestrator";

export type SupervisorPriority = "critical" | "high" | "normal";
export type SupervisorDecisionKind = "continue" | "retry" | "crosscheck" | "request-capability" | "wait";
export interface SupervisorRecommendation { id: string; priority: SupervisorPriority; domain?: ResearchDomain; problem: string; requestedChange: string; reason: string; }
export interface SupervisorDecision { id: string; kind: SupervisorDecisionKind; priority: SupervisorPriority; requirementId?: string; domain?: ResearchDomain; action: string; reason: string; sourceSignals: string[]; }
export interface SupervisorMemory { cycle: number; learned: string[]; inhibited: string[]; activeFollowUps: string[]; unresolvedCount: number; readiness: "ready" | "degraded" | "blocked"; }
export interface OrchestratorUpdate { generatedAt: string; cycle: number; completedDomains: ResearchDomain[]; partialDomains: ResearchDomain[]; unavailableDomains: ResearchDomain[]; errorDomains: ResearchDomain[]; unresolved: string[]; conflicts: string[]; departmentReports: DepartmentReport[]; capabilityAudit: CapabilityAudit; neuralCycles: NeuralCycle[]; memory: SupervisorMemory; decisions: SupervisorDecision[]; recommendations: SupervisorRecommendation[]; }
const priority = (value: string): SupervisorPriority => value === "critical" ? "critical" : value === "high" ? "high" : "normal";

export function buildOrchestratorUpdate(results: ResearchResult[], tasks: ResearchTask[], unresolved: string[], departmentReports: DepartmentReport[] = [], cycle = 1, capabilityAudit?: CapabilityAudit, neuralCycles: NeuralCycle[] = []): OrchestratorUpdate {
  const byDomain = new Map<ResearchDomain, ResearchResult[]>();
  for (const result of results) byDomain.set(result.task.domain, [...(byDomain.get(result.task.domain) ?? []), result]);
  const completedDomains = [...byDomain.entries()].filter(([, items]) => items.length > 0 && items.every(i => i.status === "ready")).map(([d]) => d);
  const partialDomains = [...byDomain.entries()].filter(([, items]) => items.some(i => i.status === "partial" || i.status === "needs_review")).map(([d]) => d);
  const errorDomains = [...byDomain.entries()].filter(([, items]) => items.some(i => i.status === "error")).map(([d]) => d);
  const unavailableDomains = [...byDomain.entries()].filter(([, items]) => items.length > 0 && items.every(i => i.status === "unavailable")).map(([d]) => d);
  const conflicts = departmentReports.flatMap(report => report.conflicts.map(conflict => `${report.domain}: ${conflict}`));
  const decisions: SupervisorDecision[] = [];
  const recommendations: SupervisorRecommendation[] = [];
  const latestNeural = neuralCycles.at(-1);
  const learned = neuralCycles.flatMap(c => c.signals.filter(s => s.kind === "learning").map(s => `${s.requirementId}: ${s.reason}`));
  const inhibited = neuralCycles.flatMap(c => c.signals.filter(s => s.kind === "inhibition" || s.kind === "error").map(s => `${s.requirementId}: ${s.reason}`));
  const activeFollowUps = neuralCycles.flatMap(c => c.followUps.map(f => f.id));

  for (const domain of errorDomains) {
    decisions.push({ id: `decision:recover:${domain}`, kind: "retry", priority: "high", domain, action: `Reintentar únicamente las misiones fallidas de ${domain}, conservando las salidas válidas.`, reason: "El error es localizable por dominio.", sourceSignals: [] });
    recommendations.push({ id: `recover:${domain}`, priority: "high", domain, problem: `El departamento ${domain} tiene un error.`, requestedChange: "Aislar el fallo y ejecutar una recuperación específica.", reason: "Un proveedor fallido no debe bloquear resultados válidos." });
  }
  for (const domain of partialDomains) {
    decisions.push({ id: `decision:review:${domain}`, kind: "crosscheck", priority: "high", domain, action: `Investigar los subresultados incompletos de ${domain}.`, reason: "Una salida parcial requiere seguimiento dirigido.", sourceSignals: [] });
    recommendations.push({ id: `review:${domain}`, priority: "high", domain, problem: `El departamento ${domain} es parcial.`, requestedChange: "Investigar sólo lo que falta y conservar la evidencia válida.", reason: "El aprendizaje debe ser incremental." });
  }
  for (const task of tasks) if (!byDomain.has(task.domain)) {
    const p = task.priority === "critical" ? "critical" : task.priority === "high" ? "high" : "normal";
    decisions.push({ id: `decision:missing:${task.domain}`, kind: "continue", priority: p, domain: task.domain, action: `Evaluar ${task.domain} antes de cerrar el viaje.`, reason: "Ausencia de resultado no equivale a capacidad disponible.", sourceSignals: [] });
    recommendations.push({ id: `missing:${task.domain}`, priority: p, domain: task.domain, problem: `La tarea ${task.domain} no tiene resultado.`, requestedChange: "Ejecutar, dejar explícitamente pendiente o marcar como no disponible.", reason: "El estado debe representar la realidad." });
  }
  for (const request of capabilityAudit?.accessRequests ?? []) {
    const p = priority(request.priority);
    decisions.push({ id: `decision:access:${request.domain}:${request.capability}`, kind: "request-capability", priority: p, domain: request.domain, action: request.requestedFromCeo, reason: `Requiere ${request.accessKind}.`, sourceSignals: [] });
    recommendations.push({ id: `access:${request.domain}:${request.capability}`, priority: p, domain: request.domain, problem: `La capacidad ${request.capability} no está operativa.`, requestedChange: request.requestedFromCeo, reason: `Se requiere ${request.accessKind}.` });
  }
  for (const followUp of latestNeural?.followUps ?? []) decisions.push({ id: `decision:followup:${followUp.id}`, kind: "continue", priority: priority(followUp.priority), requirementId: followUp.id, domain: followUp.domain, action: followUp.question, reason: followUp.reason, sourceSignals: [followUp.parentRequirementId] });
  if (unresolved.length) {
    decisions.push({ id: "decision:unresolved", kind: "wait", priority: "critical", action: "Mantener los datos no resueltos como bloqueos explícitos.", reason: "La incertidumbre no debe convertirse en una suposición.", sourceSignals: [] });
    recommendations.push({ id: "context:unresolved", priority: "critical", problem: "Hay elementos no resueltos.", requestedChange: "Solicitar resolución o investigación antes de decidir.", reason: "No se deben inventar datos." });
  }
  if (conflicts.length) {
    decisions.push({ id: "decision:crosscheck:conflicts", kind: "crosscheck", priority: "critical", action: "Activar verificación cruzada antes del plan final.", reason: "Las piezas deben encajar mediante evidencia.", sourceSignals: [] });
    recommendations.push({ id: "crosscheck:conflicts", priority: "critical", problem: "Existen contradicciones entre departamentos.", requestedChange: "Resolverlas o declararlas antes de cerrar el plan.", reason: "El cerebro debe integrar, no agregar ciegamente." });
  }

  const audit = capabilityAudit ?? { generatedAt: new Date().toISOString(), operational: [], partial: [], blocked: [], failed: [], notExercised: [], accessRequests: [], items: [] } satisfies CapabilityAudit;
  const readiness: SupervisorMemory["readiness"] = unresolved.length || conflicts.length || errorDomains.length ? "blocked" : partialDomains.length || unavailableDomains.length || decisions.some(d => d.kind === "request-capability") ? "degraded" : "ready";
  return { generatedAt: new Date().toISOString(), cycle, completedDomains, partialDomains, unavailableDomains, errorDomains, unresolved, conflicts, departmentReports, capabilityAudit: audit, neuralCycles, memory: { cycle, learned: [...new Set(learned)], inhibited: [...new Set(inhibited)], activeFollowUps: [...new Set(activeFollowUps)], unresolvedCount: unresolved.length, readiness }, decisions, recommendations };
}
