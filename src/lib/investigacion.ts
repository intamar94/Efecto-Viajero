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

export type CategoriaSitio = "gastronomia" | "cultura" | "naturaleza" | "experiencias";

export interface SitioReal {
  nombre: string;
  categoria: CategoriaSitio;
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

const CATEGORIAS: Record<string, CategoriaSitio> = {
  gastronomy: "gastronomia",
  culture: "cultura",
  nature: "naturaleza",
  experiences: "experiencias",
};

export const ETIQUETA_CATEGORIA_SITIO: Record<CategoriaSitio, { etiqueta: string; icono: string }> = {
  gastronomia: { etiqueta: "Para comer", icono: "🍽️" },
  cultura: { etiqueta: "Cultura y museos", icono: "🏛️" },
  naturaleza: { etiqueta: "Naturaleza", icono: "🌿" },
  experiencias: { etiqueta: "Qué ver", icono: "🎟️" },
};

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

function extraerSitios(data: unknown, categoria: CategoriaSitio): { lugar: string; sitios: SitioReal[] }[] {
  if (!Array.isArray(data)) return [];
  const salida: { lugar: string; sitios: SitioReal[] }[] = [];

  for (const entrada of data) {
    if (!esObjeto(entrada)) continue;
    const destino = esObjeto(entrada.destination) ? entrada.destination : undefined;
    const lugar = typeof destino?.name === "string" ? destino.name : undefined;
    const resultado = esObjeto(entrada.result) ? entrada.result : undefined;
    const elementos = Array.isArray(resultado?.elements) ? (resultado.elements as ElementoOverpass[]) : [];
    if (!lugar || elementos.length === 0) continue;

    const vistos = new Set<string>();
    const sitios: SitioReal[] = [];
    for (const el of elementos) {
      // Sin nombre no sirve de nada: un punto anónimo en el mapa no es un
      // sitio al que alguien pueda ir.
      const nombre = el.tags?.name?.trim();
      if (!nombre || vistos.has(nombre.toLowerCase())) continue;
      vistos.add(nombre.toLowerCase());
      sitios.push({
        nombre,
        categoria,
        detalle: detalleDe(el.tags),
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
      });
      if (sitios.length >= MAX_POR_CATEGORIA) break;
    }
    if (sitios.length) salida.push({ lugar, sitios });
  }

  return salida;
}

function extraerClima(data: unknown): ClimaLugar[] {
  if (!Array.isArray(data)) return [];
  const salida: ClimaLugar[] = [];

  for (const entrada of data) {
    if (!esObjeto(entrada)) continue;
    const destino = esObjeto(entrada.destination) ? entrada.destination : undefined;
    const lugar = typeof destino?.name === "string" ? destino.name : undefined;
    const clima = esObjeto(entrada.weather) ? entrada.weather : undefined;
    if (!lugar || !clima) continue;

    const actual = esObjeto(clima.current) ? clima.current : undefined;
    const dias = Array.isArray(clima.daily) ? clima.daily : [];

    salida.push({
      lugar,
      actualC: typeof actual?.temperatureC === "number" ? actual.temperatureC : undefined,
      // Una semana basta: más días ni caben en pantalla ni son fiables.
      dias: dias.slice(0, 7).flatMap((d) => {
        if (!esObjeto(d) || typeof d.date !== "string") return [];
        return [{
          fecha: d.date,
          minC: typeof d.minC === "number" ? d.minC : undefined,
          maxC: typeof d.maxC === "number" ? d.maxC : undefined,
          probabilidadLluvia: typeof d.precipitationProbability === "number" ? d.precipitationProbability : undefined,
        }];
      }),
    });
  }

  return salida;
}

function extraerMoneda(data: unknown): CambioMoneda | undefined {
  if (!esObjeto(data)) return undefined;
  const resultado = esObjeto(data.result) ? data.result : undefined;
  const base = typeof resultado?.base === "string" ? resultado.base : undefined;
  const fecha = typeof resultado?.date === "string" ? resultado.date : undefined;
  const tasas = esObjeto(resultado?.rates) ? (resultado.rates as Record<string, number>) : undefined;
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
      clima = extraerClima(resultado.data);
      if (clima.length) fuentes.add("Open-Meteo");
      continue;
    }

    if (dominio === "currency") {
      moneda = extraerMoneda(resultado.data);
      if (moneda) fuentes.add("Frankfurter");
      continue;
    }

    const categoria = CATEGORIAS[dominio];
    if (!categoria) continue;
    for (const { lugar, sitios: encontrados } of extraerSitios(resultado.data, categoria)) {
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
