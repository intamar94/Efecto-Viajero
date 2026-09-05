import type { CanonicalTripContext } from "./tripContext";
import type { ResolvedDestination } from "./destinationResolver";
import type { ResearchResult, ResearchTask } from "./researchOrchestrator";
import type { AgentSpec, DataRequirement } from "./reverseEngineeringOrchestrator";
import { executeTask } from "./providerExecutor";

export interface AgentResult {
  agentId: string;
  requirementId: string;
  domain: string;
  dataType: string;
  status: "ready" | "partial" | "unavailable" | "error";
  data?: unknown;
  evidence?: ResearchResult["evidence"];
  confidence: "high" | "medium" | "low";
  freshness: "live" | "recent" | "dated" | "unknown";
  error?: string;
}

export async function executeAgent(agent: AgentSpec, requirement: DataRequirement, context: CanonicalTripContext, locations: ResolvedDestination[], dependencyResults: ResearchResult[] = []): Promise<AgentResult> {
  try {
    if (requirement.status === "blocked") return { agentId: agent.id, requirementId: requirement.id, domain: requirement.domain, dataType: requirement.dataType, status: "unavailable", confidence: "low", freshness: "unknown", error: "Requirement blocked before execution." };
    if (requirement.dependsOn.some((id) => !dependencyResults.some((r) => r.task.id === id && ["ready", "partial"].includes(r.status)))) {
      return { agentId: agent.id, requirementId: requirement.id, domain: requirement.domain, dataType: requirement.dataType, status: "unavailable", confidence: "low", freshness: "unknown", error: "Dependency not available." };
    }
    if (requirement.domain === "destination") {
      const data = locations.map((location) => ({ name: location.name, countryCode: location.countryCode, region: location.region, latitude: location.latitude, longitude: location.longitude }));
      return { agentId: agent.id, requirementId: requirement.id, domain: requirement.domain, dataType: requirement.dataType, status: data.length ? "ready" : "unavailable", data, evidence: [{ source: "destinationResolver", checkedAt: new Date().toISOString(), freshness: "live", confidence: "high" }], confidence: data.length ? "high" : "low", freshness: "live" };
    }
    const task: ResearchTask = { id: `agent-task:${agent.id}`, domain: requirement.domain, priority: requirement.priority, dependsOn: [], phase: "plan" };
    const results = await executeTask(task, context, locations);
    if (!results.length) return { agentId: agent.id, requirementId: requirement.id, domain: requirement.domain, dataType: requirement.dataType, status: "unavailable", confidence: "low", freshness: "unknown", error: "Provider returned no result." };
    const hasReady = results.some((r) => r.status === "ready");
    const hasPartial = results.some((r) => r.status === "partial" || r.status === "needs_review");
    const status: AgentResult["status"] = hasReady ? (hasPartial ? "partial" : "ready") : hasPartial ? "partial" : results.every((r) => r.status === "unavailable") ? "unavailable" : "error";
    const evidence = results.flatMap((r) => r.evidence ?? []);
    const confidence = evidence.some((e) => e.confidence === "high") ? "high" : evidence.some((e) => e.confidence === "medium") ? "medium" : "low";
    const freshness = evidence.some((e) => e.freshness === "live") ? "live" : evidence.some((e) => e.freshness === "recent") ? "recent" : "unknown";
    return { agentId: agent.id, requirementId: requirement.id, domain: requirement.domain, dataType: requirement.dataType, status, data: results.flatMap((r) => Array.isArray(r.data) ? r.data : r.data === undefined ? [] : [r.data]), evidence, confidence, freshness, error: results.find((r) => r.error)?.error };
  } catch (error) {
    return { agentId: agent.id, requirementId: requirement.id, domain: requirement.domain, dataType: requirement.dataType, status: "error", confidence: "low", freshness: "unknown", error: error instanceof Error ? error.message : "Agent execution error" };
  }
}

export async function executeAgents(requirements: DataRequirement[], agents: AgentSpec[], context: CanonicalTripContext, locations: ResolvedDestination[], dependencyResults: ResearchResult[] = []) {
  const byRequirement = new Map(requirements.map((r) => [r.id, r]));
  const work = agents.map((agent) => {
    const requirement = agent.requirementIds.map((id) => byRequirement.get(id)).find(Boolean);
    return requirement ? executeAgent(agent, requirement, context, locations, dependencyResults) : Promise.resolve({ agentId: agent.id, requirementId: agent.requirementIds[0] ?? "unknown", domain: agent.domain, dataType: "unknown", status: "error", confidence: "low", freshness: "unknown", error: "Agent requirement not found." } as AgentResult);
  });
  return Promise.allSettled(work).then((settled) => settled.map((result) => result.status === "fulfilled" ? result.value : ({ agentId: "unknown", requirementId: "unknown", domain: "unknown", dataType: "unknown", status: "error", confidence: "low", freshness: "unknown", error: result.reason instanceof Error ? result.reason.message : "Agent failed" } as AgentResult)));
}
