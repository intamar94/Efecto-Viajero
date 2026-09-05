import type { BrainState } from "./brainState";

export type DesignLayer = "brand" | "psychology" | "content" | "interaction" | "visual" | "component" | "responsive" | "accessibility" | "motion" | "performance" | "implementation";
export type CreativeAgentId = "creative-director" | "ux-strategist" | "visual-designer" | "color-psychology" | "copy-strategist" | "interaction-designer" | "accessibility-designer" | "responsive-designer" | "motion-designer" | "performance-designer" | "design-system-engineer" | "conversion-designer";

export interface DesignInstruction {
  id: string;
  layer: DesignLayer;
  agentId: CreativeAgentId;
  priority: "critical" | "high" | "normal" | "polish";
  objective: string;
  commands: string[];
  libraries: string[];
  files: string[];
  acceptanceCriteria: string[];
}

export interface CreativeAgentSpec {
  id: CreativeAgentId;
  department: "creative" | "product" | "engineering";
  responsibility: string;
  inputs: string[];
  outputs: string[];
  constraints: string[];
}

export interface DesignSystemBrief {
  version: 1;
  principle: string;
  layers: DesignLayer[];
  agents: CreativeAgentSpec[];
  instructions: DesignInstruction[];
  colorPsychology: { primaryRole: string; accentRole: string; warningRole: string; successRole: string; rules: string[] };
  commandPolicy: string[];
  libraryPolicy: string[];
}

const AGENTS: CreativeAgentSpec[] = [
  { id: "creative-director", department: "creative", responsibility: "Mantener coherencia de marca, concepto y experiencia completa.", inputs: ["brand", "user_journey", "brain_state"], outputs: ["creative_direction", "priorities", "consistency_rules"], constraints: ["No inventar capacidades", "Priorizar claridad sobre decoración"] },
  { id: "ux-strategist", department: "product", responsibility: "Diseñar arquitectura de información, flujos y decisiones.", inputs: ["journey", "decisions", "blockers"], outputs: ["flows", "information_hierarchy", "interaction_rules"], constraints: ["Una acción principal por estado", "Reducir carga cognitiva"] },
  { id: "visual-designer", department: "creative", responsibility: "Definir composición, jerarquía, tipografía, espacios y lenguaje visual.", inputs: ["brand", "ux_rules", "content"], outputs: ["visual_rules", "component_specs"], constraints: ["No depender sólo del color", "Mantener legibilidad"] },
  { id: "color-psychology", department: "creative", responsibility: "Aplicar psicología del color de forma contextual y accesible.", inputs: ["state_semantics", "brand_palette", "accessibility"], outputs: ["color_roles", "contrast_rules"], constraints: ["El color nunca sustituye texto", "Evitar usar rojo como estado genérico de pendiente"] },
  { id: "copy-strategist", department: "creative", responsibility: "Convertir estados técnicos en lenguaje humano orientado a decisión.", inputs: ["brain_state", "product_capabilities"], outputs: ["copy", "labels", "microcopy"], constraints: ["No jerga interna", "No claims no verificables"] },
  { id: "interaction-designer", department: "product", responsibility: "Definir comportamiento de controles, estados, errores y recuperación.", inputs: ["decisions", "actions", "changes"], outputs: ["interaction_specs", "recovery_flows"], constraints: ["Feedback inmediato", "No perder contexto"] },
  { id: "accessibility-designer", department: "product", responsibility: "Garantizar accesibilidad perceptiva, motora y cognitiva.", inputs: ["components", "color", "flows"], outputs: ["a11y_rules", "keyboard_rules"], constraints: ["Texto + icono + contraste", "Targets táctiles adecuados"] },
  { id: "responsive-designer", department: "product", responsibility: "Adaptar la experiencia a móvil, tablet y escritorio.", inputs: ["layouts", "priority", "travel_context"], outputs: ["breakpoints", "mobile_layouts"], constraints: ["Mobile-first", "Evitar scroll horizontal crítico"] },
  { id: "motion-designer", department: "creative", responsibility: "Definir movimiento funcional para feedback y orientación.", inputs: ["interaction_specs", "state_changes"], outputs: ["motion_rules"], constraints: ["Motion comunica estado, no decora", "Respetar reduced motion"] },
  { id: "performance-designer", department: "engineering", responsibility: "Evitar que la experiencia visual perjudique velocidad y estabilidad.", inputs: ["visual_assets", "components", "runtime"], outputs: ["performance_budget", "loading_rules"], constraints: ["No añadir librerías por defecto", "Priorizar CSS y componentes existentes"] },
  { id: "design-system-engineer", department: "engineering", responsibility: "Convertir las reglas creativas en tokens, componentes y patrones reutilizables.", inputs: ["visual_rules", "a11y_rules", "interaction_specs"], outputs: ["tokens", "components", "implementation_plan"], constraints: ["Reutilización", "Cambios mínimos y trazables"] },
  { id: "conversion-designer", department: "product", responsibility: "Optimizar comprensión, confianza y siguiente acción sin manipulación.", inputs: ["journey", "value_proposition", "trust_state"], outputs: ["cta_strategy", "conversion_rules"], constraints: ["Una CTA primaria", "No usar dark patterns"] },
];

