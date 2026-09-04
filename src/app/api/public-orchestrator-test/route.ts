import { NextResponse } from "next/server";
import { analyzeTrip } from "@/lib/travelBrain/researchOrchestrator";

export async function GET() {
  const query = "Quiero viajar a Colombia durante 7 días y visitar Bogotá y Medellín. Me interesa la gastronomía, cultura y naturaleza.";
  try {
    const result = await analyzeTrip(query);
    return NextResponse.json({
      ok: true,
      test: query,
      resultCount: result.results?.length ?? 0,
      pendingCount: result.pending?.length ?? 0,
      capabilityAudit: result.capabilityAudit,
      supervisorUpdate: result.supervisorUpdate,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
