// Puente entre "actividades del itinerario" y "coordenadas reales": los
// mismos ids que usa Actividades para los sitios reales (OpenStreetMap y
// Wikivoyage) se recalculan aquí igual, para que el Modo Guía y el Mapa
// del día sepan ubicar exactamente las mismas actividades sin duplicar
// la lógica de generación de ids en cada sitio.
import type { Etapa, Viaje } from "./types";

export interface PuntoGeo {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
  fuente: "OpenStreetMap" | "Wikivoyage";
  detalle?: string;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function puntosConCoordenadas(viaje: Viaje, etapa: Etapa): PuntoGeo[] {
  const deOsm: PuntoGeo[] = (viaje.investigacion?.sitios?.[etapa.nombre] ?? [])
    .filter((s) => s.lat !== undefined && s.lon !== undefined)
    .map((s) => ({
      id: `sitio-${etapa.id}-${slug(s.nombre)}`,
      nombre: s.nombre,
      lat: s.lat!,
      lon: s.lon!,
      fuente: "OpenStreetMap",
      detalle: s.detalle,
    }));

  const deWikivoyage: PuntoGeo[] = (viaje.wikivoyage?.[etapa.nombre]?.listings ?? [])
    .filter((l) => l.lat !== undefined && l.lon !== undefined && l.nombre)
    .map((l) => ({
      id: `wv-${etapa.id}-${slug(l.nombre!)}`,
      nombre: l.nombre!,
      lat: l.lat!,
      lon: l.lon!,
      fuente: "Wikivoyage",
      detalle: l.contenido,
    }));

  return [...deOsm, ...deWikivoyage];
}
