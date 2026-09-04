import { extractLocationCandidates } from "./tripDeconstructor";
import { resolveDestination, type ResolvedDestination } from "./destinationResolver";
import type { ModoPlanificacion } from "../types";
import type { CanonicalTripContext } from "./tripContext";
import { buildExplorerPlan } from "./explorerIntelligence";

export type ResearchDomain =
  | "destination" | "requirements" | "laws" | "emergency" | "transport" | "accommodation"
  | "weather" | "experiences" | "culture" | "gastronomy" | "nature" | "events" | "language"
  | "currency" | "map" | "budget" | "expenses" | "memory" | "offline" | "social";

export type ResearchStatus = "queued" | "running" | "ready" | "partial" | "needs_review" | "unavailable" | "error";
export type ResearchPriority = "critical" | "high" | "normal" | "background";

export interface ResearchTask {
  id: string;
  domain: ResearchDomain;
  priority: ResearchPriority;
  dependsOn: string[];
  phase: "understand" | "prepare" | "plan" | "live" | "memory";
}

export interface EvidenceRef {
  source: string;
  checkedAt: string;
  freshness: "live" | "recent" | "dated" | "unknown";
  confidence: "high" | "medium" | "low";
}

export interface ResearchResult {
  task: ResearchTask;
  status: ResearchStatus;
  data?: unknown;
  evidence?: EvidenceRef[];
  error?: string;
}

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
  if (!results.length) return undefined;
  if (!code) return results[0];
  return results.find((r) => r.countryCode.toUpperCase() === code.toUpperCase()) ?? results[0];
}

/**
 * Builds one shared research state. Domain execution is deliberately provider-driven:
 * no task is reported ready merely because it exists in the graph.
 */
export async function analyzeTrip(
  rawText: string,
  context?: CanonicalTripContext,
  trip: { destino?: string; etapas?: Array<{ nombre: string }> } = {},
) {
  const candidates = unique(extractLocationCandidates(rawText)
    .concat(context?.destinations ?? [], trip.destino ?? "", ...(trip.etapas ?? []).map((e) => e.nombre)));
  const hint = countryHint(candidates);
  let countryCode: string | undefined;

  if (hint) {
    const matches = await resolveDestination(hint);
    countryCode = matches.find((r) => r.name.toLowerCase() === hint.toLowerCase())?.countryCode ?? matches[0]?.countryCode;
  }

  const locations: ResolvedDestination[] = [];
  const unresolved: string[] = [];
  for (const candidate of candidates) {
    const matches = await resolveDestination(candidate, countryCode);
    const best = bestMatch(matches, countryCode);
    if (!best) { unresolved.push(candidate); continue; }
    const isCountry = best.name.toLowerCase() === candidate.toLowerCase() && !best.region;
    if (!isCountry || candidates.length === 1) locations.push(best);
    if (countryCode && best.countryCode.toUpperCase() !== countryCode.toUpperCase()) unresolved.push(candidate);
  }

  const plan = buildResearchPlan();
  const destinationResult: ResearchResult = {
    task: plan.tasks[0],
    status: locations.length ? (unresolved.length ? "needs_review" : "ready") : "error",
    data: { locations, countryCode, unresolved },
  };

  // The graph is explicit and deterministic. A later provider layer can execute ready tasks
  // in parallel by dependency layer; this version returns the correct queue rather than faking data.
  const results: ResearchResult[] = [destinationResult];
  for (const task of plan.tasks.slice(1)) {
    results.push({
      task,
      status: "queued",
      data: { destinationIds: locations.map((l) => l.id), waitingFor: task.dependsOn },
    });
  }

  const explorer = context?.planningMode === "dejarse_llevar"
    ? buildExplorerPlan({ request: context.rawText || rawText, context, now: { iso: new Date().toISOString() } })
    : undefined;

  return {
    locations,
    unresolved: unique(unresolved),
    countryCode,
    plan,
    results,
    mode: context?.planningMode ?? "completo",
    phases: {
      understand: results.filter((r) => r.task.phase === "understand").map((r) => r.task.domain),
      prepare: results.filter((r) => r.task.phase === "prepare").map((r) => r.task.domain),
      plan: results.filter((r) => r.task.phase === "plan").map((r) => r.task.domain),
      live: results.filter((r) => r.task.phase === "live").map((r) => r.task.domain),
      memory: results.filter((r) => r.task.phase === "memory").map((r) => r.task.domain),
    },
    explorer,
  };
}
