// Paradas y líneas reales de transporte público cerca de un punto, vía
// OpenStreetMap Overpass — gratis, sin clave. No hay horarios ni tarifas
// en tiempo real sin una API de pago (Google Directions Transit,
// Citymapper), pero saber qué paradas y qué líneas existen de verdad
// cerca del destino es un dato concreto que sí podemos dar gratis, en vez
// de dejar la sección vacía cuando la ciudad no está en el catálogo
// curado a mano.

export interface ParadaTransporte {
  nombre: string;
  tipo: "bus" | "tranvia" | "metro" | "tren" | "otro";
  lat: number;
  lon: number;
}

export interface LineaTransporte {
  nombre: string;
  tipo: "bus" | "tranvia" | "metro" | "tren" | "otro";
}

export interface TransportePublicoCercano {
  paradas: ParadaTransporte[];
  lineas: LineaTransporte[];
}

const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const MAX_ITEMS = 8;

interface ElementoOverpass {
  type?: string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

function tipoDeTags(tags: Record<string, string> = {}): ParadaTransporte["tipo"] {
  if (tags.railway === "subway_entrance" || tags.station === "subway") return "metro";
  if (tags.railway === "tram_stop") return "tranvia";
  if (tags.railway === "station" || tags.railway === "halt") return "tren";
  if (tags.highway === "bus_stop" || tags.amenity === "bus_station") return "bus";
  if (tags.route === "tram") return "tranvia";
  if (tags.route === "subway") return "metro";
  if (tags.route === "train" || tags.route === "light_rail") return "tren";
  if (tags.route === "bus" || tags.route === "trolleybus") return "bus";
  return "otro";
}

async function consultarEndpoint(endpoint: string, body: string): Promise<{ elements?: ElementoOverpass[] } | undefined> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json", "User-Agent": "Efecto-Viajero/1.0" },
      body: new URLSearchParams({ data: body }).toString(),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return undefined;
    return (await response.json()) as { elements?: ElementoOverpass[] };
  } catch {
    return undefined;
  }
}

export async function transportePublicoCercano(lat: number, lon: number, radioKm = 1.5): Promise<TransportePublicoCercano> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { paradas: [], lineas: [] };
  const radio = radioKm * 1000;
  const body = `[out:json][timeout:15];(
    nwr[highway=bus_stop](around:${radio},${lat},${lon});
    nwr[railway=tram_stop](around:${radio},${lat},${lon});
    nwr[railway=station](around:${radio},${lat},${lon});
    nwr[station=subway](around:${radio},${lat},${lon});
    relation[route~"^(bus|tram|subway|trolleybus|light_rail)$"](around:${radio},${lat},${lon});
  );out center tags ${MAX_ITEMS * 4};`;

  const resultados = await Promise.all(OVERPASS_ENDPOINTS.map((endpoint) => consultarEndpoint(endpoint, body)));
  const data = resultados.find((r) => r !== undefined);
  if (!data) return { paradas: [], lineas: [] };

  const paradasVistas = new Set<string>();
  const lineasVistas = new Set<string>();
  const paradas: ParadaTransporte[] = [];
  const lineas: LineaTransporte[] = [];

  for (const el of data.elements ?? []) {
    const tags = el.tags ?? {};
    if (el.type === "relation") {
      // Una línea real (número o nombre): "16", "Línea M1"...
      const nombreLinea = tags.ref ?? tags.name;
      if (!nombreLinea || lineasVistas.has(nombreLinea)) continue;
      lineasVistas.add(nombreLinea);
      lineas.push({ nombre: nombreLinea, tipo: tipoDeTags(tags) });
      if (lineas.length >= MAX_ITEMS) continue;
      continue;
    }
    const nombre = tags.name?.trim();
    const lat2 = el.lat ?? el.center?.lat;
    const lon2 = el.lon ?? el.center?.lon;
    if (!nombre || lat2 === undefined || lon2 === undefined || paradasVistas.has(nombre.toLowerCase())) continue;
    if (paradas.length >= MAX_ITEMS) continue;
    paradasVistas.add(nombre.toLowerCase());
    paradas.push({ nombre, tipo: tipoDeTags(tags), lat: lat2, lon: lon2 });
  }

  return { paradas, lineas };
}
