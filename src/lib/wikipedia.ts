// Wikipedia: gratis, sin clave. Se usa para dar contexto real y breve
// sobre un lugar — historia, datos curiosos — en vez de dejar la pantalla
// solo con botones y enlaces, o inventar "leyendas" que no podemos
// verificar.

import { geosearchWiki, mejorCoincidenciaPorNombre } from "./wikiGeosearch";
export interface ResumenWikipedia {
  titulo: string;
  extracto: string;
  url: string;
}

const LARGO_POR_DEFECTO = 200;

// Un dato con año explícito entre paréntesis ("67 650 habitantes (2011)")
// es casi siempre una cifra censal que ya está desactualizada — no
// podemos actualizarla sin inventar un número, así que la frase entera se
// evita en vez de mostrar una estadística vieja como si fuera reciente.
function tieneCifraDesactualizada(frase: string): boolean {
  return /\(\s*\d{4}\s*\)/.test(frase);
}

// El extracto completo de Wikipedia suele ser el párrafo introductorio
// entero (varias frases, a veces con datos administrativos que a nadie le
// interesa leer antes de un viaje). Se recorta a las primeras frases que
// quepan en el largo pedido — pero SIEMPRE frases completas: cortar a
// media palabra deja un texto que se siente roto ("...que sirve para…"),
// así que si ni la primera frase entra en el largo pedido, se muestra
// completa de todas formas antes que dejarla a medias.
function acortar(texto: string, maxCaracteres: number): string {
  const todas = (texto.match(/[^.]+\.+\s*/g) ?? [texto]).map((f) => f.trim()).filter(Boolean);
  const frases = todas.filter((f) => !tieneCifraDesactualizada(f));
  const candidatas = frases.length > 0 ? frases : todas;
  let resultado = candidatas[0] ?? texto;
  for (let i = 1; i < candidatas.length; i++) {
    if (`${resultado} ${candidatas[i]}`.length > maxCaracteres) break;
    resultado += ` ${candidatas[i]}`;
  }
  return resultado;
}

interface ArticuloWikipedia { titulo: string; extractoCompleto: string; url: string }

// Se cachea por (término, contexto, idioma): dos lugares con el mismo
// nombre pero distinto contexto (país) no deben compartir caché.
const cache = new Map<string, ArticuloWikipedia | null>();

// La API de resumen de Wikipedia busca por TÍTULO EXACTO, no por
// relevancia: pedir el resumen de "Faro" a secas devuelve el artículo
// sobre el concepto (la torre de señalización), no la ciudad portuguesa,
// porque ese es el título exacto que existe con ese nombre. Se busca
// primero con la API de búsqueda (que sí rankea por relevancia) para
// encontrar el título real del artículo — sumando el país como contexto
// cuando se conoce, que es justo lo que más ayuda a desambiguar un lugar
// de un sustantivo común.
async function buscarTitulo(termino: string, idioma: "es" | "en"): Promise<string | null> {
  const url = `https://${idioma}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(termino)}&format=json&origin=*&srlimit=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    const titulo = data?.query?.search?.[0]?.title;
    return typeof titulo === "string" ? titulo : null;
  } catch {
    return null;
  }
}

async function obtenerResumenDeTitulo(titulo: string, idioma: "es" | "en"): Promise<ArticuloWikipedia | null> {
  try {
    const res = await fetch(`https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === "disambiguation" || !data.extract || data.extract_html?.includes("puede referirse a")) return null;
    return {
      titulo: data.title as string,
      extractoCompleto: data.extract as string,
      url: (data.content_urls?.desktop?.page as string | undefined) ?? `https://${idioma}.wikipedia.org/wiki/${encodeURIComponent(titulo)}`,
    };
  } catch {
    return null;
  }
}

export interface Coordenadas {
  lat: number;
  lon: number;
}

async function buscarResumen(termino: string, idioma: "es" | "en", contexto?: string, coords?: Coordenadas): Promise<ArticuloWikipedia | null> {
  // Si ya sabemos dónde está el lugar (coordenadas reales, no adivinadas),
  // se pregunta primero qué artículo hay geolocalizado justo ahí — sin
  // depender de si el nombre es ambiguo en algún idioma o país. Solo se
  // acepta un resultado geolocalizado si de verdad coincide de nombre
  // (ver mejorCoincidenciaPorNombre): el más cercano sin más podría ser
  // cualquier otra cosa geoetiquetada cerca, no el lugar que buscamos.
  let titulo: string | null = null;
  if (coords) {
    const cercanos = await geosearchWiki(`${idioma}.wikipedia.org`, coords.lat, coords.lon, 300, 10);
    titulo = mejorCoincidenciaPorNombre(cercanos, termino) ?? null;
  }
  if (!titulo) {
    const consulta = contexto ? `${termino} ${contexto}` : termino;
    titulo = (await buscarTitulo(consulta, idioma)) ?? (contexto ? await buscarTitulo(termino, idioma) : null);
  }
  if (!titulo) return null;
  return obtenerResumenDeTitulo(titulo, idioma);
}

// Prueba primero en español (el idioma de la app); si no hay artículo,
// cae a inglés antes de rendirse — mejor un resumen real en otro idioma
// que ningún dato, y se lo dejamos claro al usuario en el origen mostrado.
// `contexto` (p. ej. el país) ayuda a desambiguar nombres que coinciden
// con una palabra común ("Faro", "Sucre", "Mérida"...) cuando no hay
// coordenadas; `coords`, cuando se conocen, es la desambiguación más
// fiable de todas — no depende de adivinar el nombre correcto en ningún
// idioma ni país, funciona igual en cualquier lugar del mundo.
export async function obtenerResumenLugar(nombre: string, maxCaracteres: number = LARGO_POR_DEFECTO, contexto?: string, coords?: Coordenadas): Promise<ResumenWikipedia | null> {
  const clave = `${nombre.trim().toLowerCase()}|${(contexto ?? "").trim().toLowerCase()}`;
  let completo = cache.get(clave);
  if (completo === undefined) {
    completo = (await buscarResumen(nombre, "es", contexto, coords)) ?? (await buscarResumen(nombre, "en", contexto, coords));
    cache.set(clave, completo);
  }
  if (!completo) return null;
  return { titulo: completo.titulo, extracto: acortar(completo.extractoCompleto, maxCaracteres), url: completo.url };
}
