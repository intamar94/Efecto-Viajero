import { NextResponse } from "next/server";
import { runBrain, type BrainInput } from "@/lib/travelBrain/brainController";

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
