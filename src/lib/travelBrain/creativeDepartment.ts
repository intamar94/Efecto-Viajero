import type { BrainState } from "./brainState";
import type { MarketingDesignBrief, UXCodeChange } from "./marketingDesignNeuron";

export type CreativeLayer =
  | "brand" | "psychology" | "content" | "interaction" | "visual"
  | "component" | "responsive" | "accessibility" | "motion" | "performance" | "implementation";

export type CreativeAgentId =
  | "creative-director" | "ux-strategist" | "visual-designer"
  | "color-psychology" | "copy-strategist" | "interaction-designer"
  | "accessibility-designer" | "responsive-designer" | "motion-designer"
  | "performance-designer" | "design-system-engineer" | "conversion-designer";

export interface CreativeAgentSpec {
  id: CreativeAgentId;
  name: string;
  specialty: string;
  layers: CreativeLayer[];
  responsibilities: string[];
  canModify: string[];
}

export interface CreativeInstruction {
  id: string;
  agentId: CreativeAgentId;
  layer: CreativeLayer;
  priority: UXCodeChange["priority"];
  title: string;
  reason: string;
  files: string[];
  operations: string[];
  libraries: string[];
  commands: string[];
  acceptanceCriteria: string[];
  userOutcome: string;
}

export interface CreativeDepartmentPlan {
  agents: CreativeAgentSpec[];
  instructions: CreativeInstruction[];
  auditSurfaces: string[];
  designPrinciples: string[];
  colorPsychology: { rule: string; rationale: string }[];
  status: "ready" | "partial" | "blocked";
}

const AGENTS: CreativeAgentSpec[] = [
  { id: "creative-director", name: "Creative Director", specialty: "dirección de experiencia", layers: ["brand","visual","content"], responsibilities: ["mantener coherencia global","resolver conflictos creativos","priorizar experiencia"], canModify: ["arquitectura visual","jerarquía"] },
  { id: "ux-strategist", name: "UX Strategist", specialty: "flujo y arquitectura de información", layers: ["content","interaction","accessibility"], responsibilities: ["reducir fricción","definir journeys","priorizar acciones"], canModify: ["flujos","navegación","jerarquía"] },
  { id: "visual-designer", name: "Visual Designer", specialty: "composición visual", layers: ["visual","component","responsive"], responsibilities: ["composición","escala tipográfica","consistencia visual"], canModify: ["componentes","tokens"] },
  { id: "color-psychology", name: "Color Psychology", specialty: "semántica y percepción del color", layers: ["psychology","visual","accessibility"], responsibilities: ["semántica cromática","contraste","jerarquía emocional"], canModify: ["tokens de color","estados"] },
  { id: "copy-strategist", name: "Copy Strategist", specialty: "lenguaje de producto", layers: ["content","brand"], responsibilities: ["claridad","confianza","microcopy"], canModify: ["textos","labels","CTAs"] },
  { id: "interaction-designer", name: "Interaction Designer", specialty: "interacciones", layers: ["interaction","motion","component"], responsibilities: ["feedback","estados","transiciones"], canModify: ["interacciones","estados"] },
  { id: "accessibility-designer", name: "Accessibility Designer", specialty: "accesibilidad", layers: ["accessibility","responsive","component"], responsibilities: ["contraste","teclado","lectura"], canModify: ["ARIA","focus","contraste"] },
  { id: "responsive-designer", name: "Responsive Designer", specialty: "experiencia multidispositivo", layers: ["responsive","component"], responsibilities: ["mobile-first","breakpoints","touch"], canModify: ["layout","breakpoints"] },
  { id: "motion-designer", name: "Motion Designer", specialty: "movimiento funcional", layers: ["motion","interaction"], responsibilities: ["feedback visual","transiciones útiles"], canModify: ["animations","transitions"] },
  { id: "performance-designer", name: "Performance Designer", specialty: "rendimiento percibido", layers: ["performance","implementation"], responsibilities: ["reducir peso","priorizar contenido crítico"], canModify: ["rendering","assets"] },
  { id: "design-system-engineer", name: "Design System Engineer", specialty: "sistema de diseño", layers: ["component","implementation","visual"], responsibilities: ["tokens","componentes reutilizables","consistencia"], canModify: ["components","tokens","styles"] },
  { id: "conversion-designer", name: "Conversion Designer", specialty: "decisión y conversión", layers: ["content","interaction","visual"], responsibilities: ["CTA","reducción de fricción","claridad de valor"], canModify: ["CTAs","funnels"] },
];

