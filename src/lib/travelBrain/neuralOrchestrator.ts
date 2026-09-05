import type { CanonicalTripContext } from "./tripContext";
import type { ResolvedDestination } from "./destinationResolver";
import type { DataRequirement, AgentSpec } from "./reverseEngineeringOrchestrator";
import type { AgentResult } from "./agentRuntime";
import type { BrainActionType } from "./brainActions";

/** Neural-style control layer: an engineering analogy, not a biological equivalence. */
export interface NeuralSignal { requirementId: string; source: string; kind: "activation" | "inhibition" | "error" | "learning"; strength: number; reason: string; }
export interface NeuralFollowUp {
  id: string;
  parentRequirementId: string;
  domain: DataRequirement["domain"];
  targetDataType: string;
  actionType: Extract<BrainActionType, "research" | "verify" | "cross_check" | "request_missing_data">;
  question: string;
  priority: DataRequirement["priority"];
  dependsOn: string[];
  reason: string;
  recovery: "missing-data" | "validation" | "evidence";
}
export interface NeuralCycle { cycle: number; fired: string[]; inhibited: string[]; signals: NeuralSignal[]; followUps: NeuralFollowUp[]; }

const DEFAULT_MAX_NEURAL_CYCLES = 3;
function priority(p: DataRequirement["priority"]): number { return p === "critical" ? 1 : p === "high" ? .8 : p === "normal" ? .5 : .25; }
function recoveryFor(issue: string): NeuralFollowUp["recovery"] {
  const value = issue.toLowerCase();
  if (value.includes("evidence") || value.includes("fuente") || value.includes("source")) return "evidence";
  if (value === "validation" || value.includes("valid")) return "validation";
  return "missing-data";
}
function actionTypeFor(recovery: NeuralFollowUp["recovery"]): NeuralFollowUp["actionType"] {
  if (recovery === "evidence") return "cross_check";
  if (recovery === "validation") return "verify";
  return "request_missing_data";
}

export function deriveNeuralFollowUps(requirements: DataRequirement[], results: AgentResult[]): NeuralFollowUp[] {
  const byId = new Map(requirements.map((r) => [r.id, r])); const followUps: NeuralFollowUp[] = [];
  for (const result of results) {
    const parent = byId.get(result.requirementId); if (!parent || result.status === "unavailable") continue;
    const missing = [...new Set([...result.validation.missing, ...(result.validation.issues.length ? ["validation"] : [])])];
    if (!missing.length && result.status !== "error") continue;
    for (const missingItem of missing) {
      const recovery = recoveryFor(missingItem);
      const reason = (result.error ?? result.validation.issues.join("; ")) || "Resultado incompleto";
      followUps.push({ id: `followup:${parent.id}:${recovery}:${missingItem}`, parentRequirementId: parent.id, domain: parent.domain, targetDataType: parent.dataType, actionType: actionTypeFor(recovery), question: recovery === "evidence" ? `Buscar evidencia adicional para validar ${parent.dataType}.` : recovery === "validation" ? `Contrastar y validar de nuevo ${parent.dataType}.` : `Resolver específicamente ${missingItem} necesario para completar ${parent.dataType}.`, priority: priority(parent.priority) >= .8 ? "high" : "normal", dependsOn: [parent.id], reason, recovery });
    }
  }
  return followUps;
}

export function buildNeuralCycle(requirements: DataRequirement[], results: AgentResult[], cycle: number): NeuralCycle {
  const resultByReq = new Map(results.map((r) => [r.requirementId, r])); const signals: NeuralSignal[] = []; const fired: string[] = []; const inhibited: string[] = [];
  for (const requirement of requirements) {
    const result = resultByReq.get(requirement.id);
    if (!result) { fired.push(requirement.id); signals.push({ requirementId: requirement.id, source: "scheduler", kind: "activation", strength: priority(requirement.priority), reason: "Requisito pendiente listo para investigación." }); continue; }
    if (result.status === "ready" && result.validation.valid) signals.push({ requirementId: requirement.id, source: result.agentId, kind: "learning", strength: 1, reason: "Salida validada; señal propagable." });
    else { inhibited.push(requirement.id); signals.push({ requirementId: requirement.id, source: result.agentId, kind: result.status === "error" ? "error" : "inhibition", strength: 1 - priority(requirement.priority) + .25, reason: (result.error ?? result.validation.issues.join("; ")) || "Salida insuficiente." }); }
  }
  return { cycle, fired, inhibited, signals, followUps: deriveNeuralFollowUps(requirements, results) };
}

export function materializeFollowUpRequirements(followUps: NeuralFollowUp[], existing: DataRequirement[], agents: AgentSpec[]): { requirements: DataRequirement[]; agents: AgentSpec[] } {
  const existingIds = new Set(existing.map((r) => r.id)); const newRequirements: DataRequirement[] = []; const newAgents: AgentSpec[] = [];
  for (const f of followUps) {
    if (existingIds.has(f.id)) continue;
    const requirement: DataRequirement = { id: f.id, domain: f.domain, dataType: f.targetDataType, question: f.question, purpose: `Acción ${f.actionType}: ${f.reason}`, priority: f.priority, dependsOn: f.dependsOn, agentId: `agent:${f.id}`, status: "planned" };
    newRequirements.push(requirement); newAgents.push({ id: requirement.agentId, name: `${f.actionType}:${f.domain}.${f.targetDataType}`, domain: f.domain, input: ["TripContext", "validated_signals", "dependency_results", "previous_evidence"], output: [f.targetDataType, "evidence", "validation", "confidence", "freshness"], requirementIds: [f.id], mode: "research" }); existingIds.add(f.id);
  }
  return { requirements: [...existing, ...newRequirements], agents: [...agents, ...newAgents] };
}

export async function runNeuralOrchestration(requirements: DataRequirement[], agents: AgentSpec[], context: CanonicalTripContext, locations: ResolvedDestination[], execute: (requirements: DataRequirement[], agents: AgentSpec[], context: CanonicalTripContext, locations: ResolvedDestination[]) => Promise<AgentResult[]>, maxCycles = DEFAULT_MAX_NEURAL_CYCLES): Promise<{ results: AgentResult[]; cycles: NeuralCycle[]; requirements: DataRequirement[]; agents: AgentSpec[] }> {
  let currentRequirements = [...requirements]; let currentAgents = [...agents]; const allResults = new Map<string, AgentResult>(); const cycles: NeuralCycle[] = [];
  for (let cycle = 1; cycle <= maxCycles; cycle++) {
    const pending = currentRequirements.filter((r) => !allResults.has(r.id)); if (!pending.length) break;
    const pendingAgents = currentAgents.filter((a) => pending.some((r) => r.agentId === a.id));
    const results = await execute(pending, pendingAgents, context, locations); results.forEach((r) => allResults.set(r.requirementId, r));
    const neural = buildNeuralCycle(pending, results, cycle); cycles.push(neural);
    const materialized = materializeFollowUpRequirements(neural.followUps, currentRequirements, currentAgents); currentRequirements = materialized.requirements; currentAgents = materialized.agents;
    if (!neural.followUps.length) break;
  }
  return { results: [...allResults.values()], cycles, requirements: currentRequirements, agents: currentAgents };
}
