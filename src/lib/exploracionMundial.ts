// "I don't know where to go, but I know what I want to do."
//
// This is the reverse of the rest of the app: there is no destination
// yet, only a wish ("diving", "northern lights", "quiet mountains").
// The road has to be walked backwards — from the wish to the place on
// Earth where that happens.
//
// The source is Wikivoyage, the free travel guide — the same one the app
// already uses for each city's guide. Free, no key, and above all
// written by travellers describing what you actually do in each place:
// searching "diving reef" there returns the articles of the places where
// people really dive, not a list we made up.
//
// Hard rule: no place is ever suggested that doesn't come from a real
// article, and every card shows Wikivoyage's own text with its link. If
// a search finds nothing, we say so — we never pad the page.
//
// ── Why it scores instead of just listing ──────────────────────────────
// Someone who asks for "typical food, quiet, near villages, with nature"
// is not asking for four separate lists. Answering with "here you can
// dive, over there you can see stars" is answering a question nobody
// asked. So each wish becomes its own search, and a place scores one
// point per wish whose search returned it. A place Wikivoyage considers
// relevant for THREE of your four wishes ranks above one that only
// matches a single wish — and the card says which ones it covers, so the
// ranking is never a black box.

import { interpretarIntencion } from "./intencion";
import { resolverLugar } from "./lugares";
import { buscarPaisPorCodigo } from "./paises";
import { traducirAlIngles } from "./traduccion";
import type { CategoriaActividad } from "./types";

export interface Criterio {
  id: string;
  // What the traveller asked for, in their terms — this is what the card
  // shows as "covered", so it has to read like their own wish.
  etiqueta: string;
  consulta: string;
}

export interface DestinoSugerido {
  nombre: string;
  // Wikivoyage's own lead text, verbatim. Never a description we wrote.
  resumen: string;
  imagen?: string;
  lat: number;
  lon: number;
  url: string;
  paisCodigo?: string;
  paisNombre?: string;
  idioma: "es" | "en";
  // Which of the traveller's wishes this place covers, and how many.
  // Both are shown: a score without its reasons is just a number.
  cumple: Criterio[];
}

export interface ResultadoExploracion {
  sugerencias: DestinoSugerido[];
  criterios: Criterio[];
  // How many wishes the best result actually covers. When it is lower
  // than the number asked for, the page says so instead of quietly
  // presenting a partial match as if it were everything.
  mejorCobertura: number;
}

// What to search on Wikivoyage for each kind of plan. Not the interface
// label: what a destination article would actually say. A guide doesn't
// write "nautical", it writes "boat rental" and "marina".
const CRITERIO_POR_CATEGORIA: Partial<Record<CategoriaActividad, { etiqueta: string; consulta: string }>> = {
  naturaleza: { etiqueta: "nature", consulta: "hiking national park nature trails" },
  playa: { etiqueta: "beaches", consulta: "beach coast sand swimming" },
  nautica: { etiqueta: "water & boats", consulta: "diving snorkelling boat rental marina fishing" },
  aventura: { etiqueta: "adventure", consulta: "climbing rafting paragliding adventure sports" },
  fauna: { etiqueta: "wildlife", consulta: "wildlife birdwatching safari animals" },
  astronomia: { etiqueta: "stargazing", consulta: "northern lights observatory dark sky stargazing" },
  bienestar: { etiqueta: "hot springs & spa", consulta: "hot springs thermal baths spa" },
  museo: { etiqueta: "museums", consulta: "museum art history gallery" },
  espiritual: { etiqueta: "spiritual", consulta: "pilgrimage monastery temple sacred" },
  eventos: { etiqueta: "festivals", consulta: "festival carnival music event" },
  restaurante: { etiqueta: "local food", consulta: "local cuisine traditional food specialities market" },
  compras: { etiqueta: "markets & crafts", consulta: "market crafts shopping artisan" },
  experiencias: { etiqueta: "food & wine", consulta: "vineyards winery brewery food tour" },
  pueblos: { etiqueta: "villages", consulta: "historic village old town charming small town" },
  discoteca: { etiqueta: "nightlife", consulta: "nightlife bars live music clubs" },
  arte_urbano: { etiqueta: "street art", consulta: "street art murals graffiti" },
  ciencia: { etiqueta: "science & books", consulta: "library science planetarium" },
  memoria: { etiqueta: "history & memory", consulta: "memorial historic site heritage" },
  industrial: { etiqueta: "industrial heritage", consulta: "industrial heritage mine lighthouse mill" },
  todos: { etiqueta: "for all ages", consulta: "theme park aquarium zoo family friendly" },
  cine_teatro: { etiqueta: "theatre & cinema", consulta: "theatre opera cinema" },
  parque: { etiqueta: "parks & gardens", consulta: "park botanical garden" },
};

