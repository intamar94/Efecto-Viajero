import type { CreativeDepartmentPlan, CreativeInstruction } from "./creativeDepartment";
import type { CreativeAuditReport } from "./creativeAuditEngine";

/** Turns concrete audit findings into actionable department work without changing the canonical design-system agents. */
export function attachCreativeAuditToPlan(plan: CreativeDepartmentPlan, audit: CreativeAuditReport): CreativeDepartmentPlan {
  const auditInstructions: CreativeInstruction[] = audit.findings.map((finding) => ({
    id: `audit-task:${finding.id}`,
    agentId: finding.agentId,
    layer: finding.layer,
    priority: finding.severity,
    title: `Auditar/corregir: ${finding.problem}`,
    reason: finding.evidence.join(" "),
    files: finding.files,
    operations: [finding.recommendation],
    libraries: ["React", "Next.js", "Tailwind/CSS", "componentes existentes"],
    commands: finding.layer === "performance" ? ["npm run lint", "npm run build"] : ["npm run lint"],
    acceptanceCriteria: finding.acceptanceCriteria,
    userOutcome: `Resolver el hallazgo ${finding.id} sin degradar la experiencia del viajero.`,
  }));

  const existing = new Set(plan.instructions.map((instruction) => instruction.id));
  return {
    ...plan,
    instructions: [...plan.instructions, ...auditInstructions.filter((instruction) => !existing.has(instruction.id))],
    status: audit.findings.some((finding) => finding.severity === "critical" || finding.severity === "high") ? "partial" : plan.status,
  };
}
