import type { EvidenceRef } from "./researchOrchestrator";
import type { AgentResult, DependencySignal } from "./agentRuntime";
import type { NeuralCycle } from "./neuralOrchestrator";

export interface WorkingMemoryFact {
  key: string;
  requirementId: string;
  dataType: string;
  value: unknown;
  confidence: "high" | "medium" | "low";
  freshness: "live" | "recent" | "dated" | "unknown";
  evidence: EvidenceRef[];
  updatedAt: string;
}

export interface WorkingMemoryConflict {
  key: string;
  requirementIds: string[];
  values: unknown[];
  reason: string;
}

export interface WorkingMemoryDecision {
  id: string;
  action: string;
  reason: string;
  priority: "critical" | "high" | "normal";
  createdAt: string;
}

export interface WorkingMemory {
  facts: WorkingMemoryFact[];
  signals: DependencySignal[];
  conflicts: WorkingMemoryConflict[];
  decisions: WorkingMemoryDecision[];
  cycles: NeuralCycle[];
}

export function createWorkingMemory(): WorkingMemory {
  return { facts: [], signals: [], conflicts: [], decisions: [], cycles: [] };
}

function sameValue(a: unknown, b: unknown) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return Object.is(a, b); }
}

/** Shared blackboard: every validated agent output becomes reusable knowledge. */
export function absorbAgentResults(memory: WorkingMemory, results: AgentResult[]): WorkingMemory {
  for (const result of results) {
    if (result.data === undefined) continue;
    const key = `${result.domain}.${result.dataType}`;
    const existing = memory.facts.find((fact) => fact.key === key);
    const fact: WorkingMemoryFact = {
      key, requirementId: result.requirementId, dataType: result.dataType, value: result.data,
      confidence: result.confidence, freshness: result.freshness, evidence: result.evidence ?? [], updatedAt: new Date().toISOString(),
    };
    if (existing && !sameValue(existing.value, fact.value) && existing.requirementId !== fact.requirementId) {
      const conflictKey = key;
      const conflict = memory.conflicts.find((item) => item.key === conflictKey);
      if (conflict) {
        conflict.requirementIds = [...new Set([...conflict.requirementIds, existing.requirementId, fact.requirementId])];
        conflict.values = [...conflict.values.filter((value) => !sameValue(value, fact.value)), fact.value];
      } else {
        memory.conflicts.push({ key: conflictKey, requirementIds: [existing.requirementId, fact.requirementId], values: [existing.value, fact.value], reason: "Dos señales distintas describen el mismo dato; requiere verificación cruzada." });
      }
    }
    if (existing) Object.assign(existing, fact); else memory.facts.push(fact);
    for (const signal of result.dependencySignals ?? []) {
      if (!memory.signals.some((item) => item.requirementId === signal.requirementId && item.dataType === signal.dataType)) memory.signals.push(signal);
    }
  }
  return memory;
}

export function absorbNeuralCycle(memory: WorkingMemory, cycle: NeuralCycle): WorkingMemory {
  memory.cycles.push(cycle);
  return memory;
}

export function recordDecision(memory: WorkingMemory, decision: Omit<WorkingMemoryDecision, "createdAt">): WorkingMemory {
  memory.decisions.push({ ...decision, createdAt: new Date().toISOString() });
  return memory;
}

export function getSignalsForRequirement(memory: WorkingMemory, requirementId: string, dependencyIds: string[]): DependencySignal[] {
  return dependencyIds.map((id) => memory.signals.find((signal) => signal.requirementId === id)).filter(Boolean) as DependencySignal[];
}
