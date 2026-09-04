import { NextResponse } from "next/server";
import { analyzeTrip } from "@/lib/travelBrain/researchOrchestrator";
import { deconstructTripText } from "@/lib/travelBrain/tripDeconstructor";
import { buildCanonicalTripContext } from "@/lib/travelBrain/tripContext";
import type { AccesibilidadViaje, ModoPlanificacion, PresupuestoViaje } from "@/lib/types";

interface AnalyzeBody {
  text?: string;
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
  modoPlanificacion?: ModoPlanificacion;
  origen?: string;
  interests?: string[];
  food?: string[];
  transport?: string[];
  constraints?: string[];
  destinations?: string[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeBody;
    const text = body.text?.trim();
    if (!text) return NextResponse.json({ error: "Falta la descripción del viaje." }, { status: 400 });

    const context = buildCanonicalTripContext({
      text,
      fechaSalida: body.fechaSalida,
      fechaRegreso: body.fechaRegreso,
      presupuesto: body.presupuesto,
      moneda: body.moneda,
      presupuestoTipo: body.presupuestoTipo,
      presupuestoFlexible: body.presupuestoFlexible,
      adultos: body.adultos,
      ninos: body.ninos,
      edadesNinos: body.edadesNinos,
      bebes: body.bebes,
      personasMayores: body.personasMayores,
      mascotas: body.mascotas,
      accesibilidad: body.accesibilidad,
      modoPlanificacion: body.modoPlanificacion ?? "completo",
      origin: body.origen,
      interests: body.interests,
      food: body.food,
      transport: body.transport,
      constraints: body.constraints,
      destinations: body.destinations,
    });

    const deconstructed = deconstructTripText(text);
    const analysis = await analyzeTrip(text, context);
    return NextResponse.json({ context, deconstructed, ...analysis });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo analizar el viaje." }, { status: 502 });
  }
}
