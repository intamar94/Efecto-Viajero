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
  // Tiendas reales (regalos, artesanía, arte, delicatessen) tampoco tenían
  // ninguna consulta real detrás — "Qué comprar" dependía solo de un
  // catálogo genérico por país. Se suman aquí por el mismo motivo que la
  // vida nocturna: categoriaDeTags (investigacion.ts) ya sabe convertir
  // shop=* en "compras" a partir de la propia etiqueta.
  // Termales y parques temáticos/acuáticos no tenían ninguna etiqueta de
  // OpenStreetMap en la lista — no es que se buscaran y no hubiera nada,
  // es que nunca se pedían: la consulta a Overpass ni siquiera preguntaba
  // por ellos. Sitios reales y muy típicos de ciertas zonas (los
  // termales del eje cafetero colombiano, por ejemplo) quedaban
  // invisibles sin importar qué tan cerca estuvieran.
  // "Experiencias" era solo atracciones, bares y tiendas de souvenirs.
  // Todo lo que de verdad se hace en un destino de naturaleza —
  // parapente, rafting, canopy, escalada, buceo, cabalgatas — no se
  // buscaba en ninguna parte, así que para la app no existía. Igual los
  // termales/spa y los planes con niños (acuario, granja, parque de
  // atracciones). Se busca todo eso explícitamente.
  experiences: [
    "tourism=attraction", "amenity=bar", "amenity=pub", "amenity=nightclub", "amenity=biergarten",
    "shop=gift", "shop=souvenir", "shop=craft", "shop=art", "shop=deli",
    // Aventura y deporte
    "sport=climbing", "sport=paragliding", "sport=hang_gliding", "sport=rafting", "sport=canyoning",
    "sport=surfing", "sport=scuba_diving", "sport=kitesurfing", "sport=canoe", "sport=cycling",
    "sport=horse_riding", "leisure=horse_riding", "aerialway=zip_line", "attraction=zip_line",
    "leisure=climbing_adventure", "leisure=sports_centre",
    // Bienestar
    "leisure=spa", "amenity=spa", "leisure=sauna", "amenity=public_bath",
    // Planes para todos: acuario, zoo, parque temático, piscina, jardín
    // botánico, bolos, patinaje... cosas que hace la familia entera, sin
    // límite de edad. Faltaban casi todas, y son las que más gente puede
    // disfrutar junta.
    "tourism=aquarium", "attraction=animal", "attraction=amusement_ride", "leisure=amusement_arcade",
    "tourism=farm", "attraction=big_wheel", "leisure=swimming_pool", "leisure=swimming_area",
    "leisure=bowling_alley", "leisure=ice_rink", "leisure=miniature_golf", "amenity=planetarium",
    "leisure=beach_resort", "garden:type=botanical",
    // Experiencias locales
    "tourism=winery", "craft=brewery", "craft=distillery", "amenity=marketplace", "tourism=artwork",
    // Aventura que faltaba: cuevas, cuatrimotos, puenting, globo, esquí
    "sport=caving", "sport=quad", "sport=bungee_jumping", "sport=ballooning", "sport=skiing",
    "sport=free_flying", "tourism=wilderness_hut",
    // Eventos: dónde pasan conciertos, ferias y partidos
    "amenity=events_venue", "amenity=conference_centre", "leisure=stadium", "amenity=theatre",
    // Espiritual y religioso
    "amenity=place_of_worship", "amenity=monastery", "historic=wayside_shrine", "historic=monastery",
    // Fauna: dónde se ve de verdad
    "leisure=bird_hide", "tourism=wildlife_hide",
    // Intereses de nicho: mucha gente viaja persiguiendo algo suyo
    // (auroras, bibliotecas, murales, faros) y eso no lo ofrece ninguna
    // app de viajes.
    "man_made=telescope", "amenity=library", "amenity=archive",
    "artwork_type=mural", "artwork_type=graffiti", "artwork_type=street_art",
    "historic=memorial", "historic=battlefield", "historic=tomb",
    "man_made=lighthouse", "historic=mine", "historic=mine_shaft", "attraction=train",
    "man_made=watermill", "man_made=windmill",
  ],
  culture: ["tourism=museum", "tourism=gallery", "historic"], gastronomy: ["amenity=restaurant", "amenity=cafe", "amenity=fast_food"],   // Una cascada se etiqueta como waterway=waterfall tanto o más que como
  // natural=waterfall, y acampar, un parque natural o un jardín botánico
  // no estaban en la lista en absoluto: en Pereira eso dejaba fuera La
  // Florida, los termales y el camping, y "naturaleza" se llenaba de
  // parques de barrio del centro por pura falta de candidatos reales.
  // El agua y el monte eran justo lo que no se buscaba. Quien tiene la
  // pesca o los botes como hobby no encontraba NADA: ni un embarcadero,
  // ni un alquiler, ni una marina. Y "senderismo" se reducía a que
  // apareciera un parque — las rutas señalizadas de OSM (relaciones
  // route=hiking, con su dificultad y sus kilómetros) no se consultaban
  // en absoluto, ni los refugios de montaña donde esas rutas paran.
  nature: [
    "leisure=park", "leisure=nature_reserve", "natural=beach", "natural=waterfall", "waterway=waterfall",
    "tourism=viewpoint", "natural=hot_spring", "natural=spring", "natural=peak", "natural=cave_entrance",
    "tourism=theme_park", "leisure=water_park", "tourism=camp_site", "tourism=picnic_site", "tourism=zoo",
    "leisure=garden", "boundary=national_park",
    // Senderismo de verdad: la ruta señalizada, el refugio y la montaña
    "route=hiking", "route=foot", "tourism=alpine_hut", "tourism=wilderness_hut",
    "natural=glacier", "natural=cliff", "natural=volcano", "natural=geyser", "natural=arch",
    "boundary=protected_area", "natural=bay",
    // Agua: alquilar un bote, salir a pescar, un muelle donde embarcar
    "amenity=boat_rental", "amenity=boat_sharing", "leisure=marina", "leisure=slipway",
    "leisure=fishing", "sport=fishing", "sport=sailing", "sport=rowing", "man_made=pier",
    // La casa flotante SÍ tiene etiqueta propia en OSM: houseboat_rental
    // sobre el alquiler, o "houseboat" entre los tipos de rental=.
    "houseboat_rental=yes", "rental=boat", "boat:rental", "shop=boat",
  ],
  accommodation: ["tourism=hotel", "tourism=hostel", "tourism=guest_house", "tourism=apartment"],
};