// Moods that aren't an activity but absolutely change which place fits.
// "Quiet" is a real requirement — ignoring it and returning a capital
// city would be answering a different question.
const MATICES: { patron: RegExp; etiqueta: string; consulta: string }[] = [
  { patron: /\b(tranquil|quiet|calm|peace|relax|sin gente|uncrowded|secluded|remote|no crowds|not crowded|few tourists|off the beaten)/i, etiqueta: "quiet", consulta: "quiet peaceful uncrowded relaxed" },
  { patron: /\b(barato|cheap|budget|econom|affordable)/i, etiqueta: "affordable", consulta: "budget cheap affordable" },
  { patron: /\b(lujo|luxur|exclusiv)/i, etiqueta: "upscale", consulta: "luxury upscale resort" },
  { patron: /\b(frio|cold|nieve|snow|winter|invierno)/i, etiqueta: "cold climate", consulta: "snow winter cold mountains" },
  { patron: /\b(calor|warm|tropical|sol\b|sunny)/i, etiqueta: "warm climate", consulta: "tropical warm sunny climate" },
];

interface PaginaWiki {
  title?: string;
  extract?: string;
  coordinates?: { lat?: number; lon?: number }[];
  thumbnail?: { source?: string };
}

// Real Wikivoyage articles that are not a destination: topics,
// itineraries, phrasebooks. Most fall out for having no coordinates, but
// a few do have them, and passing one off as "a place to go" would be
// misleading.
const NO_ES_DESTINO = /^(wikivoyage|wikiviajes|category|categor[ií]a|template|plantilla|help|ayuda|user|usuario|talk)\s*:/i;

async function buscar(consulta: string, idioma: "es" | "en", señal?: AbortSignal): Promise<DestinoSugerido[]> {
  // generator=search chains the search with the properties in ONE
  // request: without it each wish would cost two round trips, and there
  // are several wishes per exploration.
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: consulta,
    gsrlimit: "14",
    gsrnamespace: "0",
    prop: "coordinates|extracts|pageimages",
    exintro: "1",
    explaintext: "1",
    piprop: "thumbnail",
    pithumbsize: "400",
    format: "json",
    origin: "*",
  });

  try {
    const res = await fetch(`https://${idioma}.wikivoyage.org/w/api.php?${params}`, { signal: señal });
    if (!res.ok) return [];
    const datos = await res.json();
    const paginas: Record<string, PaginaWiki> = datos?.query?.pages ?? {};
    const salida: DestinoSugerido[] = [];

    for (const pagina of Object.values(paginas)) {
      const nombre = pagina.title?.trim();
      if (!nombre || NO_ES_DESTINO.test(nombre)) continue;
      // Proof that this is a PLACE and not a topic: it sits on the map.
      // An article about "Diving" has no coordinates; Bonaire does.
      const coord = pagina.coordinates?.[0];
      if (typeof coord?.lat !== "number" || typeof coord?.lon !== "number") continue;
      const resumen = pagina.extract?.trim();
      // With nothing to say, the card would be a bare name — exactly the
      // empty box this app is trying not to produce.
      if (!resumen) continue;

      const lugar = resolverLugar(nombre);
      const pais = buscarPaisPorCodigo(lugar?.paisCodigo);

      salida.push({
        nombre,
        resumen,
        imagen: pagina.thumbnail?.source,
        lat: coord.lat,
        lon: coord.lon,
        url: `https://${idioma}.wikivoyage.org/wiki/${encodeURIComponent(nombre.replace(/ /g, "_"))}`,
        // Only when we actually know it: if the name isn't in the
        // dictionary the card stays silent rather than guessing.
        paisCodigo: pais?.codigo,
        paisNombre: pais?.nombre,
        idioma,
        cumple: [],
      });
    }
    return salida;
  } catch {
    return [];
  }
}

function recortar(texto: string, maximo = 260): string {
  if (texto.length <= maximo) return texto;
  const corte = texto.slice(0, maximo);
  const punto = corte.lastIndexOf(". ");
  return punto > 80 ? corte.slice(0, punto + 1) : `${corte.trimEnd()}…`;
}

