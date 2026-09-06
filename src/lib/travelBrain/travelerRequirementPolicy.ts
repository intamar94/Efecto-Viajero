import type { CanonicalTripContext } from "./tripContext";
import type { DataRequirement, ReverseEngineeringPlan } from "./reverseEngineeringOrchestrator";

function hasChildren(context: CanonicalTripContext) { return context.travelers.ninos > 0; }
function hasBabies(context: CanonicalTripContext) { return Boolean(context.travelers.bebes); }
function hasElders(context: CanonicalTripContext) { return Boolean(context.travelers.personasMayores); }
function hasPets(context: CanonicalTripContext) { return Boolean(context.travelers.mascotas); }

function include(dataType: string, context: CanonicalTripContext) {
  if (["minor_documents", "children_fit", "children_options"].includes(dataType)) return hasChildren(context);
  if (["infant_requirements", "infant_fit", "infant_options", "baby_facilities", "baby_costs"].includes(dataType)) return hasBabies(context);
  if (["elder_requirements", "elder_fit", "elder_options"].includes(dataType)) return hasElders(context);
  if (["pet_documents", "pet_rules", "pet_transport", "pet_friendly", "pet_fit", "pet_policy", "pet_access", "pet_costs"].includes(dataType)) return hasPets(context);
  return true;
}

function adaptQuestion(requirement: DataRequirement, context: CanonicalTripContext): DataRequirement {
  if (requirement.dataType === "family_fit") {
    const profiles = [hasChildren(context) ? `${context.travelers.ninos} menor(es)` : "", hasBabies(context) ? `${context.travelers.bebes} bebé(s)` : "", hasElders(context) ? `${context.travelers.personasMayores} persona(s) mayor(es)` : "", hasPets(context) ? `${context.travelers.mascotas} mascota(s)` : ""].filter(Boolean);
    return { ...requirement, question: profiles.length ? `¿Qué opción es adecuada para el grupo: ${profiles.join(", ")}?` : "¿Qué opción es adecuada para el grupo de viajeros?" };
  }
  if (requirement.dataType === "family_cost_model") {
    const people = context.travelers.adultos + context.travelers.ninos + (context.travelers.bebes ?? 0) + (context.travelers.personasMayores ?? 0);
    return { ...requirement, question: `¿Cómo cambia el coste para ${people} viajero(s)${hasPets(context) ? ` y ${context.travelers.mascotas} mascota(s)` : ""}?` };
  }
  return requirement;
}

export function applyTravelerRequirementPolicy(plan: ReverseEngineeringPlan, context: CanonicalTripContext): ReverseEngineeringPlan {
  const requirements = plan.requirements.filter((requirement) => include(requirement.dataType, context)).map((requirement) => adaptQuestion(requirement, context));
  const ids = new Set(requirements.map((requirement) => requirement.id));
  const normalized = requirements.map((requirement) => ({ ...requirement, dependsOn: requirement.dependsOn.filter((id) => ids.has(id)) }));
  const agents = plan.agents.filter((agent) => normalized.some((requirement) => requirement.agentId === agent.id));
  const departments = plan.departments.map((department) => ({ ...department, requirements: normalized.filter((requirement) => requirement.domain === department.domain), agents: agents.filter((agent) => agent.domain === department.domain) }));
  return { ...plan, requirements: normalized, agents, departments };
}

export function validateTravelerRequirementPolicy(plan: ReverseEngineeringPlan, context: CanonicalTripContext) {
  const forbidden = new Set<string>();
  if (!hasChildren(context)) ["minor_documents", "children_fit", "children_options"].forEach((id) => forbidden.add(id));
  if (!hasBabies(context)) ["infant_requirements", "infant_fit", "infant_options", "baby_facilities", "baby_costs"].forEach((id) => forbidden.add(id));
  if (!hasElders(context)) ["elder_requirements", "elder_fit", "elder_options"].forEach((id) => forbidden.add(id));
  if (!hasPets(context)) ["pet_documents", "pet_rules", "pet_transport", "pet_friendly", "pet_fit", "pet_policy", "pet_access", "pet_costs"].forEach((id) => forbidden.add(id));
  return plan.requirements.every((requirement) => !forbidden.has(requirement.dataType));
}
