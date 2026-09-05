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

const LARGO_POR_DEFECTO = 200;

// El extracto completo de Wikipedia suele ser el párrafo introductorio
// entero (varias frases, a veces con datos administrativos que a nadie
// le interesa leer antes de un viaje). Se recorta a la(s) primera(s)
// frase(s) que quepan en el largo pedido: corto pero claro, un dato
// concreto en vez de un muro de texto que nadie lee.
function acortar(texto: string, maxCaracteres: number): string {
  const frases = texto.match(/[^.]+\.+\s*/g) ?? [texto];
  let resultado = frases[0] ?? texto;
  for (let i = 1; i < frases.length; i++) {
    if ((resultado + frases[i]).length > maxCaracteres) break;
    resultado += frases[i];
  }
  resultado = resultado.trim();
  if (resultado.length > maxCaracteres) {
    const corte = resultado.slice(0, maxCaracteres);
    const ultimoEspacio = corte.lastIndexOf(" ");
    resultado = `${corte.slice(0, ultimoEspacio > 0 ? ultimoEspacio : maxCaracteres)}…`;
  }
  return resultado;
}

// Se cachea el extracto completo (sin recortar): así, si dos sitios de la
// app piden distinto largo para el mismo lugar, no hace falta repetir la
// llamada de red.
const cache = new Map<string, { titulo: string; extractoCompleto: string; url: string } | null>();

async function buscarResumen(termino: string, idioma: "es" | "en"): Promise<{ titulo: string; extractoCompleto: string; url: string } | null> {
  try {
    const res = await fetch(`https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(termino)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === "disambiguation" || !data.extract || data.extract_html?.includes("puede referirse a")) return null;
    return {
      titulo: data.title as string,
      extractoCompleto: data.extract as string,
      url: (data.content_urls?.desktop?.page as string | undefined) ?? `https://${idioma}.wikipedia.org/wiki/${encodeURIComponent(termino)}`,
    };
  } catch {
    return null;
  }
}

// Prueba primero en español (el idioma de la app); si no hay artículo,
// cae a inglés antes de rendirse — mejor un resumen real en otro idioma
// que ningún dato, y se lo dejamos claro al usuario en el origen mostrado.
export async function obtenerResumenLugar(nombre: string, maxCaracteres: number = LARGO_POR_DEFECTO): Promise<ResumenWikipedia | null> {
  const clave = nombre.trim().toLowerCase();
  let completo = cache.get(clave);
  if (completo === undefined) {
    completo = (await buscarResumen(nombre, "es")) ?? (await buscarResumen(nombre, "en"));
    cache.set(clave, completo);
  }
  if (!completo) return null;
  return { titulo: completo.titulo, extracto: acortar(completo.extractoCompleto, maxCaracteres), url: completo.url };
}
