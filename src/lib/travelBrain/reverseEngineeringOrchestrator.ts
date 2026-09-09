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

export interface ReverseEngineeringDepartment { domain: ResearchDomain; objective: string; requirements: DataRequirement[]; agents: AgentSpec[]; }
export interface ReverseEngineeringPlan { version: 1; objective: string; source: "general-orchestrator"; requirements: DataRequirement[]; agents: AgentSpec[]; departments: ReverseEngineeringDepartment[]; }

type Blueprint = [string, string, string, RequirementPriority];

const DATA_BLUEPRINTS: Partial<Record<ResearchDomain, Blueprint[]>> = {
  destination: [["resolved_location", "¿Cuál es el lugar exacto?", "normalizar destinos", "critical"], ["geography", "¿Qué región, ciudad o área corresponde?", "relacionar datos posteriores con una geografía estable", "high"]],
  requirements: [["traveler_documents", "¿Qué documento necesita cada viajero humano para entrar y salir?", "evitar requisitos incompletos por persona", "critical"], ["minor_documents", "¿Qué requisitos adicionales aplican a los menores?", "detectar autorizaciones y documentación específica", "critical"], ["infant_requirements", "¿Qué requisitos específicos aplican al bebé?", "proteger al viajero más vulnerable", "critical"], ["elder_requirements", "¿Qué consideraciones documentales o de seguro afectan a la persona mayor?", "evitar omisiones", "high"], ["pet_documents", "¿Qué documentos, vacunas, microchip y certificados necesita la mascota?", "hacer posible el viaje con mascota", "critical"], ["insurance", "¿Qué cobertura conviene comprobar para cada perfil?", "detectar huecos de cobertura", "high"], ["entry_requirements", "¿Qué requisitos oficiales de entrada aplican al grupo?", "preparar el viaje correctamente", "critical"]],
  laws: [["local_rules", "¿Qué normas locales pueden afectar al grupo?", "evitar recomendaciones incompatibles con normas", "critical"], ["pet_rules", "¿Qué normas afectan a mascotas en lugares y transporte?", "filtrar actividades y desplazamientos", "high"]],
  emergency: [["emergency_info", "¿Qué información oficial de emergencia es relevante?", "dar soporte seguro", "critical"], ["family_emergency", "¿Qué información debe estar disponible para cada perfil?", "hacer accionable una emergencia con niños, bebé, mayor y mascota", "critical"]],
  transport: [["origin", "¿Desde dónde parte el viajero?", "calcular desplazamientos", "high"], ["available_modes", "¿Qué medios existen entre los puntos?", "comparar alternativas", "high"], ["routes", "¿Qué rutas conectan los puntos?", "construir recorrido", "high"], ["duration", "¿Cuánto tarda cada desplazamiento?", "evitar itinerarios inviables", "high"], ["cost", "¿Cuál es el coste observado?", "alimentar presupuesto", "normal"], ["family_fit", "¿Qué opción es adecuada para niños, bebé y persona mayor?", "evitar tramos físicamente inadecuados", "high"], ["pet_transport", "¿Qué condiciones tiene cada medio para transportar al perro?", "hacer viable el viaje con mascota", "critical"], ["luggage_equipment", "¿Qué equipaje y equipamiento especial requiere el grupo?", "preparar bebé, mascota y necesidades especiales", "normal"]],
  accommodation: [["areas", "¿Qué zonas son adecuadas para el recorrido?", "reducir búsqueda", "high"], ["lodging_options", "¿Qué alojamientos cumplen los requisitos?", "generar candidatos", "high"], ["price", "¿Qué precio se observa?", "alimentar presupuesto", "normal"], ["family_room", "¿Qué configuración de habitaciones admite al grupo?", "comprobar capacidad real", "high"], ["pet_friendly", "¿Acepta realmente mascotas y bajo qué condiciones?", "evitar incompatibilidades", "critical"], ["baby_facilities", "¿Qué servicios existen para bebé?", "reducir carga logística", "high"], ["elder_fit", "¿Qué tan adecuada es la estancia para la persona mayor?", "evitar accesos o entornos problemáticos", "high"], ["quietness", "¿Hay una opción razonable de descanso y habitación tranquila?", "proteger recuperación", "normal"]],
  weather: [["forecast", "¿Qué condiciones meteorológicas se esperan?", "adaptar actividades", "high"], ["alerts", "¿Existen alertas o condiciones adversas?", "proteger decisiones sensibles", "critical"], ["family_impact", "¿Cómo afectan las condiciones a niños, bebé, mayor y mascota?", "convertir clima en decisiones", "high"]],
  experiences: [["activities", "¿Qué experiencias existen?", "generar candidatos", "normal"], ["schedule", "¿Cuándo pueden realizarse?", "encajarlas", "normal"], ["duration", "¿Cuánto duran?", "calcular carga diaria", "normal"], ["requirements", "¿Qué requisitos tienen?", "filtrar incompatibilidades", "high"], ["group_fit", "¿Puede participar todo el grupo?", "evitar recomendaciones genéricas", "high"], ["children_fit", "¿Es adecuada para niños de 6 y 11 años?", "personalizar", "high"], ["infant_fit", "¿Es viable con un bebé de 1 año?", "evitar riesgos logísticos", "critical"], ["elder_fit", "¿Es viable para una persona de 72 años?", "adaptar exigencia", "high"], ["pet_fit", "¿Puede acompañar el perro?", "integrar mascota", "high"], ["indoor_backup", "¿Qué alternativa bajo techo existe si cambia el tiempo?", "mantener el plan viable", "normal"], ["rest_windows", "¿Dónde colocar descansos sin perder el viaje?", "controlar fatiga", "high"]],
  culture: [["cultural_places", "¿Qué patrimonio y lugares culturales son relevantes?", "crear candidatos", "normal"], ["opening_hours", "¿Cuándo están disponibles?", "planificar visitas", "normal"], ["admission", "¿Qué condiciones de acceso tienen?", "evitar errores", "normal"], ["family_fit", "¿Son adecuados para distintas generaciones?", "personalizar", "high"]],
  gastronomy: [["local_specialties", "¿Qué comidas y productos locales son relevantes?", "personalizar experiencia", "normal"], ["food_places", "¿Dónde se pueden probar?", "crear candidatos", "normal"], ["opening_hours", "¿Cuándo están disponibles?", "encajar comidas", "normal"], ["price", "¿Qué precio se observa?", "controlar presupuesto", "normal"], ["children_options", "¿Qué opciones funcionan para niños?", "adaptar comidas", "high"], ["infant_options", "¿Qué opciones sencillas existen para el bebé?", "resolver alimentación práctica", "high"], ["pet_policy", "¿Acepta mascotas el establecimiento o existe alternativa cercana?", "integrar mascota", "high"], ["elder_options", "¿Hay opciones adecuadas para la persona mayor?", "personalizar", "normal"]],
  nature: [["natural_places", "¿Qué espacios naturales son relevantes?", "crear candidatos", "normal"], ["access", "¿Cómo se accede?", "comprobar viabilidad", "high"], ["conditions", "¿Qué condiciones afectan la visita?", "evitar recomendaciones inviables", "high"], ["difficulty", "¿Qué exigencia tiene?", "adaptar al grupo", "normal"], ["pet_access", "¿Puede acceder la mascota?", "evitar incompatibilidades", "high"], ["family_access", "¿Es razonable para bebé y persona mayor?", "proteger viabilidad", "high"]],
  events: [["events", "¿Qué eventos ocurren durante el periodo?", "aprovechar oportunidades temporales", "normal"], ["event_schedule", "¿Cuándo y dónde ocurren?", "encajar eventos", "normal"], ["family_fit", "¿Son adecuados para el grupo?", "filtrar", "high"]],
  language: [["language_needs", "¿Qué necesidades lingüísticas prácticas existen?", "facilitar interacción", "normal"]],
  currency: [["exchange_rate", "¿Cuál es la información monetaria relevante?", "interpretar costes", "high"]],
  budget: [["budget_inputs", "¿Qué datos económicos observados alimentan el presupuesto?", "calcular viabilidad", "high"], ["family_cost_model", "¿Cómo cambia el coste por 6 personas y una mascota?", "evitar presupuestos irreales", "high"], ["pet_costs", "¿Qué costes adicionales genera la mascota?", "completar presupuesto", "high"], ["baby_costs", "¿Qué costes específicos del bebé deben contemplarse?", "completar presupuesto", "normal"]],
  expenses: [["expense_items", "¿Qué gastos deben contabilizarse?", "mantener presupuesto", "normal"], ["traveler_expenses", "¿Qué gastos deben asociarse a cada perfil?", "auditar costes", "normal"]],
  map: [["geospatial_links", "¿Cómo se relacionan geográficamente los lugares?", "optimizar desplazamientos", "high"]],
  offline: [["offline_bundle", "¿Qué información mínima debe quedar disponible sin conexión?", "mantener utilidad offline", "background"], ["offline_documents", "¿Qué documentos y contactos deben estar accesibles offline?", "responder ante pérdida de conexión", "high"]],
  social: [["participants", "¿Qué participantes y permisos intervienen?", "coordinar viaje", "background"]],
  memory: [["memory_candidates", "¿Qué información merece conservarse?", "construir memoria reutilizable", "background"]],
};

