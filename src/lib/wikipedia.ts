// Wikipedia: gratis, sin clave. Se usa para dar contexto real y breve
// sobre un lugar — historia, datos curiosos — en vez de dejar la pantalla
// solo con botones y enlaces, o inventar "leyendas" que no podemos
// verificar.
export interface ResumenWikipedia {
  titulo: string;
  extracto: string;
  url: string;
}

const LARGO_POR_DEFECTO = 200;

// El extracto completo de Wikipedia suele ser el párrafo introductorio
// entero (varias frases, a veces con datos administrativos que a nadie le
// interesa leer antes de un viaje). Se recorta a las primeras frases que
// quepan en el largo pedido — pero SIEMPRE frases completas: cortar a
// media palabra deja un texto que se siente roto ("...que sirve para…"),
// así que si ni la primera frase entra en el largo pedido, se muestra
// completa de todas formas antes que dejarla a medias.
function acortar(texto: string, maxCaracteres: number): string {
  const frases = texto.match(/[^.]+\.+\s*/g) ?? [texto];
  let resultado = (frases[0] ?? texto).trim();
  for (let i = 1; i < frases.length; i++) {
    const siguiente = frases[i].trim();
    if (!siguiente) continue;
    if (`${resultado} ${siguiente}`.length > maxCaracteres) break;
    resultado += ` ${siguiente}`;
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

async function buscarResumen(termino: string, idioma: "es" | "en", contexto?: string): Promise<ArticuloWikipedia | null> {
  const consulta = contexto ? `${termino} ${contexto}` : termino;
  const titulo = (await buscarTitulo(consulta, idioma)) ?? (contexto ? await buscarTitulo(termino, idioma) : null);
  if (!titulo) return null;
  return obtenerResumenDeTitulo(titulo, idioma);
}

// Prueba primero en español (el idioma de la app); si no hay artículo,
// cae a inglés antes de rendirse — mejor un resumen real en otro idioma
// que ningún dato, y se lo dejamos claro al usuario en el origen mostrado.
// `contexto` (p. ej. el país) ayuda a desambiguar nombres que coinciden
// con una palabra común ("Faro", "Sucre", "Mérida"...).
export async function obtenerResumenLugar(nombre: string, maxCaracteres: number = LARGO_POR_DEFECTO, contexto?: string): Promise<ResumenWikipedia | null> {
  const clave = `${nombre.trim().toLowerCase()}|${(contexto ?? "").trim().toLowerCase()}`;
  let completo = cache.get(clave);
  if (completo === undefined) {
    completo = (await buscarResumen(nombre, "es", contexto)) ?? (await buscarResumen(nombre, "en", contexto));
    cache.set(clave, completo);
  }
  if (!completo) return null;
  return { titulo: completo.titulo, extracto: acortar(completo.extractoCompleto, maxCaracteres), url: completo.url };
}