// Each wish becomes its own criterion, so that later we can say how many
// of them a place covers. Without splitting them there is no way to tell
// "matches everything you asked for" from "matches one thing".
export function criteriosDe(texto: string): Criterio[] {
  const criterios: Criterio[] = [];
  const vistos = new Set<string>();

  for (const categoria of interpretarIntencion(texto)) {
    const c = CRITERIO_POR_CATEGORIA[categoria];
    if (c && !vistos.has(c.etiqueta)) {
      vistos.add(c.etiqueta);
      criterios.push({ id: categoria, etiqueta: c.etiqueta, consulta: c.consulta });
    }
  }

  for (const matiz of MATICES) {
    if (matiz.patron.test(texto) && !vistos.has(matiz.etiqueta)) {
      vistos.add(matiz.etiqueta);
      criterios.push({ id: matiz.etiqueta, etiqueta: matiz.etiqueta, consulta: matiz.consulta });
    }
  }

  return criterios.slice(0, 6);
}

export async function explorarElMundo(texto: string, señal?: AbortSignal): Promise<ResultadoExploracion> {
  const criterios = criteriosDe(texto);
  if (criterios.length === 0) return { sugerencias: [], criterios: [], mejorCobertura: 0 };

  // English Wikivoyage first, on purpose: it has several times more
  // destination articles than the Spanish one, so asking it first is the
  // difference between a real answer and "nothing found" for anything
  // slightly specific. Spanish is added on top, never instead.
  const idiomas: ("es" | "en")[] = ["en", "es"];
  const lotes = await Promise.all(
    criterios.flatMap((c) => idiomas.map(async (idioma) => ({ criterio: c, resultados: await buscar(c.consulta, idioma, señal) })))
  );

  // One entry per place, accumulating which wishes it covers. The same
  // place showing up in three different searches IS the signal: it means
  // Wikivoyage considers it relevant for all three.
  const porLugar = new Map<string, DestinoSugerido>();
  for (const { criterio, resultados } of lotes) {
    for (const destino of resultados) {
      const clave = destino.nombre.toLowerCase();
      const existente = porLugar.get(clave);
      if (!existente) {
        porLugar.set(clave, { ...destino, resumen: recortar(destino.resumen), cumple: [criterio] });
        continue;
      }
      if (!existente.cumple.some((c) => c.id === criterio.id)) existente.cumple.push(criterio);
      // Prefer the version with a picture either way; between the two
      // languages, prefer English when the place has an article there —
      // the rest of the page is in English, so that's the consistent
      // choice, not a value judgement on which article is "better". A
      // place found ONLY in Spanish is never dropped for this: it just
      // gets translated below instead of losing it — the goal is the
      // most real options for the traveller, not language purity.
      if (!existente.imagen && destino.imagen) existente.imagen = destino.imagen;
      if (existente.idioma === "es" && destino.idioma === "en") {
        existente.url = destino.url;
        existente.idioma = "en";
        existente.resumen = recortar(destino.resumen);
      }
    }
  }

  // A place whose only real article is in Spanish keeps its spot — it's
  // still a genuine option, dropping it would shrink the results for no
  // real gain — but its text gets translated so the page doesn't mix
  // languages, the same way Wikivoyage content is already translated
  // for each city's own guide (see wikivoyage.ts).
  const traducidas = await Promise.all(
    [...porLugar.values()].map(async (d) => (d.idioma === "en" ? d : { ...d, resumen: await traducirAlIngles(d.resumen, "es") }))
  );

  const ordenadas = traducidas.sort(
    (a, b) => b.cumple.length - a.cumple.length || a.nombre.localeCompare(b.nombre)
  );
  const mejorCobertura = ordenadas[0]?.cumple.length ?? 0;

  // When several wishes were asked for, a place covering only one is
  // noise: it's the "over there you can dive" answer to a question that
  // asked for four things at once. Below the best coverage by more than
  // one point, it stops being an answer.
  const minimo = criterios.length > 1 ? Math.max(2, mejorCobertura - 1) : 1;
  const utiles = ordenadas.filter((d) => d.cumple.length >= minimo);

  return { sugerencias: (utiles.length ? utiles : ordenadas).slice(0, 18), criterios, mejorCobertura };
}
