import { NextRequest, NextResponse } from "next/server";
import { normalizarTexto } from "@/lib/wikiGeosearch";
import { distanciaMetros } from "@/lib/geoAudio";

// Dos fuentes comerciales que necesitan clave secreta (a diferencia de
// Wikipedia/Wikidata/OpenStreetMap, que se llaman directo desde el
// cliente): corren aquí, en el servidor, para que la clave nunca se
// mande al navegador ni quede en el bundle — mismo patrón que
// /api/buscar-web con Google Search.
//
// Foursquare Places da nombre/categoría/dirección de un lugar.
// Yelp Fusion da horario y rango de precio, pero SOLO tiene sentido
// pedirlo para sitios gastronómicos — es su dominio (restaurantes,
// bares, cafés), no lo tiene para un museo o un parque.
//
// Si el dueño de la app no configuró FOURSQUARE_API_KEY/YELP_API_KEY,
// esa fuente simplemente no aparece en la respuesta — no rompe nada,
// el resto del pipeline (Wikipedia/Wikidata + platos típicos, que no
// necesitan clave) sigue funcionando igual.

const UMBRAL_METROS = 250;

export interface DatoFoursquare {
  nombre: string;
  categoria?: string;
  direccion?: string;
  fsqId: string;
  distanciaMetros: number;
}

export interface DatoYelp {
  nombre: string;
  horario?: string;
  rangoPrecios?: string;
  direccion?: string;
  categorias: string[];
  distanciaMetros: number;
  abiertoAhora?: boolean;
}

interface CandidatoConNombreYCoords {
  nombre: string;
  lat: number;
  lon: number;
}

// Nunca se confía en el primer resultado de una búsqueda por texto sin
// validarlo: mismo principio anti-alucinación que ya usa el resto de la
// app (ver mejorTituloPorNombre en wikiGeosearch.ts). Un resultado se
// acepta solo si el nombre coincide (contención en cualquier dirección,
// sin acentos/mayúsculas) Y está dentro del radio esperado — o, si
// ningún nombre coincide, solo cuando hay uno clarísimamente pegado a
// las coordenadas (a menos de 60 m: puede ser el mismo sitio con una
// grafía distinta del nombre entre fuentes).
function mejorCoincidencia<T extends CandidatoConNombreYCoords>(candidatos: T[], nombreBuscado: string, lat: number, lon: number): T | undefined {
  const nombreNorm = normalizarTexto(nombreBuscado);
  const conDistancia = candidatos
    .map((c) => ({ c, dist: distanciaMetros(lat, lon, c.lat, c.lon) }))
    .filter(({ dist }) => dist <= UMBRAL_METROS)
    .sort((a, b) => a.dist - b.dist);

  const porNombre = conDistancia.find(({ c }) => {
    const candNorm = normalizarTexto(c.nombre);
    return candNorm.includes(nombreNorm) || nombreNorm.includes(candNorm);
  });
  if (porNombre) return porNombre.c;

  const masCercano = conDistancia[0];
  if (masCercano && masCercano.dist <= 60) return masCercano.c;
  return undefined;
}

interface FoursquareResultado {
  fsq_id: string;
  name: string;
  categories?: { name: string }[];
  location?: { formatted_address?: string };
  geocodes?: { main?: { latitude: number; longitude: number } };
}

