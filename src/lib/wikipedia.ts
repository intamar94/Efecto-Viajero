// Wikipedia REST API: gratis, sin clave, con CORS habilitado de fábrica
// (a diferencia de la API de acción de MediaWiki, que necesita el truco
// origin=*). Se usa para dar contexto real y breve sobre un lugar —
// historia, datos curiosos — en vez de dejar la pantalla solo con
// botones y enlaces, o inventar "leyendas" que no podemos verificar.
export interface ResumenWikipedia {
  titulo: string;
  extracto: string;
  url: string;
}

const cache = new Map<string, ResumenWikipedia | null>();

async function buscarResumen(termino: string, idioma: "es" | "en"): Promise<ResumenWikipedia | null> {
  try {
    const res = await fetch(`https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(termino)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === "disambiguation" || !data.extract || data.extract_html?.includes("puede referirse a")) return null;
    return {
      titulo: data.title as string,
      extracto: data.extract as string,
      url: (data.content_urls?.desktop?.page as string | undefined) ?? `https://${idioma}.wikipedia.org/wiki/${encodeURIComponent(termino)}`,
    };
  } catch {
    return null;
  }
}

// Prueba primero en español (el idioma de la app); si no hay artículo,
// cae a inglés antes de rendirse — mejor un resumen real en otro idioma
// que ningún dato, y se lo dejamos claro al usuario en el origen mostrado.
export async function obtenerResumenLugar(nombre: string): Promise<ResumenWikipedia | null> {
  const clave = nombre.trim().toLowerCase();
  if (cache.has(clave)) return cache.get(clave)!;
  const enEspañol = await buscarResumen(nombre, "es");
  const resumen = enEspañol ?? (await buscarResumen(nombre, "en"));
  cache.set(clave, resumen);
  return resumen;
}
