import type { CanonicalTripContext } from "./tripContext";
import type { ResearchDomain, ResearchPlan } from "./researchOrchestrator";
import type { ResolvedDestination } from "./destinationResolver";

export type RequirementPriority = "critical" | "high" | "normal" | "background";
export type RequirementStatus = "planned" | "partial" | "blocked";

export interface DataRequirement {
  id: string;
  domain: ResearchDomain;
  dataType: string;
  question: string;
  purpose: string;
  priority: RequirementPriority;
  dependsOn: string[];
  agentId: string;
  status: RequirementStatus;
}

export interface AgentSpec {
  id: string;
  name: string;
  domain: ResearchDomain;
  input: string[];
  output: string[];
  requirementIds: string[];
  mode: "deterministic-provider" | "research";
}

export interface ReverseEngineeringDepartment {
  domain: ResearchDomain;
  objective: string;
  requirements: DataRequirement[];
  agents: AgentSpec[];
}

export interface ReverseEngineeringPlan {
  version: 1;
  objective: string;
  source: "general-orchestrator";
  requirements: DataRequirement[];
  agents: AgentSpec[];
  departments: ReverseEngineeringDepartment[];
}

const DATA_BLUEPRINTS: Partial<Record<ResearchDomain, Array<[string, string, string, RequirementPriority]>>> = {
  destination: [["resolved_location", "¿Cuál es el lugar exacto?", "normalizar destinos y evitar ambigüedades", "critical"], ["geography", "¿Qué región, ciudad o área corresponde?", "relacionar datos posteriores con una geografía estable", "high"]],
  transport: [["origin", "¿Desde dónde parte el viajero?", "calcular desplazamientos reales", "high"], ["available_modes", "¿Qué medios de transporte existen?", "comparar alternativas", "high"], ["routes", "¿Qué rutas conectan los puntos relevantes?", "construir el recorrido", "high"], ["duration", "¿Cuánto tarda cada desplazamiento?", "evitar itinerarios inviables", "high"], ["cost", "¿Cuál es el coste observado?", "alimentar presupuesto y ranking", "normal"], ["accessibility", "¿Qué compatibilidad tiene el transporte con las restricciones?", "filtrar opciones incompatibles", "high"]],
  accommodation: [["areas", "¿Qué zonas son adecuadas?", "reducir el espacio de búsqueda", "high"], ["lodging_options", "¿Qué alojamientos cumplen los requisitos?", "generar candidatos", "high"], ["price", "¿Qué precio se observa?", "alimentar presupuesto", "normal"], ["location_fit", "¿Cómo encaja la ubicación con el recorrido?", "reducir desplazamientos", "normal"]],
  weather: [["forecast", "¿Qué condiciones meteorológicas se esperan?", "adaptar actividades", "high"], ["alerts", "¿Existen alertas o condiciones adversas?", "proteger decisiones sensibles", "critical"]],
  experiences: [["activities", "¿Qué experiencias existen?", "generar candidatos", "normal"], ["schedule", "¿Cuándo pueden realizarse?", "encajarlas en el itinerario", "normal"], ["duration", "¿Cuánto duran?", "calcular carga diaria", "normal"], ["requirements", "¿Qué requisitos tienen?", "filtrar incompatibilidades", "high"]],
  culture: [["cultural_places", "¿Qué patrimonio y lugares culturales son relevantes?", "crear candidatos culturales", "normal"], ["opening_hours", "¿Cuándo están disponibles?", "planificar visitas", "normal"], ["admission", "¿Qué condiciones de acceso tienen?", "evitar errores de planificación", "normal"]],
  gastronomy: [["local_specialties", "¿Qué comidas y productos locales son relevantes?", "personalizar la experiencia gastronómica", "normal"], ["food_places", "¿Dónde se pueden probar?", "crear candidatos gastronómicos", "normal"], ["opening_hours", "¿Cuándo están disponibles?", "encajar comidas en el día", "normal"], ["price", "¿Qué precio se observa?", "controlar presupuesto", "normal"], ["preferences_fit", "¿Son compatibles con las preferencias del viajero?", "filtrar candidatos", "high"]],
  nature: [["natural_places", "¿Qué espacios naturales son relevantes?", "crear candidatos", "normal"], ["access", "¿Cómo se accede?", "comprobar viabilidad", "high"], ["conditions", "¿Qué condiciones afectan la visita?", "evitar recomendaciones inviables", "high"], ["difficulty", "¿Qué exigencia tiene la actividad?", "adaptar al grupo", "normal"]],
  events: [["events", "¿Qué eventos ocurren durante el periodo?", "aprovechar oportunidades temporales", "normal"], ["event_schedule", "¿Cuándo y dónde ocurren?", "encajar eventos en el itinerario", "normal"]],
  requirements: [["entry_requirements", "¿Qué requisitos de entrada y documentación aplican?", "preparar el viaje correctamente", "critical"]],
  laws: [["local_rules", "¿Qué normas o restricciones aplican?", "evitar recomendaciones contrarias a normas", "critical"]],
  emergency: [["emergency_info", "¿Qué información oficial de emergencia es relevante?", "dar soporte seguro durante el viaje", "critical"]],
  language: [["language_needs", "¿Qué necesidades lingüísticas prácticas existen?", "facilitar la interacción", "normal"]],
  currency: [["exchange_rate", "¿Cuál es la información monetaria relevante?", "interpretar costes", "high"]],
  budget: [["budget_inputs", "¿Qué datos económicos observados alimentan el presupuesto?", "calcular viabilidad", "high"]],
  expenses: [["expense_items", "¿Qué gastos deben contabilizarse?", "mantener el presupuesto actualizado", "normal"]],
  map: [["geospatial_links", "¿Cómo se relacionan geográficamente los lugares?", "optimizar desplazamientos", "high"]],
  offline: [["offline_bundle", "¿Qué información mínima debe quedar disponible sin conexión?", "mantener utilidad offline", "background"]],
  social: [["participants", "¿Qué participantes y permisos intervienen?", "coordinar el viaje", "background"]],
  memory: [["memory_candidates", "¿Qué información del viaje merece conservarse?", "construir memoria reutilizable", "background"]],
};

