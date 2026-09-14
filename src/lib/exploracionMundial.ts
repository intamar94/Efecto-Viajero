// "No sé a dónde ir, pero sé qué quiero hacer."
//
// Es el caso contrario al de toda la app: aquí no hay destino todavía, y
// lo que hay es un deseo ("bucear", "ver auroras", "andar por montaña
// sin gente"). Hace falta recorrer el camino al revés: del deseo al
// lugar del mundo donde eso se hace.
//
// La fuente es Wikivoyage, la guía de viajes libre — la misma que ya usa
// la app para la guía de cada ciudad. Es gratis, sin clave y, sobre
// todo, está escrita por viajeros describiendo qué se hace en cada
// sitio: buscar "buceo arrecife" ahí devuelve los artículos de los
// lugares donde de verdad se bucea, no una lista inventada.
//
// Regla dura: NO se sugiere ningún lugar que no venga de un artículo
// real, y cada tarjeta enseña el texto tal cual lo escribió Wikivoyage,
// con su enlace. Si una búsqueda no da lugares, se dice; no se rellena.

import { interpretarIntencion } from "./intencion";
import { resolverLugar } from "./lugares";
import { buscarPaisPorCodigo } from "./paises";
import type { CategoriaActividad } from "./types";

export interface DestinoSugerido {
  nombre: string;
  // El texto de entrada del artículo de Wikivoyage, tal cual. Nunca una
  // descripción escrita por nosotros.
  resumen: string;
  imagen?: string;
  lat: number;
  lon: number;
  url: string;
  paisCodigo?: string;
  paisNombre?: string;
  idioma: "es" | "en";
  // Qué búsqueda lo trajo: así la persona ve por qué se le propone esto
  // y no un lugar salido de la nada.
  motivo: string;
}

export interface ResultadoExploracion {
  sugerencias: DestinoSugerido[];
  // Las búsquedas que de verdad se lanzaron contra Wikivoyage, para
  // poder enseñarlas: es la diferencia entre "esto salió de algún sitio"
  // y una caja negra.
  consultas: string[];
}

// Qué buscar en Wikivoyage para cada tipo de plan. No es la etiqueta de
// la interfaz: es lo que un artículo de destino diría de verdad. Una
// guía no dice "náutica", dice "alquiler de barcos" y "puerto
// deportivo".
const CONSULTA_POR_CATEGORIA: Partial<Record<CategoriaActividad, string>> = {
  naturaleza: "senderismo parque nacional naturaleza",
  playa: "playa costa arena",
  nautica: "buceo navegar puerto deportivo pesca",
  aventura: "escalada rafting parapente aventura",
  fauna: "avistamiento de aves fauna safari",
  astronomia: "auroras boreales observatorio cielo nocturno",
  bienestar: "aguas termales balneario spa",
  museo: "museo arte historia",
  espiritual: "peregrinación monasterio templo",
  eventos: "festival carnaval fiesta",
  restaurante: "gastronomía cocina local mercado",
  compras: "mercado artesanía compras",
  experiencias: "viñedos bodega ruta del vino",
  pueblos: "pueblo histórico casco antiguo",
  discoteca: "vida nocturna bares música en vivo",
  arte_urbano: "arte urbano murales",
  ciencia: "biblioteca ciencia planetario",
  memoria: "memoria histórica monumento",
  industrial: "patrimonio industrial mina faro",
  todos: "parque temático acuario zoológico en familia",
  cine_teatro: "teatro ópera cine",
  parque: "parque jardín botánico",
};

// Palabras que hablan de la logística del viaje, no de lo que se quiere
// hacer. Buscarlas en Wikivoyage solo mete ruido: "10 días en enero con
// mi pareja" no dice nada sobre QUÉ lugar encaja.
const RUIDO = new Set([
  "quiero", "quisiera", "queremos", "me", "gustaria", "gustaría", "busco", "buscamos", "tengo", "tenemos",
  "ir", "viajar", "visitar", "conocer", "hacer", "algun", "algún", "alguna", "sitio", "lugar", "lugares",
  "dias", "días", "dia", "día", "semana", "semanas", "mes", "meses", "noche", "noches", "finde",
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  "presupuesto", "euros", "dolares", "dólares", "barato", "barata", "economico", "económico",
  "con", "mi", "mis", "sin", "para", "por", "que", "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas",
  "y", "o", "en", "a", "al", "es", "son", "muy", "mas", "más", "pero", "como", "donde", "dónde", "algo",
  "pareja", "novia", "novio", "amigos", "familia", "solo", "sola", "nos", "nuestro", "nuestra",
  "vacaciones", "viaje", "libre", "tiempo",
]);

