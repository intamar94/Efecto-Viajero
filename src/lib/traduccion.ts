// Traducción automática, gratis y sin clave (MyMemory: mymemory.translated.net).
// Se usa solo para texto libre que ya es real (el contenido de un listing de
// Wikivoyage), nunca para inventar nada — cuando el único artículo
// disponible para una ciudad está en inglés o portugués, esto deja ese
// mismo texto real en español, como el resto de la interfaz.
//
// El servicio tiene un cupo diario gratuito limitado: si se agota, o si
// falla por cualquier motivo, se devuelve el texto original sin traducir
// en vez de romper nada — un dato real en otro idioma sigue siendo mejor
// que ningún dato.

const cache = new Map<string, string>();

// MyMemory a veces responde 200 con un aviso de cupo agotado en vez de una
// traducción real; se detecta por estas marcas típicas del aviso y se
// descarta, para no mostrarlo como si fuera el texto traducido.
function pareceAvisoDeCuota(texto: string): boolean {
  return /MYMEMORY WARNING|QUOTA|INVALID.*(TARGET|SOURCE)|MICROSOFT/i.test(texto);
}

export async function traducirAlEspanol(texto: string, idiomaOrigen: "en" | "pt"): Promise<string> {
  const original = texto.trim();
  if (!original) return texto;
  const clave = `${idiomaOrigen}:${original}`;
  const cacheado = cache.get(clave);
  if (cacheado !== undefined) return cacheado;

  try {
    // MyMemory limita el largo por consulta en su nivel gratuito: no hace
    // falta más para una descripción corta de una tarjeta de todas formas.
    const consulta = original.slice(0, 480);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(consulta)}&langpair=${idiomaOrigen}|es`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return texto;
    const data = await res.json();
    const traducido = data?.responseData?.translatedText;
    if (typeof traducido !== "string" || !traducido.trim() || pareceAvisoDeCuota(traducido)) return texto;
    const resultado = consulta.length < original.length ? `${traducido.trim()}…` : traducido.trim();
    cache.set(clave, resultado);
    return resultado;
  } catch {
    return texto;
  }
}