export function buildDesignSystemBrief(state: BrainState): DesignSystemBrief {
  const instructions: DesignInstruction[] = [
    { id: "layer:brand", layer: "brand", agentId: "creative-director", priority: "critical", objective: "Alinear toda pantalla con una identidad reconocible y consistente.", commands: ["auditar jerarquía visual", "unificar voz y patrones", "eliminar elementos que compitan con la propuesta de valor"], libraries: ["sistema de componentes existente"], files: ["src/app/page.tsx", "src/app/planificar/page.tsx", "src/app/cerebro/page.tsx", "src/components/"], acceptanceCriteria: ["La propuesta de valor se entiende sin explicación técnica", "Patrones equivalentes se ven y funcionan igual"] },
    { id: "layer:psychology", layer: "psychology", agentId: "color-psychology", priority: "critical", objective: "Usar color para orientar atención, seguridad y estado sin manipular ni excluir.", commands: ["definir roles semánticos de color", "auditar contraste", "separar confianza, advertencia, error y progreso", "no asignar significado sólo mediante color"], libraries: ["tokens CSS existentes", "CSS/Tailwind existente"], files: ["src/app/globals.css", "src/lib/travelBrain/presentation.ts", "src/components/"], acceptanceCriteria: ["Cada color tiene una función", "Los estados siguen siendo comprensibles en escala de grises", "No se añaden colores arbitrarios por pantalla"] },
    { id: "layer:content", layer: "content", agentId: "copy-strategist", priority: "critical", objective: "Hablar de beneficio, estado y acción en lenguaje humano.", commands: ["eliminar jerga técnica del flujo viajero", "escribir microcopy para incertidumbre", "hacer que cada CTA explique su consecuencia"], libraries: ["sin librería adicional"], files: ["src/app/page.tsx", "src/app/planificar/page.tsx", "src/app/cerebro/page.tsx"], acceptanceCriteria: ["Un usuario no técnico entiende cada estado", "No se presentan inferencias como hechos"] },
    { id: "layer:interaction", layer: "interaction", agentId: "interaction-designer", priority: "critical", objective: "Hacer que cada estado del cerebro tenga una respuesta de interfaz.", commands: ["mapear idle/loading/success/partial/pending/error/blocked", "conectar decisión con CTA", "preservar contexto después de una modificación"], libraries: ["React/Next.js existente"], files: ["src/app/cerebro/page.tsx", "src/app/planificar/page.tsx", "src/app/viajes/[id]/"], acceptanceCriteria: ["Ningún estado importante queda sin feedback", "Una modificación no obliga a repetir datos"] },
    { id: "layer:responsive", layer: "responsive", agentId: "responsive-designer", priority: "high", objective: "Diseñar primero para el contexto móvil real del viajero.", commands: ["priorizar información accionable", "hacer CTA y navegación alcanzables", "revisar densidad y scroll"], libraries: ["Tailwind existente"], files: ["src/app/", "src/components/"], acceptanceCriteria: ["Flujo crítico usable con una mano", "Sin tablas anchas en vistas principales"] },
    { id: "layer:accessibility", layer: "accessibility", agentId: "accessibility-designer", priority: "high", objective: "Hacer que la experiencia sea comprensible y operable por más personas.", commands: ["auditar focus", "labels", "contraste", "targets táctiles", "reduced motion"], libraries: ["APIs nativas del navegador"], files: ["src/components/", "src/app/", "src/app/globals.css"], acceptanceCriteria: ["Estados no dependen sólo del color", "Controles principales tienen nombre accesible", "Movimiento puede reducirse"] },
    { id: "layer:motion", layer: "motion", agentId: "motion-designer", priority: "normal", objective: "Usar movimiento sólo para orientar y confirmar.", commands: ["animar cambios de estado relevantes", "evitar animaciones permanentes", "respetar prefers-reduced-motion"], libraries: ["CSS transitions"], files: ["src/app/globals.css", "src/components/"], acceptanceCriteria: ["La animación aporta información", "No bloquea interacción"] },
    { id: "layer:performance", layer: "performance", agentId: "performance-designer", priority: "high", objective: "Mantener la experiencia rápida pese a la inteligencia del producto.", commands: ["evitar dependencias visuales innecesarias", "priorizar renderizado ligero", "deferir contenido secundario", "definir presupuesto de rendimiento"], libraries: ["Next.js/React existentes"], files: ["src/app/", "src/components/", "package.json"], acceptanceCriteria: ["No se añade una librería si CSS/React resuelve el problema", "El estado inicial aparece antes que contenido secundario"] },
    { id: "layer:implementation", layer: "implementation", agentId: "design-system-engineer", priority: "high", objective: "Convertir decisiones creativas en infraestructura reutilizable.", commands: ["extraer tokens", "crear componentes de estado", "crear patrones de CTA", "centralizar badges y estados"], libraries: ["Tailwind existente", "React existente"], files: ["src/components/", "src/app/globals.css", "src/lib/travelBrain/presentation.ts"], acceptanceCriteria: ["Una corrección de diseño se puede aplicar globalmente", "No hay estilos semánticamente duplicados"] },
    { id: "layer:conversion", layer: "conversion", agentId: "conversion-designer", priority: "high", objective: "Reducir fricción entre entender el valor y empezar a usarlo.", commands: ["definir CTA primaria por estado", "mostrar valor antes de pedir configuración compleja", "usar prueba del producto como primera experiencia"], libraries: ["sin librería adicional"], files: ["src/app/page.tsx", "src/app/planificar/page.tsx"], acceptanceCriteria: ["La acción principal es inequívoca", "No existen dark patterns", "El usuario puede empezar sin aprender el sistema"] },
  ];

  return {
    version: 1,
    principle: "Diseñar la experiencia desde el significado del estado del cerebro, no decorar una arquitectura técnica.",
    layers: ["brand", "psychology", "content", "interaction", "visual", "component", "responsive", "accessibility", "motion", "performance", "implementation"],
    agents: AGENTS,
    instructions,
    colorPsychology: {
      primaryRole: "Orientación y acción principal; el color de marca debe atraer sin dominar.",
      accentRole: "Destacar oportunidades y acciones secundarias sin confundirse con estados de seguridad.",
      warningRole: "Indicar atención o incertidumbre; siempre acompañado de texto/icono.",
      successRole: "Confirmar un estado realmente verificado o completado; nunca una mera recomendación.",
      rules: ["No usar rojo para todo lo pendiente.", "No usar verde para todo lo que el sistema cree que está bien.", "No codificar estados únicamente con color.", "Mantener contraste suficiente y coherencia entre superficies.", "El color debe reforzar el significado semántico, no crearlo por sí solo."],
    },
    commandPolicy: ["Preferir componentes y CSS existentes antes de instalar dependencias.", "Toda instrucción de diseño debe traducirse a cambios verificables de código.", "No crear comandos destructivos ni modificaciones globales sin alcance explícito.", "Cada cambio debe conservar la semántica de estado del producto."],
    libraryPolicy: ["No añadir una librería por moda.", "Reutilizar Next.js, React y Tailwind ya presentes.", "Añadir una dependencia sólo cuando resuelva una necesidad demostrable que la base actual no cubra.", "Registrar qué problema resuelve cada dependencia nueva."],
  };
}
