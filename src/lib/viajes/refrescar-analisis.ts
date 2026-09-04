import type { Viaje } from "@/lib/types";

export async function refrescarAnalisis(viajeId: string, viaje?: Viaje): Promise<unknown> {
  const source = viaje ?? (typeof window !== "undefined" ? undefined : undefined);
  if (!source) throw new Error("Se necesita el viaje para refrescar su análisis.");

  const response = await fetch("/api/trips/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: source.contexto.textoOriginal ?? source.destino,
      fechaSalida: source.fechaSalida ?? source.contexto.fechaSalida,
      fechaRegreso: source.fechaRegreso ?? source.contexto.fechaRegreso,
      presupuesto: source.contexto.presupuesto?.importe ?? source.contexto.presupuestoTotal,
      moneda: source.contexto.presupuesto?.moneda,
      presupuestoTipo: source.contexto.presupuesto?.tipo,
      presupuestoFlexible: source.contexto.presupuesto?.flexible,
      adultos: source.contexto.viajeros?.adultos ?? source.contexto.numAdultos,
      ninos: source.contexto.viajeros?.ninos,
      edadesNinos: source.contexto.viajeros?.edadesNinos ?? source.contexto.edadesMenores,
      bebes: source.contexto.viajeros?.bebes,
      personasMayores: source.contexto.viajeros?.personasMayores,
      mascotas: source.contexto.viajeros?.mascotas ?? (source.contexto.mascota ? 1 : 0),
      accesibilidad: source.contexto.accesibilidad,
      modoPlanificacion: source.modoPlanificacion ?? "completo",
      origen: source.contexto.ciudadOrigen,
      interests: source.contexto.intereses,
      food: source.contexto.preferenciasComida,
      transport: source.contexto.preferenciasTransporte,
      constraints: source.contexto.restricciones,
    }),
  });
  if (!response.ok) throw new Error(`No se pudo refrescar el análisis (${response.status}).`);
  const analysis = await response.json();
  return { viajeId, investigacion: analysis };
}
