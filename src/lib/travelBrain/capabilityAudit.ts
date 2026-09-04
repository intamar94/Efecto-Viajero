import type { ResearchDomain, ResearchResult, ResearchTask } from "./researchOrchestrator";
import { PROVIDERS } from "./providerRegistry";
import { CAPABILITY_REQUIREMENTS } from "./capabilityRequirements";
import type { DepartmentReport } from "./departments";

export type CapabilityAuditStatus = "operational" | "partial" | "blocked" | "failed" | "not_exercised";

export interface CapabilityAuditItem {
  domain: ResearchDomain;
  status: CapabilityAuditStatus;
  implementation: "implemented" | "partial" | "planned" | "blocked";
  executionStatus?: string;
  provider?: string;
  requiredAccess?: string[];
  blockers: string[];
  improvements: string[];
  lastEvidence?: string[];
}

export interface CapabilityAudit {
  generatedAt: string;
  operational: ResearchDomain[];
  partial: ResearchDomain[];
  blocked: ResearchDomain[];
  failed: ResearchDomain[];
  notExercised: ResearchDomain[];
  accessRequests: Array<{
    domain: ResearchDomain;
    capability: string;
    accessKind: string;
    environmentVariable?: string;
    providerCandidates: string[];
    priority: string;
    blocking: boolean;
    requestedFromCeo: string;
  }>;
  items: CapabilityAuditItem[];
}

export function auditCapabilities(tasks: ResearchTask[], results: ResearchResult[], reports: DepartmentReport[]): CapabilityAudit {
  const domains = [...new Set(tasks.map((task) => task.domain))];
  const items = domains.map((domain): CapabilityAuditItem => {
    const provider = PROVIDERS.find((item) => item.domain === domain);
    const requirements = CAPABILITY_REQUIREMENTS.filter((item) => item.domain === domain);
    const domainResults = results.filter((result) => result.task.domain === domain);
    const report = reports.find((item) => item.domain === domain);
    const executionStatus = report?.status ?? domainResults[0]?.status;
    const blockers = requirements
      .filter((requirement) => requirement.blocking && (provider?.status === "blocked" || provider?.status === "planned" || !domainResults.length || domainResults.some((result) => result.status === "unavailable")))
      .map((requirement) => requirement.requestedFromCeo);
    const improvements = provider?.notes ? [provider.notes] : [];

    let status: CapabilityAuditStatus;
    if (executionStatus === "error") status = "failed";
    else if (provider?.status === "partial") status = "partial";
    else if (executionStatus === "unavailable") status = "blocked";
    else if (!domainResults.length) status = "not_exercised";
    else if (executionStatus === "partial" || executionStatus === "needs_review") status = "partial";
    else if (provider?.status === "implemented" && executionStatus === "ready") status = "operational";
    else if (provider?.status === "blocked" || provider?.status === "planned") status = "blocked";
    else status = "not_exercised";

    return {
      domain,
      status,
      implementation: provider?.status ?? "planned",
      executionStatus,
      provider: provider?.provider,
      requiredAccess: requirements.map((requirement) => requirement.environmentVariable ?? requirement.accessKind),
      blockers,
      improvements,
      lastEvidence: domainResults.flatMap((result) => (result.evidence ?? []).map((evidence) => evidence.source)),
    };
  });

  const accessRequests = CAPABILITY_REQUIREMENTS.filter((requirement) => {
    const item = items.find((candidate) => candidate.domain === requirement.domain);
    return requirement.blocking && item?.status !== "operational";
  }).map((requirement) => ({
    domain: requirement.domain,
    capability: requirement.capability,
    accessKind: requirement.accessKind,
    environmentVariable: requirement.environmentVariable,
    providerCandidates: requirement.providerCandidates,
    priority: requirement.priority,
    blocking: requirement.blocking,
    requestedFromCeo: requirement.requestedFromCeo,
  }));

  return {
    generatedAt: new Date().toISOString(),
    operational: items.filter((item) => item.status === "operational").map((item) => item.domain),
    partial: items.filter((item) => item.status === "partial").map((item) => item.domain),
    blocked: items.filter((item) => item.status === "blocked").map((item) => item.domain),
    failed: items.filter((item) => item.status === "failed").map((item) => item.domain),
    notExercised: items.filter((item) => item.status === "not_exercised").map((item) => item.domain),
    accessRequests,
    items,
  };
}
