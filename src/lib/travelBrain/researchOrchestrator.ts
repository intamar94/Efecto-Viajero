import { extractLocationCandidates } from "./tripDeconstructor";
import { resolveDestination, type ResolvedDestination } from "./destinationResolver";
import type { CanonicalTripContext } from "./tripContext";
import { buildExplorerPlan } from "./explorerIntelligence";
import { runDepartments } from "./departmentRunner";
import { scoreDestinations } from "./compatibility";
import { buildTripDraft } from "./tripBuilder";
import { buildOrchestratorUpdate } from "./supervisorProtocol";
import { auditCapabilities } from "./capabilityAudit";
import { deriveOrchestrationSignals, selectResearchDomains } from "./orchestrationPolicy";

export type ResearchDomain = "destination" | "requirements" | "laws" | "emergency" | "transport" | "accommodation" | "weather" | "experiences" | "culture" | "gastronomy" | "nature" | "events" | "language" | "currency" | "map" | "budget" | "expenses" | "memory" | "offline" | "social";
export type ResearchStatus = "queued" | "running" | "ready" | "partial" | "needs_review" | "unavailable" | "error";
export type ResearchPriority = "critical" | "high" | "normal" | "background";
export interface ResearchTask { id: string; domain: ResearchDomain; priority: ResearchPriority; dependsOn: string[]; phase: "understand" | "prepare" | "plan" | "live" | "memory"; }
export interface EvidenceRef { source: string; checkedAt: string; freshness: "live" | "recent" | "dated" | "unknown"; confidence: "high" | "medium" | "low"; }
export interface ResearchResult { task: ResearchTask; status: ResearchStatus; data?: unknown; evidence?: EvidenceRef[]; error?: string; }
export interface ResearchPlan { tasks: ResearchTask[]; selectedDomains: ResearchDomain[]; skippedDomains: ResearchDomain[]; selectionReasons: Partial<Record<ResearchDomain, string>>; }

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

export function buildResearchPlan(context: CanonicalTripContext): ResearchPlan {
  const selected = selectResearchDomains(context, DEFINITIONS);
  const signals = deriveOrchestrationSignals(context);
  const tasks = DEFINITIONS
    .filter(([domain]) => selected.has(domain))
    .map(([domain, priority, dependencies, phase]) => ({
      id: `research:${domain}`,
      domain,
      priority,
      phase,
      dependsOn: dependencies.filter((d) => selected.has(d)).map((d) => `research:${d}`),
    }));

  return {
    tasks,
    selectedDomains: tasks.map((task) => task.domain),
    skippedDomains: DEFINITIONS.map(([domain]) => domain).filter((domain) => !selected.has(domain)),
    selectionReasons: Object.fromEntries(
      [...signals.explicit, ...signals.inferred].map((domain) => [domain, signals.reasons[domain] ?? "Necesario por el contexto o por una dependencia."]),
    ),
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
  const ctx = context ?? fallbackContext(rawText);
  const candidates = unique(extractLocationCandidates(rawText).concat(ctx.destinations ?? [], trip.destino ?? "", ...(trip.etapas ?? []).map((e) => e.nombre)));
  const hint = countryHint(candidates);
  let countryCode: string | undefined;

  async function resolverTolerante(valor: string, code?: string) {
    try {
      return await resolveDestination(valor, code);
    } catch {
      return [];
    }
  }

  if (hint) {
    const matches = await resolverTolerante(hint);
    countryCode = matches.find((r) => r.name.toLowerCase() === hint.toLowerCase())?.countryCode ?? matches[0]?.countryCode;
  }

  const resolved = await Promise.all(candidates.map(async (candidate) => {
    const matches = await resolverTolerante(candidate, countryCode);
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

  // Selección semántica primero; ejecución después. El runner recibe únicamente
  // las misiones que el contexto justifica, junto con el cierre de dependencias.
  const plan = buildResearchPlan(ctx);
  const departmentExecution = await runDepartments(plan, ctx, locations);
  const results = departmentExecution.results;
  const ranked = scoreDestinations(ctx, locations);
  const draft = buildTripDraft(ctx, ranked);
  const explorer = ctx.planningMode === "dejarse_llevar"
    ? buildExplorerPlan({ request: ctx.rawText || rawText, context: ctx, now: { iso: new Date().toISOString() } })
    : undefined;
  const normalizedUnresolved = unique(unresolved.concat(departmentExecution.reports.flatMap((report) => report.unresolved)));
  const pendingCount = plan.tasks.filter((task) => !results.some((result) => result.task.id === task.id)).length;
  const capabilityAudit = auditCapabilities(plan.tasks, results, departmentExecution.reports);
  const supervisorUpdate = buildOrchestratorUpdate(results, plan.tasks, normalizedUnresolved, departmentExecution.reports, 1, capabilityAudit);

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
    mode: ctx.planningMode,
    pendingCount,
    orchestration: {
      selected: plan.selectedDomains,
      skipped: plan.skippedDomains,
      reasons: plan.selectionReasons,
      explicitSignals: [...deriveOrchestrationSignals(ctx).explicit],
      inferredSignals: [...deriveOrchestrationSignals(ctx).inferred],
    },
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
