import type { TripState } from "./types";
import { delegates } from "./delegates";

export type ResearchDomain =
  | "events" | "culture" | "transport" | "accommodation" | "gastronomy"
  | "nature" | "requirements" | "weather" | "language" | "currency"
  | "laws" | "emergency" | "map" | "offline" | "social" | "expenses" | "memory";

export interface ResearchTaskResult {
  domain: ResearchDomain;
  status: "ready" | "partial" | "error";
  data: unknown;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

const ALWAYS_RELEVANT: ResearchDomain[] = ["events", "culture", "transport", "gastronomy", "requirements", "weather", "language", "currency", "laws", "emergency", "map"];

function shouldRun(domain: ResearchDomain, trip: TripState): boolean {
  if (ALWAYS_RELEVANT.includes(domain)) return Boolean(trip.destination || trip.etapas?.length);
  if (domain === "accommodation") return Boolean(trip.destination || trip.etapas?.length);
  if (domain === "nature") return Boolean(trip.destination || trip.etapas?.length);
  if (domain === "offline") return true;
  if (domain === "social" || domain === "expenses") return true;
  return false;
}

export async function researchTrip(trip: TripState, domains?: ResearchDomain[]): Promise<ResearchTaskResult[]> {
  const selected = (domains ?? (Object.keys(delegates) as ResearchDomain[])).filter((domain) => shouldRun(domain, trip));
  const tasks = selected.map(async (domain): Promise<ResearchTaskResult> => {
    const startedAt = new Date().toISOString();
    try {
      const data = await delegates[domain].run(trip);
      return { domain, status: "ready", data, startedAt, finishedAt: new Date().toISOString() };
    } catch (error) {
      return { domain, status: "error", data: null, error: error instanceof Error ? error.message : "Unknown research error", startedAt, finishedAt: new Date().toISOString() };
    }
  });
  return Promise.all(tasks);
}
