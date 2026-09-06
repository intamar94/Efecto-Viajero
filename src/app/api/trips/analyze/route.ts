import { NextResponse } from "next/server";
import { runBrain, type BrainInput } from "@/lib/travelBrain/brainController";
import { CASO_PRUEBA } from "@/lib/casoPrueba";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("case") !== "japan") return NextResponse.json({ error: "Caso de prueba no especificado." }, { status: 400 });
  try {
    const result = await runBrain(CASO_PRUEBA);
    return NextResponse.json({ ...result.analysis, context: result.context, deconstructed: result.deconstructed, brain: result.brain });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo ejecutar el caso de prueba." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<BrainInput>;
    const text = body.text?.trim();
    if (!text) return NextResponse.json({ error: "Falta la descripción del viaje." }, { status: 400 });

    const result = await runBrain({ ...body, text });
    return NextResponse.json({ ...result.analysis, context: result.context, deconstructed: result.deconstructed, brain: result.brain });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo analizar el viaje." }, { status: 502 });
  }
}
