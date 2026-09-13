// Puente entre lo que investiga el Travel Brain y lo que ve el viajero.
//
// El orquestador consulta de verdad Overpass, Open-Meteo y Frankfurter en
// cada análisis, y devuelve la respuesta completa al navegador. Hasta
// ahora la interfaz se quedaba solo con los nombres de los lugares y
// tiraba todo lo demás: se pagaba la espera de esas consultas y no se
// mostraba nada.
//
// Aquí esa respuesta se recorta a lo que de verdad sirve en pantalla y a
// un tamaño que quepa en localStorage (las respuestas de Overpass traen
// decenas de elementos por categoría y por lugar, con toda su etiquetería).

import type { CategoriaActividad } from "./types";
import { distanciaMetros } from "./geoAudio";

// Sube cuando cambia de raíz CÓMO se busca resumenWikipedia por sitio (una
// estrategia de búsqueda mejor, no solo más categorías elegibles). Un
// sitio ya marcado como "" (sin artículo) bajo una versión de búsqueda
// anterior no debe quedarse así para siempre solo porque esa búsqueda
// vieja no lo encontró: se reintenta con la versión vigente.
export const VERSION_ENRIQUECIMIENTO_SITIO = 4;

export interface SitioReal {
  nombre: string;
  categoria: CategoriaActividad;
  detalle?: string;
  lat?: number;
  lon?: number;
  url?: string;
  precioAprox?: string;
  horarioApertura?: string;
  horarioCierre?: string;
  boleteria?: string;
  // Resumen real de Wikipedia sobre ESTE sitio en concreto (no la ciudad):
  // solo existe si el lugar tiene su propio artículo — un parque grande y
  // conocido puede tenerlo (y contar qué hay de verdad ahí: aves, un
  // monumento, su historia), uno chico normalmente no. Cadena vacía "" =
  // ya se buscó y no hay artículo (para no repetir la búsqueda);
  // undefined = todavía no se buscó.
  resumenWikipedia?: string;
  // Con qué versión de la búsqueda (VERSION_ENRIQUECIMIENTO_SITIO) se
  // obtuvo resumenWikipedia. undefined (viajes de antes de este campo) o
  // distinta de la vigente = se reintenta con la estrategia actual, en
  // vez de confiar para siempre en el resultado de una búsqueda peor.
  versionResumen?: number;
  // Solo se busca cuando este sitio NO tiene resumenWikipedia (ni lo va a
  // tener): qué hay de verdad alrededor según OpenStreetMap — bancos,
  // heladería, baños... para no dejar la tarjeta en la categoría sola.
  // Mismo patrón de cadena vacía "" / undefined que resumenWikipedia.
  entornoCercano?: string;
  // Cuando el propio colaborador de OpenStreetMap ya enlazó este sitio a
  // su artículo real de Wikipedia o a su entidad de Wikidata (etiquetas
  // wikipedia=/wikidata=), se usa ESE enlace directo antes que buscar por
  // nombre o coordenadas — no es adivinar cuál es el artículo correcto,
  // es leer el enlace que OSM ya dejó hecho. No siempre está presente.
  enlaceWikipedia?: string;
  enlaceWikidata?: string;
  // Último recurso, solo si ni Wikipedia ni lo que hay alrededor (OSM)
  // tuvieron nada: un fragmento real de una búsqueda web (blogs, foros,
  // reseñas — cuando está configurada, ver src/lib/busquedaWeb.ts), con
  // su fuente citada. Mismo patrón "" / undefined que los anteriores.
  resumenWeb?: string;
  // Tipo de cocina real, cuando OpenStreetMap lo trae etiquetado
  // (cuisine=colombian;grill, etc.): "en este restaurante puedes comer
  // X" es justo lo que hace falta para decidir si vale la pena, no solo
  // "Restaurante." — pero solo se muestra si el dato existe de verdad,
  // nunca se adivina la especialidad de un sitio.
  cocina?: string;
  // Lo que aporta el pipeline comercial (Foursquare/Yelp, ver
  // src/lib/enriquecimiento.ts) cuando OpenStreetMap no trae horario,
  // precio ni dirección — que es el caso más común y justo el dato que
  // más se echa en falta al decidir si ir. Solo se rellena si esas
  // fuentes están configuradas Y encontraron ESTE sitio (validado por
  // nombre + coordenadas); si no, quedan sin dato, nunca inventados.
  // Mismo patrón "" / undefined: "" = ya se consultó y no había.
  horarioComercial?: string;
  precioComercial?: string;
  direccionComercial?: string;
  // De dónde salió este sitio. Sin marcar = OpenStreetMap (el caso
  // normal). "wikidata" = lo trajo el descubrimiento por cercanía, que
  // encuentra lo que está fuera del casco urbano (termales, cascadas,
  // pueblos) y que OSM no tiene bien etiquetado a esa distancia.
  fuente?: "wikidata";
}

