import type { EvidenceRef, ResearchDomain } from "./researchOrchestrator";
import type { ResolvedDestination } from "./destinationResolver";
import { buscarPaisPorCodigo } from "../paises";

export interface ProviderSignal {
  requirementId: string;
  dataType: string;
  data?: unknown;
  evidence?: EvidenceRef[];
  confidence: "high" | "medium" | "low";
  freshness: "live" | "recent" | "dated" | "unknown";
}

export interface DomainProviderContext {
  domain: ResearchDomain;
  destination: ResolvedDestination;
  start?: string;
  end?: string;
  currency?: string;
  budgetAmount?: number;
  budgetType?: string;
  travelerCounts?: { adults: number; children: number; babies: number; seniors: number; pets: number };
  query?: string;
  origin?: { latitude: number; longitude: number };
  requirementId?: string;
  dataType?: string;
  question?: string;
  dependencySignals?: ProviderSignal[];
}

export interface DomainProviderResult {
  domain: ResearchDomain;
  status: "ready" | "unavailable" | "error";
  data?: unknown;
  evidence?: EvidenceRef[];
  error?: string;
}

type Adapter = (context: DomainProviderContext) => Promise<DomainProviderResult>;

const evidence = (source: string, confidence: EvidenceRef["confidence"] = "medium"): EvidenceRef => ({ source, checkedAt: new Date().toISOString(), freshness: "live", confidence });

// Corrección local rápida: un fallo de red o un 5xx/429 en un servicio
// público gratuito (Overpass, Open-Meteo, Nominatim, OSRM...) suele ser
// pasajero. Se reintenta una vez con una pequeña espera antes de dar el
// dominio por caído — así el propio proveedor se "autocorrige" sin tener
// que escalar cada fallo transitorio al controlador central.
//
// Un servicio público gratuito a veces no falla rápido: se queda colgado
// sin responder ni devolver error. Sin un límite de tiempo por intento,
// eso bloqueaba TODO el análisis del viaje varios minutos (reportado en
// vivo por un usuario esperando "Preparando tu viaje…"). timeoutMs acota
// cada intento con AbortSignal.timeout, así un servicio caído se detecta
// y se reintenta/abandona en vez de colgar la petición entera.
async function getJson(url: string, source: string, init?: RequestInit, intentos = 2, timeoutMs = 10000) {
  let ultimoError: unknown;
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), next: { revalidate: 900 } });
      if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      ultimoError = error;
      if (intento < intentos) await new Promise((resolve) => setTimeout(resolve, 400 * intento));
    }
  }
  throw ultimoError instanceof Error ? ultimoError : new Error(`${source}: fallo de red`);
}

const poi: Record<string, string[]> = {
  // La vida nocturna (bares, pubs, discotecas) no tenía ninguna consulta
  // real detrás — la categoría existía en la interfaz pero nunca se pedía
  // nada para ella. Se suma aquí, no como dominio aparte: el reparto por
  // categoría real ya lo hace investigacion.ts a partir de la etiqueta de
  // cada sitio, no de qué dominio lo buscó.
  experiences: ["tourism=attraction", "amenity=bar", "amenity=pub", "amenity=nightclub"], culture: ["tourism=museum", "tourism=gallery", "historic"], gastronomy: ["amenity=restaurant", "amenity=cafe", "amenity=fast_food"], nature: ["leisure=park", "leisure=nature_reserve", "natural=beach", "natural=waterfall", "tourism=viewpoint"],
  accommodation: ["tourism=hotel", "tourism=hostel", "tourism=guest_house", "tourism=apartment"],
};

const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

// Radio de búsqueda: 8km cubre bien una ciudad compacta, pero en destinos
// más dispersos (islas, zonas rurales, ciudades extendidas) puede no haber
// nada etiquetado tan cerca aunque sí exista más lejos. Antes de dar el
// dominio por vacío, se reintenta una vez con un radio mucho mayor.
const RADIOS_KM = [8, 25];

