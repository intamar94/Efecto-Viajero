import type { ResearchDomain, ResearchResult, EvidenceRef } from "./researchOrchestrator";
import type { CanonicalTripContext } from "./tripContext";
import type { ResolvedDestination } from "./destinationResolver";

export type AgentOperation =
  | "resolve-destination"
  | "forecast-weather"
  | "discover-poi"
  | "route-road"
  | "lookup-fx"
  | "retrieve-official-requirements"
  | "retrieve-official-laws"
  | "retrieve-official-emergency"
  | "search-accommodation"
  | "search-events"
  | "model-budget"
  | "build-offline-bundle"
  | "derive-language-help"
  | "derive-map-links"
  | "derive-memory"
  | "derive-social"
  | "unsupported";

export interface AgentExecutionContext {
  context: CanonicalTripContext;
  locations: ResolvedDestination[];
  dependencyResults: ResearchResult[];
}

export interface AgentEvidence extends EvidenceRef {
  claim?: string;
  locator?: string;
}

export interface AgentValidation {
  valid: boolean;
  issues: string[];
  missing: string[];
  claims: Array<{ claim: string; supported: boolean; evidence: AgentEvidence[] }>;
}

export function operationFor(domain: ResearchDomain, dataType: string): AgentOperation {
  if (domain === "destination") return "resolve-destination";
  if (domain === "weather") return "forecast-weather";
  if (domain === "transport") return dataType === "routes" || dataType === "duration" ? "route-road" : "unsupported";
  if (["experiences", "culture", "gastronomy", "nature"].includes(domain)) return "discover-poi";
  if (domain === "currency") return "lookup-fx";
  if (domain === "requirements") return "retrieve-official-requirements";
  if (domain === "laws") return "retrieve-official-laws";
  if (domain === "emergency") return "retrieve-official-emergency";
  if (domain === "accommodation") return "search-accommodation";
  if (domain === "events") return "search-events";
  if (domain === "budget") return "model-budget";
  if (domain === "offline") return "build-offline-bundle";
  if (domain === "language") return "derive-language-help";
  if (domain === "map") return "derive-map-links";
  if (domain === "memory") return "derive-memory";
  if (domain === "social") return "derive-social";
  return "unsupported";
}

export function validateAgentOutput(
  dataType: string,
  operation: AgentOperation,
  data: unknown,
  evidence: AgentEvidence[] = [],
): AgentValidation {
  const issues: string[] = [];
  const missing: string[] = [];
  if (operation === "unsupported") issues.push(`No existe una operación ejecutable para ${dataType}.`);
  if (data === undefined || data === null || (Array.isArray(data) && data.length === 0)) missing.push(dataType);
  if (["retrieve-official-requirements", "retrieve-official-laws", "retrieve-official-emergency"].includes(operation) && evidence.length === 0) {
    issues.push("La información oficial requiere evidencia verificable.");
    missing.push("official_evidence");
  }
  return { valid: issues.length === 0 && missing.length === 0, issues, missing, claims: [{ claim: dataType, supported: issues.length === 0 && evidence.length > 0, evidence }] };
}