function palabrasUtiles(texto: string): string[] {
  return texto
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 && !RUIDO.has(p) && !/^\d+$/.test(p));
}

interface PaginaWiki {
  title?: string;
  extract?: string;
  coordinates?: { lat?: number; lon?: number }[];
  thumbnail?: { source?: string };
}

// Títulos que son artículos de Wikivoyage pero no un destino: temas,
// itinerarios, listas. Aunque casi todos caen ya por no tener
// coordenadas, algunos sí las tienen y colarlos como "un sitio al que
// ir" sería engañoso.
const NO_ES_DESTINO = /^(wikiviajes|wikivoyage|categor[ií]a|plantilla|ayuda|usuario|template|category|help|user)\s*:/i;

async function buscarEnWikivoyage(consulta: string, idioma: "es" | "en", señal?: AbortSignal): Promise<DestinoSugerido[]> {
  // generator=search encadena la búsqueda con las propiedades en UNA
  // sola petición: sin esto harían falta dos por consulta (buscar y
  // luego pedir coordenadas), y son varias consultas por exploración.
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: consulta,
    gsrlimit: "12",
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
      // La prueba de que es un LUGAR y no un tema: tiene coordenadas en
      // el mapa. Un artículo sobre "Buceo" no las tiene; Bonaire sí.
      const coord = pagina.coordinates?.[0];
      if (typeof coord?.lat !== "number" || typeof coord?.lon !== "number") continue;
      const resumen = pagina.extract?.trim();
      // Sin una línea que contar, la tarjeta sería un nombre suelto: eso
      // es justo el "cajón vacío" que no queremos.
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
        // Solo cuando lo sabemos de verdad: si el nombre no está en el
        // diccionario, la tarjeta no dice país en vez de adivinarlo.
        paisCodigo: pais?.codigo,
        paisNombre: pais?.nombre,
        idioma,
        motivo: consulta,
      });
    }
    return salida;
  } catch {
    return [];
  }
}

function primeraFrase(texto: string, maximo = 260): string {
  if (texto.length <= maximo) return texto;
  const corte = texto.slice(0, maximo);
  const punto = corte.lastIndexOf(". ");
  return punto > 80 ? corte.slice(0, punto + 1) : `${corte.trimEnd()}…`;
}

export async function explorarElMundo(texto: string, señal?: AbortSignal): Promise<ResultadoExploracion> {
  const palabras = palabrasUtiles(texto);
  const categorias = interpretarIntencion(texto);

  const consultas: string[] = [];
  // Primero las palabras de la propia persona: si dijo "arrecife" o
  // "auroras", eso es más preciso que cualquier consulta nuestra.
  if (palabras.length) consultas.push(palabras.slice(0, 6).join(" "));
  // Y después, lo que esas palabras significan en lenguaje de guía de
  // viajes: alguien que escribe "salir de fiesta" no encuentra nada
  // buscando esas palabras, pero sí buscando "vida nocturna".
  for (const categoria of categorias.slice(0, 3)) {
    const consulta = CONSULTA_POR_CATEGORIA[categoria];
    if (consulta && !consultas.includes(consulta)) consultas.push(consulta);
  }
  if (consultas.length === 0) return { sugerencias: [], consultas: [] };

  const lotes = await Promise.all(consultas.map((c) => buscarEnWikivoyage(c, "es", señal)));
  let encontrados = lotes.flat();

  // Wikivoyage en español es mucho más pequeño que el inglés. Si desde
  // aquí no sale casi nada, el mundo no se ha quedado sin sitios: se
  // pregunta a la edición inglesa antes de decir "no hay nada".
  if (encontrados.length < 5) {
    const enIngles = await Promise.all(consultas.map((c) => buscarEnWikivoyage(c, "en", señal)));
    encontrados = [...encontrados, ...enIngles.flat()];
  }

  // El mismo lugar puede salir en varias consultas (y en los dos
  // idiomas): gana el primero, que viene de la consulta más precisa.
  const porNombre = new Map<string, DestinoSugerido>();
  for (const d of encontrados) {
    const clave = d.nombre.toLowerCase();
    if (!porNombre.has(clave)) porNombre.set(clave, { ...d, resumen: primeraFrase(d.resumen) });
  }

  return { sugerencias: [...porNombre.values()].slice(0, 18), consultas };
}