const osmPoi: Adapter = async ({ destination, domain, query }) => {
  const filters = query ? [query] : poi[domain] ?? poi.experiences;
  let lastError: unknown;
  let ultimaRespuestaVacia: unknown;
  for (const radioKm of RADIOS_KM) {
    const clauses = filters.map((filter) => `nwr[${filter}](around:${radioKm * 1000},${destination.latitude},${destination.longitude});`).join("");
    const body = `[out:json][timeout:15];(${clauses});out center tags 40;`;
    // Los dos endpoints se prueban a la vez, no uno tras otro: si uno está
    // caído o muy lento, ya no dobla la espera del radio entero — solo un
    // fallo real en los DOS a la vez obliga a pasar al siguiente radio.
    const intentos = await Promise.allSettled(
      OVERPASS_ENDPOINTS.map((endpoint) =>
        getJson(endpoint, "OpenStreetMap Overpass", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json", "User-Agent": "Efecto-Viajero/1.0" }, body: new URLSearchParams({ data: body }).toString() }, 1, 12000) as Promise<{ elements?: unknown[] }>,
      ),
    );
    const conDatos = intentos.find((r) => r.status === "fulfilled" && (r.value.elements?.length ?? 0) > 0);
    if (conDatos?.status === "fulfilled") return { domain, status: "ready", data: conDatos.value, evidence: [evidence("OpenStreetMap Overpass")] };
    const vacio = intentos.find((r) => r.status === "fulfilled");
    if (vacio?.status === "fulfilled") ultimaRespuestaVacia = vacio.value;
    const fallo = intentos.find((r) => r.status === "rejected");
    if (fallo?.status === "rejected") lastError = fallo.reason;
  }
  // Si al menos una consulta respondió sin error (aunque vacía), no es un
  // fallo del proveedor — de verdad no hay nada etiquetado cerca ni lejos.
  // Se devuelve esa respuesta honestamente vacía en vez de fingir un error.
  if (ultimaRespuestaVacia !== undefined) return { domain, status: "ready", data: ultimaRespuestaVacia, evidence: [evidence("OpenStreetMap Overpass")] };
  throw lastError instanceof Error ? lastError : new Error("OpenStreetMap Overpass: provider unavailable");
};

const weather: Adapter = async ({ destination, start, end }) => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(destination.latitude)); url.searchParams.set("longitude", String(destination.longitude)); url.searchParams.set("current", "temperature_2m,precipitation,weather_code,wind_speed_10m"); url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code"); url.searchParams.set("timezone", "auto");
  if (start) url.searchParams.set("start_date", start); if (end) url.searchParams.set("end_date", end);
  const data = await getJson(url.toString(), "Open-Meteo Forecast");
  return { domain: "weather", status: "ready", data, evidence: [evidence("Open-Meteo Forecast", "high")] };
};

const map: Adapter = async ({ destination }) => {
  const data = await getJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${destination.latitude}&lon=${destination.longitude}`, "OpenStreetMap Nominatim", { headers: { "User-Agent": "Efecto-Viajero/1.0" } });
  return { domain: "map", status: "ready", data, evidence: [evidence("OpenStreetMap Nominatim")] };
};

const route: Adapter = async ({ destination, origin, dependencySignals }) => {
  const upstream = dependencySignals?.map((signal) => ({ requirementId: signal.requirementId, dataType: signal.dataType, data: signal.data })) ?? [];
  if (!origin) return { domain: "transport", status: "unavailable", data: { reason: "Se necesita origen y destino para calcular una ruta.", upstream } };
  const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const data = await getJson(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=true`, "OSRM");
  return { domain: "transport", status: "ready", data: { route: data, upstream }, evidence: [evidence("OSRM")] };
};

