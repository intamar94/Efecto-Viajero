import type { BrainState } from "./brainState";
import type { CreativeAgentId, DesignLayer } from "./designSystemNeuron";

export type CreativeAuditSeverity = "critical" | "high" | "normal" | "polish";

export interface CreativeAuditFinding {
  id: string;
  agentId: CreativeAgentId;
  layer: DesignLayer;
  severity: CreativeAuditSeverity;
  surface: string;
  problem: string;
  evidence: string[];
  recommendation: string;
  files: string[];
  acceptanceCriteria: string[];
  status: "open" | "verified";
}

export interface CreativeAuditReport {
  version: 1;
  auditedAt: string;
  surfaces: string[];
  agents: CreativeAgentId[];
  findings: CreativeAuditFinding[];
  highestSeverity?: CreativeAuditSeverity;
  summary: string;
}

export interface CreativeAuditInput {
  state: BrainState;
  /** Optional source snapshots. When present, agents can audit concrete implementation evidence. */
  sourceFiles?: Record<string, string>;
}

const SURFACES = [
  "src/app/page.tsx",
  "src/app/planificar/page.tsx",
  "src/app/cerebro/page.tsx",
  "src/app/viajes/[id]/page.tsx",
  "src/app/viajes/[id]/decisiones/page.tsx",
  "src/app/viajes/[id]/itinerario/page.tsx",
  "src/app/viajes/[id]/alojamiento/page.tsx",
  "src/app/viajes/[id]/transporte/page.tsx",
  "src/app/viajes/[id]/actividades/page.tsx",
  "src/components/",
  "src/app/globals.css",
];

const AGENTS: CreativeAgentId[] = [
  "creative-director", "ux-strategist", "visual-designer", "color-psychology",
  "copy-strategist", "interaction-designer", "accessibility-designer",
  "responsive-designer", "motion-designer", "performance-designer",
  "design-system-engineer", "conversion-designer",
];

const SEVERITY_RANK: Record<CreativeAuditSeverity, number> = {
  critical: 4, high: 3, normal: 2, polish: 1,
};

function hasAnySource(sourceFiles: Record<string, string> | undefined, paths: string[]): boolean {
  return Boolean(sourceFiles && paths.some((path) => typeof sourceFiles[path] === "string"));
}

function sourceText(sourceFiles: Record<string, string> | undefined, paths: string[]): string {
  if (!sourceFiles) return "";
  return paths.map((path) => sourceFiles[path] ?? "").join("\n");
}

function finding(
  agentId: CreativeAgentId,
  layer: DesignLayer,
  severity: CreativeAuditSeverity,
  surface: string,
  problem: string,
  evidence: string[],
  recommendation: string,
  files: string[],
  acceptanceCriteria: string[],
  id: string,
): CreativeAuditFinding {
  return { id: `creative-audit:${id}`, agentId, layer, severity, surface, problem, evidence, recommendation, files, acceptanceCriteria, status: "open" };
}

function auditCreativeDirector(input: CreativeAuditInput): CreativeAuditFinding[] {
  const { state, sourceFiles } = input;
  const findings: CreativeAuditFinding[] = [];
  const homepage = sourceFiles?.["src/app/page.tsx"] ?? "";
  if (homepage && /demo|ejemplo/i.test(homepage)) {
    findings.push(finding(
      "creative-director", "brand", "high", "src/app/page.tsx",
      "La entrada principal se presenta como demostración técnica en lugar de producto.",
      ["La superficie contiene lenguaje de demo/ejemplo."],
      "Convertir la portada en una entrada de producto: propuesta de valor, entrada natural del viaje y una CTA primaria; dejar la demo como prueba secundaria.",
      ["src/app/page.tsx"],
      ["El usuario entiende qué resuelve Efecto Viajero sin conocer su arquitectura.", "La CTA primaria inicia el flujo real."],
      "homepage-demo-positioning",
    ));
  }
  if (state.blockers.length > 0 && !state.creativeDepartment) {
    findings.push(finding(
      "creative-director", "brand", "high", "brain-state",
      "El estado de bloqueo del producto todavía no tiene una capa creativa materializada.",
      [`Hay ${state.blockers.length} bloqueos en BrainState.`],
      "Asignar una representación visual y verbal consistente para bloqueo, espera y recuperación.",
      ["src/lib/travelBrain/presentation.ts", "src/components/"],
      ["Cada bloqueo relevante tiene explicación y siguiente acción comprensible."],
      "blocked-state-language",
    ));
  }
  return findings;
}

