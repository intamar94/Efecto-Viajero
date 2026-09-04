import type { ResearchDomain } from "./researchOrchestrator";

export type AccessKind = "api_key" | "oauth" | "account" | "official_source" | "database" | "device_permission" | "none";
export type AccessPriority = "critical" | "high" | "normal" | "later";

export interface CapabilityRequirement {
  domain: ResearchDomain;
  capability: string;
  accessKind: AccessKind;
  environmentVariable?: string;
  providerCandidates: string[];
  priority: AccessPriority;
  blocking: boolean;
  reason: string;
  requestedFromCeo: string;
}

/**
 * Single source of truth for integrations the Orchestrator will eventually
 * need. No secret belongs in this file; it only describes the access required.
 */
export const CAPABILITY_REQUIREMENTS: CapabilityRequirement[] = [
  {
    domain: "transport",
    capability: "flight/rail/transit search and live schedules",
    accessKind: "api_key",
    environmentVariable: "AMADEUS_API_KEY",
    providerCandidates: ["Amadeus", "regional rail/transit APIs", "GTFS/GTFS-RT feeds"],
    priority: "critical",
    blocking: true,
    reason: "OSRM only covers road routing and cannot build the real intercity transport layer.",
    requestedFromCeo: "Connect a travel transport provider and supply test credentials first; production credentials later.",
  },
  {
    domain: "accommodation",
    capability: "live hotel/accommodation availability, price and policies",
    accessKind: "api_key",
    environmentVariable: "ACCOMMODATION_PROVIDER_API_KEY",
    providerCandidates: ["Amadeus Hotels", "other licensed accommodation provider"],
    priority: "critical",
    blocking: true,
    reason: "The department cannot claim availability or price without a live licensed source.",
    requestedFromCeo: "Choose/approve an accommodation provider and connect its API account.",
  },
  {
    domain: "requirements",
    capability: "traveler-specific entry requirements",
    accessKind: "official_source",
    providerCandidates: ["official government/consular sources", "licensed travel-requirements provider"],
    priority: "critical",
    blocking: true,
    reason: "Entry rules depend on nationality, residence, documents, destination and dates.",
    requestedFromCeo: "Provide traveler nationality/residence/document context in the product and approve an official-source strategy.",
  },
  {
    domain: "laws",
    capability: "jurisdiction-specific travel rules",
    accessKind: "official_source",
    providerCandidates: ["official government", "local authority", "protected-area authority"],
    priority: "critical",
    blocking: true,
    reason: "There is no reliable universal global laws API; official jurisdiction sources are required.",
    requestedFromCeo: "Approve official-source retrieval and escalation when a jurisdiction cannot be verified.",
  },
  {
    domain: "emergency",
    capability: "emergency numbers, hospitals, consulates and safety contacts",
    accessKind: "official_source",
    providerCandidates: ["official emergency services", "foreign ministry/consular sources", "local health authorities"],
    priority: "critical",
    blocking: true,
    reason: "Emergency information must be authoritative and location-specific.",
    requestedFromCeo: "Approve authoritative-source retrieval; never substitute an LLM-generated emergency number.",
  },
  {
    domain: "events",
    capability: "date-specific events and availability",
    accessKind: "api_key",
    environmentVariable: "EVENTS_PROVIDER_API_KEY",
    providerCandidates: ["licensed events/ticketing provider", "official venue/event sources"],
    priority: "high",
    blocking: false,
    reason: "Events require date, location and freshness; the current stack has no event provider.",
    requestedFromCeo: "Connect an events source when event discovery becomes part of the MVP scope.",
  },
  {
    domain: "map",
    capability: "rich places, multimodal routing, traffic and navigation",
    accessKind: "api_key",
    environmentVariable: "GOOGLE_MAPS_API_KEY",
    providerCandidates: ["Google Maps Platform", "OpenStreetMap ecosystem"],
    priority: "high",
    blocking: false,
    reason: "Current OSM adapters cover reverse geocoding and POI discovery but not a complete navigation stack.",
    requestedFromCeo: "Approve a maps provider and create a restricted API key if richer routing/places are required.",
  },
  {
    domain: "memory",
    capability: "user media/document memory",
    accessKind: "device_permission",
    providerCandidates: ["device photo/document storage", "approved cloud storage"],
    priority: "high",
    blocking: false,
    reason: "Memory requires explicit user permissions and persistent storage; it must not be inferred from transient trip state.",
    requestedFromCeo: "Approve the storage architecture and permission model before connecting personal media.",
  },
  {
    domain: "social",
    capability: "shared trips, participants, permissions and realtime updates",
    accessKind: "database",
    providerCandidates: ["Supabase"],
    priority: "high",
    blocking: false,
    reason: "Shared travel requires authenticated identities and persistent authorization state.",
    requestedFromCeo: "Connect/approve the persistent backend and authentication model.",
  },
];

export function requirementsFor(domain: ResearchDomain) {
  return CAPABILITY_REQUIREMENTS.filter((item) => item.domain === domain);
}

export function blockingRequirements() {
  return CAPABILITY_REQUIREMENTS.filter((item) => item.blocking);
}
