import { extractLocationCandidates } from "./tripDeconstructor";
import { resolveDestination, type ResolvedDestination } from "./destinationResolver";

export type ResearchDomain = "destination" | "transport" | "accommodation" | "experiences" | "requirements" | "weather" | "currency" | "laws" | "emergency" | "map" | "offline" | "memory";
export type ResearchStatus = "queued" | "running" | "ready" | "partial" | "error";

export interface ResearchTask { id: string; domain: ResearchDomain; priority: "critical" | "high" | "normal" | "background"; dependsOn: string[]; }
export interface ResearchResult { task: ResearchTask; status: ResearchStatus; data?: unknown; error?: string; }
export interface ResearchPlan { tasks: ResearchTask[]; }

const ALL: Array<[ResearchDomain, ResearchTask["priority"], string[]]> = [
  ["destination", "critical", []],
  ["requirements", "critical", ["destination"]],
  ["laws", "critical", ["destination"]],
  ["emergency", "critical", ["destination"]],
  ["transport", "high", ["destination"]],
  ["accommodation", "high", ["destination"]],
  ["weather", "high", ["destination"]],
  ["experiences", "normal", ["destination"]],
  ["currency", "normal", ["destination"]],
  ["map", "high", ["destination", "transport"]],
  ["offline", "background", ["requirements", "emergency", "map"]],
  ["memory", "background", []],
];

export function buildResearchPlan(): ResearchPlan {
  return { tasks: ALL.map(([domain, priority, dependencies]) => ({ id: `research:${domain}`, domain, priority, dependsOn: dependencies.map((d) => `research:${d}`) })) };
}

function text(trip: { destino?: string; contexto?: { ciudadOrigen?: string }; etapas?: Array<{ nombre: string }> }) {
  return [trip.destino, trip.contexto?.ciudadOrigen, ...(trip.etapas ?? []).map((e) => e.nombre)].filter(Boolean).join(" ");
}

function chooseBest(results: ResolvedDestination[], countryCode?: string): ResolvedDestination | undefined {
  if (!results.length) return undefined;
  if (countryCode) return results.find((r) => r.countryCode.toUpperCase() === countryCode.toUpperCase()) ?? results[0];
  return results[0];
}

/** Real dependency-aware orchestration for the planning entry point. */
export async function analyzeTrip(trip: { destino?: string; contexto?: { ciudadOrigen?: string }; etapas?: Array<{ nombre: string }> }, rawText: string) {
  const locationCandidates = extractLocationCandidates(rawText);
  const ordered = locationCandidates.length ? locationCandidates : [trip.destino, ...(trip.etapas ?? []).map((e) => e.nombre)].filter(Boolean) as string[];
  const unique = ordered.filter((value, index, array) => array.findIndex((x) => x.toLowerCase() === value.toLowerCase()) === index);

  const countryHints = unique.filter((value) => /colombia|ecuador|per[uú]|bolivia|chile|espa[ñn]a|alemania|francia|italia|jap[oó]n|méxico|mexico|brasil|argentina/i.test(value));
  const countryResolved = await Promise.all(countryHints.map((value) => resolveDestination(value)));
  const countryCode = countryResolved.flat().find((r) => /country/i.test(r.type))?.countryCode;

  const resolved: ResolvedDestination[] = [];
  for (const candidate of unique) {
    const matches = await resolveDestination(candidate, countryCode);
    const best = chooseBest(matches, countryCode);
    if (best && !resolved.some((r) => r.id === best.id)) resolved.push(best);
  }

  const plan = buildResearchPlan();
  const results: ResearchResult[] = [{
    task: plan.tasks[0],
    status: resolved.length === unique.length ? "ready" : resolved.length ? "partial" : "error",
    data: { candidates: unique, destinations: resolved, countryCode },
    error: resolved.length < unique.length ? "Algunos lugares necesitan confirmación." : undefined,
  }];

  // Remaining domains are not presented as fake completed research. They are
  // scheduled with explicit dependencies and consume the resolved context.
  for (const task of plan.tasks.slice(1)) {
    results.push({ task, status: "queued", data: { dependsOn: task.dependsOn, destinations: resolved.map((r) => r.id) } });
  }
  return { rawText, locations: resolved, unresolved: unique.filter((name) => !resolved.some((r) => r.name.toLowerCase() === name.toLowerCase())), plan, results };
}
