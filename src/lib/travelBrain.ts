import { calcularPresupuesto } from "./compatibilidad";
import type { Destino, ResultadoRequisito, Viaje } from "./types";

// B19 — Travel Brain: no es una pantalla más, es la capa que relaciona
// requisitos + presupuesto + transporte + alojamiento + actividades y
// devuelve un puñado de conclusiones accionables, en vez de obligar al
// usuario a revisar cada módulo por separado para saber "cómo va" el viaje.
export interface InsightViaje {
  nivel: "alerta" | "aviso" | "ok";
  texto: string;
  accion?: { texto: string; href: string };
}

export function resumenViaje(viaje: Viaje, requisitos: ResultadoRequisito[], destino?: Destino): InsightViaje[] {
  const insights: InsightViaje[] = [];

  const rojos = requisitos.filter((r) => r.estado === "rojo").length;
  const amarillos = requisitos.filter((r) => r.estado === "amarillo").length;
  if (rojos > 0) {
    insights.push({ nivel: "alerta", texto: `${rojos} required requirement${rojos > 1 ? "s" : ""} unresolved.` });
  } else if (amarillos > 0) {
    insights.push({ nivel: "aviso", texto: `${amarillos} requirement${amarillos > 1 ? "s" : ""} to check.` });
  } else if (requisitos.length > 0) {
    insights.push({ nivel: "ok", texto: "No issues detected with documents and health." });
  }

  const presupuesto = calcularPresupuesto(viaje, destino);
  if (presupuesto.excedido) {
    insights.push({ nivel: "alerta", texto: `Budget exceeded by ${Math.abs(presupuesto.disponible ?? 0)}€.` });
  } else if (presupuesto.presupuestoTotal !== undefined) {
    insights.push({ nivel: "ok", texto: `Budget on track (${presupuesto.disponible}€ left).` });
  }

  if (!viaje.alojamientoId) {
    insights.push({ nivel: "aviso", texto: "The budget doesn't count accommodation yet.", accion: { texto: "See accommodation", href: `/viajes/${viaje.id}/alojamiento` } });
  }
  if (viaje.transporte.length === 0) {
    insights.push({ nivel: "aviso", texto: "You haven't added any transport legs yet.", accion: { texto: "Add transport", href: `/viajes/${viaje.id}/transporte` } });
  }

  const planificadas = viaje.actividades.filter((a) => a.estado !== "descartada").length;
  if (planificadas === 0) {
    insights.push({ nivel: "aviso", texto: "You haven't added any activities yet.", accion: { texto: "See activities", href: `/viajes/${viaje.id}/actividades` } });
  } else {
    insights.push({ nivel: "ok", texto: `${planificadas} activit${planificadas > 1 ? "ies" : "y"} in progress.` });
  }

  return insights;
}
