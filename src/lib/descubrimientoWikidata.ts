// Descubrimiento de lugares reales alrededor de una ciudad usando
// Wikidata, gratis y sin clave (como Wikipedia, OpenStreetMap o
// Wikivoyage).
//
// Por qué hacía falta otra fuente: OpenStreetMap es excelente para lo que
// hay DENTRO de una ciudad (calles, parques, restaurantes), pero lo que
// de verdad lleva a alguien a una región suele estar fuera del casco
// urbano y mal etiquetado — los termales de Santa Rosa, las cascadas de
// La Florida o un parque natural cerca de Pereira. Wikidata sí conoce
// esos sitios por nombre, con sus coordenadas y su tipo, y admite buscar
// "todo lo notable en X kilómetros a la redonda", que es justo lo que
// Overpass no hace bien a esa escala.
//
// No sustituye a OpenStreetMap: lo completa. Y no inventa nada — cada
// resultado es una entidad real de Wikidata con su identificador.

import type { CategoriaActividad } from "./types";

const ENDPOINT = "https://query.wikidata.org/sparql";

// Sube cuando cambie de raíz QUÉ se pide o cómo se clasifica: una ciudad
// ya explorada con una versión anterior se vuelve a explorar en vez de
// quedarse con un resultado peor para siempre.
export const VERSION_DESCUBRIMIENTO = 6;

export interface LugarDescubierto {
  nombre: string;
  categoria: CategoriaActividad;
  detalle: string;
  lat: number;
  lon: number;
  wikidataId: string;
}

// Tipos de entidad (P31 "instancia de") que de verdad son un sitio al que
// alguien va de viaje, y en qué cajón de la interfaz cae cada uno. Se
// listan explícitamente en vez de aceptar cualquier cosa con coordenadas:
// sin este filtro entrarían empresas, calles o barrios, que no son planes.
const TIPOS: Record<string, { categoria: CategoriaActividad; detalle: string }> = {
  Q34038: { categoria: "naturaleza", detalle: "waterfall" },
  Q177380: { categoria: "bienestar", detalle: "hot springs" },
  Q1394476: { categoria: "bienestar", detalle: "hot springs" },
  Q46169: { categoria: "naturaleza", detalle: "national park" },
  Q179049: { categoria: "naturaleza", detalle: "nature reserve" },
  Q473972: { categoria: "naturaleza", detalle: "protected area" },
  Q8502: { categoria: "naturaleza", detalle: "mountain" },
  Q8072: { categoria: "naturaleza", detalle: "volcano" },
  Q23397: { categoria: "naturaleza", detalle: "lake" },
  Q35509: { categoria: "naturaleza", detalle: "cave" },
  // Naturaleza y agua que faltaba. Cada QID está comprobado contra
  // Wikidata antes de añadirlo: Q39816 es "valle", no "cañón" como
  // parecía, y ponerlo mal habría etiquetado mal cada sitio que trajera.
  Q4022: { categoria: "naturaleza", detalle: "river" },
  Q23442: { categoria: "naturaleza", detalle: "island" },
  Q39816: { categoria: "naturaleza", detalle: "valley" },
  Q44782: { categoria: "nautica", detalle: "port" },
  Q40080: { categoria: "playa", detalle: "beach" },
  Q22698: { categoria: "parque", detalle: "park" },
  Q167346: { categoria: "todos", detalle: "botanical garden" },
  Q43501: { categoria: "todos", detalle: "zoo" },
  Q194195: { categoria: "todos", detalle: "theme park" },
  Q43483: { categoria: "todos", detalle: "aquarium" },
  Q740326: { categoria: "todos", detalle: "water park" },
  Q1501: { categoria: "todos", detalle: "swimming pool" },
  Q207694: { categoria: "museo", detalle: "art museum" },
  Q2087181: { categoria: "todos", detalle: "tourist attraction" },
  Q1076486: { categoria: "aventura", detalle: "sports venue" },
  Q1341387: { categoria: "bienestar", detalle: "spa resort" },
  Q820477: { categoria: "industrial", detalle: "visitable mine" },
  Q204832: { categoria: "aventura", detalle: "roller coaster" },
  Q22750: { categoria: "experiencias", detalle: "vineyard" },
  Q131734: { categoria: "experiencias", detalle: "brewery" },
  Q330284: { categoria: "experiencias", detalle: "market" },
  Q33506: { categoria: "museo", detalle: "museum" },
  Q839954: { categoria: "museo", detalle: "archaeological site" },
  Q4989906: { categoria: "museo", detalle: "monument" },
  Q24354: { categoria: "cine_teatro", detalle: "theatre" },
  Q16970: { categoria: "espiritual", detalle: "church" },
  Q2977: { categoria: "espiritual", detalle: "cathedral" },
  Q44613: { categoria: "espiritual", detalle: "monastery" },
  Q32815: { categoria: "espiritual", detalle: "mosque" },
  Q34627: { categoria: "espiritual", detalle: "synagogue" },
  Q842402: { categoria: "espiritual", detalle: "shrine" },
  Q483110: { categoria: "eventos", detalle: "stadium" },
  Q62832: { categoria: "astronomia", detalle: "observatory" },
  Q184876: { categoria: "astronomia", detalle: "planetarium" },
  Q7075: { categoria: "ciencia", detalle: "library" },
  Q39715: { categoria: "industrial", detalle: "lighthouse" },
  Q575759: { categoria: "memoria", detalle: "memorial monument" },
  Q5003624: { categoria: "memoria", detalle: "memorial" },
  Q39614: { categoria: "memoria", detalle: "historic cemetery" },
  Q18674739: { categoria: "eventos", detalle: "events venue" },
  Q515: { categoria: "pueblos", detalle: "ciudad" },
  Q3957: { categoria: "pueblos", detalle: "pueblo" },
  Q15284: { categoria: "pueblos", detalle: "municipio" },
};

