import type { CanonicalTripContext } from "./tripContext";
import type { ResearchDomain, ResearchTask } from "./researchOrchestrator";

export interface DepartmentMission {
  domain: ResearchDomain;
  objective: string;
  context: CanonicalTripContext;
  dependencies: ResearchDomain[];
}

export interface DepartmentSubtask {
  id: string;
  question: string;
  priority: "critical" | "high" | "normal" | "background";
}

export interface DepartmentReport {
  domain: ResearchDomain;
  objective: string;
  subtasks: DepartmentSubtask[];
  findings: unknown[];
  evidence: unknown[];
  unresolved: string[];
  conflicts: string[];
  status: "ready" | "partial" | "needs_review" | "unavailable" | "error";
}

export interface TravelDepartment {
  domain: ResearchDomain;
  mission(context: CanonicalTripContext, task: ResearchTask): DepartmentMission;
  organize(mission: DepartmentMission): DepartmentSubtask[];
}

const OBJECTIVES: Partial<Record<ResearchDomain, string>> = {
  transport: "Determinar cómo desplazarse de forma compatible con el viajero, sus destinos, fechas, presupuesto y restricciones.",
  accommodation: "Determinar qué características de alojamiento necesita el viajero y qué opciones son compatibles.",
  weather: "Determinar cómo las condiciones meteorológicas afectan al viaje y a sus decisiones.",
  experiences: "Encontrar experiencias relevantes y compatibles con el contexto real del viaje.",
  culture: "Identificar patrimonio, cultura y lugares de interés compatibles con el viajero.",
  gastronomy: "Identificar gastronomía y lugares para comer relevantes para el viajero y su recorrido.",
  nature: "Identificar espacios naturales y actividades de naturaleza compatibles con el viaje.",
  events: "Identificar acontecimientos relevantes durante las fechas y en los lugares del viaje.",
  requirements: "Determinar requisitos de entrada, documentación y preparación aplicables al viajero.",
  laws: "Determinar normas y restricciones relevantes para el viaje.",
  emergency: "Determinar información oficial útil para situaciones de emergencia.",
  language: "Determinar necesidades lingüísticas prácticas para el viaje.",
  currency: "Determinar la información monetaria necesaria para interpretar correctamente el presupuesto.",
  map: "Construir la representación geográfica necesaria para relacionar lugares y desplazamientos.",
};

const DEFAULT_SUBTASKS: Partial<Record<ResearchDomain, string[]>> = {
  transport: ["origen y destinos", "medios disponibles", "tiempos y distancias", "compatibilidad con restricciones", "impacto en presupuesto"],
  accommodation: ["zonas adecuadas", "necesidades del grupo", "ubicación respecto al recorrido", "precio si está disponible", "restricciones"],
  gastronomy: ["especialidades locales", "lugares relevantes", "ubicación", "horarios si están disponibles", "compatibilidad con preferencias"],
  nature: ["lugares naturales", "distancia", "accesibilidad", "condiciones", "compatibilidad con ritmo y grupo"],
  culture: ["lugares culturales", "patrimonio", "distancia", "horarios si están disponibles", "compatibilidad"],
  experiences: ["experiencias", "ubicación", "duración si está disponible", "compatibilidad", "evidencia"],
};

export function createDepartment(domain: ResearchDomain): TravelDepartment {
  return {
    domain,
    mission(context, task) {
      return { domain, objective: OBJECTIVES[domain] ?? `Investigar ${domain} de forma autónoma dentro del contexto completo del viaje.`, context, dependencies: task.dependsOn.map((id) => id.replace("research:", "") as ResearchDomain) };
    },
    organize(mission) {
      return (DEFAULT_SUBTASKS[mission.domain] ?? ["determinar necesidades", "investigar fuentes", "validar resultados", "detectar incertidumbres"]).map((question, index) => ({ id: `${mission.domain}:${index + 1}`, question, priority: index === 0 ? "high" : "normal" }));
    },
  };
}

export function organizeDepartments(tasks: ResearchTask[], context: CanonicalTripContext) {
  return tasks.map((task) => {
    const department = createDepartment(task.domain);
    const mission = department.mission(context, task);
    return { department, mission, subtasks: department.organize(mission) };
  });
}
