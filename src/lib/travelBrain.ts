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
    insights.push({ nivel: "alerta", texto: `${rojos} requisito${rojos > 1 ? "s" : ""} obligatorio${rojos > 1 ? "s" : ""} sin resolver.` });
  } else if (amarillos > 0) {
    insights.push({ nivel: "aviso", texto: `${amarillos} requisito${amarillos > 1 ? "s" : ""} por revisar.` });
  } else if (requisitos.length > 0) {
    insights.push({ nivel: "ok", texto: "Documentación y salud sin problemas detectados." });
  }

  const presupuesto = calcularPresupuesto(viaje, destino);
  if (presupuesto.excedido) {
    insights.push({ nivel: "alerta", texto: `Presupuesto excedido en ${Math.abs(presupuesto.disponible ?? 0)}€.` });
  } else if (presupuesto.presupuestoTotal !== undefined) {
    insights.push({ nivel: "ok", texto: `Presupuesto dentro de lo previsto (quedan ${presupuesto.disponible}€).` });
  }

  if (!viaje.alojamientoId) {
    insights.push({ nivel: "aviso", texto: "Todavía no has elegido alojamiento.", accion: { texto: "Elegir alojamiento", href: `/viajes/${viaje.id}/alojamiento` } });
  }
  if (viaje.transporte.length === 0) {
    insights.push({ nivel: "aviso", texto: "Todavía no has añadido ningún tramo de transporte.", accion: { texto: "Añadir transporte", href: `/viajes/${viaje.id}/transporte` } });
  }

  const planificadas = viaje.actividades.filter((a) => a.estado !== "descartada").length;
  if (planificadas === 0) {
    insights.push({ nivel: "aviso", texto: "Aún no has añadido actividades.", accion: { texto: "Ver actividades", href: `/viajes/${viaje.id}/actividades` } });
  } else {
    insights.push({ nivel: "ok", texto: `${planificadas} actividad${planificadas > 1 ? "es" : ""} en marcha.` });
  }

  return insights;
}