function priorityFor(domain: ResearchDomain, base: RequirementPriority): RequirementPriority {
  return ["requirements", "laws", "emergency"].includes(domain) ? "critical" : base;
}

export function buildReverseEngineeringPlan(context: CanonicalTripContext, researchPlan: ResearchPlan, locations: ResolvedDestination[]): ReverseEngineeringPlan {
  const requirements: DataRequirement[] = [];
  const agents: AgentSpec[] = [];
  for (const task of researchPlan.tasks) {
    const blueprint: Array<[string, string, string, RequirementPriority]> = DATA_BLUEPRINTS[task.domain] ?? [["domain_data", `¿Qué datos concretos necesita resolver ${task.domain}?`, "resolver la misión departamental", "normal"]];
    const departmentRequirements = blueprint.map(([dataType, question, purpose, basePriority], index) => ({
      id: `req:${task.domain}:${dataType}`,
      domain: task.domain,
      dataType,
      question,
      purpose,
      priority: priorityFor(task.domain, basePriority),
      dependsOn: index === 0 ? task.dependsOn.map((d) => `req:${d.replace("research:", "")}:resolved_location`) : [`req:${task.domain}:${blueprint[index - 1][0]}`],
      agentId: `agent:${task.domain}:${dataType}`,
      status: (locations.length || task.domain === "social" || task.domain === "memory" ? "planned" : "partial") as RequirementStatus,
    }));
    requirements.push(...departmentRequirements);
    agents.push(...departmentRequirements.map((requirement) => ({ id: requirement.agentId, name: `${task.domain}.${requirement.dataType}`, domain: task.domain, input: ["TripContext", "destination", "date_window", "constraints"], output: [requirement.dataType, "evidence", "confidence", "freshness"], requirementIds: [requirement.id], mode: task.domain === "destination" ? "deterministic-provider" as const : "research" as const })));
  }
  return {
    version: 1,
    objective: `Deconstrucción de la intención: ${context.rawText}`,
    source: "general-orchestrator",
    requirements,
    agents,
    departments: researchPlan.selectedDomains.map((domain) => ({ domain, objective: `Deconstruir ${domain} en datos atómicos verificables para el viaje.`, requirements: requirements.filter((r) => r.domain === domain), agents: agents.filter((a) => a.domain === domain) })),
  };
}
