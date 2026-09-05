import type { BrainState } from "./brainState";

export type UXPriority = "critical" | "high" | "normal" | "polish";
export type UXArea = "clarity" | "trust" | "conversion" | "navigation" | "accessibility" | "visual" | "performance" | "marketing";

export interface UXCodeChange {
  id: string;
  priority: UXPriority;
  area: UXArea;
  title: string;
  why: string;
  files: string[];
  changes: string[];
  acceptanceCriteria: string[];
  userOutcome: string;
  dependsOn?: string[];
}

export interface MarketingDesignBrief {
  objective: string;
  userPromise: string;
  primaryJourney: string[];
  changes: UXCodeChange[];
  copyRules: string[];
  designRules: string[];
  blockedBy?: string[];
}

/**
 * Product-facing neuron: translates the internal brain state into a concrete
 * implementation backlog for UX, digital design and product marketing.
 * It never invents product capabilities; claims are derived from the state.
 */
export function buildMarketingDesignBrief(state: BrainState): MarketingDesignBrief {
  const changes: UXCodeChange[] = [];
  const pending = state.pendingActions.length;
  const blockers = state.blockers.length;
  const conflicts = state.conflicts.length;

  changes.push({
    id: "ux:single-primary-action",
    priority: "critical",
    area: "conversion",
    title: "Una sola siguiente acción visible",
    why: pending ? `El cerebro tiene ${pending} acción(es) pendiente(s); la interfaz debe convertir la siguiente decisión en una acción comprensible.` : "El usuario debe saber qué hacer incluso cuando no hay trabajo pendiente.",
    files: ["src/app/planificar/page.tsx", "src/app/cerebro/page.tsx"],
    changes: ["Mostrar una CTA primaria contextual basada en la decisión del cerebro.", "Evitar que botones técnicos compitan con la acción principal.", "Después de cada cambio, devolver al usuario al punto exacto del flujo."],
    acceptanceCriteria: ["Existe una única acción primaria por estado de pantalla.", "La acción explica qué ocurrirá antes de ejecutarse.", "No aparecen CTAs que prometan una capacidad bloqueada."],
    userOutcome: "El viajero siempre sabe cuál es el siguiente paso.",
  });

  changes.push({
    id: "ux:truth-status-language",
    priority: "critical",
    area: "trust",
    title: "Estado visible y lenguaje de confianza",
    why: "Las capacidades parciales, pendientes y bloqueadas no deben parecer resultados finales.",
    files: ["src/lib/travelBrain/presentation.ts", "src/app/viajes/[id]/alojamiento/page.tsx", "src/app/viajes/[id]/transporte/page.tsx"],
    changes: ["Aplicar una semántica única para Verificado, Disponible, Parcial, Investigando, Por verificar, Idea y No disponible.", "Mostrar fuente o motivo cuando una afirmación pueda influir en una decisión.", "Separar siempre recomendación de reserva, precio observado de precio confirmado y idea de dato verificado."],
    acceptanceCriteria: ["Ningún dato pendiente se presenta como confirmado.", "Cada estado importante tiene texto comprensible para una persona no técnica.", "El usuario puede distinguir propuesta, evidencia y acción."],
    userOutcome: "El usuario entiende qué puede confiar, qué debe comprobar y qué puede hacer ahora.",
  });

  changes.push({
    id: "ux:decision-surface",
    priority: "high",
    area: "clarity",
    title: "Convertir decisiones del cerebro en superficies de producto",
    why: "Una decisión interna sólo tiene valor si modifica el viaje visible.",
    files: ["src/app/cerebro/page.tsx", "src/app/viajes/[id]/page.tsx", "src/app/viajes/[id]/decisiones/page.tsx"],
    changes: ["Mostrar decisión actual, motivo, impacto y siguiente acción.", "Enlazar cada bloqueo con la pantalla donde el usuario puede resolverlo.", "Cuando una decisión cambie, refrescar sólo los módulos afectados."],
    acceptanceCriteria: ["Toda decisión con impacto tiene una representación visible.", "Los bloqueos tienen una ruta de resolución.", "Los cambios no obligan a rehacer manualmente todo el viaje."],
    userOutcome: "El sistema parece un acompañante que actúa, no un panel de diagnóstico.",
  });

  changes.push({
    id: "ux:input-conversation",
    priority: "high",
    area: "clarity",
    title: "Entrada libre como conversación guiada",
    why: "El usuario debe poder expresar restricciones y cambios sin aprender el modelo de datos.",
    files: ["src/app/planificar/page.tsx", "src/lib/travelBrain/tripDeconstructor.ts", "src/lib/travelBrain/tripContext.ts"],
    changes: ["Mostrar lo entendido como chips editables y permitir corregir una sola parte sin repetir todo.", "Distinguir información declarada por el viajero de inferencias del sistema.", "Cuando falte información crítica, preguntar sólo lo necesario para desbloquear la siguiente decisión."],
    acceptanceCriteria: ["Una corrección puntual no borra el resto del contexto.", "El usuario puede revisar y editar lo entendido.", "Las preguntas del sistema tienen una razón visible."],
    userOutcome: "Planificar se siente como hablar con un asistente competente, no rellenar un formulario técnico.",
  });

  changes.push({
    id: "ux:mobile-first-travel",
    priority: "high",
    area: "accessibility",
    title: "Diseño móvil para decisiones durante el viaje",
    why: "La interfaz se utilizará con atención limitada, movimiento y pantallas pequeñas.",
    files: ["src/app/planificar/page.tsx", "src/app/cerebro/page.tsx", "src/app/viajes/[id]/page.tsx", "src/components/"],
    changes: ["Reducir densidad visual y priorizar información accionable.", "Usar áreas táctiles amplias, jerarquía clara y estados que no dependan sólo del color.", "Mantener navegación y acción principal accesibles con una mano."],
    acceptanceCriteria: ["Las acciones primarias son visibles sin buscar.", "Los estados se entienden con texto además de color.", "Las vistas críticas funcionan sin tablas anchas ni scroll horizontal innecesario."],
    userOutcome: "El producto sigue siendo utilizable en el contexto real de un viaje.",
  });

  if (blockers || conflicts) changes.push({
    id: "ux:blocker-resolution",
    priority: "high",
    area: "trust",
    title: "Centro de resolución de bloqueos",
    why: `El estado contiene ${blockers} bloqueo(s) y ${conflicts} conflicto(s); ocultarlos degrada la confianza y no permite actuar.`,
    files: ["src/app/cerebro/page.tsx", "src/app/viajes/[id]/decisiones/page.tsx"],
    changes: ["Agrupar bloqueos por impacto para el viaje.", "Explicar qué dato falta, por qué importa y qué parte del viaje afecta.", "Ofrecer una acción de resolución cuando exista."],
    acceptanceCriteria: ["Cada bloqueo tiene impacto y siguiente paso.", "Los conflictos no se muestran como simples errores técnicos.", "Resolver un bloqueo actualiza el estado visible."],
    userOutcome: "Un problema se convierte en una tarea concreta, no en incertidumbre.",
  });

  changes.push({
    id: "marketing:promise",
    priority: "high",
    area: "marketing",
    title: "Alinear promesa comercial con capacidad real",
    why: "La comunicación debe vender la experiencia diferencial sin prometer proveedores o automatizaciones que todavía no existen.",
    files: ["src/app/page.tsx", "src/app/planificar/page.tsx", "src/app/cerebro/page.tsx"],
    changes: ["Comunicar la propuesta como comprensión + coordinación + verificación + adaptación.", "Eliminar claims absolutos sobre reservas, precios, requisitos o disponibilidad.", "Usar ejemplos concretos del valor para familias, mascotas, cambios y contingencias."],
    acceptanceCriteria: ["La home explica en segundos qué hace diferente al producto.", "Cada claim comercial puede rastrearse a una capacidad real.", "El CTA conduce directamente a experimentar el valor."],
    userOutcome: "El usuario entiende por qué esto es distinto antes de tener que estudiar el producto.",
  });

  return {
    objective: "Convertir el estado inteligente de Efecto Viajero en una experiencia clara, confiable, accionable y comercialmente comprensible.",
    userPromise: "Tú explicas el viaje; Efecto Viajero entiende las condiciones, coordina lo necesario, comprueba lo que puede y te dice qué falta o qué hacer después.",
    primaryJourney: ["expresar", "entender", "confirmar", "investigar", "decidir", "actuar", "adaptar"],
    changes,
    copyRules: [
      "Hablar primero del beneficio y después del mecanismo.",
      "No mostrar jerga como requirement, agent, provider, blocker o ChangeSet al viajero.",
      "Explicar incertidumbre sin alarmismo: qué falta, por qué importa y cómo resolverlo.",
      "Nunca convertir una inferencia en un hecho mediante el lenguaje.",
    ],
    designRules: [
      "Una jerarquía clara: contexto → estado → decisión → acción.",
      "Una CTA primaria por superficie.",
      "Estados con texto + icono + contraste, no sólo color.",
      "Mobile-first y orientado a uso durante el viaje.",
      "La complejidad interna queda disponible para auditoría, no invade el flujo principal.",
    ],
    blockedBy: state.blockers.filter((b) => b.type === "provider").map((b) => b.target),
  };
}