const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

// Radio de búsqueda: 8km cubre bien una ciudad compacta, pero en destinos
// más dispersos (islas, zonas rurales, ciudades extendidas, o simplemente
// una ciudad con poco etiquetado en su propio centro) puede no haber
// mucho tan cerca aunque sí exista más lejos — los termales de un pueblo
// vecino, por ejemplo.
const RADIOS_KM = [8, 25];

interface ElementoOverpassCrudo {
  type?: string;
  id?: number;
  [clave: string]: unknown;
}

// Antes, en cuanto el radio más chico (8km) devolvía CUALQUIER resultado
// (aunque fuera uno o dos), se daba el dominio por resuelto y el radio
// grande (25km) nunca se llegaba a probar — así un centro con poco
// etiquetado se quedaba para siempre con esos 1-2 resultados, aunque a
// 20km (un pueblo vecino con termales, cascadas, restaurantes...)
// hubiera muchísimo más. Ahora se consultan TODOS los radios y se
// combinan los elementos (deduplicados por id real de OSM: el mismo
// sitio puede aparecer en el radio chico Y en el grande) antes de
// devolver el resultado — el radio grande solo se salta si el chico ya
// costó una consulta completa a los dos endpoints y AMBOS fallaron
// (entonces tampoco tiene sentido gastar otra consulta más amplia).
const osmPoi: Adapter = async ({ destination, domain, query }) => {
  const filters = query ? [query] : poi[domain] ?? poi.experiences;
  let lastError: unknown;
  let huboRespuestaValida = false;
  const elementosPorId = new Map<string, ElementoOverpassCrudo>();

  for (const radioKm of RADIOS_KM) {
    const clauses = filters.map((filter) => `nwr[${filter}](around:${radioKm * 1000},${destination.latitude},${destination.longitude});`).join("");
    // El tope de 40 elementos por consulta era el techo real de toda la
    // búsqueda: con 90 etiquetas distintas y un cupo de 8 por categoría,
    // Overpass cortaba mucho antes de que hubiera candidatos para llenar
    // las cajas — daba igual cuántas fuentes o etiquetas se añadieran.
    const body = `[out:json][timeout:15];(${clauses});out center tags 150;`;
    // Los dos endpoints se prueban a la vez, no uno tras otro: si uno está
    // caído o muy lento, ya no dobla la espera del radio entero — solo un
    // fallo real en los DOS a la vez cuenta como fallo de este radio.
    const intentos = await Promise.allSettled(
      OVERPASS_ENDPOINTS.map((endpoint) =>
        getJson(endpoint, "OpenStreetMap Overpass", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json", "User-Agent": "Efecto-Viajero/1.0" }, body: new URLSearchParams({ data: body }).toString() }, 1, 18000) as Promise<{ elements?: ElementoOverpassCrudo[] }>,
      ),
    );
    // Entre los dos endpoints de este radio, se prefiere el que sí trajo
    // datos (uno puede tener un índice más completo que el otro).
    const conDatos = intentos.find((r) => r.status === "fulfilled" && (r.value.elements?.length ?? 0) > 0);
    const exitoso = conDatos ?? intentos.find((r) => r.status === "fulfilled");
    if (exitoso?.status === "fulfilled") {
      huboRespuestaValida = true;
      for (const el of exitoso.value.elements ?? []) {
        const clave = el.type && el.id !== undefined ? `${el.type}${el.id}` : JSON.stringify(el);
        elementosPorId.set(clave, el);
      }
    }
    const fallo = intentos.find((r) => r.status === "rejected");
    if (fallo?.status === "rejected") lastError = fallo.reason;
  }

  // Si al menos una consulta respondió sin error (aunque vacía), no es un
  // fallo del proveedor — de verdad no hay nada etiquetado en ningún
  // radio. Se devuelve esa respuesta honestamente vacía en vez de fingir
  // un error.
  if (huboRespuestaValida) return { domain, status: "ready", data: { elements: [...elementosPorId.values()] }, evidence: [evidence("OpenStreetMap Overpass")] };
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
