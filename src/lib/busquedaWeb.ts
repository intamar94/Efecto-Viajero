// Cuando ninguna fuente estructurada (Wikipedia, Wikivoyage, el propio
// enlace de OpenStreetMap, lo que hay alrededor) tiene nada sobre un
// sitio real, se prueba una búsqueda web real (vía /api/buscar-web,
// server-side) — blogs, foros, reseñas: lo que la gente de verdad
// comparte sobre ese lugar. No siempre está disponible (requiere que el
// dueño de la app configure una clave gratuita de Google Programmable
// Search — ver /api/buscar-web/route.ts); si no lo está, esto no rompe
// nada, simplemente no aporta más que las fuentes de siempre.
//
// Se muestra como cita textual con su fuente, nunca como si fuera
// conocimiento propio verificado de la app: un blog puede estar
// desactualizado o equivocado, a diferencia de un artículo real de
// Wikipedia.
export interface ResultadoBusquedaWeb {
  titulo: string;
  url: string;
  fragmento?: string;
}

export async function buscarEnLaWeb(nombre: string, contexto?: string): Promise<ResultadoBusquedaWeb[]> {
  const consulta = contexto ? `${nombre} ${contexto}` : nombre;
  try {
    const res = await fetch(`/api/buscar-web?q=${encodeURIComponent(consulta)}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.resultados) ? data.resultados : [];
  } catch {
    return [];
  }
}

// Frase corta con el fragmento real y de dónde salió — nunca se presenta
// como un dato verificado, siempre queda claro que viene de una búsqueda.
export function describirResultadoWeb(resultado: ResultadoBusquedaWeb): string | undefined {
  if (!resultado.fragmento) return undefined;
  let dominio: string;
  try {
    dominio = new URL(resultado.url).hostname.replace(/^www\./, "");
  } catch {
    dominio = "la web";
  }
  return `Según ${dominio}: "${resultado.fragmento}"`;
}