function construirConsulta(lat: number, lon: number, radioKm: number): string {
  const valores = Object.keys(TIPOS).map((q) => `wd:${q}`).join(" ");
  return `SELECT ?item ?itemLabel ?tipo ?lat ?lon WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "${radioKm}" .
    bd:serviceParam wikibase:distance ?dist .
  }
  ?item wdt:P31 ?tipo .
  VALUES ?tipo { ${valores} }
  ?item p:P625/psv:P625 ?nodo .
  ?nodo wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" . }
}
ORDER BY ?dist
LIMIT 60`;
}

interface FilaSparql {
  item?: { value?: string };
  itemLabel?: { value?: string };
  tipo?: { value?: string };
  lat?: { value?: string };
  lon?: { value?: string };
}

// Cuando Wikidata no tiene etiqueta en español ni inglés devuelve el
// propio identificador ("Q12345") como nombre: eso no es un sitio que
// alguien reconozca, así que se descarta en vez de mostrarlo.
function esIdentificadorSinNombre(nombre: string): boolean {
  return /^Q\d+$/.test(nombre);
}

export async function descubrirLugaresCercanos(lat: number, lon: number, radioKm = 30): Promise<LugarDescubierto[]> {
  try {
    const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(construirConsulta(lat, lon, radioKm))}`;
    const res = await fetch(url, {
      headers: { Accept: "application/sparql-results+json", "User-Agent": "Efecto-Viajero/1.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const filas: FilaSparql[] = data?.results?.bindings ?? [];

    const porNombre = new Map<string, LugarDescubierto>();
    for (const fila of filas) {
      const nombre = fila.itemLabel?.value?.trim();
      const uriTipo = fila.tipo?.value ?? "";
      const uriItem = fila.item?.value ?? "";
      const qidTipo = uriTipo.split("/").pop() ?? "";
      const wikidataId = uriItem.split("/").pop() ?? "";
      const tipo = TIPOS[qidTipo];
      const latitud = Number(fila.lat?.value);
      const longitud = Number(fila.lon?.value);
      if (!nombre || !tipo || !wikidataId) continue;
      if (esIdentificadorSinNombre(nombre)) continue;
      if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) continue;
      // Una misma entidad puede ser instancia de varios tipos y volver
      // repetida: se queda la primera (la consulta viene ordenada por
      // distancia, así que es la lectura más cercana).
      const clave = nombre.toLowerCase();
      if (porNombre.has(clave)) continue;
      porNombre.set(clave, { nombre, categoria: tipo.categoria, detalle: tipo.detalle, lat: latitud, lon: longitud, wikidataId });
    }
    return [...porNombre.values()];
  } catch {
    return [];
  }
}
