import type { ResearchDomain } from "./researchOrchestrator";

export type ProviderMode = "native" | "api" | "mcp" | "user_connected" | "not_connected";

export interface ProviderCapability {
  domain: ResearchDomain;
  mode: ProviderMode;
  provider?: string;
  requiresKey?: string;
  authoritative?: boolean;
  status: "implemented" | "partial" | "planned" | "blocked";
  notes: string;
}

/**
 * Capability registry. It describes the real implementation state rather than
 * claiming that a connector exists merely because a future provider is named.
 */
export const PROVIDERS: ProviderCapability[] = [
  { domain: "destination", mode: "api", provider: "Open-Meteo Geocoding", authoritative: false, status: "implemented", notes: "Place resolution. It is a resolver, not authoritative destination truth." },
  { domain: "weather", mode: "api", provider: "Open-Meteo", status: "implemented", notes: "Current and forecast data once coordinates and dates are known." },
  { domain: "map", mode: "api", provider: "OpenStreetMap Nominatim", status: "implemented", notes: "Reverse geocoding only today. Full map/routing/POI capability is still partial." },
  { domain: "transport", mode: "api", provider: "OSRM", status: "partial", notes: "Road routing only. Flight, rail, bus, transit and reliable origin handling still need connectors." },
  { domain: "accommodation", mode: "api", provider: "Accommodation provider adapter", status: "blocked", notes: "Needs live availability, prices, policies and accessibility data." },
  { domain: "requirements", mode: "api", provider: "Official government / consular sources", authoritative: true, status: "blocked", notes: "Needs country-specific official source strategy and traveler profile inputs." },
  { domain: "laws", mode: "api", provider: "Official local sources", authoritative: true, status: "blocked", notes: "No universal global API; needs jurisdiction-aware official-source retrieval." },
  { domain: "emergency", mode: "api", provider: "Official emergency / consular sources", authoritative: true, status: "blocked", notes: "Needs country/city emergency and consular source adapters." },
  { domain: "currency", mode: "api", provider: "Frankfurter", status: "partial", notes: "FX retrieval exists; destination-currency mapping and budget integration are incomplete." },
  { domain: "events", mode: "api", provider: "Events provider adapter", status: "blocked", notes: "Needs date/location event source with reliable freshness." },
  { domain: "gastronomy", mode: "api", provider: "OpenStreetMap Overpass", status: "partial", notes: "POI discovery works; reviews, menus, dietary fit, reliable hours and booking need richer sources." },
  { domain: "culture", mode: "api", provider: "OpenStreetMap Overpass", status: "partial", notes: "POI discovery works; authoritative descriptions, opening data and ticketing need richer sources." },
  { domain: "nature", mode: "api", provider: "OpenStreetMap Overpass", status: "partial", notes: "POI discovery works; closures, trail conditions and protected-area rules need authoritative sources." },
  { domain: "experiences", mode: "api", provider: "OpenStreetMap Overpass", status: "partial", notes: "Attraction discovery works; availability, booking, duration and price need richer sources." },
  { domain: "language", mode: "native", provider: "LLM", status: "partial", notes: "The domain is modeled but execution needs a real LLM capability boundary and language requirements in context." },
  { domain: "budget", mode: "native", provider: "Travel Brain", status: "partial", notes: "Domain exists in the plan but currently lacks a native execution model consuming dependency results." },
  { domain: "expenses", mode: "native", provider: "Travel Brain", status: "partial", notes: "Domain exists in the plan but currently lacks a native execution model and expense ledger integration." },
  { domain: "memory", mode: "user_connected", provider: "Device/cloud media adapters", status: "blocked", notes: "Needs user storage/media connection and explicit permission model." },
  { domain: "offline", mode: "native", provider: "Local device storage", status: "partial", notes: "Concept exists; critical-bundle generation and persistence still need implementation." },
  { domain: "social", mode: "api", provider: "Trip sharing adapter", status: "blocked", notes: "Needs authentication, persistent trip membership, permissions and realtime/shared state." },
];

export function capabilityFor(domain: ResearchDomain) {
  return PROVIDERS.find((provider) => provider.domain === domain);
}

export function capabilitiesNeedingAccess() {
  return PROVIDERS.filter((provider) => provider.status === "blocked" || provider.status === "planned");
}
