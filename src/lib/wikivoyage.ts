// Investigación real por ciudad usando Wikivoyage: la guía de viaje
// colaborativa que ya usan millones de viajeros, con datos estructurados
// pensados exactamente para esto (nombre, dirección, horario, precio, web)
// en vez de texto libre. Es pública, gratis y no requiere clave de API —
// a diferencia de Google Places, que sería la alternativa de pago.
//
// No inventamos nada de lo que hay aquí: si Wikivoyage no tiene el dato
// (por ejemplo el horario), el campo queda vacío y así se muestra.

import { acortarTexto } from "./texto";
import { traducirAlEspanol } from "./traduccion";
import { geosearchWiki, mejorCoincidenciaPorNombre, mejorTituloPorNombre } from "./wikiGeosearch";

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

// Sube cada vez que cambia de raíz cómo se procesa la guía (p. ej. al
// añadir la traducción automática): una guía ya guardada en un viaje con
// una versión anterior se vuelve a buscar en vez de quedarse con el
// inglés sin traducir para siempre.
export const VERSION_WIKIVOYAGE = 7;

export interface WikivoyageResumen {
  articulo: string;
  idioma: "es" | "en";
  url: string;
  listings: WikivoyageListing[];
  obtenidoEn: string;
  version: number;
}

// Entidades HTML más comunes en el wikitext crudo de Wikivoyage (un
// nombre con "&" o un apóstrofo tipográfico suele venir así en el
// código fuente): sin decodificarlas, un título terminaba mostrando
// literalmente "&amp;" o "&#39;" en vez del símbolo real.
const ENTIDADES_HTML: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodificarEntidadesHtml(texto: string): string {
  return texto.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTIDADES_HTML[m] ?? m);
}

