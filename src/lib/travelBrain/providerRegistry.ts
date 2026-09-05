import type { ResearchDomain } from "./researchOrchestrator";
export type ProviderMode = "native" | "api" | "mcp" | "user_connected" | "not_connected";
export interface ProviderCapability { domain: ResearchDomain; mode: ProviderMode; provider?: string; requiresKey?: string; authoritative?: boolean; status: "implemented" | "partial" | "planned" | "blocked"; notes: string; }
export const PROVIDERS: ProviderCapability[] = [
  { domain: "destination", mode: "api", provider: "Open-Meteo Geocoding", authoritative: false, status: "implemented", notes: "Place resolution; not authoritative destination truth." },
  { domain: "weather", mode: "api", provider: "Open-Meteo", status: "implemented", notes: "Current and forecast data once coordinates and dates are known." },
  { domain: "map", mode: "api", provider: "OpenStreetMap Nominatim", status: "partial", notes: "Reverse geocoding is operational; full map/routing/POI remains partial." },
  { domain: "transport", mode: "api", provider: "OSRM", status: "partial", notes: "Road routing only; flight, rail, bus, transit and reliable origin handling need connectors." },
  { domain: "accommodation", mode: "api", provider: "OpenStreetMap Overpass", status: "partial", notes: "Concrete lodging discovery is operational; live availability, prices, policies and accessibility still require richer sources." },
  { domain: "requirements", mode: "api", provider: "Official government / consular sources", authoritative: true, status: "partial", notes: "Official retrieval is implemented for Colombia; country-specific connectors remain to be added." },
  { domain: "laws", mode: "api", provider: "Official local sources", authoritative: true, status: "partial", notes: "Official-source retrieval is implemented for Colombia at source level; jurisdiction-specific legal extraction remains to be added." },
  { domain: "emergency", mode: "api", provider: "Official emergency / consular sources", authoritative: true, status: "partial", notes: "Official source retrieval is implemented for Colombia; city/country emergency directories still need structured connectors." },
  { domain: "currency", mode: "api", provider: "Frankfurter", status: "partial", notes: "FX retrieval exists; destination-currency mapping still needs integration." },
  { domain: "events", mode: "api", provider: "Events provider adapter", status: "blocked", notes: "Needs date/location event source with reliable freshness; venue discovery is not presented as events." },
  { domain: "gastronomy", mode: "api", provider: "OpenStreetMap Overpass", status: "partial", notes: "POI discovery works; menus, dietary fit, reliable hours and booking need richer sources." },
  { domain: "culture", mode: "api", provider: "OpenStreetMap Overpass", status: "partial", notes: "POI discovery works; authoritative descriptions, opening data and ticketing need richer sources." },
  { domain: "nature", mode: "api", provider: "OpenStreetMap Overpass", status: "partial", notes: "POI discovery works; closures, trail conditions and protected-area rules need authoritative sources." },
  { domain: "experiences", mode: "api", provider: "OpenStreetMap Overpass", status: "partial", notes: "Attraction discovery works; availability, booking, duration and price need richer sources." },
  { domain: "language", mode: "native", provider: "LLM", status: "partial", notes: "Domain modeled; execution boundary and language requirements still need implementation." },
  { domain: "budget", mode: "native", provider: "Efecto Viajero Budget Engine", status: "implemented", notes: "Transparent planning envelope; never a market price." },
  { domain: "expenses", mode: "native", provider: "Efecto Viajero Expense Ledger", status: "implemented", notes: "Aggregates explicit numeric costs and marks incomplete coverage." },
  { domain: "memory", mode: "user_connected", provider: "Supabase brain snapshots", status: "partial", notes: "Server adapter is implemented; user-bound authentication and production project configuration remain required." },
  { domain: "offline", mode: "native", provider: "Efecto Viajero Offline Planner", status: "implemented", notes: "Builds a deterministic manifest; missing content stays pending." },
  { domain: "social", mode: "api", provider: "Trip sharing adapter", status: "blocked", notes: "Needs authentication, persistent trip membership, permissions and realtime/shared state." },
];
export function capabilityFor(domain: ResearchDomain) { return PROVIDERS.find((provider) => provider.domain === domain); }
export function capabilitiesNeedingAccess() { return PROVIDERS.filter((provider) => provider.status === "blocked" || provider.status === "planned"); }