export interface DiaClima {
  fecha: string;
  minC?: number;
  maxC?: number;
  probabilidadLluvia?: number;
}

export interface ClimaLugar {
  lugar: string;
  actualC?: number;
  dias: DiaClima[];
}

export interface CambioMoneda {
  base: string;
  fecha: string;
  tasas: Record<string, number>;
}

export interface AuditoriaCapacidades {
  operativas: string[];
  parciales: string[];
  bloqueadas: string[];
  fallidas: string[];
  noEjercidas: string[];
}

// Se sube cada vez que cambia de raíz cómo se investiga o categoriza (una
// nueva fuente, una corrección de categoría, una extracción de dato que
// antes no se leía). Un viaje ya creado guarda su investigación con la
// versión vigente al momento de analizarse: si desde entonces subió el
// número, esa investigación quedó desactualizada aunque nadie la haya
// tocado, y conviene volver a correrla en vez de esperar a que alguien
// recuerde tocar "Actualizar investigación real".
export const VERSION_INVESTIGACION = 7;

export interface Investigacion {
  generadoEn: string;
  version: number;
  clima: ClimaLugar[];
  // Por nombre de lugar: en un circuito cada parada tiene los suyos.
  sitios: Record<string, SitioReal[]>;
  moneda?: CambioMoneda;
  auditoria: AuditoriaCapacidades;
  fuentes: string[];
  // Por ciudad, con qué versión del descubrimiento por cercanía
  // (Wikidata) se completó ya. Sirve para no repetir la consulta en cada
  // visita y, a la vez, para volver a lanzarla sola cuando la forma de
  // descubrir mejore — sin que nadie tenga que revisar ciudad por ciudad
  // si le falta información.
  descubrimiento?: Record<string, number>;
}

// Dominios cuyos resultados son sitios reales navegables (los que buscan en
// OpenStreetMap). "accommodation" queda fuera: eso lo cubre su propia
// sección, no tiene sentido como "actividad".
const DOMINIOS_CON_SITIOS = new Set(["gastronomy", "culture", "nature", "experiences"]);

// Traducción de las etiquetas de OpenStreetMap a algo legible. Solo las
// que se entienden sin contexto: el resto no se muestra en vez de
// enseñar una clave técnica.
const DETALLE_OSM: Record<string, string> = {
  restaurant: "restaurante",
  cafe: "cafetería",
  fast_food: "comida rápida",
  bar: "bar",
  museum: "museo",
  gallery: "galería",
  attraction: "atracción",
  viewpoint: "mirador",
  park: "parque",
  nature_reserve: "reserva natural",
  beach: "playa",
  waterfall: "cascada",
  artwork: "obra de arte",
  monument: "monumento",
  memorial: "memorial",
  castle: "castillo",
  ruins: "ruinas",
  archaeological_site: "yacimiento arqueológico",
  pub: "pub",
  nightclub: "discoteca",
  biergarten: "terraza / jardín de cerveza",
  gift: "tienda de regalos",
  souvenir: "tienda de souvenirs",
  craft: "artesanía",
  art: "galería de arte",
  deli: "delicatessen",
  hot_spring: "aguas termales",
  theme_park: "parque temático",
  water_park: "parque acuático",
};