const currency: Adapter = async ({ currency: base, destination, dependencySignals }) => {
  if (!base) return { domain: "currency", status: "unavailable", data: { reason: "No se indicó moneda base.", upstream: dependencySignals } };
  const data = await getJson(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`, "Frankfurter");
  return { domain: "currency", status: "ready", data: { destination, rates: data, upstream: dependencySignals }, evidence: [evidence("Frankfurter")] };
};

/** Native decision capability: converts the user's budget into an explicit planning envelope. It never pretends these are market prices. */
const budget: Adapter = async ({ destination, currency: base, budgetAmount, budgetType, travelerCounts, dependencySignals }) => {
  if (!budgetAmount || budgetAmount <= 0) return { domain: "budget", status: "unavailable", data: { reason: "Falta un presupuesto total positivo." } };
  const people = (travelerCounts?.adults ?? 0) + (travelerCounts?.children ?? 0) + (travelerCounts?.babies ?? 0) + (travelerCounts?.seniors ?? 0);
  const allocation = { transport: 0.30, accommodation: 0.35, food: 0.15, activities: 0.10, contingency: 0.10 };
  const envelope = Object.fromEntries(Object.entries(allocation).map(([key, ratio]) => [key, Math.round(budgetAmount * ratio * 100) / 100]));
  return { domain: "budget", status: "ready", data: { destination, currency: base ?? "EUR", total: budgetAmount, type: budgetType ?? "total", travelers: people, allocation: envelope, methodology: "planning-envelope", dependencySignals }, evidence: [evidence("Efecto Viajero Budget Engine", "medium")] };
};

/** Native ledger capability: aggregates explicit numeric amounts found in upstream provider signals. */
const expenses: Adapter = async ({ destination, currency: base, dependencySignals }) => {
  const items = (dependencySignals ?? []).flatMap((signal) => {
    const data = signal.data as Record<string, unknown> | undefined;
    const candidates = [data?.cost, data?.price, data?.amount].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return candidates.map((amount) => ({ requirementId: signal.requirementId, dataType: signal.dataType, amount }));
  });
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  return { domain: "expenses", status: "ready", data: { destination, currency: base ?? "EUR", items, total, coverage: items.length ? "partial-from-observed-data" : "no-observed-costs" }, evidence: [evidence("Efecto Viajero Expense Ledger", "medium")] };
};

/** Native offline planner: creates a deterministic manifest from the facts already available to the brain. */
const offline: Adapter = async ({ destination, dependencySignals }) => {
  const required = ["traveler_documents", "emergency_info", "transport", "accommodation", "offline_map", "weather", "currency"];
  const available = new Set((dependencySignals ?? []).map((signal) => signal.dataType));
  const bundle = required.map((item) => ({ item, status: available.has(item) ? "ready" : "pending" }));
  return { domain: "offline", status: "ready", data: { destination, bundle, readyCount: bundle.filter((item) => item.status === "ready").length, total: bundle.length, policy: "never fabricate missing offline content" }, evidence: [evidence("Efecto Viajero Offline Planner", "medium")] };
};

// Estos dos dominios tenían dato real en la app desde hace tiempo
// (paises.ts: bloques regionales, número de emergencias, autoridad) pero
// nunca se conectó aquí — así que el cerebro los reportaba "unavailable"
// siempre, para cualquier destino, en vez de usar lo que ya sabíamos.
// Nota de honestidad: esto es el requisito/emergencia a nivel de PAÍS, no
// por viajero concreto (eso vive en requisitos.ts, que sí conoce
// nacionalidad y documentos reales de cada persona una vez añadida al viaje).
const requirementsProvider: Adapter = async ({ destination }) => {
  const pais = buscarPaisPorCodigo(destination.countryCode);
  if (!pais) return { domain: "requirements", status: "unavailable", data: { reason: "País de destino no reconocido todavía." } };
  return {
    domain: "requirements",
    status: "ready",
    data: { pais: pais.nombre, bloques: pais.bloques ?? [], nota: "El requisito exacto depende de la nacionalidad de cada viajero: ver detalle por persona en Requisitos del viaje." },
    evidence: [evidence("Efecto Viajero — datos de país", "high")],
  };
};

const emergencyProvider: Adapter = async ({ destination }) => {
  const pais = buscarPaisPorCodigo(destination.countryCode);
  if (!pais?.emergencias) return { domain: "emergency", status: "unavailable", data: { reason: "Número de emergencias no confirmado con certeza para este país." } };
  return {
    domain: "emergency",
    status: "ready",
    data: { pais: pais.nombre, emergencias: pais.emergencias, telefonoTurista: pais.telefonoTurista, autoridad: pais.autoridad },
    evidence: [evidence("Efecto Viajero — datos de país", "high")],
  };
};

const adapters: Partial<Record<ResearchDomain, Adapter>> = { experiences: osmPoi, culture: osmPoi, gastronomy: osmPoi, nature: osmPoi, accommodation: osmPoi, weather, map, transport: route, currency, budget, expenses, offline, requirements: requirementsProvider, emergency: emergencyProvider };

// Cada dominio tiene varias "preguntas" internas (reverseEngineeringOrchestrator.ts
// las encadena en secuencia, una tras otra), pero executeDomainProvider despacha
// SOLO por dominio+destino: "experiences" por sí solo tiene 11 preguntas
// (activities, schedule, duration, group_fit, children_fit...) y las 11
// disparaban, una detrás de otra, la MISMA búsqueda real en Overpass para el
// mismo destino. Eso multiplicaba por hasta 11 el peor caso de espera de un
// solo dominio — la causa real detrás de "se queda cargando" varios minutos,
// no solo llamadas de red sin límite de tiempo (ya acotadas en getJson).
// Se cachea por (dominio, destino, parámetros que sí cambian el resultado)
// solo para los proveedores que consultan una fuente externa real y estable
// durante todo el análisis: la primera pregunta paga el coste de red, el
// resto de preguntas del mismo dominio reutilizan la misma respuesta.
// budget/expenses/requirements/emergency quedan fuera: son cálculo local o
// dependen de señales que sí cambian entre preguntas del mismo dominio.
const DOMINIOS_CACHEABLES = new Set<ResearchDomain>(["experiences", "culture", "gastronomy", "nature", "accommodation", "weather", "map", "transport", "currency"]);
const TTL_CACHE_MS = 10 * 60 * 1000;
const cacheProveedor = new Map<string, { expira: number; promesa: Promise<DomainProviderResult> }>();

function claveCache(domain: ResearchDomain, context: Omit<DomainProviderContext, "domain">): string {
  const destino = context.destination ? `${context.destination.latitude},${context.destination.longitude}` : "";
  const origen = context.origin ? `${context.origin.latitude},${context.origin.longitude}` : "";
  return [domain, destino, origen, context.query ?? "", context.currency ?? ""].join("|");
}

export async function executeDomainProvider(domain: ResearchDomain, context: Omit<DomainProviderContext, "domain">): Promise<DomainProviderResult> {
  const adapter = adapters[domain];
  if (!adapter) return { domain, status: "unavailable", data: { reason: "Este dominio requiere un conector especializado antes de poder ofrecer datos factuales." } };

  const cacheable = DOMINIOS_CACHEABLES.has(domain);
  const clave = cacheable ? claveCache(domain, context) : "";
  if (cacheable) {
    const enCache = cacheProveedor.get(clave);
    if (enCache && enCache.expira > Date.now()) return enCache.promesa;
  }

  const promesa = (async (): Promise<DomainProviderResult> => {
    try { return await adapter({ ...context, domain }); }
    catch (error) { return { domain, status: "error" as const, error: error instanceof Error ? error.message : "Provider error" }; }
  })();

  if (cacheable) cacheProveedor.set(clave, { expira: Date.now() + TTL_CACHE_MS, promesa });
  return promesa;
}
