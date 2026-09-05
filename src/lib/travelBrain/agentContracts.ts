import type { ResearchDomain, ResearchResult, EvidenceRef } from "./researchOrchestrator";
import type { CanonicalTripContext } from "./tripContext";
import type { ResolvedDestination } from "./destinationResolver";

export type AgentOperation =
  | "resolve-destination" | "forecast-weather" | "discover-poi" | "route-road" | "lookup-fx"
  | "retrieve-official-requirements" | "retrieve-official-laws" | "retrieve-official-emergency"
  | "search-accommodation" | "search-events" | "model-budget" | "build-offline-bundle"
  | "derive-language-help" | "derive-map-links" | "derive-memory" | "derive-social" | "unsupported";

export interface AgentExecutionContext {
  context: CanonicalTripContext;
  locations: ResolvedDestination[];
  dependencyResults: ResearchResult[];
  requirementResults?: Map<string, unknown>;
}

export interface AgentEvidence extends EvidenceRef { claim?: string; locator?: string; }
export interface AgentValidation {
  valid: boolean;
  issues: string[];
  missing: string[];
  claims: Array<{ claim: string; supported: boolean; evidence: AgentEvidence[] }>;
}

const EXACT_OPERATIONS: Partial<Record<ResearchDomain, Record<string, AgentOperation>>> = {
  transport: {
    origin: "derive-map-links", available_modes: "route-road", routes: "route-road", duration: "route-road",
    cost: "route-road", family_fit: "route-road", pet_transport: "route-road", luggage_equipment: "route-road",
  },
  gastronomy: {
    local_specialties: "discover-poi", food_places: "discover-poi", opening_hours: "discover-poi", price: "discover-poi",
    children_options: "discover-poi", infant_options: "discover-poi", pet_policy: "discover-poi", elder_options: "discover-poi",
  },
  experiences: {
    activities: "discover-poi", schedule: "discover-poi", duration: "discover-poi", requirements: "discover-poi",
    group_fit: "discover-poi", children_fit: "discover-poi", infant_fit: "discover-poi", elder_fit: "discover-poi",
    pet_fit: "discover-poi", indoor_backup: "discover-poi", rest_windows: "discover-poi",
  },
  culture: { cultural_places: "discover-poi", opening_hours: "discover-poi", admission: "discover-poi", family_fit: "discover-poi" },
  nature: { natural_places: "discover-poi", access: "discover-poi", conditions: "discover-poi", difficulty: "discover-poi", pet_access: "discover-poi", family_access: "discover-poi" },
};

export function operationFor(domain: ResearchDomain, dataType: string): AgentOperation {
  if (domain === "destination") return "resolve-destination";
  if (domain === "weather") return "forecast-weather";
  if (EXACT_OPERATIONS[domain]?.[dataType]) return EXACT_OPERATIONS[domain]![dataType];
  if (domain === "transport") return "unsupported";
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

export function validateAgentOutput(dataType: string, operation: AgentOperation, data: unknown, evidence: AgentEvidence[] = []): AgentValidation {
  const issues: string[] = [];
  const missing: string[] = [];
  if (operation === "unsupported") issues.push(`No existe una operación ejecutable para ${dataType}.`);
  if (data === undefined || data === null || (Array.isArray(data) && data.length === 0)) missing.push(dataType);
  if (["retrieve-official-requirements", "retrieve-official-laws", "retrieve-official-emergency"].includes(operation) && evidence.length === 0) {
    issues.push("La información oficial requiere evidencia verificable."); missing.push("official_evidence");
  }
  const supported = issues.length === 0 && evidence.length > 0;
  return { valid: issues.length === 0 && missing.length === 0, issues, missing, claims: [{ claim: dataType, supported, evidence }] };
}