const MAX_POR_CATEGORIA = 8;

// Franjas de distancia al centro, en metros: lo que está a mano, lo que
// es una salida corta y lo que es la excursión del día (un pueblo vecino
// con termales, una cascada, un parque natural).
const FRANJAS_METROS = [3000, 15000, Infinity];

// Intercala candidatos de cada franja (el más cercano de cada una, por
// turnos) en vez de listarlos del más cercano al más lejano. Así, cuando
// después se recorta al cupo por categoría, sobreviven sitios de las tres
// distancias y no solo los del centro.
function repartirPorFranjas<T extends { lat?: number; lon?: number; center?: { lat?: number; lon?: number } }>(
  elementos: T[],
  destLat: number,
  destLon: number
): T[] {
  const grupos: T[][] = FRANJAS_METROS.map(() => []);
  const sinCoordenadas: T[] = [];

  for (const el of elementos) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) {
      sinCoordenadas.push(el);
      continue;
    }
    const distancia = distanciaMetros(destLat, destLon, lat, lon);
    const indice = FRANJAS_METROS.findIndex((limite) => distancia <= limite);
    grupos[indice === -1 ? grupos.length - 1 : indice].push(el);
  }

  for (const grupo of grupos) {
    grupo.sort((a, b) => {
      const distA = distanciaMetros(destLat, destLon, a.lat ?? a.center!.lat!, a.lon ?? a.center!.lon!);
      const distB = distanciaMetros(destLat, destLon, b.lat ?? b.center!.lat!, b.lon ?? b.center!.lon!);
      return distA - distB;
    });
  }

  const intercalados: T[] = [];
  const maximo = Math.max(...grupos.map((g) => g.length));
  for (let i = 0; i < maximo; i++) {
    for (const grupo of grupos) {
      if (grupo[i]) intercalados.push(grupo[i]);
    }
  }
  // Sin coordenadas no se puede decidir la franja, pero siguen siendo
  // sitios reales con nombre: van al final, nunca se descartan.
  return [...intercalados, ...sinCoordenadas];
}

