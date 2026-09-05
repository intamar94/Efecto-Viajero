import type { AgentEvidence } from "./agentContracts";
import type { WorkingMemoryConflict } from "./workingMemory";

export interface ConflictClaim {
  requirementId: string;
  value: unknown;
  evidence: AgentEvidence[];
}

export interface ConflictResolution {
  conflictId: string;
  status: "resolved" | "unresolved";
  winner?: ConflictClaim;
  rationale: string;
  confidence: number;
  needsResearch: boolean;
}

function evidenceScore(evidence: AgentEvidence[]): number {
  return evidence.reduce((score, item) => {
    const authority = /official|gob|gov|government|ministerio|embassy|consulado|institucional/i.test(item.source) ? 3 : 1;
    const freshness = item.freshness === "live" ? 3 : item.freshness === "recent" ? 2 : item.freshness === "dated" ? 1 : 0;
    const confidence = item.confidence === "high" ? 2 : item.confidence === "medium" ? 1 : 0;
    return score + authority + freshness + confidence;
  }, 0);
}

export function resolveConflict(
  conflict: WorkingMemoryConflict,
  claims: ConflictClaim[],
): ConflictResolution {
  if (claims.length < 2) {
    return {
      conflictId: conflict.key,
      status: "unresolved",
      rationale: "No hay suficientes afirmaciones independientes para resolver el conflicto.",
      confidence: 0,
      needsResearch: true,
    };
  }

  const ranked = claims
    .map((claim) => ({ claim, score: evidenceScore(claim.evidence) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const second = ranked[1];

  if (!best || best.score === 0 || best.score === second?.score) {
    return {
      conflictId: conflict.key,
      status: "unresolved",
      rationale: "Las evidencias disponibles no permiten establecer una fuente suficientemente superior.",
      confidence: 0,
      needsResearch: true,
    };
  }

  const confidence = Math.min(0.98, 0.55 + (best.score - (second?.score ?? 0)) * 0.08);
  return {
    conflictId: conflict.key,
    status: "resolved",
    winner: best.claim,
    rationale: "Se priorizó la afirmación con mayor autoridad, frescura y confianza de evidencia.",
    confidence,
    needsResearch: confidence < 0.8,
  };
}

export function resolveWorkingMemoryConflicts(
  conflicts: WorkingMemoryConflict[],
  claimsByRequirement: Map<string, ConflictClaim>,
): ConflictResolution[] {
  return conflicts.map((conflict) =>
    resolveConflict(
      conflict,
      conflict.requirementIds.map((id) => claimsByRequirement.get(id)).filter(Boolean) as ConflictClaim[],
    ),
  );
}
