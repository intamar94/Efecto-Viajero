import { NextResponse } from "next/server";
import { buildExplorerPlan } from "@/lib/travelBrain/explorerIntelligence";
import { buildCanonicalTripContext } from "@/lib/travelBrain/tripContext";
import type { AccesibilidadViaje } from "@/lib/types";

interface Body {
  request?: string;
  fechaSalida?: string;
  fechaRegreso?: string;
  presupuesto?: number;
  adultos?: number;
  ninos?: number;
  edadesNinos?: number[];
  bebes?: number;
  personasMayores?: number;
  mascotas?: number;
  accesibilidad?: AccesibilidadViaje;
  origen?: string;
  destinations?: string[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const text = body.request?.trim();
    if (!text) return NextResponse.json({ error: "Falta lo que quieres hacer hoy." }, { status: 400 });

    const context = buildCanonicalTripContext({
      text,
      fechaSalida: body.fechaSalida,
      fechaRegreso: body.fechaRegreso,
      presupuesto: body.presupuesto,
      adultos: body.adultos,
      ninos: body.ninos,
      edadesNinos: body.edadesNinos,
      bebes: body.bebes,
      personasMayores: body.personasMayores,
      mascotas: body.mascotas,
      accesibilidad: body.accesibilidad,
      modoPlanificacion: "dejarse_llevar",
      origin: body.origen,
      destinations: body.destinations,
    });

    const plan = buildExplorerPlan({ request: text, context, now: { iso: new Date().toISOString() } });
    return NextResponse.json({ plan, context });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo preparar la exploración." }, { status: 502 });
  }
}
