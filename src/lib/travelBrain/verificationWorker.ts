import type { BrainState } from "./brainState";
import type { CreativeAuditFinding, CreativeAuditReport } from "./creativeAuditEngine";
import { auditCreativeAgents } from "./creativeAuditEngine";

export type VerificationStatus = "verified" | "open" | "blocked";

export interface VerificationResult {
  findingId: string;
  status: VerificationStatus;
  remainingEvidence: string[];
  checkedAt: string;
}

/** Re-audits the changed source rather than trusting the implementation worker. */
export function verifyCreativeFinding(state: BrainState, finding: CreativeAuditFinding, sourceFiles: Record<string, string>): VerificationResult {
  const report = auditCreativeAgents({ state, sourceFiles });
  const stillOpen = report.findings.some((item) => item.id === finding.id);
  return {
    findingId: finding.id,
    status: stillOpen ? "open" : "verified",
    remainingEvidence: stillOpen ? report.findings.find((item) => item.id === finding.id)?.evidence ?? [] : [],
    checkedAt: new Date().toISOString(),
  };
}

export function verifyCreativeReport(state: BrainState, report: CreativeAuditReport, sourceFiles: Record<string, string>): VerificationResult[] {
  return report.findings.map((finding) => verifyCreativeFinding(state, finding, sourceFiles));
}