function priorityFor(domain: ResearchDomain, base: RequirementPriority): RequirementPriority { return ["requirements", "laws", "emergency"].includes(domain) ? "critical" : base; }

export function buildReverseEngineeringPlan(context: CanonicalTripContext, researchPlan: ResearchPlan, locations: ResolvedDestination[]): ReverseEngineeringPlan {
  const requirements: DataRequirement[] = [];
  const agents: AgentSpec[] = [];
  for (const task of researchPlan.tasks) {
    const blueprint = DATA_BLUEPRINTS[task.domain] ?? [["domain_data", `¿Qué datos concretos necesita resolver ${task.domain}?`, "resolver la misión departamental", "normal"] as Blueprint];
    const departmentRequirements = blueprint.map(([dataType, question, purpose, basePriority], index) => {
      const dependencyRequirements = task.dependsOn.flatMap((dep) => {
        const domain = dep.replace("research:", "") as ResearchDomain;
        const first = DATA_BLUEPRINTS[domain]?.[0]?.[0];
        return first ? [`req:${domain}:${first}`] : [];
      });
      return {
        id: `req:${task.domain}:${dataType}`,
        domain: task.domain,
        dataType,
        question,
        purpose,
        priority: priorityFor(task.domain, basePriority),
        dependsOn: index === 0 ? dependencyRequirements : [`req:${task.domain}:${blueprint[index - 1][0]}`],
        agentId: `agent:${task.domain}:${dataType}`,
        status: (locations.length || task.domain === "social" || task.domain === "memory" ? "planned" : "partial") as RequirementStatus,
      };
    });
    requirements.push(...departmentRequirements);
    agents.push(...departmentRequirements.map((requirement) => ({ id: requirement.agentId, name: `${task.domain}.${requirement.dataType}`, domain: task.domain, input: ["TripContext", "traveler_profiles", "destination", "date_window", "constraints", "dependency_results"], output: [requirement.dataType, "evidence", "confidence", "freshness", "status"], requirementIds: [requirement.id], mode: task.domain === "destination" ? "deterministic-provider" as const : "research" as const })));
  }
  return { version: 1, objective: `Deconstrucción de la intención: ${context.rawText}`, source: "general-orchestrator", requirements, agents, departments: researchPlan.selectedDomains.map((domain) => ({ domain, objective: `Deconstruir ${domain} en datos atómicos verificables para este grupo concreto.`, requirements: requirements.filter((r) => r.domain === domain), agents: agents.filter((a) => a.domain === domain) })) };
}
