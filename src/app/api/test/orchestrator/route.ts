import { NextResponse } from "next/server";
import { analyzeTrip } from "@/lib/travelBrain/researchOrchestrator";
import { buildCanonicalTripContext } from "@/lib/travelBrain/tripContext";

export async function GET() {
  const text = "Quiero viajar a Colombia durante 7 días y visitar Bogotá y Medellín. Me interesa la gastronomía, cultura y naturaleza.";
  const context = buildCanonicalTripContext({ text, modoPlanificacion: "completo", adultos: 1, ninos: 0 });
  const result = await analyzeTrip(text, context);
  return NextResponse.json({
    ok: true,
    locations: result.locations.map((location) => ({ name: location.name, countryCode: location.countryCode })),
    resultCount: result.results.length,
    pendingCount: result.pendingCount,
    availableDomains: result.availableDomains,
    unavailableDomains: result.unavailableDomains,
    departmentReports: result.departmentReports.map((report) => ({
      domain: report.domain,
      status: report.status,
      findings: report.findings.length,
      evidence: report.evidence.length,
      unresolved: report.unresolved,
      conflicts: report.conflicts,
      error: report.error,
    })),
    supervisor: {
      completedDomains: result.supervisorUpdate.completedDomains,
      partialDomains: result.supervisorUpdate.partialDomains,
      unavailableDomains: result.supervisorUpdate.unavailableDomains,
      errorDomains: result.supervisorUpdate.errorDomains,
      unresolved: result.supervisorUpdate.unresolved,
      conflicts: result.supervisorUpdate.conflicts,
      recommendations: result.supervisorUpdate.recommendations,
    },
  });
}
