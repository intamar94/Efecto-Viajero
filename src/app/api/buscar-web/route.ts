import { NextRequest, NextResponse } from "next/server";

// Búsqueda real en la web (blogs, reseñas, foros — lo que la gente ya
// comparte públicamente, no solo Wikipedia/OSM). Corre en el servidor
// porque Google Programmable Search necesita una clave secreta que
// nunca debe llegar al navegador ni al bundle del cliente.
//
// Dos niveles, en orden:
// 1) Google Programmable Search — el más completo (indexa blogs, sitios
//    de turismo, foros), pero requiere que el usuario haya configurado
//    GOOGLE_SEARCH_API_KEY/GOOGLE_SEARCH_CX como variables de entorno.
// 2) DuckDuckGo Instant Answer — sin clave ni cuenta, igual que
//    Wikipedia/OSM. Más limitado (trae resúmenes tipo enciclopedia sobre
//    temas/lugares ya conocidos, no rastrea cualquier blog suelto), pero
//    funciona siempre, sin que nadie tenga que registrarse en nada.
//
// Si Google está configurado se intenta primero; si no lo está, o no
// devolvió nada, se cae a DuckDuckGo automáticamente.
type ResultadoWeb = { titulo: string; url: string; fragmento?: string };

async function buscarGoogle(q: string, apiKey: string, cx: string): Promise<ResultadoWeb[]> {
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(q)}&num=3`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    const items: unknown[] = Array.isArray(data?.items) ? data.items : [];
    return items.slice(0, 3).flatMap((it) => {
      const o = it as Record<string, unknown>;
      if (typeof o.title !== "string" || typeof o.link !== "string") return [];
      return [{ titulo: o.title, url: o.link, fragmento: typeof o.snippet === "string" ? o.snippet.replace(/\s+/g, " ").trim() : undefined }];
    });
  } catch {
    return [];
  }
}

async function buscarDuckDuckGo(q: string): Promise<ResultadoWeb[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    const resultados: ResultadoWeb[] = [];
    if (typeof data?.AbstractText === "string" && data.AbstractText.trim()) {
      resultados.push({
        titulo: typeof data.Heading === "string" && data.Heading ? data.Heading : q,
        url: typeof data.AbstractURL === "string" ? data.AbstractURL : "",
        fragmento: data.AbstractText.trim(),
      });
    }
    const relacionados: unknown[] = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
    for (const rt of relacionados) {
      if (resultados.length >= 3) break;
      const o = rt as Record<string, unknown>;
      if (typeof o.Text !== "string" || typeof o.FirstURL !== "string") continue;
      const separador = o.Text.indexOf(" - ");
      const titulo = separador > 0 ? o.Text.slice(0, separador) : o.Text;
      resultados.push({ titulo, url: o.FirstURL, fragmento: o.Text });
    }
    return resultados;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!q) return NextResponse.json({ disponible: true, resultados: [] });

  const resultadosGoogle = apiKey && cx ? await buscarGoogle(q, apiKey, cx) : [];
  if (resultadosGoogle.length > 0) return NextResponse.json({ disponible: true, resultados: resultadosGoogle });

  const resultadosDuckDuckGo = await buscarDuckDuckGo(q);
  return NextResponse.json({ disponible: true, resultados: resultadosDuckDuckGo });
}
