import { NextRequest, NextResponse } from "next/server";

// Búsqueda real en la web (blogs, reseñas, foros — lo que la gente ya
// comparte públicamente, no solo Wikipedia/OSM) vía Google Programmable
// Search Engine. A diferencia del resto de fuentes de la app (sin clave
// ni cuenta), esta SÍ necesita credenciales — así que corre aquí, en el
// servidor: la clave nunca se manda al navegador ni queda en el bundle.
//
// Si el usuario todavía no configuró GOOGLE_SEARCH_API_KEY/GOOGLE_SEARCH_CX
// como variables de entorno, se responde "no disponible" en vez de
// romper — el resto de la app sigue funcionando igual con las fuentes
// gratis de siempre; esto es una capa extra, no una dependencia dura.
export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (!apiKey || !cx) return NextResponse.json({ disponible: false, resultados: [] });
  if (!q) return NextResponse.json({ disponible: true, resultados: [] });

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(q)}&num=3`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return NextResponse.json({ disponible: true, resultados: [] });
    const data = await res.json();
    const items: unknown[] = Array.isArray(data?.items) ? data.items : [];
    const resultados = items.slice(0, 3).flatMap((it) => {
      const o = it as Record<string, unknown>;
      if (typeof o.title !== "string" || typeof o.link !== "string") return [];
      return [{ titulo: o.title, url: o.link, fragmento: typeof o.snippet === "string" ? o.snippet.replace(/\s+/g, " ").trim() : undefined }];
    });
    return NextResponse.json({ disponible: true, resultados });
  } catch {
    return NextResponse.json({ disponible: true, resultados: [] });
  }
}