function auditUx(input: CreativeAuditInput): CreativeAuditFinding[] {
  const source = sourceText(input.sourceFiles, ["src/app/cerebro/page.tsx", "src/app/planificar/page.tsx"]);
  if (!source) return [];
  const findings: CreativeAuditFinding[] = [];
  if (/requirements|agents|cycles|orchestrator|provider/i.test(source)) {
    findings.push(finding(
      "ux-strategist", "content", "high", "src/app/cerebro/page.tsx",
      "Terminología interna del sistema puede filtrarse a la experiencia principal.",
      ["La superficie contiene referencias técnicas detectables en el código."],
      "Mantener métricas, agentes y proveedores exclusivamente en Diagnóstico; en Para ti mostrar significado, estado, decisión y acción.",
      ["src/app/cerebro/page.tsx"],
      ["La vista Para ti no expone nombres de subsistemas.", "Diagnóstico conserva el detalle técnico."],
      "traveler-view-internal-jargon",
    ));
  }
  return findings;
}

function auditVisual(input: CreativeAuditInput): CreativeAuditFinding[] {
  const source = sourceText(input.sourceFiles, SURFACES);
  if (!source) return [];
  const findings: CreativeAuditFinding[] = [];
  const directStatusColors = (source.match(/\b(?:emerald|red|amber|green|yellow|orange)-(?:50|100|200|300|400|500|600|700|800|900)\b/g) ?? []).length;
  if (directStatusColors >= 3) {
    findings.push(finding(
      "visual-designer", "visual", "high", "traveler surfaces",
      "Estados funcionales usan colores directos por pantalla en lugar de una gramática semántica central.",
      [`Se detectaron ${directStatusColors} clases cromáticas directas en las superficies auditadas.`],
      "Centralizar tokens semánticos de estado y reutilizar un componente/patrón común.",
      ["src/app/", "src/components/", "src/app/globals.css"],
      ["Estados equivalentes comparten tokens.", "No hay color semántico arbitrario por pantalla."],
      "direct-status-colors",
    ));
  }
  return findings;
}

function auditColor(input: CreativeAuditInput): CreativeAuditFinding[] {
  const source = sourceText(input.sourceFiles, ["src/app/globals.css", "src/app/cerebro/page.tsx"]);
  if (!source) return [];
  if (/text-(?:red|green|amber|emerald)-|bg-(?:red|green|amber|emerald)-/i.test(source)) {
    return [finding(
      "color-psychology", "psychology", "high", "state semantics",
      "La semántica de estado parece depender de colores utilitarios directos.",
      ["Se encontraron clases de color de estado fuera de un token semántico evidente."],
      "Definir roles success/warning/error/pending/verified y acompañarlos con texto o icono.",
      ["src/app/globals.css", "src/lib/travelBrain/presentation.ts", "src/components/"],
      ["El estado sigue siendo comprensible sin color.", "Los colores tienen una función única y documentada."],
      "state-color-semantics",
    )];
  }
  return [];
}

function auditCopy(input: CreativeAuditInput): CreativeAuditFinding[] {
  const source = sourceText(input.sourceFiles, ["src/app/page.tsx", "src/app/planificar/page.tsx", "src/app/cerebro/page.tsx"]);
  if (!source) return [];
  const findings: CreativeAuditFinding[] = [];
  if (/orquestador|orchestrator|BrainState|BrainController|provider|agentResults/i.test(source)) {
    findings.push(finding(
      "copy-strategist", "content", "high", "traveler-facing copy",
      "Hay vocabulario de infraestructura que debería traducirse a lenguaje de viajero.",
      ["El texto/render contiene términos internos detectables."],
      "Usar lenguaje de estado y consecuencia: 'Estamos comprobando', 'Falta confirmar', 'Puedes decidir ahora'.",
      ["src/app/page.tsx", "src/app/planificar/page.tsx", "src/app/cerebro/page.tsx"],
      ["No aparece jerga interna en el flujo del viajero.", "Cada estado explica qué significa y qué puede hacer el usuario."],
      "traveler-copy",
    ));
  }
  return findings;
}

