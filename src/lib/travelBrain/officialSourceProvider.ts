import type { EvidenceRef, ResearchDomain } from "./researchOrchestrator";
import type { ResolvedDestination } from "./destinationResolver";

export interface OfficialSourceContext { destination: ResolvedDestination; question?: string; dataType?: string; travelerCounts?: { adults: number; children: number; babies: number; seniors: number; pets: number }; }
export interface OfficialSourceResult { status: "ready" | "partial" | "unavailable" | "error"; data?: unknown; evidence?: EvidenceRef[]; error?: string; }

const COLOMBIA_SOURCES = {
  requirements: "https://portal.migracioncolombia.gov.co/tramites-y-servicios/instructivos/requisitos-de-entrada-y-salida-del-pais",
  laws: "https://www.cancilleria.gov.co/",
  emergency: "https://portal.migracioncolombia.gov.co/",
  pets: "https://www.ica.gov.co/importacion-y-exportacion/otros-procedimientos/requisitos-para-importar-mascotas/ingreso-de-perros-y-gatos-a-colombia",
};

const evidence = (source: string, confidence: EvidenceRef["confidence"] = "high"): EvidenceRef => ({ source, checkedAt: new Date().toISOString(), freshness: "live", confidence });
const OFFICIAL_TIMEOUT_MS = 15_000;

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFFICIAL_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 }, headers: { Accept: "text/html", "User-Agent": "Efecto-Viajero/1.0" } });
    if (!response.ok) throw new Error(`Official source HTTP ${response.status}`);
    return (await response.text()).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error(`Official source timeout after ${OFFICIAL_TIMEOUT_MS / 1000}s`);
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function executeOfficialSource(domain: ResearchDomain, context: OfficialSourceContext): Promise<OfficialSourceResult> {
  if (context.destination.countryCode.toUpperCase() !== "CO") return { status: "unavailable", data: { reason: "Todavía no existe un conector oficial específico para este país; no se sustituye por una fuente no oficial." } };
  const urls: string[] = [];
  if (domain === "requirements") urls.push(COLOMBIA_SOURCES.requirements, ...(context.travelerCounts?.pets ? [COLOMBIA_SOURCES.pets] : []));
  else if (domain === "laws") urls.push(COLOMBIA_SOURCES.laws);
  else if (domain === "emergency") urls.push(COLOMBIA_SOURCES.emergency);
  else return { status: "unavailable" };
  try {
    const pages = await Promise.all(urls.map(async (url) => ({ url, text: await fetchText(url) })));
    return { status: "ready", data: { country: "CO", domain, pages: pages.map((page) => ({ source: page.url, text: page.text.slice(0, 30000) })), note: "Texto recuperado de fuentes institucionales; la aplicación debe volver a comprobarlo antes de una decisión crítica." }, evidence: pages.map((page) => evidence(page.url)) };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Official source error" };
  }
}