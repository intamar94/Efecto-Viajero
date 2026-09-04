import { resolverLugar } from "../lugares";
import { buscarPaisPorCodigo } from "../paises";

export type DestinationType = "city" | "town" | "village" | "region" | "country" | "unknown";

export interface DestinationEvidence {
  source: string;
  url: string;
  checkedAt: string;
  confidence: "high" | "medium" | "low";
}

export interface ResolvedDestination {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  latitude: number;
  longitude: number;
  type: DestinationType;
  displayName: string;
  evidence: DestinationEvidence;
}

interface GeocodingResponse {
  results?: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
    admin1?: string;
    feature_code?: string;
  }>;
}

function classify(code?: string): DestinationType {
  if (!code) return "unknown";
  if (code.startsWith("PPLC") || code.startsWith("PPLA")) return "city";
  if (code.startsWith("PPL")) return "town";
  if (code.startsWith("ADM")) return "region";
  return "unknown";
}

// Antes de salir a la red: el diccionario local resuelve al instante los
// lugares más buscados y, sobre todo, los exónimos españoles. Open-Meteo
// indexa el nombre local, así que "Reikiavik", "Katmandú" o "Pekín" no
// siempre lo encuentran; aquí sí. Además funciona sin conexión.
//
// No sustituye a Open-Meteo: no trae coordenadas, así que solo se usa como
// respuesta rápida cuando la red falla o para no depender de ella para lo
// evidente. Lo que no esté aquí sigue yendo al geocodificador.
function resolverConDiccionario(value: string): ResolvedDestination | undefined {
  const lugar = resolverLugar(value);
  if (!lugar?.paisCodigo || lugar.fuente !== "diccionario") return undefined;
  const pais = buscarPaisPorCodigo(lugar.paisCodigo);
  if (!pais) return undefined;

  return {
    id: `dicc:${lugar.paisCodigo}:${lugar.nombre.toLowerCase()}`,
    name: lugar.nombre,
    country: pais.nombre,
    countryCode: pais.codigo,
    // Sin coordenadas verificadas no se inventan: quien las necesite
    // (clima, mapas, puntos de interés) debe pedir el geocodificador.
    latitude: Number.NaN,
    longitude: Number.NaN,
    type: lugar.tipo === "pais" ? "country" : "city",
    displayName: [lugar.nombre, pais.nombre].filter(Boolean).join(", "),
    evidence: {
      source: "Diccionario local de Efecto Viajero",
      url: "",
      checkedAt: new Date().toISOString(),
      confidence: "medium",
    },
  };
}

export async function resolveDestination(query: string, countryCode?: string): Promise<ResolvedDestination[]> {
  const value = query.trim();
  if (!value) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", value);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");
  if (countryCode) url.searchParams.set("countryCode", countryCode.toUpperCase());

  const deDiccionario = resolverConDiccionario(value);

  let data: GeocodingResponse;
  try {
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`No se pudo resolver ${value}`);
    data = (await response.json()) as GeocodingResponse;
  } catch (error) {
    // Sin red no se pierde el viaje: si el diccionario lo conoce, sirve.
    if (deDiccionario) return [deDiccionario];
    throw error;
  }

  const checkedAt = new Date().toISOString();
  const resultados: ResolvedDestination[] = (data.results ?? []).map((item) => ({
    id: `geo:${item.id}`,
    name: item.name,
    country: item.country ?? "",
    countryCode: item.country_code ?? "",
    region: item.admin1,
    latitude: item.latitude,
    longitude: item.longitude,
    type: classify(item.feature_code),
    displayName: [item.name, item.admin1, item.country].filter(Boolean).join(", "),
    evidence: {
      source: "Open-Meteo Geocoding",
      url: url.toString(),
      checkedAt,
      confidence: "high",
    },
  }));

  // El diccionario va detrás, no delante: las coordenadas del
  // geocodificador hacen falta para clima, mapas y puntos de interés. Pero
  // si el geocodificador no reconoce el exónimo español y el diccionario
  // sí, esa respuesta es mejor que ninguna.
  if (resultados.length === 0 && deDiccionario) return [deDiccionario];
  return resultados;
}
