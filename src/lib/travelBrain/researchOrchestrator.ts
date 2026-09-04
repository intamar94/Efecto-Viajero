import { extractLocationCandidates } from "./tripDeconstructor";
import { resolveDestination, type ResolvedDestination } from "./destinationResolver";

export type ResearchDomain = "destination" | "transport" | "accommodation" | "experiences" | "requirements" | "weather" | "currency" | "laws" | "emergency" | "map" | "offline" | "memory";
export type ResearchStatus = "queued" | "running" | "ready" | "partial" | "error";
export interface ResearchTask { id: string; domain: ResearchDomain; priority: "critical" | "high" | "normal" | "background"; dependsOn: string[]; }
export interface ResearchResult { task: ResearchTask; status: ResearchStatus; data?: unknown; error?: string; }
export interface ResearchPlan { tasks: ResearchTask[]; }

const ALL: Array<[ResearchDomain, ResearchTask["priority"], string[]]> = [
  ["destination", "critical", []], ["requirements", "critical", ["destination"]], ["laws", "critical", ["destination"]], ["emergency", "critical", ["destination"]],
  ["transport", "high", ["destination"]], ["accommodation", "high", ["destination"]], ["weather", "high", ["destination"]], ["experiences", "normal", ["destination"]],
  ["currency", "normal", ["destination"]], ["map", "high", ["destination", "transport"]], ["offline", "background", ["requirements", "emergency", "map"]], ["memory", "background", []],
];

export function buildResearchPlan(): ResearchPlan {
  return { tasks: ALL.map(([domain, priority, dependencies]) => ({ id: `research:${domain}`, domain, priority, dependsOn: dependencies.map((d) => `research:${d}`) })) };
}

function unique(values: string[]) { return values.filter((v, i, a) => a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i); }
function countryHint(values: string[]) { return values.find((v) => /^(colombia|ecuador|per[uú]|bolivia|chile|espa[ñn]a|alemania|francia|italia|jap[oó]n|m[eé]xico|brasil|argentina)$/i.test(v)); }
function chooseBest(results: ResolvedDestination[], code?: string) { return code ? results.find((r) => r.countryCode.toUpperCase() === code.toUpperCase()) ?? results[0] : results[0]; }

/** Internal dependency-aware entry point. The UI receives outcomes, never agents. */
export async function analyzeTrip(rawText: string, trip: { destino?: string; etapas?: Array<{ nombre: string }> } = {}) {
  const candidates = unique(extractLocationCandidates(rawText).concat(trip.destino ?? "", ...(trip.etapas ?? []).map((e) => e.nombre)).filter(Boolean));
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
    const best = chooseBest(matches, countryCode);
    if (!best) { unresolved.push(candidate); continue; }
    const isCountry = best.name.toLowerCase() === candidate.toLowerCase() && !best.region;
    if (!isCountry || candidates.length === 1) locations.push(best);
    if (countryCode && best.countryCode.toUpperCase() !== countryCode.toUpperCase()) unresolved.push(candidate);
  }

  const plan = buildResearchPlan();
  const results: ResearchResult[] = [{ task: plan.tasks[0], status: locations.length ? (unresolved.length ? "partial" : "ready") : "error", data: { locations, countryCode, unresolved }, error: unresolved.length ? "Algunos lugares necesitan confirmación." : undefined }];
  for (const task of plan.tasks.slice(1)) results.push({ task, status: "queued", data: { destinationIds: locations.map((l) => l.id) } });
  return { locations, unresolved, countryCode, plan, results };
}
