import type { CanonicalTripContext } from "./tripContext";

export type ExplorerSignal = "weather" | "time" | "traveler" | "accessibility" | "distance" | "budget" | "rules";

export interface ExplorerRequest {
  request: string;
  context: CanonicalTripContext;
  now: { iso: string; latitude?: number; longitude?: number };
}

export interface ExplorerPlan {
  intent: string;
  searchProfile: {
    categories: string[];
    pace: "tranquilo" | "medio" | "intenso";
    maxDistanceKm?: number;
    familyFriendly: boolean;
    accessibilityRequired: boolean;
    budgetAware: boolean;
  };
  contextualChecks: ExplorerSignal[];
  companionTips: string[];
}

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function buildExplorerPlan(input: ExplorerRequest): ExplorerPlan {
  const text = normalize(input.request);
  const categories: string[] = [];
  if (/playa|mar|costa|arena/.test(text)) categories.push("playa");
  if (/tranquil|relaj|descanso|dia tranquilo/.test(text)) categories.push("relax");
  if (/comer|comida|restaurante|gastronom/.test(text)) categories.push("gastronomia");
  if (/naturaleza|selva|parque|rio|sender/.test(text)) categories.push("naturaleza");
  if (/cultura|museo|historia/.test(text)) categories.push("cultura");
  if (/mercado|compr/.test(text)) categories.push("compras");
  if (!categories.length) categories.push("experiencias");

  const familyFriendly = input.context.travelers.ninos > 0 || Boolean(input.context.travelers.bebes);
  const accessibilityRequired = input.context.accessibility.requiereAccesibilidad;
  const budgetAware = input.context.budget.importe !== undefined;
  const companionTips: string[] = [];

  if (categories.includes("playa")) {
    companionTips.push("Comprobar condiciones de acceso y restricciones locales sobre comida y bebidas.");
    companionTips.push("Adaptar recomendaciones de protección solar, hidratación y equipamiento a las condiciones del día.");
  }
  if (input.context.travelers.mascotas) companionTips.push("Filtrar lugares que admitan mascotas y comprobar restricciones específicas.");
  if (familyFriendly) companionTips.push("Priorizar distancias, horarios y pausas apropiadas para el grupo.");
  if (accessibilityRequired) companionTips.push("Verificar accesos, aseos, pendientes, superficies y transporte accesible cuando exista información fiable.");
  if (budgetAware) companionTips.push("Evitar opciones que rompan el presupuesto objetivo y mostrar alternativas de distinto coste.");

  return {
    intent: input.request.trim(),
    searchProfile: {
      categories: [...new Set(categories)],
      pace: categories.includes("relax") ? "tranquilo" : "medio",
      maxDistanceKm: categories.includes("relax") ? 35 : 50,
      familyFriendly,
      accessibilityRequired,
      budgetAware,
    },
    contextualChecks: ["weather", "time", "traveler", "distance", "rules", ...(budgetAware ? ["budget"] : []), ...(accessibilityRequired ? ["accessibility"] : [])],
    companionTips,
  };
}
