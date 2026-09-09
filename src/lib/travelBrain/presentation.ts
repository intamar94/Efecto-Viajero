export type PresentationStatus = "verified" | "available" | "partial" | "researching" | "pending" | "idea" | "incompatible" | "unavailable";

export const PRESENTATION_STATUS: Record<PresentationStatus, { label: string; icon: string; className: string }> = {
  verified: { label: "Verificado", icon: "✓", className: "bg-emerald-50 text-emerald-700" },
  available: { label: "Disponible", icon: "●", className: "bg-emerald-50 text-emerald-700" },
  partial: { label: "Parcial", icon: "◐", className: "bg-amber-50 text-amber-700" },
  researching: { label: "Investigando", icon: "⌕", className: "bg-sky-50 text-sky-700" },
  pending: { label: "Por verificar", icon: "!", className: "bg-amber-50 text-amber-700" },
  idea: { label: "Idea", icon: "💡", className: "bg-neutral-100 text-neutral-600" },
  incompatible: { label: "No compatible", icon: "×", className: "bg-red-50 text-red-700" },
  unavailable: { label: "No disponible", icon: "—", className: "bg-neutral-100 text-neutral-500" },
};

export interface CompatibilityView { label: string; status: "ok" | "conditional" | "unknown" | "no"; reason?: string; }
export interface RecommendationPresentation {
  status: PresentationStatus;
  decision: "recommended" | "conditional" | "idea" | "rejected";
  summary: string;
  why?: string;
  priceLabel: string;
  compatibility: CompatibilityView[];
}

export function normalizeDisplayText(value?: string): string {
  if (!value) return "";
  return value.replace(/&nbsp;|&#160;/gi, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function recommendationPresentation(input: {
  isGeneric?: boolean; isReal?: boolean; source?: string; price?: string; description?: string;
  admitsPets?: boolean; hasPet?: boolean; hasChildren?: boolean; hasInfant?: boolean; hasElder?: boolean;
}): RecommendationPresentation {
  const status: PresentationStatus = input.isGeneric ? "idea" : input.isReal && input.source ? "verified" : input.isReal ? "pending" : "partial";
  const decision = input.isGeneric ? "idea" : status === "verified" ? "recommended" : "conditional";
  const compatibility: CompatibilityView[] = [];
  if (input.hasChildren) compatibility.push({ label: "Niños", status: "unknown", reason: "Comprobar edad y condiciones del lugar." });
  if (input.hasInfant) compatibility.push({ label: "Bebé", status: "unknown", reason: "Comprobar carrito, descanso y servicios." });
  if (input.hasElder) compatibility.push({ label: "Persona mayor", status: "unknown", reason: "Comprobar accesibilidad y esfuerzo físico." });
  if (input.hasPet) compatibility.push({ label: "Mascota", status: input.admitsPets ? "ok" : "unknown", reason: input.admitsPets ? "Admite mascotas según los datos disponibles." : "Política de mascotas pendiente de verificar." });
  return {
    status, decision,
    summary: input.isGeneric ? "Idea detectada para tu viaje; todavía falta encontrar y verificar un lugar concreto." : normalizeDisplayText(input.description),
    why: input.isGeneric ? "Coincide con tus intereses, pero el cerebro aún no dispone de evidencia suficiente para recomendar un lugar concreto." : undefined,
    priceLabel: input.price ? normalizeDisplayText(input.price) : input.isReal ? "Precio por verificar" : "Coste orientativo",
    compatibility,
  };
}