const SURFACES = [
  "src/app/page.tsx", "src/app/planificar/page.tsx", "src/app/cerebro/page.tsx",
  "src/app/viajes/[id]/page.tsx", "src/app/viajes/[id]/decisiones/page.tsx",
  "src/app/viajes/[id]/itinerario/page.tsx", "src/app/viajes/[id]/alojamiento/page.tsx",
  "src/app/viajes/[id]/transporte/page.tsx", "src/app/viajes/[id]/actividades/page.tsx",
  "src/components/", "src/lib/travelBrain/presentation.ts",
];

function inferLayer(change: UXCodeChange): CreativeLayer {
  if (change.area === "marketing") return "brand";
  if (change.area === "conversion") return "interaction";
  if (change.area === "accessibility") return "accessibility";
  if (change.area === "trust") return "psychology";
  if (change.area === "visual") return "visual";
  return "content";
}

function owner(layer: CreativeLayer): CreativeAgentId {
  const map: Record<CreativeLayer, CreativeAgentId> = {
    brand: "creative-director", psychology: "color-psychology", content: "copy-strategist",
    interaction: "interaction-designer", visual: "visual-designer", component: "design-system-engineer",
    responsive: "responsive-designer", accessibility: "accessibility-designer", motion: "motion-designer",
    performance: "performance-designer", implementation: "design-system-engineer",
  };
  return map[layer];
}

function commandsFor(layer: CreativeLayer): string[] {
  if (layer === "performance") return ["npm run lint", "npm run build"];
  return ["npm run lint"];
}

function toInstruction(change: UXCodeChange): CreativeInstruction {
  const layer = inferLayer(change);
  return {
    id: `creative:${change.id}`,
    agentId: owner(layer),
    layer,
    priority: change.priority,
    title: change.title,
    reason: change.why,
    files: change.files,
    operations: change.changes,
    libraries: ["React", "Next.js", "Tailwind/CSS", "componentes existentes"],
    commands: commandsFor(layer),
    acceptanceCriteria: change.acceptanceCriteria,
    userOutcome: change.userOutcome,
  };
}

export function buildCreativeDepartmentPlan(state: BrainState): CreativeDepartmentPlan {
  const brief = state.marketingDesign;
  const changes = brief?.changes ?? [];
  const instructions = changes.map(toInstruction);
  const hasBlockers = state.blockers.length > 0;
  const hasConflicts = state.conflicts.length > 0;

  return {
    agents: AGENTS,
    instructions,
    auditSurfaces: SURFACES,
    designPrinciples: [
      "contexto → estado → decisión → acción",
      "una acción primaria por superficie",
      "la complejidad del cerebro no invade la experiencia del viajero",
      "ninguna afirmación de producto supera la capacidad realmente disponible",
      "la interfaz debe degradar con elegancia cuando faltan datos o proveedores",
    ],
    colorPsychology: [
      { rule: "Acción primaria: color de máxima saliencia reservado a la acción que mueve el viaje.", rationale: "Reduce competencia visual y carga de decisión." },
      { rule: "Verificado: semántica de confirmación sólo para evidencia validada.", rationale: "Evita asociar color positivo con información incierta." },
      { rule: "Pendiente/bloqueo: contraste y texto explícito además del color.", rationale: "El significado no depende de percepción cromática." },
      { rule: "Marca: paleta estable; estados funcionales no deben alterar arbitrariamente la identidad.", rationale: "Separa identidad de semántica operacional." },
    ],
    status: hasBlockers || hasConflicts ? "partial" : instructions.length ? "ready" : "blocked",
  };
}