async function buscarFoursquare(nombre: string, lat: number, lon: number, apiKey: string): Promise<DatoFoursquare | undefined> {
  try {
    const url = `https://api.foursquare.com/v3/places/search?ll=${lat}%2C${lon}&query=${encodeURIComponent(nombre)}&radius=${UMBRAL_METROS}&limit=5`;
    const res = await fetch(url, { headers: { Authorization: apiKey, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return undefined;
    const data = await res.json();
    const resultados: FoursquareResultado[] = Array.isArray(data?.results) ? data.results : [];
    const candidatos = resultados.flatMap((r) => {
      const g = r.geocodes?.main;
      if (!g) return [];
      return [{ nombre: r.name, lat: g.latitude, lon: g.longitude, raw: r }];
    });
    const elegido = mejorCoincidencia(candidatos, nombre, lat, lon);
    if (!elegido) return undefined;
    return {
      nombre: elegido.raw.name,
      categoria: elegido.raw.categories?.[0]?.name,
      direccion: elegido.raw.location?.formatted_address,
      fsqId: elegido.raw.fsq_id,
      distanciaMetros: Math.round(distanciaMetros(lat, lon, elegido.lat, elegido.lon)),
    };
  } catch {
    return undefined;
  }
}

interface YelpNegocio {
  id: string;
  name: string;
  price?: string;
  coordinates?: { latitude: number; longitude: number };
  location?: { display_address?: string[] };
  categories?: { title: string }[];
}

interface YelpHorarioBloque {
  day: number; // 0 = lunes ... 6 = domingo
  start: string; // "HHMM"
  end: string; // "HHMM"
}

const DIA_ES_ABREV = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function horaLegible(hhmm: string): string {
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

// El horario de Yelp viene como lista de bloques {día, inicio, fin} —
// posiblemente varios bloques por día (jornada partida). Se agrupa por
// día primero (uniendo los bloques de ESE día con "y"), y solo después
// se comprimen días consecutivos con el mismo horario en un rango — así
// nunca se pierde una jornada partida real por simplificar de más.
function formatearHorarioYelp(bloques: YelpHorarioBloque[]): string | undefined {
  if (bloques.length === 0) return undefined;
  const porDia = new Map<number, string>();
  for (const b of bloques) {
    const franja = `${horaLegible(b.start)}–${horaLegible(b.end)}`;
    porDia.set(b.day, porDia.has(b.day) ? `${porDia.get(b.day)} y ${franja}` : franja);
  }

  const dias = [...porDia.keys()].sort((a, b) => a - b);
  const grupos: { desde: number; hasta: number; horario: string }[] = [];
  for (const dia of dias) {
    const horario = porDia.get(dia)!;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.hasta === dia - 1 && ultimo.horario === horario) {
      ultimo.hasta = dia;
    } else {
      grupos.push({ desde: dia, hasta: dia, horario });
    }
  }

  return grupos
    .map((g) => (g.desde === g.hasta ? `${DIA_ES_ABREV[g.desde]} ${g.horario}` : `${DIA_ES_ABREV[g.desde]}-${DIA_ES_ABREV[g.hasta]} ${g.horario}`))
    .join(", ");
}

async function buscarYelp(nombre: string, lat: number, lon: number, apiKey: string): Promise<DatoYelp | undefined> {
  try {
    const urlBusqueda = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(nombre)}&latitude=${lat}&longitude=${lon}&radius=${UMBRAL_METROS}&limit=5&sort_by=best_match`;
    const resBusqueda = await fetch(urlBusqueda, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000) });
    if (!resBusqueda.ok) return undefined;
    const dataBusqueda = await resBusqueda.json();
    const negocios: YelpNegocio[] = Array.isArray(dataBusqueda?.businesses) ? dataBusqueda.businesses : [];
    const candidatos = negocios.flatMap((b) => {
      if (!b.coordinates) return [];
      return [{ nombre: b.name, lat: b.coordinates.latitude, lon: b.coordinates.longitude, raw: b }];
    });
    const elegido = mejorCoincidencia(candidatos, nombre, lat, lon);
    if (!elegido) return undefined;

    // El horario real no viene en la búsqueda: hace falta el detalle del
    // negocio. Un fallo aquí no descarta lo que ya tenemos (precio,
    // dirección, categorías) — el horario simplemente queda sin dato.
    let horario: string | undefined;
    let abiertoAhora: boolean | undefined;
    try {
      const resDetalle = await fetch(`https://api.yelp.com/v3/businesses/${elegido.raw.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (resDetalle.ok) {
        const detalle = await resDetalle.json();
        const bloqueHorario = Array.isArray(detalle?.hours) ? detalle.hours[0] : undefined;
        if (bloqueHorario?.open) {
          horario = formatearHorarioYelp(bloqueHorario.open);
          abiertoAhora = typeof bloqueHorario.is_open_now === "boolean" ? bloqueHorario.is_open_now : undefined;
        }
      }
    } catch {
      // Silencioso: el resto del dato de Yelp (precio, dirección) sigue siendo válido.
    }

    return {
      nombre: elegido.raw.name,
      horario,
      rangoPrecios: elegido.raw.price,
      direccion: elegido.raw.location?.display_address?.join(", "),
      categorias: elegido.raw.categories?.map((c) => c.title) ?? [],
      distanciaMetros: Math.round(distanciaMetros(lat, lon, elegido.lat, elegido.lon)),
      abiertoAhora,
    };
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  const nombre = req.nextUrl.searchParams.get("nombre")?.trim();
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  const esGastronomico = req.nextUrl.searchParams.get("gastronomico") === "1";

  if (!nombre || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ configurado: false, foursquare: null, yelp: null });
  }

  const foursquareKey = process.env.FOURSQUARE_API_KEY;
  const yelpKey = process.env.YELP_API_KEY;

  // Sin ninguna clave no hay nada que consultar: se dice explícitamente
  // para que el cliente deje de preguntar por cada sitio en vez de hacer
  // una llamada por lugar que siempre va a volver vacía.
  if (!foursquareKey && !yelpKey) {
    return NextResponse.json({ configurado: false, foursquare: null, yelp: null });
  }

  const [foursquare, yelp] = await Promise.all([
    foursquareKey ? buscarFoursquare(nombre, lat, lon, foursquareKey) : Promise.resolve(undefined),
    // Yelp es específicamente para gastronomía (horarios y precio de
    // restaurantes/bares/cafés): pedirlo para un museo o un parque no
    // tiene sentido y sería gastar la cuota gratuita de la API en vano.
    yelpKey && esGastronomico ? buscarYelp(nombre, lat, lon, yelpKey) : Promise.resolve(undefined),
  ]);

  return NextResponse.json({ configurado: true, foursquare: foursquare ?? null, yelp: yelp ?? null });
}
