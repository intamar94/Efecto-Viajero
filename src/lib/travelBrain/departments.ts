import type { CanonicalTripContext } from "./tripContext";
import type { ResearchDomain, ResearchResult, ResearchTask } from "./researchOrchestrator";
import { executeTask } from "./providerExecutor";
import type { ResolvedDestination } from "./destinationResolver";
import type { DataRequirement } from "./reverseEngineeringOrchestrator";

export interface DepartmentMission {
  domain: ResearchDomain;
  objective: string;
  context: CanonicalTripContext;
  task: ResearchTask;
  dependencies: ResearchDomain[];
  dependencyResults: ResearchResult[];
  requirements?: DataRequirement[];
}

export interface DepartmentSubtask {
  id: string;
  question: string;
  priority: "critical" | "high" | "normal" | "background";
  dataType?: string;
  agentId?: string;
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
  error?: string;
}

export interface TravelDepartment {
  domain: ResearchDomain;
  mission(context: CanonicalTripContext, task: ResearchTask, dependencyResults?: ResearchResult[], requirements?: DataRequirement[]): DepartmentMission;
  organize(mission: DepartmentMission): DepartmentSubtask[];
  execute(mission: DepartmentMission, subtasks: DepartmentSubtask[], locations: ResolvedDestination[]): Promise<DepartmentReport>;
}

const OBJECTIVES: Partial<Record<ResearchDomain, string>> = {
  destination: "Resolver y validar el destino y la geografía relevante para el viaje.",
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
  budget: "Modelar la viabilidad económica del viaje a partir de datos observados y restricciones del viajero.",
  expenses: "Modelar gastos y desviaciones del presupuesto a partir de datos disponibles.",
  offline: "Determinar el conjunto mínimo de información que debe quedar disponible sin conexión.",
  social: "Determinar necesidades de participantes, permisos y colaboración del viaje.",
  memory: "Determinar qué memoria del viaje puede conservarse o recuperarse con las capacidades disponibles.",
};

const DEFAULT_SUBTASKS: Partial<Record<ResearchDomain, string[]>> = {
  destination: ["validar lugares", "validar país y región", "detectar ambigüedades"],
  transport: ["origen y destinos", "medios disponibles", "tiempos y distancias", "compatibilidad con restricciones", "impacto en presupuesto"],
  accommodation: ["zonas adecuadas", "necesidades del grupo", "ubicación respecto al recorrido", "precio si está disponible", "restricciones"],
  gastronomy: ["especialidades locales", "lugares relevantes", "ubicación", "horarios si están disponibles", "compatibilidad con preferencias"],
  nature: ["lugares naturales", "distancia", "accesibilidad", "condiciones", "compatibilidad con ritmo y grupo"],
  culture: ["lugares culturales", "patrimonio", "distancia", "horarios si están disponibles", "compatibilidad"],
  experiences: ["experiencias", "ubicación", "duración si está disponible", "compatibilidad", "evidencia"],
};

function statusFromResults(results: ResearchResult[]): DepartmentReport["status"] {
  if (!results.length) return "unavailable";
  if (results.some((result) => result.status === "error")) return results.every((result) => result.status === "error") ? "error" : "partial";
  if (results.some((result) => result.status === "needs_review")) return "needs_review";
  if (results.some((result) => result.status === "partial")) return "partial";
  if (results.every((result) => result.status === "unavailable")) return "unavailable";
  return "ready";
}

export function createDepartment(domain: ResearchDomain): TravelDepartment {
  return {
    domain,
    mission(context, task, dependencyResults = [], requirements = []) {
      return {
        domain,
        objective: OBJECTIVES[domain] ?? `Investigar ${domain} de forma autónoma dentro del contexto completo del viaje.`,
        context,
        task,
        dependencies: task.dependsOn.map((id) => id.replace("research:", "") as ResearchDomain),
        dependencyResults,
        requirements,
      };
    },
    organize(mission) {
      if (mission.requirements?.length) {
        return mission.requirements.map((requirement) => ({
          id: requirement.id,
          question: requirement.question,
          priority: requirement.priority,
          dataType: requirement.dataType,
          agentId: requirement.agentId,
        }));
      }
      return (DEFAULT_SUBTASKS[mission.domain] ?? ["determinar necesidades", "investigar fuentes", "validar resultados", "detectar incertidumbres"]).map((question, index) => ({ id: `${mission.domain}:${index + 1}`, question, priority: index === 0 ? "high" : "normal" }));
    },
    async execute(mission, subtasks, locations) {
      try {
        if (mission.domain === "destination") {
          const findings = locations.map((location) => ({ name: location.name, countryCode: location.countryCode, region: location.region, latitude: location.latitude, longitude: location.longitude }));
          return {
            domain: mission.domain,
            objective: mission.objective,
            subtasks,
            findings,
            evidence: [{ source: "destinationResolver", checkedAt: new Date().toISOString(), freshness: "live", confidence: "high" }],
            unresolved: [],
            conflicts: [],
            status: findings.length ? "ready" : "unavailable",
          };
        }
        const task: ResearchTask = { ...mission.task, dependsOn: [] };
        const results = await executeTask(task, mission.context, locations);
        const status = statusFromResults(results);
        const findings = results.flatMap((result) => Array.isArray(result.data) ? result.data : result.data === undefined ? [] : [result.data]);
        const evidence = results.flatMap((result) => result.evidence ?? []);
        const unresolved = results.flatMap((result) => result.error ? [result.error] : []);
        return { domain: mission.domain, objective: mission.objective, subtasks, findings, evidence, unresolved, conflicts: [], status, error: results.find((result) => result.error)?.error };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Department execution error";
        return { domain: mission.domain, objective: mission.objective, subtasks, findings: [], evidence: [], unresolved: [message], conflicts: [], status: "error", error: message };
      }
    },
  };
}

export function organizeDepartments(tasks: ResearchTask[], context: CanonicalTripContext, dependencyResults: Map<string, ResearchResult> = new Map(), requirements: DataRequirement[] = []) {
  return tasks.map((task) => {
    const department = createDepartment(task.domain);
    const mission = department.mission(context, task, task.dependsOn.flatMap((id) => {
      const result = dependencyResults.get(id);
      return result ? [result] : [];
    }), requirements.filter((requirement) => requirement.domain === task.domain));
    return { department, mission, subtasks: department.organize(mission) };
  });
}
