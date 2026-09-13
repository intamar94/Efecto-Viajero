// Pipeline de enriquecimiento de un lugar: une tres fuentes reales en un
// solo objeto por sitio.
//
// 1. Foursquare Places  — nombre/categoría/dirección (necesita clave).
// 2. Yelp Fusion        — horario y rango de precio, solo si es
//    gastronómico (necesita clave).
// 3. Wikidata/Wikipedia — descripción cultural del lugar, sin clave
//    (reutiliza obtenerResumenSitio, ya construido y usado en toda la
//    app) + platos típicos reales de la zona (catalogo.ts).
//
// Foursquare y Yelp corren en el servidor (/api/enriquecer-lugar) porque
// necesitan una clave secreta que nunca debe llegar al navegador — mismo
// patrón que /api/buscar-web con Google Search. Si el dueño de la app no
// configuró FOURSQUARE_API_KEY/YELP_API_KEY, esas dos fuentes
// simplemente no aparecen: el resto del objeto (cultural + platos
// típicos, que no necesitan clave) sigue completo igual.
//
// La unión entre fuentes se hace por nombre + coordenadas (ver
// mejorCoincidencia en la ruta del servidor): nunca se acepta a ciegas
// el primer resultado de una búsqueda por texto.

import { obtenerResumenSitio, type EnlacesOsm } from "./wikipedia";
import { platosTipicosDe } from "./catalogo";
import type { PlatoTipico, CategoriaActividad } from "./types";
import type { DatoFoursquare, DatoYelp } from "@/app/api/enriquecer-lugar/route";

export type { DatoFoursquare, DatoYelp };

export interface DatoCultural {
  descripcion: string;
  // Siempre es un extracto real de un artículo de Wikipedia — a veces
  // localizado cruzando primero por Wikidata (cuando OpenStreetMap
  // enlazaba a una entidad de Wikidata en vez de directo a un artículo),
  // pero el contenido mostrado es siempre el extracto de Wikipedia, así
  // que no se inventa una distinción de fuente que el dato de verdad no
  // permite hacer (obtenerResumenSitio siempre termina en un artículo de
  // Wikipedia, nunca deja el dato "en bruto" de Wikidata).
  fuente: "Wikipedia";
  url: string;
}

export interface LugarEnriquecido {
  nombre: string;
  lat: number;
  lon: number;
  foursquare?: DatoFoursquare;
  yelp?: DatoYelp;
  cultural?: DatoCultural;
  platosTipicos?: PlatoTipico[];
  // Auditoría honesta de qué fuentes de verdad aportaron algo a este
  // objeto — mismo espíritu que la auditoría de capacidades del resto
  // de la investigación de la app: nunca se presenta como completo lo
  // que en realidad vino de una sola fuente.
  fuentesEncontradas: string[];
}

const CATEGORIAS_GASTRONOMICAS: CategoriaActividad[] = ["restaurante", "discoteca"];

// Si ninguna de las dos fuentes comerciales está configurada, la ruta lo
// dice y no hace falta volver a preguntar por cada sitio del viaje: se
// recuerda para el resto de la sesión. Sin esto, un viaje con 20 sitios
// disparaba 20 llamadas que siempre iban a volver vacías.
let comercialesConfiguradas: boolean | undefined;

export function hayFuentesComerciales(): boolean {
  return comercialesConfiguradas !== false;
}

async function obtenerDatosComerciales(
  nombre: string,
  lat: number,
  lon: number,
  esGastronomico: boolean
): Promise<{ foursquare?: DatoFoursquare; yelp?: DatoYelp }> {
  if (comercialesConfiguradas === false) return {};
  try {
    const url = `/api/enriquecer-lugar?nombre=${encodeURIComponent(nombre)}&lat=${lat}&lon=${lon}${esGastronomico ? "&gastronomico=1" : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return {};
    const data = await res.json();
    if (typeof data?.configurado === "boolean") comercialesConfiguradas = data.configurado;
    return {
      foursquare: data?.foursquare ?? undefined,
      yelp: data?.yelp ?? undefined,
    };
  } catch {
    return {};
  }
}

export interface ParametrosEnriquecimiento {
  nombre: string;
  lat: number;
  lon: number;
  categoria?: CategoriaActividad;
  pais?: string;
  ciudad?: string;
  enlacesOsm?: EnlacesOsm;
}

export async function enriquecerLugar(params: ParametrosEnriquecimiento): Promise<LugarEnriquecido> {
  const { nombre, lat, lon, categoria, pais, ciudad, enlacesOsm } = params;
  const esGastronomico = categoria ? CATEGORIAS_GASTRONOMICAS.includes(categoria) : false;

  const [comercial, resumenCultural] = await Promise.all([
    obtenerDatosComerciales(nombre, lat, lon, esGastronomico),
    obtenerResumenSitio(nombre, ciudad, { lat, lon }, enlacesOsm, 220),
  ]);

  const platos = pais ? platosTipicosDe(pais, ciudad) : [];

  const cultural: DatoCultural | undefined = resumenCultural
    ? {
        descripcion: resumenCultural.extracto,
        fuente: "Wikipedia",
        url: resumenCultural.url,
      }
    : undefined;

  const fuentesEncontradas: string[] = [];
  if (comercial.foursquare) fuentesEncontradas.push("Foursquare");
  if (comercial.yelp) fuentesEncontradas.push("Yelp");
  if (cultural) fuentesEncontradas.push("Wikipedia/Wikidata");
  if (platos.length > 0) fuentesEncontradas.push("Platos típicos");

  return {
    nombre,
    lat,
    lon,
    foursquare: comercial.foursquare,
    yelp: comercial.yelp,
    cultural,
    platosTipicos: platos.length > 0 ? platos : undefined,
    fuentesEncontradas,
  };
}
