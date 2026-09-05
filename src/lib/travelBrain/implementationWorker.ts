import type { CreativeInstruction } from "./creativeDepartment";
import type { CreativeAuditFinding } from "./creativeAuditEngine";

export type ImplementationTaskStatus = "queued" | "in_progress" | "implemented" | "blocked" | "failed";

export interface ImplementationTask {
  id: string;
  findingId?: string;
  instructionId: string;
  agentId: string;
  files: string[];
  operations: string[];
  acceptanceCriteria: string[];
  commands: string[];
  status: ImplementationTaskStatus;
  createdAt: string;
}

/**
 * Converts creative work into a machine-readable implementation queue.
 * The repository worker is deliberately separated from the web runtime: a
 * Next.js request must never receive arbitrary shell/Git credentials.
 */
export function buildImplementationTask(instruction: CreativeInstruction, finding?: CreativeAuditFinding): ImplementationTask {
  return {
    id: `implementation:${instruction.id}`,
    findingId: finding?.id,
    instructionId: instruction.id,
    agentId: instruction.agentId,
    files: instruction.files,
    operations: instruction.operations,
    acceptanceCriteria: instruction.acceptanceCriteria,
    commands: instruction.commands,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
}

export function buildImplementationQueue(instructions: CreativeInstruction[], findings: CreativeAuditFinding[] = []): ImplementationTask[] {
  const byFinding = new Map(findings.map((finding) => [`audit-task:${finding.id}`, finding]));
  return instructions.map((instruction) => buildImplementationTask(instruction, byFinding.get(instruction.id)));
}
