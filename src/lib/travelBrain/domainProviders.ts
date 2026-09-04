import type { EvidenceRef, ResearchDomain } from "./researchOrchestrator";
import type { ResolvedDestination } from "./destinationResolver";

export interface DomainProviderContext { destination: ResolvedDestination; start?: string; end?: string; currency?: string; query?: string; }
export interface DomainProviderResult { domain: ResearchDomain; status: "ready" | "unavailable" | "error"; data?: unknown; evidence?: EvidenceRef[]; error?: string; }

type Adapter = (context: DomainProviderContext) => Promise<DomainProviderResult>;
const evidence = (source: string, confidence: EvidenceRef["confidence"] = "medium"): EvidenceRef => ({ source, checkedAt: new Date().toISOString(), freshness: "live", confidence });

async function getJson(url: string, source: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
  return response.json();
}

const overpass: Adapter = async ({ destination, query }) => {
  const q = query ?? "tourism=attraction";
  const body = `[out:json][timeout:12];nwr[${q}](around:8000,${destination.latitude},${destination.longitude});out center tags 30;`;
  const data = await getJson("https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(body), "OpenStreetMap Overpass");
  return { domain: "experiences", status: "ready", data, evidence: [evidence("OpenStreetMap Overpass")] };
};

const map: Adapter = async ({ destination }) => {
  const data = await getJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${destination.latitude}&lon=${destination.longitude}`, "OpenStreetMap Nominatim", { headers: { "User-Agent": "Efecto-Viajero/1.0" } });
  return { domain: "map", status: "ready", data, evidence: [evidence("OpenStreetMap Nominatim")] };
};

const currency: Adapter = async ({ currency: base }) => {
  if (!base) return { domain: "currency", status: "unavailable" };
  const data = await getJson(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`, "Frankfurter");
  return { domain: "currency", status: "ready", data, evidence: [evidence("Frankfurter")] };
};

const adapters: Partial<Record<ResearchDomain, Adapter>> = { experiences: overpass, map, currency };

export async function executeDomainProvider(domain: ResearchDomain, context: DomainProviderContext): Promise<DomainProviderResult> {
  const adapter = adapters[domain];
  if (!adapter) return { domain, status: "unavailable", data: { reason: "Este dominio requiere un conector especializado antes de poder ofrecer datos factuales." } };
  try { return await adapter(context); } catch (error) { return { domain, status: "error", error: error instanceof Error ? error.message : "Provider error" }; }
}