interface ElementoOverpass {
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

function detalleDe(tags: Record<string, string> = {}): string | undefined {
  for (const clave of ["amenity", "tourism", "leisure", "natural", "historic", "shop"]) {
    const valor = tags[clave];
    if (valor && DETALLE_OSM[valor]) return DETALLE_OSM[valor];
  }
  return undefined;
}

interface ResultadoBruto {
  task?: { domain?: string };
  status?: string;
  data?: unknown;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

// Cada ResearchResult que llega aquí trae su data envuelta como
// { findings, requirements, agents, agentResults } (departmentRunner.ts).
// Lo único que interesa para mostrar en pantalla son los "findings": la
// lista real de { destination, result } que cada proveedor devolvió.
function findingsDe(data: unknown): unknown[] {
  if (!esObjeto(data)) return [];
  return Array.isArray(data.findings) ? data.findings : [];
}

// La categoría real de cada sitio se saca de su propia etiqueta de
// OpenStreetMap, no de qué dominio lo buscó. Playas, parques, senderos y
// reservas naturales van todos bajo "naturaleza": separarlos en cajas
// propias (Parques / Playa / Naturaleza) fragmentaba demasiado la
// selección para algo que el viajero piensa como un solo tipo de plan —
// el tipo exacto (playa, parque, mirador...) se sigue viendo en el
// detalle de cada tarjeta, solo que ya no como categoría aparte.
function categoriaDeTags(tags: Record<string, string> = {}, dominio: string): CategoriaActividad {
  if (
    tags.natural === "beach" ||
    tags.leisure === "park" ||
    tags.leisure === "nature_reserve" ||
    tags.tourism === "viewpoint" ||
    tags.natural === "waterfall" ||
    tags.natural === "hot_spring" ||
    tags.tourism === "theme_park" ||
    tags.leisure === "water_park"
  )
    return "naturaleza";
  if (tags.amenity === "bar" || tags.amenity === "pub" || tags.amenity === "nightclub" || tags.amenity === "biergarten") return "discoteca";
  if (tags.amenity === "restaurant" || tags.amenity === "cafe" || tags.amenity === "fast_food") return "restaurante";
  if (tags.tourism === "museum" || tags.tourism === "gallery" || tags.historic) return "museo";
  if (tags.shop) return "compras";
  if (dominio === "gastronomy") return "restaurante";
  if (dominio === "culture") return "museo";
  if (dominio === "nature") return "naturaleza";
  return "otro";
}

// El formato crudo de "opening_hours" en OpenStreetMap es una sintaxis
// propia (https://wiki.openstreetmap.org/wiki/Key:opening_hours), no un
// texto pensado para leerse: mezcla la regla semanal habitual con
// excepciones por fecha ("Jan 01 12:00-02:00; Dec 25 off"), en cualquier
// orden. Mostrarlo tal cual es ilegible y no cabe en una etiqueta. Aquí se
// queda solo con las reglas de días de la semana (las que de verdad
// importan para planear una visita) y se traducen las abreviaturas al
// español; las excepciones por fecha puntual se descartan en vez de
// mostrarse a medias.
const DIA_ES: Record<string, string> = { Mo: "Lu", Tu: "Ma", We: "Mi", Th: "Ju", Fr: "Vi", Sa: "Sá", Su: "Do" };

function formatearHorario(raw: string): string | undefined {
  const clausulas = raw.split(";").map((c) => c.trim()).filter(Boolean);
  const semanales = clausulas.filter((c) => /^(Mo|Tu|We|Th|Fr|Sa|Su)([-,]|\s)/i.test(c) || /^24\/7$/i.test(c));
  if (semanales.length === 0) return undefined;
  return semanales
    .slice(0, 2)
    .map((c) => c.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (m) => DIA_ES[m] ?? m))
    .join(" / ");
}

// OSM sí trae horario, web y a veces precio para muchos sitios — no
// leerlos era la causa real de "no hay información de valor, solo
// 'consultar precio'": el dato existía en la fuente y no se aprovechaba.
function horarioDe(tags: Record<string, string> = {}): string | undefined {
  return tags.opening_hours ? formatearHorario(tags.opening_hours) : undefined;
}
function webDe(tags: Record<string, string> = {}): string | undefined {
  const url = tags.website ?? tags["contact:website"];
  return url && /^https?:\/\//.test(url) ? url : undefined;
}
function precioDe(tags: Record<string, string> = {}): string | undefined {
  if (tags.charge) return tags.charge;
  if (tags.fee === "no") return "Gratis";
  return undefined;
}

// La etiqueta "cuisine" de OpenStreetMap es justo el dato que hace falta
// para saber "qué se come aquí" sin buscar por fuera — pero llega en
// claves técnicas en inglés ("steak_house", "regional") separadas por
// ";". Solo se traducen las que se entienden sin contexto; el resto se
// descarta en vez de mostrar la clave cruda.
const CUISINE_ES: Record<string, string> = {
  colombian: "colombiana",
  regional: "regional",
  local: "local",
  latin_american: "latinoamericana",
  international: "internacional",
  grill: "parrilla",
  steak_house: "carnes",
  seafood: "mariscos",
  fish: "pescado",
  vegetarian: "vegetariana",
  vegan: "vegana",
  pizza: "pizza",
  italian: "italiana",
  mexican: "mexicana",
  peruvian: "peruana",
  argentinian: "argentina",
  venezuelan: "venezolana",
  spanish: "española",
  french: "francesa",
  chinese: "china",
  japanese: "japonesa",
  sushi: "sushi",
  asian: "asiática",
  thai: "tailandesa",
  indian: "india",
  american: "estadounidense",
  burger: "hamburguesas",
  chicken: "pollo",
  sandwich: "sándwiches",
  breakfast: "desayunos",
  coffee_shop: "café",
  bakery: "panadería",
  dessert: "postres",
  ice_cream: "helados",
  arepa: "arepas",
  empanada: "empanadas",
};

function cocinaDe(tags: Record<string, string> = {}): string | undefined {
  const crudo = tags.cuisine;
  if (!crudo) return undefined;
  const traducidas = crudo
    .split(/[;,]/)
    .map((v) => CUISINE_ES[v.trim().toLowerCase()])
    .filter((v): v is string => Boolean(v));
  const unicas = [...new Set(traducidas)];
  return unicas.length > 0 ? unicas.join(", ") : undefined;
}

// Los nombres de cadena real (no la etiqueta OSM de "comida rápida" o
// "cafetería", que ya se usaba, sino la marca en sí) tampoco deberían
// ser lo primero que se destaca al pedir algo "típico": una cadena
// puede estar tageada como restaurante normal en OSM (Crepes & Waffles,
// por ejemplo, no es "fast_food") y aun así ser justo lo contrario de
// lo que alguien busca al pedir gastronomía local. Lista acotada a
// marcas reales y reconocibles — nunca se "adivina" que algo es cadena
// solo por su tipo de comida.
const NOMBRES_CADENA = [
  "mcdonald", "burger king", "kfc", "subway", "starbucks", "domino's", "dominos",
  "pizza hut", "dunkin", "papa john", "wendy's", "wendys", "popeyes", "dairy queen",
  "little caesars", "cinnabon", "baskin robbins", "taco bell", "carl's jr", "chili's",
  "tgi friday", "hooters", "applebee",
  "crepes & waffles", "crepes y waffles", "el corral", "presto", "frisby", "kokoriko",
  "archie's", "archies", "juan valdez", "oma", "sandwich qbano", "tostao", "jeno's pizza",
  "el corral gourmet", "sanduq", "el sitio", "cosechas", "bogotá beer company",
];

export function esCadenaConocida(nombre: string): boolean {
  const normal = nombre.toLowerCase();
  return NOMBRES_CADENA.some((marca) => normal.includes(marca));
}

function extraerSitios(findings: unknown[], dominio: string): { lugar: string; sitios: SitioReal[] }[] {
  const salida: { lugar: string; sitios: SitioReal[] }[] = [];

  for (const entrada of findings) {
    if (!esObjeto(entrada)) continue;
    const destino = esObjeto(entrada.destination) ? entrada.destination : undefined;
    const lugar = typeof destino?.name === "string" ? destino.name : undefined;
    const destLat = typeof destino?.latitude === "number" ? destino.latitude : undefined;
    const destLon = typeof destino?.longitude === "number" ? destino.longitude : undefined;
    const resultado = esObjeto(entrada.result) ? entrada.result : undefined;
    let elementos = Array.isArray(resultado?.elements) ? (resultado.elements as ElementoOverpass[]) : [];
    if (!lugar || elementos.length === 0) continue;

    // Ordenar por pura cercanía tenía un efecto perverso: como el cupo por
    // categoría es pequeño, los sitios del propio centro se lo comían
    // entero y lo que está a 10-25 km no entraba NUNCA. En Pereira eso
    // significaba cuatro parques de barrio en "naturaleza" y ni rastro de
    // los termales de Santa Rosa, las cascadas de La Florida o los
    // parques temáticos — que es justo a lo que va la gente.
    //
    // Se reparte el cupo por franjas de distancia: lo que tienes al lado,
    // lo que está a un rato en coche y la excursión del día. Dentro de
    // cada franja sigue mandando la cercanía, así que no se pierde el
    // criterio, solo deja de ser lo único que decide.
    if (destLat !== undefined && destLon !== undefined) {
      elementos = repartirPorFranjas(elementos, destLat, destLon);
    }

    const vistos = new Set<string>();
    // El límite es por categoría real, no por lote entero: así unos pocos
    // resultados de un tipo (p. ej. restaurantes, que suele ser el tipo
    // con más etiquetas en OSM) no desplazan a los de otro tipo (p. ej.
    // vida nocturna) que llegaron en el mismo lote.
    const porCategoria = new Map<CategoriaActividad, number>();
    const sitios: SitioReal[] = [];
    for (const el of elementos) {
      // Sin nombre no sirve de nada: un punto anónimo en el mapa no es un
      // sitio al que alguien pueda ir.
      const nombre = el.tags?.name?.trim();
      if (!nombre || vistos.has(nombre.toLowerCase())) continue;
      const categoria = categoriaDeTags(el.tags, dominio);
      const cuenta = porCategoria.get(categoria) ?? 0;
      if (cuenta >= MAX_POR_CATEGORIA) continue;
      vistos.add(nombre.toLowerCase());
      porCategoria.set(categoria, cuenta + 1);
      sitios.push({
        nombre,
        categoria,
        detalle: detalleDe(el.tags),
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
        horarioApertura: horarioDe(el.tags),
        url: webDe(el.tags),
        precioAprox: precioDe(el.tags),
        enlaceWikipedia: el.tags?.wikipedia,
        enlaceWikidata: el.tags?.wikidata,
        cocina: cocinaDe(el.tags),
      });
    }
    if (sitios.length) salida.push({ lugar, sitios });
  }

  return salida;
}

// El proveedor de clima (domainProviders.ts) devuelve la respuesta cruda de
// Open-Meteo tal cual: "current"/"daily" en snake_case y los días como
// listas paralelas (time[], temperature_2m_min[], ...), no como objetos.
function extraerClima(findings: unknown[]): ClimaLugar[] {
  const salida: ClimaLugar[] = [];

  for (const entrada of findings) {
    if (!esObjeto(entrada)) continue;
    const destino = esObjeto(entrada.destination) ? entrada.destination : undefined;
    const lugar = typeof destino?.name === "string" ? destino.name : undefined;
    const resultado = esObjeto(entrada.result) ? entrada.result : undefined;
    const actual = esObjeto(resultado?.current) ? resultado.current : undefined;
    const diario = esObjeto(resultado?.daily) ? resultado.daily : undefined;
    if (!lugar || !resultado) continue;

    const fechas = Array.isArray(diario?.time) ? (diario.time as unknown[]) : [];
    const minimos = Array.isArray(diario?.temperature_2m_min) ? (diario.temperature_2m_min as unknown[]) : [];
    const maximos = Array.isArray(diario?.temperature_2m_max) ? (diario.temperature_2m_max as unknown[]) : [];
    const probLluvia = Array.isArray(diario?.precipitation_probability_max) ? (diario.precipitation_probability_max as unknown[]) : [];

    salida.push({
      lugar,
      actualC: typeof actual?.temperature_2m === "number" ? actual.temperature_2m : undefined,
      // Una semana basta: más días ni caben en pantalla ni son fiables.
      dias: fechas.slice(0, 7).flatMap((fecha, i) => {
        if (typeof fecha !== "string") return [];
        return [{
          fecha,
          minC: typeof minimos[i] === "number" ? (minimos[i] as number) : undefined,
          maxC: typeof maximos[i] === "number" ? (maximos[i] as number) : undefined,
          probabilidadLluvia: typeof probLluvia[i] === "number" ? (probLluvia[i] as number) : undefined,
        }];
      }),
    });
  }

  return salida;
}

// El proveedor de moneda (domainProviders.ts) guarda la respuesta cruda de
// Frankfurter completa bajo la clave "rates" (junto a "destination" y
// "upstream"), así que el objeto que interesa está un nivel más adentro:
// finding.result.rates = { amount, base, date, rates: {...} }.
function extraerMoneda(findings: unknown[]): CambioMoneda | undefined {
  const primero = findings.find(esObjeto) as Record<string, unknown> | undefined;
  if (!primero) return undefined;
  const resultado = esObjeto(primero.result) ? primero.result : undefined;
  const frankfurter = esObjeto(resultado?.rates) ? resultado.rates : undefined;
  const base = typeof frankfurter?.base === "string" ? frankfurter.base : undefined;
  const fecha = typeof frankfurter?.date === "string" ? frankfurter.date : undefined;
  const tasas = esObjeto(frankfurter?.rates) ? (frankfurter.rates as Record<string, number>) : undefined;
  if (!base || !fecha || !tasas) return undefined;
  return { base, fecha, tasas };
}

interface AnalisisBruto {
  results?: ResultadoBruto[];
  capabilityAudit?: {
    operational?: string[];
    partial?: string[];
    blocked?: string[];
    failed?: string[];
    notExercised?: string[];
  };
}

export function normalizarInvestigacion(bruto: AnalisisBruto | null | undefined): Investigacion | undefined {
  if (!bruto?.results?.length) return undefined;

  const sitios: Record<string, SitioReal[]> = {};
  let clima: ClimaLugar[] = [];
  let moneda: CambioMoneda | undefined;
  const fuentes = new Set<string>();

  for (const resultado of bruto.results) {
    const dominio = resultado.task?.domain;
    if (!dominio || resultado.status === "unavailable" || resultado.status === "error") continue;

    if (dominio === "weather") {
      clima = extraerClima(findingsDe(resultado.data));
      if (clima.length) fuentes.add("Open-Meteo");
      continue;
    }

    if (dominio === "currency") {
      moneda = extraerMoneda(findingsDe(resultado.data));
      if (moneda) fuentes.add("Frankfurter");
      continue;
    }

    if (!DOMINIOS_CON_SITIOS.has(dominio)) continue;
    for (const { lugar, sitios: encontrados } of extraerSitios(findingsDe(resultado.data), dominio)) {
      sitios[lugar] = [...(sitios[lugar] ?? []), ...encontrados];
      fuentes.add("OpenStreetMap");
    }
  }

  const auditoria: AuditoriaCapacidades = {
    operativas: bruto.capabilityAudit?.operational ?? [],
    parciales: bruto.capabilityAudit?.partial ?? [],
    bloqueadas: bruto.capabilityAudit?.blocked ?? [],
    fallidas: bruto.capabilityAudit?.failed ?? [],
    noEjercidas: bruto.capabilityAudit?.notExercised ?? [],
  };

  const hayAlgo = clima.length > 0 || Object.keys(sitios).length > 0 || moneda || auditoria.operativas.length > 0;
  if (!hayAlgo) return undefined;

  return { generadoEn: new Date().toISOString(), version: VERSION_INVESTIGACION, clima, sitios, moneda, auditoria, fuentes: [...fuentes] };
}

// Nombres legibles de los departamentos, para poder enseñar la auditoría
// sin que parezca la consola de un servidor.
export const NOMBRE_DOMINIO: Record<string, string> = {
  destination: "Destino",
  requirements: "Requisitos de entrada",
  laws: "Normas locales",
  emergency: "Emergencias",
  transport: "Transporte",
  accommodation: "Alojamiento",
  weather: "Clima",
  experiences: "Qué ver",
  culture: "Cultura",
  gastronomy: "Gastronomía",
  nature: "Naturaleza",
  events: "Eventos",
  language: "Idioma",
  currency: "Moneda",
  budget: "Presupuesto",
  expenses: "Gastos",
  map: "Mapa",
  offline: "Sin conexión",
  social: "Viaje compartido",
  memory: "Recuerdos",
};
