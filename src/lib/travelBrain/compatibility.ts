import type { CanonicalTripContext } from "./tripContext";
import type { ResolvedDestination } from "./destinationResolver";

export interface CompatibilityFactor { key: string; label: string; score: number; weight: number; reason: string; }
export interface DestinationCompatibility { destination: ResolvedDestination; score: number; factors: CompatibilityFactor[]; }

export function scoreDestinations(context: CanonicalTripContext, destinations: ResolvedDestination[]): DestinationCompatibility[] {
  return destinations.map((destination) => {
    const factors: CompatibilityFactor[] = [];
    const hasFamily = context.travelers.ninos > 0 || Boolean(context.travelers.bebes);
    factors.push({ key: "destination", label: "Destino identificado", score: 100, weight: 1, reason: `${destination.displayName} fue resuelto con evidencia geográfica.` });
    if (hasFamily) factors.push({ key: "family", label: "Grupo familiar", score: 80, weight: 1, reason: "El viaje incluye menores; la planificación posterior deberá priorizar opciones familiares." });
    if (context.accessibility.requiereAccesibilidad) factors.push({ key: "accessibility", label: "Accesibilidad", score: 70, weight: 2, reason: "La accesibilidad es un requisito y necesita verificación factual por proveedor." });
    if (context.budget.importe != null) factors.push({ key: "budget", label: "Presupuesto", score: 70, weight: 1, reason: "Hay un presupuesto definido; faltan precios de proveedores para puntuar coste real." });
    if (context.interests.length) factors.push({ key: "interests", label: "Intereses", score: 75, weight: 1, reason: `Se detectaron ${context.interests.length} preferencias para orientar la selección.` });
    const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
    const score = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);
    return { destination, score, factors };
  }).sort((a, b) => b.score - a.score);
}
