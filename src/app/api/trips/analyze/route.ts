import { NextResponse } from "next/server";
import { analyzeTrip } from "@/lib/travelBrain/researchOrchestrator";
import { deconstructTripText } from "@/lib/travelBrain/tripDeconstructor";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; trip?: { destino?: string; etapas?: Array<{ nombre: string }> } };
    const text = body.text?.trim();
    if (!text) return NextResponse.json({ error: "Falta la descripción del viaje." }, { status: 400 });
    const deconstructed = deconstructTripText(text);
    const analysis = await analyzeTrip(text, body.trip);
    return NextResponse.json({ deconstructed, ...analysis });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo analizar el viaje." }, { status: 502 });
  }
}
