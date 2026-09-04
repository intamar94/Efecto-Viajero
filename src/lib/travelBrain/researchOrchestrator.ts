import { extractLocationCandidates } from "./tripDeconstructor";
import { resolveDestination, type ResolvedDestination } from "./destinationResolver";
import type { CanonicalTripContext } from "./tripContext";
import { buildExplorerPlan } from "./explorerIntelligence";
import { runDepartments } from "./departmentRunner";
import { scoreDestinations } from "./compatibility";
import { buildTripDraft } from "./tripBuilder";
import { buildOrchestratorUpdate } from "./supervisorProtocol";
import { auditCapabilities } from "./capabilityAudit";

export type ResearchDomain = "destination" | "requirements" | "laws" | "emergency" | "transport" | "accommodation" | "weather" | "experiences" | "culture" | "gastronomy" | "nature" | "events" | "language" | "currency" | "map" | "budget" | "expenses" | "memory" | "offline" | "social";
export type ResearchStatus = "queued" | "running" | "ready" | "partial" | "needs_review" | "unavailable" | "error";
export type ResearchPriority = "critical" | "high" | "normal" | "background";
export interface ResearchTask { id: string; domain: ResearchDomain; priority: ResearchPriority; dependsOn: string[]; phase: "understand" | "prepare" | "plan" | "live" | "memory"; }
export interface EvidenceRef { source: string; checkedAt: string; freshness: "live" | "recent" | "dated" | "unknown"; confidence: "high" | "medium" | "low"; }
export interface ResearchResult { task: ResearchTask; status: ResearchStatus; data?: unknown; evidence?: EvidenceRef[]; error?: string; }
export interface ResearchPlan { tasks: ResearchTask[]; }

const DEFINITIONS: Array<[ResearchDomain, ResearchPriority, ResearchDomain[], ResearchTask["phase"]]> = [
  ["destination", "critical", [], "understand"],
  ["requirements", "critical", ["destination"], "prepare"],
  ["laws", "critical", ["destination"], "prepare"],
  ["emergency", "critical", ["destination"], "prepare"],
  ["transport", "high", ["destination"], "plan"],
  ["accommodation", "high", ["destination"], "plan"],
  ["weather", "high", ["destination"], "live"],
  ["experiences", "normal", ["destination"], "plan"],
  ["culture", "normal", ["destination"], "plan"],
  ["gastronomy", "normal", ["destination"], "plan"],
  ["nature", "normal", ["destination"], "plan"],
  ["events", "normal", ["destination"], "live"],
  ["language", "normal", ["destination"], "prepare"],
  ["currency", "normal", ["destination"], "prepare"],
  ["budget", "high", ["destination", "transport", "accommodation"], "plan"],
  ["expenses", "normal", ["budget", "transport", "accommodation"], "plan"],
  ["map", "high", ["destination", "transport"], "live"],
  ["offline", "background", ["requirements", "emergency", "map"], "live"],
  ["social", "background", [], "plan"],
  ["memory", "background", [], "memory"],
];

export function buildResearchPlan(): ResearchPlan {
  return {
    tasks: DEFINITIONS.map(([domain, priority, dependencies, phase]) => ({
      id: `research:${domain}`,
      domain,
      priority,
      phase,
      dependsOn: dependencies.map((d) => `research:${d}`),
    })),
  };
}

function unique(values: string[]) {
  return values.filter((v, i, a) => v && a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);
}

function countryHint(values: string[]) {
  return values.find((v) => /^(colombia|ecuador|per[uú]|bolivia|chile|espa[ñn]a|alemania|francia|italia|jap[oó]n|m[eé]xico|brasil|argentina)$/i.test(v));
}

function bestMatch(results: ResolvedDestination[], code?: string) {
  return results.find((r) => !code || r.countryCode.toUpperCase() === code.toUpperCase()) ?? results[0];
}

