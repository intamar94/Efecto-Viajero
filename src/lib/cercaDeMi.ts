// Sitios reales alrededor de tu posición GPS y su artículo de Wikipedia
// (gratis, sin clave) en el idioma elegido. El artículo se lee por
// secciones para poder contar el lugar por historia, leyendas,
// arquitectura… Solo se usa lo que el artículo realmente dice.

import { geosearchWiki, mejorCoincidenciaPorNombre } from "./wikiGeosearch";

export interface SitioCercano {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

export interface Seccion {
  titulo: string;
  texto: string;
}

export interface Articulo {
  titulo: string;
  url: string;
  intro: string;
  secciones: Seccion[];
}

export async function sitiosCercanos(lat: number, lon: number, radioMetros: number, idioma: string): Promise<SitioCercano[]> {
  const res = await geosearchWiki(`${idioma}.wikipedia.org`, lat, lon, radioMetros, 25);
  return res.map((r) => ({ id: `wiki:${idioma}:${r.titulo}`, nombre: r.titulo, lat: r.lat, lon: r.lon }));
}

// Un sitio del viaje (que viene de OpenStreetMap/Wikivoyage) no trae el
// título de Wikipedia en el idioma elegido: se busca por coordenadas y solo
// se acepta si el nombre realmente coincide.
export async function tituloParaSitio(nombre: string, lat: number, lon: number, idioma: string): Promise<string | undefined> {
  const res = await geosearchWiki(`${idioma}.wikipedia.org`, lat, lon, 600, 10);
  return mejorCoincidenciaPorNombre(res, nombre);
}

const cache = new Map<string, Articulo>();
const REGEX_TITULO = /^(={2,6})\s*(.+?)\s*\1\s*$/;

export async function articuloWiki(titulo: string, idioma: string): Promise<Articulo | null> {
  const clave = `${idioma}:${titulo}`;
  const guardado = cache.get(clave);
  if (guardado) return guardado;
  const url = `https://${idioma}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&titles=${encodeURIComponent(titulo)}&format=json&origin=*`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const data = await res.json();
    const pagina = Object.values(data?.query?.pages ?? {})[0] as { title?: string; extract?: string } | undefined;
    if (!pagina?.extract) return null;
    const secciones: Seccion[] = [];
    const introLineas: string[] = [];
    let actual: Seccion | null = null;
    for (const linea of pagina.extract.split("\n")) {
      const m = linea.match(REGEX_TITULO);
      if (m) {
        actual = { titulo: m[2], texto: "" };
        secciones.push(actual);
      } else if (actual) actual.texto += `${linea}\n`;
      else introLineas.push(linea);
    }
    const articulo: Articulo = {
      titulo: pagina.title ?? titulo,
      url: `https://${idioma}.wikipedia.org/wiki/${encodeURIComponent((pagina.title ?? titulo).replace(/ /g, "_"))}`,
      intro: introLineas.join("\n").trim(),
      secciones: secciones.map((s) => ({ ...s, texto: s.texto.trim() })).filter((s) => s.texto),
    };
    cache.set(clave, articulo);
    return articulo;
  } catch {
    return null;
  }
}
