import type { CanonicalTripContext } from "./tripContext";
import type { ResearchDomain, ResearchResult, ResearchTask } from "./researchOrchestrator";
import type { ResolvedDestination } from "./destinationResolver";
import type { DataRequirement, AgentSpec } from "./reverseEngineeringOrchestrator";
import { executeAgents } from "./agentRuntime";

export interface DepartmentMission { domain: ResearchDomain; objective: string; context: CanonicalTripContext; task: ResearchTask; dependencies: ResearchDomain[]; dependencyResults: ResearchResult[]; requirements?: DataRequirement[]; agents?: AgentSpec[]; }
export interface DepartmentSubtask { id: string; question: string; priority: "critical" | "high" | "normal" | "background"; dataType?: string; agentId?: string; }
export interface DepartmentReport { domain: ResearchDomain; objective: string; subtasks: DepartmentSubtask[]; findings: unknown[]; evidence: unknown[]; unresolved: string[]; conflicts: string[]; status: "ready" | "partial" | "needs_review" | "unavailable" | "error"; error?: string; agentResults?: unknown[]; }
export interface TravelDepartment { domain: ResearchDomain; mission(context: CanonicalTripContext, task: ResearchTask, dependencyResults?: ResearchResult[], requirements?: DataRequirement[], agents?: AgentSpec[]): DepartmentMission; organize(mission: DepartmentMission): DepartmentSubtask[]; execute(mission: DepartmentMission, subtasks: DepartmentSubtask[], locations: ResolvedDestination[]): Promise<DepartmentReport>; }

const OBJECTIVES: Partial<Record<ResearchDomain, string>> = {
  destination: "Resolver y validar el destino y la geografía relevante para el viaje.", transport: "Determinar desplazamientos compatibles con todo el grupo, incluidos bebé, persona mayor y mascota.", accommodation: "Determinar alojamiento compatible con composición familiar, mascota, bebé, descanso y recorrido.", weather: "Determinar cómo las condiciones meteorológicas afectan al grupo y a las decisiones.", experiences: "Encontrar experiencias compatibles con cada perfil del grupo y con alternativas y descansos.", culture: "Identificar patrimonio y cultura compatibles con distintas generaciones.", gastronomy: "Identificar gastronomía y lugares compatibles con adultos, niños, bebé, persona mayor y mascota.", nature: "Identificar naturaleza y actividades compatibles con la capacidad real del grupo.", events: "Identificar acontecimientos relevantes durante las fechas y lugares.", requirements: "Determinar requisitos de entrada, documentación, seguro y mascota por viajero.", laws: "Determinar normas y restricciones relevantes.", emergency: "Determinar información oficial útil y accionable para el grupo.", language: "Determinar necesidades lingüísticas prácticas.", currency: "Determinar información monetaria necesaria.", map: "Relacionar geográficamente lugares y desplazamientos.", budget: "Modelar viabilidad económica con composición familiar y mascota.", expenses: "Modelar gastos y desviaciones.", offline: "Determinar el paquete mínimo útil sin conexión, incluidos documentos y contactos.", social: "Determinar participantes, permisos y colaboración.", memory: "Determinar memoria reutilizable del viaje.",
};

const DEFAULT_SUBTASKS: Partial<Record<ResearchDomain, string[]>> = { destination: ["validar lugares", "validar país y región", "detectar ambigüedades"], transport: ["origen y destinos", "medios disponibles", "tiempos y distancias", "compatibilidad con grupo", "impacto en presupuesto"], accommodation: ["zonas adecuadas", "necesidades del grupo", "ubicación", "precio", "restricciones"], gastronomy: ["especialidades", "lugares", "ubicación", "horarios", "compatibilidad"], nature: ["lugares", "distancia", "accesibilidad", "condiciones", "compatibilidad"], culture: ["lugares culturales", "patrimonio", "distancia", "horarios", "compatibilidad"], experiences: ["experiencias", "ubicación", "duración", "compatibilidad", "evidencia"] };

function statusFromAgentResults(results: Array<{ status: string }>): DepartmentReport["status"] { if (!results.length) return "unavailable"; if (results.every((r) => r.status === "unavailable")) return "unavailable"; if (results.some((r) => r.status === "error")) return results.every((r) => r.status === "error") ? "error" : "partial"; if (results.some((r) => r.status === "partial")) return "partial"; return "ready"; }

export function createDepartment(domain: ResearchDomain): TravelDepartment {
  return {
    domain,
    mission(context, task, dependencyResults = [], requirements = [], agents = []) { return { domain, objective: OBJECTIVES[domain] ?? `Investigar ${domain} de forma autónoma dentro del contexto completo del viaje.`, context, task, dependencies: task.dependsOn.map((id) => id.replace("research:", "") as ResearchDomain), dependencyResults, requirements, agents }; },
    organize(mission) {
      if (mission.requirements?.length) return mission.requirements.map((r) => ({ id: r.id, question: r.question, priority: r.priority, dataType: r.dataType, agentId: r.agentId }));
      return (DEFAULT_SUBTASKS[mission.domain] ?? ["determinar necesidades", "investigar fuentes", "validar resultados", "detectar incertidumbres"]).map((question, index) => ({ id: `${mission.domain}:${index + 1}`, question, priority: index === 0 ? "high" : "normal" }));
    },
    async execute(mission, subtasks, locations) {
      try {
        const requirements = mission.requirements ?? [];
        const agents = mission.agents ?? [];
        const agentResults = requirements.length && agents.length ? await executeAgents(requirements, agents, mission.context, locations, mission.dependencyResults) : [];
        const findings = agentResults.flatMap((r) => r.data === undefined ? [] : Array.isArray(r.data) ? r.data : [r.data]);
        const evidence = agentResults.flatMap((r) => r.evidence ?? []);
        const unresolved = agentResults.flatMap((r) => r.error ? [r.error] : []);
        const status = requirements.length ? statusFromAgentResults(agentResults) : "unavailable";
        return { domain: mission.domain, objective: mission.objective, subtasks, findings, evidence, unresolved, conflicts: [], status, agentResults };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Department execution error";
        return { domain: mission.domain, objective: mission.objective, subtasks, findings: [], evidence: [], unresolved: [message], conflicts: [], status: "error", error: message };
      }
    },
  };
}

export function organizeDepartments(tasks: ResearchTask[], context: CanonicalTripContext, dependencyResults: Map<string, ResearchResult> = new Map(), requirements: DataRequirement[] = [], agents: AgentSpec[] = []) {
  return tasks.map((task) => { const department = createDepartment(task.domain); const mission = department.mission(context, task, task.dependsOn.flatMap((id) => { const result = dependencyResults.get(id); return result ? [result] : []; }), requirements.filter((r) => r.domain === task.domain), agents.filter((a) => a.domain === task.domain)); return { department, mission, subtasks: department.organize(mission) }; });
}
