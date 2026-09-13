import type { Viaje } from "@/lib/types";
import { normalizarInvestigacion, type Investigacion } from "@/lib/investigacion";
import { etapasDe } from "@/lib/viaje";

// Vuelve a correr el cerebro sobre un viaje YA creado, con las ciudades
// reales de sus etapas (no solo el texto original) — así un viaje creado
// antes de una corrección en cómo se investiga (p. ej. una categoría mal
// etiquetada) puede ponerse al día sin tener que recrearlo desde cero.
export async function refrescarAnalisis(viajeId: string, viaje: Viaje): Promise<Investigacion | undefined> {
  const destinations = etapasDe(viaje).map((e) => e.nombre).filter(Boolean);
  const response = await fetch("/api/trips/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: viaje.contexto.textoOriginal ?? `Viaje a ${destinations.join(", ") || viaje.destino}.`,
      destinations: destinations.length ? destinations : undefined,
      fechaSalida: viaje.fechaSalida ?? viaje.contexto.fechaSalida,
      fechaRegreso: viaje.fechaRegreso ?? viaje.contexto.fechaRegreso,
      presupuesto: viaje.contexto.presupuesto?.importe ?? viaje.contexto.presupuestoTotal,
      moneda: viaje.contexto.presupuesto?.moneda,
      presupuestoTipo: viaje.contexto.presupuesto?.tipo,
      presupuestoFlexible: viaje.contexto.presupuesto?.flexible,
      adultos: viaje.contexto.viajeros?.adultos ?? viaje.contexto.numAdultos,
      ninos: viaje.contexto.viajeros?.ninos,
      edadesNinos: viaje.contexto.viajeros?.edadesNinos ?? viaje.contexto.edadesMenores,
      bebes: viaje.contexto.viajeros?.bebes,
      personasMayores: viaje.contexto.viajeros?.personasMayores,
      mascotas: viaje.contexto.viajeros?.mascotas ?? (viaje.contexto.mascota ? 1 : 0),
      accesibilidad: viaje.contexto.accesibilidad,
      modoPlanificacion: viaje.modoPlanificacion ?? "completo",
      origen: viaje.contexto.ciudadOrigen,
      interests: viaje.contexto.intereses,
      food: viaje.contexto.preferenciasComida,
      transport: viaje.contexto.preferenciasTransporte,
      constraints: viaje.contexto.restricciones,
    }),
  });
  if (!response.ok) throw new Error(`No se pudo refrescar el análisis (${response.status}).`);
  const analysis = await response.json();
  return normalizarInvestigacion(analysis as Parameters<typeof normalizarInvestigacion>[0]);
}