function auditInteraction(input: CreativeAuditInput): CreativeAuditFinding[] {
  const source = sourceText(input.sourceFiles, ["src/app/cerebro/page.tsx", "src/app/planificar/page.tsx"]);
  if (!source) return [];
  if (/onClick|button|CTA|submit/i.test(source) && !/aria-|ariaLabel|aria-label/i.test(source)) {
    return [finding(
      "interaction-designer", "interaction", "normal", "primary interactions",
      "Las interacciones principales no muestran una política explícita de feedback accesible en el código auditado.",
      ["Hay controles interactivos sin evidencia estática de nombres/estados ARIA."],
      "Definir estados idle/loading/success/partial/error/blocked y feedback persistente para cada acción crítica.",
      ["src/app/cerebro/page.tsx", "src/app/planificar/page.tsx", "src/components/"],
      ["Cada acción crítica tiene feedback.", "Los estados de carga y error no pierden el contexto del viaje."],
      "interaction-feedback",
    )];
  }
  return [];
}

function auditAccessibility(input: CreativeAuditInput): CreativeAuditFinding[] {
  const source = sourceText(input.sourceFiles, ["src/app/page.tsx", "src/app/planificar/page.tsx", "src/app/cerebro/page.tsx", "src/components/"]);
  if (!source) return [];
  const findings: CreativeAuditFinding[] = [];
  if (!/prefers-reduced-motion|motion-reduce|aria-|ariaLabel|aria-label/i.test(source)) {
    findings.push(finding(
      "accessibility-designer", "accessibility", "high", "traveler surfaces",
      "No hay evidencia estática suficiente de una capa de accesibilidad explícita.",
      ["No se detectan reglas ARIA ni reduced-motion en las fuentes proporcionadas."],
      "Auditar nombres accesibles, foco, contraste, targets táctiles y reduced motion en componentes compartidos.",
      ["src/components/", "src/app/globals.css"],
      ["Controles críticos tienen nombre accesible.", "Focus visible está garantizado.", "Motion se puede reducir."],
      "accessibility-evidence",
    ));
  }
  return findings;
}

function auditResponsive(input: CreativeAuditInput): CreativeAuditFinding[] {
  const source = sourceText(input.sourceFiles, ["src/app/planificar/page.tsx", "src/app/cerebro/page.tsx"]);
  if (!source) return [];
  if ((source.match(/grid-cols-|flex-row|w-full|max-w-|overflow-x/g) ?? []).length > 8) {
    return [finding(
      "responsive-designer", "responsive", "normal", "planning and brain surfaces",
      "La densidad de layout merece una auditoría móvil específica; la presencia de utilidades responsive no demuestra usabilidad móvil.",
      ["La implementación contiene múltiples decisiones de layout que pueden aumentar densidad en pantallas pequeñas."],
      "Priorizar la acción principal, reducir bloques simultáneos y verificar el flujo crítico en móvil.",
      ["src/app/planificar/page.tsx", "src/app/cerebro/page.tsx", "src/components/"],
      ["El flujo crítico es usable con una mano.", "No hay scroll horizontal en superficies principales."],
      "mobile-density",
    )];
  }
  return [];
}

function auditMotion(input: CreativeAuditInput): CreativeAuditFinding[] {
  const source = sourceText(input.sourceFiles, ["src/app/", "src/components/"]);
  if (!source) return [];
  if (/animate-|transition-|duration-|keyframes/i.test(source) && !/prefers-reduced-motion|motion-reduce/i.test(source)) {
    return [finding(
      "motion-designer", "motion", "normal", "application surfaces",
      "Hay movimiento/transiciones sin evidencia estática de soporte para reduced motion.",
      ["Se detectan utilidades de animación/transición sin una regla reduced-motion en las fuentes auditadas."],
      "Añadir una política global de reduced motion y limitar animaciones a cambios de estado funcionales.",
      ["src/app/globals.css", "src/components/"],
      ["prefers-reduced-motion reduce las transiciones no esenciales.", "Ninguna animación bloquea la interacción."],
      "reduced-motion",
    )];
  }
  return [];
}

