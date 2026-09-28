import type { CategoriaActividad } from "./types";

// Qué tipo de viajero es la persona, en categorías simples que el
// viajero elige directamente (nada de buscar etiquetas): se usa para
// ORDENAR lo que ya es real (sitios reales, categorías reales de OSM/
// Wikivoyage/Wikipedia), nunca para inventar contenido ni para
// preseleccionar/filtrar nada por su cuenta — eso ya se decidió que no,
// en Actividades. Es pura prioridad: lo que coincide con el interés
// aparece primero, todo lo demás sigue estando ahí igual.
export interface PerfilInteres {
  id: string;
  etiqueta: string;
  icono: string;
  categorias: CategoriaActividad[];
}

export const PERFILES_INTERES: PerfilInteres[] = [
  { id: "historia", etiqueta: "History", icono: "🏛️", categorias: ["museo", "memoria", "industrial", "espiritual", "arte_urbano"] },
  { id: "naturaleza", etiqueta: "Nature", icono: "🌳", categorias: ["naturaleza", "parque", "playa", "fauna", "nautica", "aventura"] },
  { id: "curiosidades", etiqueta: "Curiosities & local stories", icono: "✨", categorias: ["astronomia", "ciencia", "arte_urbano", "memoria", "industrial"] },
  { id: "gastronomia", etiqueta: "Food & drink", icono: "🍽️", categorias: ["restaurante", "experiencias"] },
  { id: "vida_nocturna", etiqueta: "Nightlife", icono: "🌃", categorias: ["discoteca", "eventos"] },
  { id: "bienestar", etiqueta: "Wellness", icono: "🧘", categorias: ["bienestar"] },
];

function categoriasDelPerfil(perfilIds: string[]): Set<CategoriaActividad> {
  const set = new Set<CategoriaActividad>();
  for (const id of perfilIds) {
    const perfil = PERFILES_INTERES.find((p) => p.id === id);
    if (perfil) for (const c of perfil.categorias) set.add(c);
  }
  return set;
}

export function coincideConInteres(categoria: CategoriaActividad | undefined, perfilIds: string[] | undefined): boolean {
  if (!categoria || !perfilIds || perfilIds.length === 0) return false;
  return categoriasDelPerfil(perfilIds).has(categoria);
}

// Comparador listo para usar en .sort(): lo que coincide con el interés
// va primero, sin alterar el resto del orden que ya traía la lista
// (es estable frente a cualquier otro criterio que se combine después).
export function comparadorPorInteres<T>(categoriaDe: (item: T) => CategoriaActividad | undefined, perfilIds: string[] | undefined) {
  return (a: T, b: T) => Number(coincideConInteres(categoriaDe(b), perfilIds)) - Number(coincideConInteres(categoriaDe(a), perfilIds));
}
