// Cuando un sitio real (un parque, un museo pequeño...) no tiene su
// propio artículo de Wikipedia, quedarse solo con la categoría ("Parque.")
// obliga al viajero a buscar por su cuenta qué hay de verdad ahí. En vez
// de eso, se cruza con OTRA fuente gratis y sin clave — OpenStreetMap
// Overpass, la misma que ya usa el resto de la app — para preguntar qué
// hay literalmente alrededor del punto: bancos para sentarse, una
// heladería, baños, agua potable... Datos concretos y reales, no relleno.
//
// Nunca se inventa nada: si Overpass no devuelve nada cerca (o falla),
// no se dice nada — la tarjeta se queda con la categoría, como antes.

const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const RADIO_METROS = 250;

interface ElementoOverpass {
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

async function consultarEndpoint(endpoint: string, body: string): Promise<{ elements?: ElementoOverpass[] } | undefined> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json", "User-Agent": "Efecto-Viajero/1.0" },
      body: new URLSearchParams({ data: body }).toString(),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return undefined;
    return (await response.json()) as { elements?: ElementoOverpass[] };
  } catch {
    return undefined;
  }
}

function tieneAlguno(tags: Record<string, string> = {}, ...pares: [string, string][]): boolean {
  return pares.some(([clave, valor]) => tags[clave] === valor);
}

// Frase corta y natural con lo que de verdad hay cerca — como mucho 3
// cosas, priorizando lo más útil para decidir si vale la pena acercarse
// (dónde sentarse, algo dulce/de comer, baños), antes que lo secundario.
function describirEntorno(hallazgos: {
  bancos: boolean;
  heladeria?: string;
  cafeteria?: string;
  zonaJuegos: boolean;
  banos: boolean;
  aguaPotable: boolean;
}): string | undefined {
  const clausulas: string[] = [];
  if (hallazgos.bancos) clausulas.push("bancos para sentarte");
  if (hallazgos.heladeria) clausulas.push(`la heladería ${hallazgos.heladeria}`);
  else if (hallazgos.cafeteria) clausulas.push(`la cafetería ${hallazgos.cafeteria}`);
  if (hallazgos.zonaJuegos) clausulas.push("una zona de juegos infantiles");
  if (hallazgos.banos) clausulas.push("baños públicos");
  else if (hallazgos.aguaPotable) clausulas.push("una fuente de agua potable");

  if (clausulas.length === 0) return undefined;
  const usadas = clausulas.slice(0, 3);
  const texto = usadas.length === 1 ? usadas[0] : `${usadas.slice(0, -1).join(", ")} y ${usadas[usadas.length - 1]}`;
  return `Con ${texto} cerca.`;
}

// Se cachea por punto redondeado (~11 m de margen, de sobra para no
// repetir la misma consulta si el efecto se reejecuta): dos sitios casi
// pegados no deberían disparar dos llamadas idénticas a Overpass.
const cache = new Map<string, string | undefined>();

export async function entornoCercanoDe(lat: number, lon: number): Promise<string | undefined> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  const clave = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (cache.has(clave)) return cache.get(clave);

  const body = `[out:json][timeout:15];(
    nwr[amenity=bench](around:${RADIO_METROS},${lat},${lon});
    nwr[leisure=picnic_table](around:${RADIO_METROS},${lat},${lon});
    nwr[amenity=ice_cream](around:${RADIO_METROS},${lat},${lon});
    nwr[shop=ice_cream](around:${RADIO_METROS},${lat},${lon});
    nwr[amenity=cafe](around:${RADIO_METROS},${lat},${lon});
    nwr[leisure=playground](around:${RADIO_METROS},${lat},${lon});
    nwr[amenity=toilets](around:${RADIO_METROS},${lat},${lon});
    nwr[amenity=drinking_water](around:${RADIO_METROS},${lat},${lon});
  );out center tags 40;`;

  const resultados = await Promise.all(OVERPASS_ENDPOINTS.map((endpoint) => consultarEndpoint(endpoint, body)));
  const data = resultados.find((r) => r !== undefined);
  if (!data) {
    // Fallo de red, no "no hay nada": se lanza (en vez de devolver
    // undefined, que aquí significaría "se buscó y no hay nada cerca") para
    // que quien llama pueda distinguirlo y NO lo marque como ya buscado —
    // así se reintenta en la próxima visita en vez de quedar vacío para siempre.
    throw new Error("entornoCercano: fallo de red en ambos endpoints de Overpass");
  }

  let bancos = false;
  let zonaJuegos = false;
  let banos = false;
  let aguaPotable = false;
  let heladeria: string | undefined;
  let cafeteria: string | undefined;

  for (const el of data.elements ?? []) {
    const tags = el.tags ?? {};
    if (tieneAlguno(tags, ["amenity", "bench"], ["leisure", "picnic_table"])) bancos = true;
    if (tags.leisure === "playground") zonaJuegos = true;
    if (tags.amenity === "toilets") banos = true;
    if (tags.amenity === "drinking_water") aguaPotable = true;
    if (!heladeria && (tags.amenity === "ice_cream" || tags.shop === "ice_cream")) {
      heladeria = tags.name?.trim() ? `"${tags.name.trim()}"` : "cercana";
    }
    if (!cafeteria && tags.amenity === "cafe" && tags.name?.trim()) {
      cafeteria = `"${tags.name.trim()}"`;
    }
  }

  const resultado = describirEntorno({ bancos, heladeria, cafeteria, zonaJuegos, banos, aguaPotable });
  cache.set(clave, resultado);
  return resultado;
}
