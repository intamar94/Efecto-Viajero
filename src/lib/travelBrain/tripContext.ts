import type { ContextoViaje, ModoPlanificacion, PresupuestoViaje, ComposicionViaje, AccesibilidadViaje } from "../types";

export interface CanonicalTripContext {
  rawText: string;
  dates: { start?: string; end?: string };
  budget: PresupuestoViaje;
  travelers: ComposicionViaje;
  accessibility: AccesibilidadViaje;
  planningMode: ModoPlanificacion;
  destinations: string[];
  interests: string[];
  food: string[];
  transport: string[];
  constraints: string[];
  origin?: string;
}

export function buildCanonicalTripContext(input: {
  text: string;
  fechaSalida?: string;
  fechaRegreso?: string;
  presupuesto?: number;
  moneda?: string;
  presupuestoTipo?: PresupuestoViaje["tipo"];
  presupuestoFlexible?: boolean;
  adultos?: number;
  ninos?: number;
  edadesNinos?: number[];
  bebes?: number;
  personasMayores?: number;
  mascotas?: number;
  accesibilidad?: AccesibilidadViaje;
  modoPlanificacion: ModoPlanificacion;
  destinations?: string[];
  interests?: string[];
  food?: string[];
  transport?: string[];
  constraints?: string[];
  origin?: string;
}): CanonicalTripContext {
  return {
    rawText: input.text.trim(),
    dates: { start: input.fechaSalida || undefined, end: input.fechaRegreso || undefined },
    budget: {
      importe: input.presupuesto,
      moneda: input.moneda || "EUR",
      tipo: input.presupuestoTipo || "total",
      flexible: input.presupuestoFlexible,
    },
    travelers: {
      adultos: Math.max(1, input.adultos ?? 1),
      ninos: Math.max(0, input.ninos ?? input.edadesNinos?.length ?? 0),
      edadesNinos: input.edadesNinos?.length ? input.edadesNinos : undefined,
      bebes: input.bebes || undefined,
      personasMayores: input.personasMayores || undefined,
      mascotas: input.mascotas || undefined,
      accesibilidad: input.accesibilidad,
    },
    accessibility: input.accesibilidad || { requiereAccesibilidad: false },
    planningMode: input.modoPlanificacion,
    destinations: input.destinations || [],
    interests: input.interests || [],
    food: input.food || [],
    transport: input.transport || [],
    constraints: input.constraints || [],
    origin: input.origin,
  };
}

export function toContextoViaje(ctx: CanonicalTripContext): ContextoViaje {
  const duration = ctx.dates.start && ctx.dates.end
    ? Math.max(1, Math.round((new Date(ctx.dates.end).getTime() - new Date(ctx.dates.start).getTime()) / 86400000) + 1)
    : undefined;
  return {
    textoOriginal: ctx.rawText,
    fechaSalida: ctx.dates.start,
    fechaRegreso: ctx.dates.end,
    duracionDias: duration,
    presupuesto: ctx.budget,
    presupuestoTotal: ctx.budget.tipo === "total" ? ctx.budget.importe : undefined,
    viajeros: ctx.travelers,
    numAdultos: ctx.travelers.adultos,
    edadesMenores: ctx.travelers.edadesNinos,
    mascota: Boolean(ctx.travelers.mascotas),
    accesibilidad: ctx.accessibility,
    intereses: ctx.interests,
    preferenciasComida: ctx.food,
    preferenciasTransporte: ctx.transport,
    restricciones: ctx.constraints,
    ciudadOrigen: ctx.origin,
    explorer: { activado: ctx.planningMode === "dejarse_llevar" },
  };
}
