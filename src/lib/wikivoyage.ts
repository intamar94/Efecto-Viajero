// Investigación real por ciudad usando Wikivoyage: la guía de viaje
// colaborativa que ya usan millones de viajeros, con datos estructurados
// pensados exactamente para esto (nombre, dirección, horario, precio, web)
// en vez de texto libre. Es pública, gratis y no requiere clave de API —
// a diferencia de Google Places, que sería la alternativa de pago.
//
// No inventamos nada de lo que hay aquí: si Wikivoyage no tiene el dato
// (por ejemplo el horario), el campo queda vacío y así se muestra.

export type TipoListingWikivoyage = "see" | "do" | "buy" | "eat" | "drink" | "sleep";

export interface WikivoyageListing {
  tipo: TipoListingWikivoyage;
  nombre?: string;
  direccion?: string;
  horario?: string;
  precio?: string;
  url?: string;
  telefono?: string;
  contenido?: string;
  lat?: number;
  lon?: number;
}

export interface WikivoyageResumen {
  articulo: string;
  idioma: "es" | "en";
  url: string;
  listings: WikivoyageListing[];
  obtenidoEn: string;
}

function limpiarWikitext(texto: string): string {
  return texto
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[([^|\]]*\|)?([^\]]+)\]\]/g, "$2")
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

// Divide el bloque de parámetros de una plantilla por "|", respetando los
// "|" que van dentro de un [[enlace|alias]] para no cortar por la mitad.
function parsearParametros(bloque: string): Record<string, string> {
  const partes: string[] = [];
  let profundidad = 0;
  let actual = "";
  for (let i = 0; i < bloque.length; i++) {
    const c = bloque[i];
    if (c === "[" && bloque[i + 1] === "[") profundidad++;
    if (c === "]" && bloque[i - 1] === "]") profundidad--;
    if (c === "|" && profundidad <= 0) {
      partes.push(actual);
      actual = "";
      continue;
    }
    actual += c;
  }
  partes.push(actual);

  const params: Record<string, string> = {};
  for (const parte of partes) {
    const idx = parte.indexOf("=");
    if (idx === -1) continue;
    const clave = parte.slice(0, idx).trim().toLowerCase();
    const valor = limpiarWikitext(parte.slice(idx + 1).trim());
    if (clave && valor) params[clave] = valor;
  }
  return params;
}

function extraerListings(wikitext: string): WikivoyageListing[] {
  const listings: WikivoyageListing[] = [];
  const regex = /\{\{\s*(see|do|buy|eat|drink|sleep)\s*\|([\s\S]*?)\}\}/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(wikitext))) {
    const tipo = m[1].toLowerCase() as TipoListingWikivoyage;
    const p = parsearParametros(m[2]);
    if (!p.name && !p.content) continue;
    listings.push({
      tipo,
      nombre: p.name,
      direccion: p.address,
      horario: p.hours,
      precio: p.price,
      url: p.url,
      telefono: p.phone,
      contenido: p.content,
      lat: p.lat ? Number(p.lat) : undefined,
      lon: p.long ? Number(p.long) : undefined,
    });
  }
  return listings;
}

async function buscarArticulo(ciudad: string, idioma: "es" | "en"): Promise<string | null> {
  const url = `https://${idioma}.wikivoyage.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(ciudad)}&format=json&origin=*&srlimit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const titulo = data?.query?.search?.[0]?.title;
    return typeof titulo === "string" ? titulo : null;
  } catch {
    return null;
  }
}

async function obtenerWikitext(titulo: string, idioma: "es" | "en"): Promise<string | null> {
  const url = `https://${idioma}.wikivoyage.org/w/api.php?action=parse&page=${encodeURIComponent(titulo)}&prop=wikitext&format=json&origin=*`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const texto = data?.parse?.wikitext?.["*"];
    return typeof texto === "string" ? texto : null;
  } catch {
    return null;
  }
}

// Intenta primero en español (más útil para el usuario) y si ese artículo
// no existe o no trae listings estructurados, cae al inglés: Wikivoyage en
// inglés cubre muchísimas más ciudades que la edición en español.
export async function obtenerGuiaWikivoyage(ciudad: string): Promise<WikivoyageResumen | null> {
  for (const idioma of ["es", "en"] as const) {
    const titulo = await buscarArticulo(ciudad, idioma);
    if (!titulo) continue;
    const wikitext = await obtenerWikitext(titulo, idioma);
    if (!wikitext) continue;
    const listings = extraerListings(wikitext);
    if (listings.length === 0) continue;
    return {
      articulo: titulo,
      idioma,
      url: `https://${idioma}.wikivoyage.org/wiki/${encodeURIComponent(titulo.replace(/ /g, "_"))}`,
      listings,
      obtenidoEn: new Date().toISOString(),
    };
  }
  return null;
}
