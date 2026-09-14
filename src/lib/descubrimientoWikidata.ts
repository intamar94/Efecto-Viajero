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
export const VERSION_DESCUBRIMIENTO = 3;

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
  Q34038: { categoria: "naturaleza", detalle: "cascada" },
  Q177380: { categoria: "bienestar", detalle: "termales" },
  Q1394476: { categoria: "bienestar", detalle: "termales" },
  Q46169: { categoria: "naturaleza", detalle: "parque nacional" },
  Q179049: { categoria: "naturaleza", detalle: "reserva natural" },
  Q473972: { categoria: "naturaleza", detalle: "área protegida" },
  Q8502: { categoria: "naturaleza", detalle: "montaña" },
  Q8072: { categoria: "naturaleza", detalle: "volcán" },
  Q23397: { categoria: "naturaleza", detalle: "lago" },
  Q35509: { categoria: "naturaleza", detalle: "cueva" },
  Q40080: { categoria: "playa", detalle: "playa" },
  Q22698: { categoria: "parque", detalle: "parque" },
  Q167346: { categoria: "todos", detalle: "jardín botánico" },
  Q43501: { categoria: "todos", detalle: "zoológico" },
  Q194195: { categoria: "todos", detalle: "parque temático" },
  Q43483: { categoria: "todos", detalle: "acuario" },
  Q740326: { categoria: "todos", detalle: "parque acuático" },
  Q1501: { categoria: "todos", detalle: "piscina" },
  Q207694: { categoria: "museo", detalle: "museo de arte" },
  Q2087181: { categoria: "todos", detalle: "atracción turística" },
  Q1076486: { categoria: "aventura", detalle: "recinto deportivo" },
  Q1341387: { categoria: "bienestar", detalle: "balneario" },
  Q820477: { categoria: "aventura", detalle: "mina visitable" },
  Q204832: { categoria: "aventura", detalle: "montaña rusa" },
  Q22750: { categoria: "experiencias", detalle: "viñedo" },
  Q131734: { categoria: "experiencias", detalle: "cervecería" },
  Q330284: { categoria: "experiencias", detalle: "mercado" },
  Q33506: { categoria: "museo", detalle: "museo" },
  Q839954: { categoria: "museo", detalle: "sitio arqueológico" },
  Q4989906: { categoria: "museo", detalle: "monumento" },
  Q2977: { categoria: "museo", detalle: "catedral" },
  Q16970: { categoria: "museo", detalle: "iglesia" },
  Q24354: { categoria: "cine_teatro", detalle: "teatro" },
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
