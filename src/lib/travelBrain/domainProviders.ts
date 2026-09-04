import type { EvidenceRef, ResearchDomain } from "./researchOrchestrator";
import type { ResolvedDestination } from "./destinationResolver";

export interface DomainProviderContext { destination: ResolvedDestination; start?: string; end?: string; currency?: string; query?: string; origin?: { latitude: number; longitude: number }; }
export interface DomainProviderResult { domain: ResearchDomain; status: "ready" | "unavailable" | "error"; data?: unknown; evidence?: EvidenceRef[]; error?: string; }
type Adapter = (context: DomainProviderContext) => Promise<DomainProviderResult>;
const evidence = (source: string, confidence: EvidenceRef["confidence"] = "medium"): EvidenceRef => ({ source, checkedAt: new Date().toISOString(), freshness: "live", confidence });
async function getJson(url: string, source: string, init?: RequestInit) { const response = await fetch(url, { ...init, next: { revalidate: 900 } }); if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`); return response.json(); }

const poi: Record<string, string> = { experiences: "tourism=attraction", culture: "tourism=museum|tourism=gallery|historic", gastronomy: "amenity=restaurant|amenity=cafe|amenity=fast_food", nature: "leisure=park|leisure=nature_reserve|natural=beach|natural=waterfall|tourism=viewpoint" };
const osmPoi: Adapter = async ({ destination, domain, query }) => {
  const filters = (query ?? poi[domain] ?? poi.experiences).split("|");
  const clauses = filters.map((item) => `[${item}]`).join("");
  const body = `[out:json][timeout:15];nwr${clauses}(around:8000,${destination.latitude},${destination.longitude});out center tags 40;`;
  const data = await getJson("https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(body), "OpenStreetMap Overpass");
  return { domain, status: "ready", data, evidence: [evidence("OpenStreetMap Overpass")] };
};
const map: Adapter = async ({ destination }) => { const data = await getJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${destination.latitude}&lon=${destination.longitude}`, "OpenStreetMap Nominatim", { headers: { "User-Agent": "Efecto-Viajero/1.0" } }); return { domain: "map", status: "ready", data, evidence: [evidence("OpenStreetMap Nominatim")] }; };
const route: Adapter = async ({ destination, origin }) => { if (!origin) return { domain: "transport", status: "unavailable", data: { reason: "Se necesita origen y destino para calcular una ruta." } }; const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`; const data = await getJson(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=true`, "OSRM"); return { domain: "transport", status: "ready", data, evidence: [evidence("OSRM")] }; };
const currency: Adapter = async ({ destination, currency: base }) => { if (!base) return { domain: "currency", status: "unavailable", data: { reason: "No se indicó moneda base." } }; const data = await getJson(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`, "Frankfurter"); return { domain: "currency", status: "ready", data: { destination, ...data }, evidence: [evidence("Frankfurter")] }; };
const adapters: Partial<Record<ResearchDomain, Adapter>> = { experiences: osmPoi, culture: osmPoi, gastronomy: osmPoi, nature: osmPoi, map, transport: route, currency };
export async function executeDomainProvider(domain: ResearchDomain, context: DomainProviderContext): Promise<DomainProviderResult> { const adapter = adapters[domain]; if (!adapter) return { domain, status: "unavailable", data: { reason: "Este dominio requiere un conector especializado antes de poder ofrecer datos factuales." } }; try { return await adapter(context); } catch (error) { return { domain, status: "error", error: error instanceof Error ? error.message : "Provider error" }; } }
