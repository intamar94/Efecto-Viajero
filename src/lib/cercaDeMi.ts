// Sitios reales alrededor de tu posición GPS, para el radar del Modo Guía.
// Wikipedia (gratis, sin clave): geosearch da lugares con artículo propio
// y el resumen real sale del mismo artículo. No se inventa nada.

import { geosearchWiki } from "./wikiGeosearch";

export interface SitioCercano {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

export async function sitiosCercanos(lat: number, lon: number, radioMetros = 1000): Promise<SitioCercano[]> {
  const res = await geosearchWiki("en.wikipedia.org", lat, lon, radioMetros, 25);
  return res.map((r) => ({ id: `wiki:${r.titulo}`, nombre: r.titulo, lat: r.lat, lon: r.lon }));
}

export async function resumenCercano(titulo: string): Promise<{ extracto: string; url: string } | null> {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === "disambiguation" || typeof data.extract !== "string" || !data.extract) return null;
    const frases = (data.extract.match(/[^.]+\.+\s*/g) ?? [data.extract]).map((f: string) => f.trim());
    let texto = frases[0] ?? data.extract;
    for (let i = 1; i < frases.length && `${texto} ${frases[i]}`.length <= 320; i++) texto += ` ${frases[i]}`;
    const url = (data.content_urls?.desktop?.page as string | undefined) ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(titulo)}`;
    return { extracto: texto, url };
  } catch {
    return null;
  }
}