function auditPerformance(input: CreativeAuditInput): CreativeAuditFinding[] {
  const source = sourceText(input.sourceFiles, ["src/app/page.tsx", "src/app/planificar/page.tsx", "src/app/cerebro/page.tsx", "src/components/"]);
  if (!source) return [];
  if ((source.match(/<img\b/g) ?? []).length > 0 && !/next\/image|Image\b/.test(source)) {
    return [finding(
      "performance-designer", "performance", "normal", "application surfaces",
      "Hay imágenes renderizadas sin evidencia de optimización específica de Next.js.",
      ["Se detectaron elementos <img> sin uso evidente de next/image en las fuentes auditadas."],
      "Evaluar next/image o una estrategia equivalente sólo donde aporte valor; no introducir dependencias innecesarias.",
      ["src/app/", "src/components/"],
      ["Contenido crítico aparece rápidamente.", "Assets secundarios no bloquean el estado inicial."],
      "image-loading",
    )];
  }
  return [];
}

function auditDesignSystem(input: CreativeAuditInput): CreativeAuditFinding[] {
  const source = sourceText(input.sourceFiles, ["src/app/globals.css", "src/components/"]);
  if (!source) return [];
  const findings: CreativeAuditFinding[] = [];
  const repeatedColorValues = (source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).length;
  if (repeatedColorValues >= 6) {
    findings.push(finding(
      "design-system-engineer", "implementation", "high", "design tokens",
      "Hay suficientes valores cromáticos literales como para justificar una capa de tokens semánticos.",
      [`Se detectaron ${repeatedColorValues} valores hexadecimales en las fuentes auditadas.`],
      "Extraer sólo los valores recurrentes a tokens semánticos; conservar excepciones justificadas localmente.",
      ["src/app/globals.css", "src/components/"],
      ["Los estados comparten tokens.", "Los cambios de identidad no requieren editar cada pantalla."],
      "semantic-design-tokens",
    ));
  }
  return findings;
}

function auditConversion(input: CreativeAuditInput): CreativeAuditFinding[] {
  const source = sourceText(input.sourceFiles, ["src/app/page.tsx", "src/app/planificar/page.tsx"]);
  if (!source) return [];
  const ctas = (source.match(/<button\b|<a\b|href=/g) ?? []).length;
  if (ctas >= 8) {
    return [finding(
      "conversion-designer", "interaction", "high", "entry and planning flow",
      "La entrada contiene muchas acciones potenciales y necesita jerarquía explícita.",
      [`Se detectaron aproximadamente ${ctas} elementos de acción/enlace en las superficies auditadas.`],
      "Definir una CTA primaria por estado y convertir acciones secundarias en progresivas.",
      ["src/app/page.tsx", "src/app/planificar/page.tsx"],
      ["La CTA primaria es inequívoca.", "Las acciones secundarias no compiten visualmente con ella."],
      "cta-hierarchy",
    ));
  }
  return [];
}

export function auditCreativeAgents(input: CreativeAuditInput): CreativeAuditReport {
  const findings = [
    ...auditCreativeDirector(input),
    ...auditUx(input),
    ...auditVisual(input),
    ...auditColor(input),
    ...auditCopy(input),
    ...auditInteraction(input),
    ...auditAccessibility(input),
    ...auditResponsive(input),
    ...auditMotion(input),
    ...auditPerformance(input),
    ...auditDesignSystem(input),
    ...auditConversion(input),
  ].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  const highest = findings[0]?.severity;
  return {
    version: 1,
    auditedAt: new Date().toISOString(),
    surfaces: SURFACES,
    agents: AGENTS,
    findings,
    highestSeverity: highest,
    summary: findings.length
      ? `${findings.length} hallazgos creativos abiertos; prioridad máxima: ${highest}.`
      : "No se encontraron hallazgos con las reglas activas en las fuentes proporcionadas.",
  };
}
