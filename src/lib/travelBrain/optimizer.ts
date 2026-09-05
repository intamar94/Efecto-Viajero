import type { CanonicalTripContext } from "./tripContext";
import type { BrainAction } from "./brainActions";

export interface OptimizationCandidate {
  id: string;
  label: string;
  score: number;
  dimensions: Record<string, number>;
  reasons: string[];
  assumptions: string[];
}

export interface OptimizationResult {
  status: "ready" | "partial" | "blocked";
  objective: string[];
  candidates: OptimizationCandidate[];
  selected?: OptimizationCandidate;
  missingInputs: string[];
}

function constraintScore(context: CanonicalTripContext): number {
  const text = context.rawText.toLowerCase();
  let score = 0.5;
  if (/sin conducir|no quiero conducir/.test(text)) score += 0.15;
  if (/ritmo tranquilo|sin prisa|descanso/.test(text)) score += 0.1;
  if ((context.travelers.bebes ?? 0) > 0) score += 0.08;
  if ((context.travelers.personasMayores ?? 0) > 0) score += 0.08;
  if ((context.travelers.mascotas ?? 0) > 0) score += 0.06;
  return Math.min(1, score);
}

export function optimizePlanningState(context: CanonicalTripContext, actions: BrainAction[]): OptimizationResult {
  const missingInputs: string[] = [];
  if (!context.dates.start || !context.dates.end) missingInputs.push("dates");
  if (!context.destinations.length) missingInputs.push("destinations");
  if (context.budget.importe === undefined && !context.budget.flexible) missingInputs.push("budget");

  const feasibility = constraintScore(context);
  const candidates: OptimizationCandidate[] = [
    {
      id: "balanced",
      label: "Plan equilibrado",
      score: feasibility,
      dimensions: { feasibility, comfort: .8, cost: .65, distance: .7, experience: .8 },
      reasons: ["Equilibra restricciones, comodidad y experiencias."],
      assumptions: ["Los costes concretos todavía deben estar verificados."],
    },
    {
      id: "comfort",
      label: "Priorizar comodidad",
      score: Math.min(1, feasibility + .06),
      dimensions: { feasibility, comfort: .95, cost: .5, distance: .8, experience: .7 },
      reasons: ["Reduce carga logística y favorece descanso."],
      assumptions: ["Puede aumentar el coste total."],
    },
    {
      id: "experience",
      label: "Priorizar experiencias",
      score: Math.min(1, feasibility + .03),
      dimensions: { feasibility, comfort: .6, cost: .6, distance: .55, experience: .95 },
      reasons: ["Maximiza variedad de experiencias compatibles."],
      assumptions: ["Requiere datos de disponibilidad y tiempos reales."],
    },
  ];

  const selected = missingInputs.length > 1 ? undefined : candidates.sort((a, b) => b.score - a.score)[0];
  return {
    status: missingInputs.length ? "partial" : "ready",
    objective: ["compatibilidad", "comodidad", "coste", "distancia", "experiencias", "riesgo"],
    candidates,
    selected,
    missingInputs,
  };
}
