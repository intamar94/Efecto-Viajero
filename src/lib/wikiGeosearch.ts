// Búsqueda de artículos de Wikipedia/Wikivoyage por COORDENADAS en vez de
// por nombre — la API "geosearch" de MediaWiki, gratis y sin clave, igual
// de pública que el resto de la app.
//
// Buscar por nombre es una lotería que depende del lugar: "Cartagena"
// existe en España y en Colombia, "Mérida" en España y en México/
// Venezuela, "Córdoba" en España y Argentina... Cada nombre repetido es un
// posible artículo equivocado, y arreglarlo caso por caso (como con
// "Cartagena Colombia") no escala a los cientos de nombres de ciudad que
// se repiten en el mundo real. Las coordenadas no tienen ese problema: ya
// sabemos dónde está el sitio (de la geocodificación al crear el viaje, o
// de OpenStreetMap para cada sitio real), así que en vez de adivinar por
// el nombre se pregunta directamente "¿qué artículo real hay geolocalizado
// justo aquí?" — la misma pregunta, resuelta igual sin importar el país.

export interface ResultadoGeosearch {
  titulo: string;
  lat: number;
  lon: number;
  distanciaMetros: number;
}

// Compara nombres ignorando mayúsculas/acentos/espacios sobrantes: el
// título real de un artículo casi nunca es idéntico carácter a carácter
// al nombre que tenemos ("Ciudad Amurallada" vs "Ciudad Amurallada de
// Cartagena de Indias"), pero uno contiene al otro.
export function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export async function geosearchWiki(dominio: string, lat: number, lon: number, radioMetros: number, limite = 10): Promise<ResultadoGeosearch[]> {
  const url = `https://${dominio}/w/api.php?action=query&list=geosearch&gscoord=${lat}%7C${lon}&gsradius=${radioMetros}&gslimit=${limite}&format=json&origin=*`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    const items: unknown[] = Array.isArray(data?.query?.geosearch) ? data.query.geosearch : [];
    return items.flatMap((it) => {
      if (typeof it !== "object" || it === null) return [];
      const o = it as Record<string, unknown>;
      if (typeof o.title !== "string" || typeof o.lat !== "number" || typeof o.lon !== "number") return [];
      return [{ titulo: o.title, lat: o.lat, lon: o.lon, distanciaMetros: typeof o.dist === "number" ? o.dist : 0 }];
    });
  } catch {
    return [];
  }
}

// Entre varios títulos candidatos (de geosearch, o de una búsqueda por
// texto libre), se prefiere el que de verdad coincide de nombre con lo
// que buscamos (uno contiene al otro) — nunca "el primero" o "el más
// cercano" sin más: eso podría ser cualquier otra cosa (geoetiquetada
// cerca, o simplemente la más "relevante" por compartir alguna palabra),
// y mostrar el contenido de un lugar equivocado es peor que no mostrar
// nada.
export function mejorTituloPorNombre(titulos: string[], nombre: string): string | undefined {
  const normal = normalizarTexto(nombre);
  if (!normal) return undefined;
  return titulos.find((t) => {
    const tn = normalizarTexto(t);
    return tn.includes(normal) || normal.includes(tn);
  });
}

export function mejorCoincidenciaPorNombre(resultados: ResultadoGeosearch[], nombre: string): string | undefined {
  return mejorTituloPorNombre(resultados.map((r) => r.titulo), nombre);
}
