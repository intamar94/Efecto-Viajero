import { actividadesDe, alojamientosDe } from "./catalogo";
import { diasEntre } from "./fecha";
import type { Destino, Viaje } from "./types";

// B04 + B09: compatibilidad de presupuesto y sugerencia de ajuste.
// No comprueba conflictos de horario (eso requeriría un itinerario con
// horas reales por actividad, que no forma parte de este recorte).
export interface DesglosePresupuesto {
  alojamiento: number;
  transporte: number;
  actividades: number;
  total: number;
  presupuestoTotal?: number;
  disponible?: number;
  excedido: boolean;
}

export function calcularPresupuesto(viaje: Viaje, destino?: Destino): DesglosePresupuesto {
  const noches =
    viaje.fechaSalida && viaje.fechaRegreso
      ? Math.max(diasEntre(viaje.fechaSalida, viaje.fechaRegreso), 1)
      : Math.max(viaje.contexto.duracionDias ?? 1, 1);

  const alojamientoElegido = destino ? alojamientosDe(destino).find((a) => a.id === viaje.alojamientoId) : undefined;
  const costeAlojamiento = alojamientoElegido ? alojamientoElegido.precioNoche * noches : 0;

  const costeTransporte = viaje.transporte.reduce((suma, t) => suma + (t.costeEstimado ?? 0), 0);

  const catalogoActividades = destino ? actividadesDe(destino) : [];
  // Las actividades propias también cuentan: en un destino sin catálogo
  // son las únicas que hay, y sin sumarlas el presupuesto marcaba 0€
  // para siempre y nunca podía excederse.
  const costeActividades = viaje.actividades
    .filter((a) => a.estado !== "descartada")
    .reduce((suma, a) => suma + (a.propia?.costeEstimado ?? catalogoActividades.find((c) => c.id === a.actividadId)?.costeEstimado ?? 0), 0);

  const total = costeAlojamiento + costeTransporte + costeActividades;
  const presupuestoTotal = viaje.contexto.presupuestoTotal;
  const disponible = presupuestoTotal !== undefined ? presupuestoTotal - total : undefined;

  return {
    alojamiento: costeAlojamiento,
    transporte: costeTransporte,
    actividades: costeActividades,
    total,
    presupuestoTotal,
    disponible,
    excedido: disponible !== undefined && disponible < 0,
  };
}

export interface SugerenciaAjuste {
  descripcion: string;
  aplicar: (viaje: Viaje) => Partial<Viaje>;
}

export function sugerirAjustePresupuesto(viaje: Viaje, destino?: Destino): SugerenciaAjuste | null {
  if (!destino) return null;
  const catalogoActividades = actividadesDe(destino);

  const planificadasConCoste = viaje.actividades
    .filter((a) => a.estado === "planificada")
    .map((a) => ({ av: a, act: catalogoActividades.find((c) => c.id === a.actividadId) }))
    .filter((x): x is { av: (typeof viaje.actividades)[number]; act: (typeof catalogoActividades)[number] } => !!x.act && x.act.costeEstimado > 0)
    .sort((a, b) => b.act.costeEstimado - a.act.costeEstimado);

  if (planificadasConCoste.length > 0) {
    const masCara = planificadasConCoste[0];
    return {
      descripcion: `Quitar "${masCara.act.nombre}" (${masCara.act.costeEstimado}€)`,
      aplicar: (v) => ({
        actividades: v.actividades.map((a) => (a.actividadId === masCara.av.actividadId ? { ...a, estado: "descartada" } : a)),
      }),
    };
  }

  const opciones = [...alojamientosDe(destino)].sort((a, b) => a.precioNoche - b.precioNoche);
  const masBarata = opciones[0];
  if (masBarata && masBarata.id !== viaje.alojamientoId) {
    return {
      descripcion: `Cambiar a "${masBarata.nombre}" (${masBarata.precioNoche}€/noche)`,
      aplicar: () => ({ alojamientoId: masBarata.id }),
    };
  }

  return null;
}
