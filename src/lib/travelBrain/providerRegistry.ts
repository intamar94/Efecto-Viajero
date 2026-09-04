import type { ResearchDomain } from "./researchOrchestrator";

export type ProviderMode = "native" | "api" | "mcp" | "user_connected" | "not_connected";

export interface ProviderCapability {
  domain: ResearchDomain;
  mode: ProviderMode;
  provider?: string;
  requiresKey?: string;
  authoritative?: boolean;
  notes: string;
}

/**
 * Capability registry: the orchestrator depends on capabilities, not brands.
 * Real connectors can be attached later without changing the product contract.
 */
export const PROVIDERS: ProviderCapability[] = [
  { domain: "destination", mode: "native", provider: "Open-Meteo Geocoding", authoritative: false, notes: "Global place resolution; use as resolver, not as destination truth." },
  { domain: "weather", mode: "api", provider: "Open-Meteo", notes: "Current/forecast weather once coordinates and dates are known." },
  { domain: "map", mode: "api", provider: "Maps provider adapter", requiresKey: "MAPS_PROVIDER_API_KEY", notes: "Routing, POI and travel-time data." },
  { domain: "transport", mode: "api", provider: "Flight/rail/transit adapters", notes: "Multi-modal route search; no single provider should define the whole trip." },
  { domain: "accommodation", mode: "api", provider: "Accommodation adapters", notes: "Availability, prices, policies and accessibility." },
  { domain: "requirements", mode: "api", provider: "Official government / consular sources", authoritative: true, notes: "Country- and traveler-specific entry rules." },
  { domain: "laws", mode: "api", provider: "Official local sources", authoritative: true, notes: "Local regulations such as food/drink, driving, park and beach rules." },
  { domain: "emergency", mode: "api", provider: "Official emergency / consular sources", authoritative: true, notes: "Emergency numbers, hospitals, consulates and local safety contacts." },
  { domain: "currency", mode: "api", provider: "FX provider adapter", notes: "Rates with timestamp and source." },
  { domain: "events", mode: "api", provider: "Events provider adapters", notes: "Events filtered by date, place and traveler fit." },
  { domain: "gastronomy", mode: "api", provider: "Places/review adapters", notes: "Restaurants, dishes, opening hours, price and dietary/accessibility fit." },
  { domain: "culture", mode: "api", provider: "POI/cultural adapters", notes: "Museums, heritage, customs and interpretation." },
  { domain: "nature", mode: "api", provider: "Parks / protected-area adapters", notes: "Trails, beaches, parks, closures and conditions." },
  { domain: "experiences", mode: "api", provider: "Experience adapters", notes: "Activities and availability." },
  { domain: "language", mode: "native", provider: "LLM", notes: "Translation, phrase support and contextual language help." },
  { domain: "budget", mode: "native", provider: "Travel Brain", notes: "Model and constraint solver consuming observed prices." },
  { domain: "expenses", mode: "native", provider: "Travel Brain", notes: "Expense ledger and budget deltas." },
  { domain: "memory", mode: "user_connected", provider: "Device/cloud media adapters", notes: "Index metadata where possible; originals stay with the user." },
  { domain: "offline", mode: "native", provider: "Local device storage", notes: "Cache the minimum required critical trip bundle." },
  { domain: "social", mode: "api", provider: "Trip sharing adapter", notes: "Participants, permissions, votes and shared changes." },
];

export function capabilityFor(domain: ResearchDomain) {
  return PROVIDERS.find((provider) => provider.domain === domain);
}
