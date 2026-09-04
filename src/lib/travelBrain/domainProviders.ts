import type { EvidenceRef, ResearchDomain } from "./researchOrchestrator";
import type { ResolvedDestination } from "./destinationResolver";

export interface DomainProviderContext {
  domain: ResearchDomain;
  destination: ResolvedDestination;
  start?: string;
  end?: string;
  currency?: string;
  query?: string;
  origin?: { latitude: number; longitude: number };
}

export interface DomainProviderResult {
  domain: ResearchDomain;
  status: "ready" | "unavailable" | "error";
  data?: unknown;
  evidence?: EvidenceRef[];
  error?: string;
}

type Adapter = (context: DomainProviderContext) => Promise<DomainProviderResult>;

const evidence = (source: string, confidence: EvidenceRef["confidence"] = "medium"): EvidenceRef => ({
  source,
  checkedAt: new Date().toISOString(),
  freshness: "live",
  confidence,
});

async function getJson(url: string, source: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
  return response.json();
}

const poi: Record<string, string[]> = {
  experiences: ["tourism=attraction"],
  culture: ["tourism=museum", "tourism=gallery", "historic"],
  gastronomy: ["amenity=restaurant", "amenity=cafe", "amenity=fast_food"],
  nature: ["leisure=park", "leisure=nature_reserve", "natural=beach", "natural=waterfall", "tourism=viewpoint"],
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const osmPoi: Adapter = async ({ destination, domain, query }) => {
  const filters = query ? [query] : poi[domain] ?? poi.experiences;
  const clauses = filters
    .map((filter) => `nwr[${filter}](around:8000,${destination.latitude},${destination.longitude});`)
    .join("");
  const body = `[out:json][timeout:15];(${clauses});out center tags 40;`;
  let lastError: unknown;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const data = await getJson(
        endpoint,
        "OpenStreetMap Overpass",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Accept: "application/json",
            "User-Agent": "Efecto-Viajero/1.0",
          },
          body: new URLSearchParams({ data: body }).toString(),
        },
      );
      return { domain, status: "ready", data, evidence: [evidence("OpenStreetMap Overpass")] };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("OpenStreetMap Overpass: provider unavailable");
};

const weather: Adapter = async ({ destination, start, end }) => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(destination.latitude));
  url.searchParams.set("longitude", String(destination.longitude));
  url.searchParams.set("current", "temperature_2m,precipitation,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code");
  url.searchParams.set("timezone", "auto");
  if (start) url.searchParams.set("start_date", start);
  if (end) url.searchParams.set("end_date", end);
  const data = await getJson(url.toString(), "Open-Meteo Forecast");
  return { domain: "weather", status: "ready", data, evidence: [evidence("Open-Meteo Forecast", "high")] };
};

const map: Adapter = async ({ destination }) => {
  const data = await getJson(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${destination.latitude}&lon=${destination.longitude}`,
    "OpenStreetMap Nominatim",
    { headers: { "User-Agent": "Efecto-Viajero/1.0" } },
  );
  return { domain: "map", status: "ready", data, evidence: [evidence("OpenStreetMap Nominatim")] };
};

const route: Adapter = async ({ destination, origin }) => {
  if (!origin) {
    return {
      domain: "transport",
      status: "unavailable",
      data: { reason: "Se necesita origen y destino para calcular una ruta." },
    };
  }
  const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const data = await getJson(
    `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=true`,
    "OSRM",
  );
  return { domain: "transport", status: "ready", data, evidence: [evidence("OSRM")] };
};

const currency: Adapter = async ({ currency: base, destination }) => {
  if (!base) {
    return {
      domain: "currency",
      status: "unavailable",
      data: { reason: "No se indicó moneda base." },
    };
  }
  const data = await getJson(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`,
    "Frankfurter",
  );
  return { domain: "currency", status: "ready", data: { destination, ...data }, evidence: [evidence("Frankfurter")] };
};

const adapters: Partial<Record<ResearchDomain, Adapter>> = {
  experiences: osmPoi,
  culture: osmPoi,
  gastronomy: osmPoi,
  nature: osmPoi,
  weather,
  map,
  transport: route,
  currency,
};

export async function executeDomainProvider(
  domain: ResearchDomain,
  context: Omit<DomainProviderContext, "domain">,
): Promise<DomainProviderResult> {
  const adapter = adapters[domain];
  if (!adapter) {
    return {
      domain,
      status: "unavailable",
      data: { reason: "Este dominio requiere un conector especializado antes de poder ofrecer datos factuales." },
    };
  }
  try {
    return await adapter({ ...context, domain });
  } catch (error) {
    return { domain, status: "error", error: error instanceof Error ? error.message : "Provider error" };
  }
}
