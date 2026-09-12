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

export interface Investigacion {
  generadoEn: string;
  clima: ClimaLugar[];
  // Por nombre de lugar: en un circuito cada parada tiene los suyos.
  sitios: Record<string, SitioReal[]>;
  moneda?: CambioMoneda;
  auditoria: AuditoriaCapacidades;
  fuentes: string[];
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
};

const MAX_POR_CATEGORIA = 8;

interface ElementoOverpass {
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

function detalleDe(tags: Record<string, string> = {}): string | undefined {
  for (const clave of ["amenity", "tourism", "leisure", "natural", "historic"]) {
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
// OpenStreetMap, no de qué dominio lo buscó: antes TODO lo que encontraba
// el dominio "nature" se guardaba como "naturaleza" genérica, así que una
// playa real (natural=beach) nunca aparecía como "🏖️ Playa" aunque el dato
// hubiera llegado — quedaba enterrada bajo una etiqueta más vaga. Solo se
// cae al dominio como pista general cuando la propia etiqueta no dice nada
// más específico.
function categoriaDeTags(tags: Record<string, string> = {}, dominio: string): CategoriaActividad {
  if (tags.natural === "beach") return "playa";
  if (tags.leisure === "park") return "parque";
  if (tags.leisure === "nature_reserve" || tags.tourism === "viewpoint" || tags.natural === "waterfall") return "naturaleza";
  if (tags.amenity === "bar" || tags.amenity === "pub" || tags.amenity === "nightclub") return "discoteca";
  if (tags.amenity === "restaurant" || tags.amenity === "cafe" || tags.amenity === "fast_food") return "restaurante";
  if (tags.tourism === "museum" || tags.tourism === "gallery" || tags.historic) return "museo";
  if (tags.shop) return "compras";
  if (dominio === "gastronomy") return "restaurante";
  if (dominio === "culture") return "museo";
  if (dominio === "nature") return "naturaleza";
  return "otro";
}

function extraerSitios(findings: unknown[], dominio: string): { lugar: string; sitios: SitioReal[] }[] {
  const salida: { lugar: string; sitios: SitioReal[] }[] = [];

  for (const entrada of findings) {
    if (!esObjeto(entrada)) continue;
    const destino = esObjeto(entrada.destination) ? entrada.destination : undefined;
    const lugar = typeof destino?.name === "string" ? destino.name : undefined;
    const resultado = esObjeto(entrada.result) ? entrada.result : undefined;
    const elementos = Array.isArray(resultado?.elements) ? (resultado.elements as ElementoOverpass[]) : [];
    if (!lugar || elementos.length === 0) continue;

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

  return { generadoEn: new Date().toISOString(), clima, sitios, moneda, auditoria, fuentes: [...fuentes] };
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
