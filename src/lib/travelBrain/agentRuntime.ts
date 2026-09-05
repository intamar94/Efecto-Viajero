import type { CanonicalTripContext } from "./tripContext";
import type { ResolvedDestination } from "./destinationResolver";
import type { ResearchResult } from "./researchOrchestrator";
import type { AgentSpec, DataRequirement } from "./reverseEngineeringOrchestrator";
import { executeTask } from "./providerExecutor";
import { operationFor, validateAgentOutput, type AgentOperation } from "./agentContracts";

export interface AgentResult {
  agentId: string;
  requirementId: string;
  domain: string;
  dataType: string;
  operation: AgentOperation;
  status: "ready" | "partial" | "unavailable" | "error";
  data?: unknown;
  evidence?: ResearchResult["evidence"];
  confidence: "high" | "medium" | "low";
  freshness: "live" | "recent" | "dated" | "unknown";
  validation: { valid: boolean; issues: string[]; missing: string[] };
  error?: string;
}

function dependencyReady(id: string, results: Map<string, AgentResult>) {
  const result = results.get(id);
  return Boolean(result && ["ready", "partial"].includes(result.status) && result.validation.valid);
}

function blocked(agent: AgentSpec, requirement: DataRequirement, operation: AgentOperation, message: string): AgentResult {
  return { agentId: agent.id, requirementId: requirement.id, domain: requirement.domain, dataType: requirement.dataType, operation, status: "unavailable", confidence: "low", freshness: "unknown", validation: { valid: false, issues: [message], missing: requirement.dependsOn } , error: message };
}

export async function executeAgent(
  agent: AgentSpec,
  requirement: DataRequirement,
  context: CanonicalTripContext,
  locations: ResolvedDestination[],
  dependencyResults: ResearchResult[] = [],
  requirementResults: Map<string, AgentResult> = new Map(),
): Promise<AgentResult> {
  const operation = operationFor(requirement.domain, requirement.dataType);
  try {
    if (requirement.status === "blocked") return blocked(agent, requirement, operation, "Requirement bloqueado antes de ejecución.");
    const missing = requirement.dependsOn.filter((id) => !dependencyReady(id, requirementResults));
    if (missing.length) return blocked(agent, requirement, operation, `Dependencias de requisito no disponibles: ${missing.join(", ")}`);

    if (operation === "unsupported") {
      return blocked(agent, requirement, operation, `No existe todavía un ejecutor específico para ${requirement.domain}.${requirement.dataType}.`);
    }

    if (operation === "resolve-destination") {
      const data = locations.map((location) => ({ name: location.name, countryCode: location.countryCode, region: location.region, latitude: location.latitude, longitude: location.longitude }));
      const evidence = data.length ? [{ source: "destinationResolver", checkedAt: new Date().toISOString(), freshness: "live" as const, confidence: "high" as const }] : [];
      const validation = validateAgentOutput(requirement.dataType, operation, data, evidence);
      return { agentId: agent.id, requirementId: requirement.id, domain: requirement.domain, dataType: requirement.dataType, operation, status: validation.valid ? "ready" : "unavailable", data, evidence, confidence: validation.valid ? "high" : "low", freshness: "live", validation };
    }

    const task = { id: `agent-task:${agent.id}`, domain: requirement.domain, priority: requirement.priority, dependsOn: [], phase: "plan" as const };
    const results = await executeTask(task, context, locations);
    if (!results.length) return blocked(agent, requirement, operation, "El proveedor no devolvió resultados.");

    const data = results.flatMap((r) => Array.isArray(r.data) ? r.data : r.data === undefined ? [] : [r.data]);
    const evidence = results.flatMap((r) => r.evidence ?? []);
    const validation = validateAgentOutput(requirement.dataType, operation, data, evidence);
    const providerReady = results.some((r) => r.status === "ready");
    const providerError = results.find((r) => r.error)?.error;
    const status: AgentResult["status"] = !validation.valid
      ? (providerReady ? "partial" : "unavailable")
      : providerReady ? (results.some((r) => r.status === "error") ? "partial" : "ready") : results.some((r) => r.status === "error") ? "error" : "unavailable";
    const confidence = evidence.some((e) => e.confidence === "high") ? "high" : evidence.some((e) => e.confidence === "medium") ? "medium" : "low";
    const freshness = evidence.some((e) => e.freshness === "live") ? "live" : evidence.some((e) => e.freshness === "recent") ? "recent" : "unknown";
    return { agentId: agent.id, requirementId: requirement.id, domain: requirement.domain, dataType: requirement.dataType, operation, status, data, evidence, confidence, freshness, validation, error: providerError ?? (validation.issues[0] || undefined) };
  } catch (error) {
    return { agentId: agent.id, requirementId: requirement.id, domain: requirement.domain, dataType: requirement.dataType, operation, status: "error", confidence: "low", freshness: "unknown", validation: { valid: false, issues: [error instanceof Error ? error.message : "Agent execution error"], missing: [] }, error: error instanceof Error ? error.message : "Agent execution error" };
  }
}

/** Executes the atomic requirement graph, not merely one task per department. */
export async function executeAgents(
  requirements: DataRequirement[],
  agents: AgentSpec[],
  context: CanonicalTripContext,
  locations: ResolvedDestination[],
  dependencyResults: ResearchResult[] = [],
) {
  const byRequirement = new Map(requirements.map((r) => [r.id, r]));
  const byAgent = new Map(agents.map((a) => [a.id, a]));
  const pending = new Map(requirements.map((r) => [r.id, r]));
  const results = new Map<string, AgentResult>();

  while (pending.size) {
    const ready = [...pending.values()].filter((r) => r.dependsOn.every((id) => !pending.has(id) || dependencyReady(id, results)));
    if (!ready.length) {
      for (const requirement of pending.values()) {
        const agent = byAgent.get(requirement.agentId);
        if (agent) results.set(requirement.id, blocked(agent, requirement, operationFor(requirement.domain, requirement.dataType), "Grafo de requisitos sin resolución topológica; posible ciclo."));
      }
      break;
    }
    const wave = await Promise.all(ready.map(async (requirement) => {
      const agent = byAgent.get(requirement.agentId);
      if (!agent) return blocked({ id: requirement.agentId, name: requirement.agentId, domain: requirement.domain, input: [], output: [], requirementIds: [requirement.id], mode: "research" }, requirement, operationFor(requirement.domain, requirement.dataType), "AgentSpec no encontrado.");
      const result = await executeAgent(agent, requirement, context, locations, dependencyResults, results);
      return result;
    }));
    ready.forEach((requirement, index) => { results.set(requirement.id, wave[index]); pending.delete(requirement.id); });
  }

  return [...results.values()];
}