function limpiarWikitext(texto: string): string {
  return decodificarEntidadesHtml(
    texto
      .replace(/\{\{[^{}]*\}\}/g, "")
      .replace(/\[\[([^|\]]*\|)?([^\]]+)\]\]/g, "$2")
      .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, "$1")
      .replace(/'''?/g, "")
      .replace(/<[^>]+>/g, "")
      .trim()
  );
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

function extraerListingsDePlantillas(wikitext: string): WikivoyageListing[] {
  const listings: WikivoyageListing[] = [];
  const regex = /\{\{\s*(see|do|buy|eat|drink|sleep)\s*\|([\s\S]*?)\}\}/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(wikitext))) {
    const tipo = m[1].toLowerCase() as TipoListingWikivoyage;
    const p = parsearParametros(m[2]);
    if (!p.name && !p.content) continue;
    // El parámetro "name" de la plantilla normalmente es un título real,
    // pero algunos colaboradores escriben ahí una frase descriptiva
    // entera en vez de un nombre corto ("Festival de Rock al Parque
    // reconocido como el festival musical..."). Igual que en las
    // viñetas, se separa el título real del resto cuando es
    // sospechosamente largo — nunca se pisa un "content" ya real que la
    // plantilla trajera aparte.
    let nombre = p.name;
    let contenido = p.content;
    if (nombre && nombre.length > 60) {
      const partido = partirNombreYContenido(nombre);
      nombre = partido.nombre;
      contenido = contenido ?? partido.contenido;
    }
    listings.push({
      tipo,
      nombre,
      direccion: p.address,
      horario: p.hours,
      precio: p.price,
      url: p.url,
      telefono: p.phone,
      contenido,
      lat: p.lat ? Number(p.lat) : undefined,
      lon: p.long ? Number(p.long) : undefined,
    });
  }
  return listings;
}

const SECCION_A_TIPO: Record<string, TipoListingWikivoyage> = {
  see: "see",
  ver: "see",
  do: "do",
  hacer: "do",
  buy: "buy",
  comprar: "buy",
  eat: "eat",
  comer: "eat",
  drink: "drink",
  beber: "drink",
};

// Una línea en viñeta suele empezar con el nombre del lugar, seguido de
// ". "/"; "/": " y luego la descripción real — p. ej. "Adega Nova. Looks
// like a pub from northern Europe." Antes `contenido` guardaba la línea
// ENTERA (nombre incluido), así que traducir ese texto traducía también
// el nombre propio metido al principio, mezclado con la frase real y sin
// sentido ("Adega Nova" no es una oración en inglés que se pueda traducir
// palabra por palabra). Se separa el nombre del resto ANTES de guardar
// "contenido", para no repetirlo ni tener que traducirlo nunca.
function partirNombreYContenido(texto: string): { nombre: string; contenido?: string } {
  const separador = texto.match(/[.;:]/);
  if (!separador || separador.index === undefined) {
    return { nombre: texto.length > 60 ? `${texto.slice(0, 60).trim()}…` : texto, contenido: undefined };
  }
  const primeraClausula = texto.slice(0, separador.index).trim();
  const resto = texto.slice(separador.index + 1).trim();
  const nombre = primeraClausula.length > 0 && primeraClausula.length <= 60 ? primeraClausula : (texto.length > 40 ? `${texto.slice(0, 40).trim()}…` : texto);
  return { nombre, contenido: resto.length > 0 ? resto : undefined };
}

// No todos los artículos usan plantillas {{see|do|...}}: muchos, sobre
// todo de ciudades más pequeñas, solo tienen texto en viñetas bajo el
// encabezado de la sección. Sin esto, esos artículos se descartaban
// enteros aunque tuvieran contenido real y útil.
//
// Las ciudades grandes (justo las que más interesan) suelen subdividir
// "==See==" o "==Eat==" por barrio con subtítulos ("=== Getsemaní ==="),
// dentro de la misma sección de nivel superior. Antes CUALQUIER
// encabezado (sin distinguir su profundidad) reiniciaba tipoActual —
// como "Getsemaní" no es una clave reconocida, quedaba en null y se
// perdían TODAS las viñetas de esa subsección entera. Resultado: un
// pueblo chico sin subtítulos se extraía bien, pero una ciudad grande y
// bien organizada (Cartagena, con su Ciudad Amurallada dividida en
// barrios) podía terminar sin nada — justo al revés de lo esperado, y
// la causa real de que la riqueza de datos pareciera depender del lugar
// en vez de ser consistente. Se distingue la profundidad real del
// encabezado (cuántos "=" hay, deben ser simétricos a ambos lados): un
// encabezado de nivel superior (2) sí decide la sección; uno más
// profundo (3+, un subtítulo dentro de esa sección) solo se ignora como
// línea, sin tocar tipoActual — las viñetas de debajo se siguen
// contando para la sección de la que en verdad son parte.
function extraerListingsDeViñetas(wikitext: string): WikivoyageListing[] {
  const listings: WikivoyageListing[] = [];
  let tipoActual: TipoListingWikivoyage | null = null;
  for (const linea of wikitext.split("\n")) {
    const encabezado = linea.match(/^(=+)\s*([^=]+?)\s*\1\s*$/);
    if (encabezado) {
      if (encabezado[1].length === 2) {
        tipoActual = SECCION_A_TIPO[encabezado[2].trim().toLowerCase()] ?? null;
      }
      continue;
    }
    if (!tipoActual) continue;
    const item = linea.match(/^\*+\s*(.+)$/);
    if (!item || /^\{\{/.test(item[1].trim())) continue;
    const texto = limpiarWikitext(item[1]);
    if (texto) listings.push({ tipo: tipoActual, ...partirNombreYContenido(texto) });
  }
  return listings;
}

function extraerListings(wikitext: string): WikivoyageListing[] {
  return [...extraerListingsDePlantillas(wikitext), ...extraerListingsDeViñetas(wikitext)];
}

async function buscarCandidatos(consulta: string, idioma: "es" | "en", limite = 5): Promise<string[]> {
  const url = `https://${idioma}.wikivoyage.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(consulta)}&format=json&origin=*&srlimit=${limite}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`Wikivoyage (${idioma}): búsqueda de "${consulta}" respondió ${res.status}`);
      return [];
    }
    const data = await res.json();
    const items: unknown[] = Array.isArray(data?.query?.search) ? data.query.search : [];
    return items.flatMap((it) => {
      const titulo = (it as Record<string, unknown> | null)?.title;
      return typeof titulo === "string" ? [titulo] : [];
    });
  } catch (err) {
    console.warn(`Wikivoyage (${idioma}): fallo al buscar "${consulta}"`, err);
    return [];
  }
}

// El PRIMER resultado de la búsqueda por texto libre no siempre es el
// artículo correcto — puede ser cualquier otra página que comparta
// alguna palabra. Solo se acepta un candidato que de verdad coincida de
// nombre con la ciudad buscada (`ciudad`, sin el país pegado: comparar
// contra "Cartagena Colombia" nunca encontraría un título real que la
// contenga entera).
async function buscarTitulo(consulta: string, idioma: "es" | "en", ciudad: string): Promise<string | null> {
  const candidatos = await buscarCandidatos(consulta, idioma);
  return mejorTituloPorNombre(candidatos, ciudad) ?? null;
}

export interface Coordenadas {
  lat: number;
  lon: number;
}

// Muchos nombres de ciudad se repiten entre países (Cartagena existe en
// España Y en Colombia; lo mismo Mérida, Sucre, Córdoba, Santiago,
// Valencia, León...). Buscar solo por el nombre es una lotería que no
// escala: cada nombre repetido en el mundo es un posible artículo
// equivocado, y no se pueden arreglar uno por uno a mano. Si ya sabemos
// dónde está la ciudad (coordenadas reales de cuando se creó el viaje),
// se pregunta primero qué artículo hay geolocalizado justo ahí — funciona
// igual sin importar el país, porque no depende de adivinar el nombre.
// El país como contexto de texto (y, sin ninguno de los dos, el nombre
// solo) quedan como respaldo para cuando no hay coordenadas guardadas
// (viajes creados antes de tenerlas) o la búsqueda por coordenadas no
// encuentra un artículo que de verdad coincida de nombre.
async function buscarArticulo(ciudad: string, idioma: "es" | "en", contexto?: string, coords?: Coordenadas): Promise<string | null> {
  if (coords) {
    const cercanos = await geosearchWiki(`${idioma}.wikivoyage.org`, coords.lat, coords.lon, 12000, 10);
    const coincide = mejorCoincidenciaPorNombre(cercanos, ciudad);
    if (coincide) return coincide;
  }
  if (!contexto) return buscarTitulo(ciudad, idioma, ciudad);
  return (await buscarTitulo(`${ciudad} ${contexto}`, idioma, ciudad)) ?? (await buscarTitulo(ciudad, idioma, ciudad));
}

async function obtenerWikitext(titulo: string, idioma: "es" | "en"): Promise<string | null> {
  const url = `https://${idioma}.wikivoyage.org/w/api.php?action=parse&page=${encodeURIComponent(titulo)}&prop=wikitext&format=json&origin=*`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`Wikivoyage (${idioma}): parse de "${titulo}" respondió ${res.status}`);
      return null;
    }
    const data = await res.json();
    const texto = data?.parse?.wikitext?.["*"];
    return typeof texto === "string" ? texto : null;
  } catch (err) {
    console.warn(`Wikivoyage (${idioma}): fallo al leer "${titulo}"`, err);
    return null;
  }
}

// Cuando el único artículo real disponible para una ciudad está en
// inglés (Wikivoyage en español es mucho más chico: cubre muchas menos
// ciudades, y con menos detalle), su contenido libre queda en inglés — se
// traduce aquí, una sola vez por ciudad, antes de guardarlo en el viaje,
// para que el resto de la interfaz no quede mezclada en dos idiomas. El
// nombre y la dirección NO se traducen (son nombres propios reales); solo
// el texto descriptivo. Si la traducción falla, `traducirAlEspanol` ya
// devuelve el texto original tal cual, así que esto nunca se queda sin
// contenido por un fallo del servicio de traducción.
async function traducirListings(listings: WikivoyageListing[]): Promise<WikivoyageListing[]> {
  return Promise.all(
    listings.map(async (l) => {
      if (!l.contenido) return l;
      const recortado = acortarTexto(l.contenido, 220);
      const traducido = await traducirAlEspanol(recortado, "en");
      return { ...l, contenido: traducido };
    })
  );
}

// Intenta primero en español (más útil para el usuario) y si ese artículo
// no existe o no trae listings estructurados, cae al inglés: Wikivoyage en
// inglés cubre muchísimas más ciudades que la edición en español.
// `coords`/`contexto` desambiguan nombres de ciudad que se repiten entre
// países — ver el comentario en buscarArticulo.
export async function obtenerGuiaWikivoyage(ciudad: string, contexto?: string, coords?: Coordenadas): Promise<WikivoyageResumen | null> {
  for (const idioma of ["es", "en"] as const) {
    const titulo = await buscarArticulo(ciudad, idioma, contexto, coords);
    if (!titulo) continue;
    const wikitext = await obtenerWikitext(titulo, idioma);
    if (!wikitext) continue;
    let listings = extraerListings(wikitext);
    if (listings.length === 0) {
      console.warn(`Wikivoyage (${idioma}): "${titulo}" no trajo listings extraíbles`);
      continue;
    }
    if (idioma === "en") listings = await traducirListings(listings);
    return {
      articulo: titulo,
      idioma,
      url: `https://${idioma}.wikivoyage.org/wiki/${encodeURIComponent(titulo.replace(/ /g, "_"))}`,
      listings,
      obtenidoEn: new Date().toISOString(),
      version: VERSION_WIKIVOYAGE,
    };
  }
  return null;
}
