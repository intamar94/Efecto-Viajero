// Aeropuerto(s) reales más cercanos al destino, vía OpenStreetMap
// Overpass — gratuito, sin clave. No hay tarifas ni horarios de vuelos
// reales sin una API de pago (ver afiliados.ts), pero saber a qué
// aeropuerto real hay que llegar SÍ es un dato concreto y verificable
// que se puede dar gratis, en vez de solo un cuadro de enlaces genéricos.
export interface AeropuertoCercano {
  nombre: string;
  iata?: string;
  distanciaKm: number;
  lat: number;
  lon: number;
}

const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

interface ElementoOverpass {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: { name?: string; iata?: string };
}

function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Solo aeropuertos con código IATA: descarta pistas privadas o de uso
// agrícola que también llevan aeroway=aerodrome en OSM pero a las que
// ningún vuelo comercial llega.
async function consultarEndpoint(endpoint: string, body: string): Promise<{ elements?: ElementoOverpass[] } | undefined> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json", "User-Agent": "Efecto-Viajero/1.0" },
      body: new URLSearchParams({ data: body }).toString(),
      // Sin límite de tiempo, un endpoint colgado (no un error, solo lento)
      // dejaba "Buscando el aeropuerto más cercano…" esperando indefinidamente.
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return undefined;
    return (await response.json()) as { elements?: ElementoOverpass[] };
  } catch {
    return undefined;
  }
}

export async function aeropuertosCercanos(lat: number, lon: number, radioKm = 150): Promise<AeropuertoCercano[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
  const body = `[out:json][timeout:15];(nwr[aeroway=aerodrome][iata](around:${radioKm * 1000},${lat},${lon}););out center tags 15;`;
  // Los dos endpoints en paralelo: si uno está caído o lento, no dobla la
  // espera — se usa el primero que responda con datos.
  const resultados = await Promise.all(OVERPASS_ENDPOINTS.map((endpoint) => consultarEndpoint(endpoint, body)));
  const data = resultados.find((r) => r !== undefined);
  if (!data) return [];
  const aeropuertos: AeropuertoCercano[] = [];
  for (const el of data.elements ?? []) {
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (elLat === undefined || elLon === undefined) continue;
    aeropuertos.push({ nombre: el.tags?.name ?? "Aeropuerto", iata: el.tags?.iata, lat: elLat, lon: elLon, distanciaKm: distanciaKm(lat, lon, elLat, elLon) });
  }
  aeropuertos.sort((a, b) => a.distanciaKm - b.distanciaKm);
  return aeropuertos.slice(0, 3);
}