function fallbackContext(rawText: string): CanonicalTripContext {
  return {
    rawText,
    dates: {},
    budget: { moneda: "EUR", tipo: "total" },
    travelers: { adultos: 1, ninos: 0 },
    accessibility: { requiereAccesibilidad: false },
    planningMode: "completo",
    destinations: [],
    interests: [],
    food: [],
    transport: [],
    constraints: [],
  };
}

export async function analyzeTrip(rawText: string, context?: CanonicalTripContext, trip: { destino?: string; etapas?: Array<{ nombre: string }> } = {}) {
  const candidates = unique(extractLocationCandidates(rawText).concat(context?.destinations ?? [], trip.destino ?? "", ...(trip.etapas ?? []).map((e) => e.nombre)));
  const hint = countryHint(candidates);
  let countryCode: string | undefined;

  // Solo la identificación inicial del país precede a la resolución paralela de lugares.
  if (hint) {
    const matches = await resolveDestination(hint);
    countryCode = matches.find((r) => r.name.toLowerCase() === hint.toLowerCase())?.countryCode ?? matches[0]?.countryCode;
  }

  const resolved = await Promise.all(candidates.map(async (candidate) => {
    const matches = await resolveDestination(candidate, countryCode);
    const best = bestMatch(matches, countryCode);
    if (!best) return { candidate, destination: undefined, unresolved: true };
    const isCountry = best.name.toLowerCase() === candidate.toLowerCase() && !best.region;
    const unresolved = Boolean(countryCode && best.countryCode.toUpperCase() !== countryCode.toUpperCase());
    return { candidate, destination: !isCountry || candidates.length === 1 ? best : undefined, unresolved };
  }));

  const locations: ResolvedDestination[] = [];
  const unresolved: string[] = [];
  for (const item of resolved) {
    if (item.destination) locations.push(item.destination);
    if (item.unresolved || (!item.destination && item.candidate !== hint)) unresolved.push(item.candidate);
  }

  const plan = buildResearchPlan();
  const ctx = context ?? fallbackContext(rawText);

  // El Orquestador ya no ejecuta proveedores directamente: entrega misiones a
  // departamentos y estos se ejecutan en ondas según el grafo de dependencias.
  const departmentExecution = await runDepartments(plan, ctx, locations);
  const results = departmentExecution.results;
  const ranked = scoreDestinations(ctx, locations);
  const draft = buildTripDraft(ctx, ranked);
  const explorer = context?.planningMode === "dejarse_llevar"
    ? buildExplorerPlan({ request: context.rawText || rawText, context, now: { iso: new Date().toISOString() } })
    : undefined;
  const normalizedUnresolved = unique(unresolved.concat(departmentExecution.reports.flatMap((report) => report.unresolved)));
  const pendingCount = plan.tasks.filter((task) => !results.some((result) => result.task.id === task.id)).length;
  const capabilityAudit = auditCapabilities(plan.tasks, results, departmentExecution.reports);
  const supervisorUpdate = buildOrchestratorUpdate(
    results,
    plan.tasks,
    normalizedUnresolved,
    departmentExecution.reports,
    1,
    capabilityAudit,
  );

  return {
    locations,
    unresolved: normalizedUnresolved,
    countryCode,
    plan,
    results,
    ranked,
    draft,
    availableDomains: departmentExecution.availableDomains,
    unavailableDomains: departmentExecution.unavailableDomains,
    mode: context?.planningMode ?? "completo",
    pendingCount,
    phases: {
      understand: results.filter((r) => r.task.phase === "understand").map((r) => r.task.domain),
      prepare: results.filter((r) => r.task.phase === "prepare").map((r) => r.task.domain),
      plan: results.filter((r) => r.task.phase === "plan").map((r) => r.task.domain),
      live: results.filter((r) => r.task.phase === "live").map((r) => r.task.domain),
      memory: results.filter((r) => r.task.phase === "memory").map((r) => r.task.domain),
    },
    explorer,
    departmentReports: departmentExecution.reports,
    capabilityAudit,
    supervisorUpdate,
  };
}
