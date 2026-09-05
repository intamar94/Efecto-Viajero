import type { CanonicalTripContext } from "./tripContext";
import type { ResearchPlan, ResearchResult, ResearchTask } from "./researchOrchestrator";
import type { ResolvedDestination } from "./destinationResolver";
import { executeDomainProvider, type ProviderSignal } from "./domainProviders";

export interface WeatherSnapshot {
  latitude: number; longitude: number; timezone: string;
  current: { temperatureC?: number; precipitation?: number; weatherCode?: number; windKmh?: number };
  daily?: { date: string; minC?: number; maxC?: number; precipitationProbability?: number; weatherCode?: number }[];
}
export interface ProviderExecution { results: ResearchResult[]; availableDomains: string[]; unavailableDomains: string[]; }

async function weatherFor(destination: ResolvedDestination, start?: string, end?: string): Promise<WeatherSnapshot> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(destination.latitude)); url.searchParams.set("longitude", String(destination.longitude));
  url.searchParams.set("current", "temperature_2m,precipitation,weather_code,wind_speed_10m"); url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code"); url.searchParams.set("timezone", "auto");
  if (start) url.searchParams.set("start_date", start); if (end) url.searchParams.set("end_date", end);
  const response = await fetch(url, { next: { revalidate: 1800 } });
  if (!response.ok) throw new Error(`No se pudo obtener el tiempo de ${destination.name}`);
  const data = await response.json() as { timezone?: string; current?: { temperature_2m?: number; precipitation?: number; weather_code?: number; wind_speed_10m?: number }; daily?: { time?: string[]; temperature_2m_min?: number[]; temperature_2m_max?: number[]; precipitation_probability_max?: number[]; weather_code?: number[] } };
  const daily = (data.daily?.time ?? []).map((date, i) => ({ date, minC: data.daily?.temperature_2m_min?.[i], maxC: data.daily?.temperature_2m_max?.[i], precipitationProbability: data.daily?.precipitation_probability_max?.[i], weatherCode: data.daily?.weather_code?.[i] }));
  return { latitude: destination.latitude, longitude: destination.longitude, timezone: data.timezone ?? "auto", current: { temperatureC: data.current?.temperature_2m, precipitation: data.current?.precipitation, weatherCode: data.current?.weather_code, windKmh: data.current?.wind_speed_10m }, daily };
}

function addStatus(set: Set<string>, unavailable: Set<string>, domain: string, status: ResearchResult["status"]) { if (status === "ready" || status === "partial") set.add(domain); if (status === "unavailable") unavailable.add(domain); }

export interface AgentProviderInput {
  requirementId?: string;
  dataType?: string;
  question?: string;
  dependencySignals?: ProviderSignal[];
}

const noDestinationDomains = new Set(["currency", "budget", "expenses", "offline"]);

/** Lowest-level provider execution. Upstream validated signals are explicit provider input. */
export async function executeTask(task: ResearchTask, context: CanonicalTripContext, locations: ResolvedDestination[], input: AgentProviderInput = {}): Promise<ResearchResult[]> {
  if (!locations.length && !noDestinationDomains.has(task.domain)) return [{ task, status: "unavailable", data: { reason: "Falta un destino resuelto." } }];
  const targets = locations.length ? locations : [{ name: "trip", displayName: "Viaje completo", countryCode: "", latitude: 0, longitude: 0 } as ResolvedDestination];
  const baseInput = {
    start: context.dates.start,
    end: context.dates.end,
    currency: context.budget.moneda,
    budgetAmount: context.budget.cantidad,
    budgetType: context.budget.tipo,
    travelerCounts: {
      adults: context.travelers.adultos ?? 0,
      children: context.travelers.ninos ?? 0,
      babies: context.travelers.bebes ?? 0,
      seniors: context.travelers.personasMayores ?? 0,
      pets: context.travelers.mascotas ?? 0,
    },
    ...input,
  };
  if (task.domain === "currency" || noDestinationDomains.has(task.domain)) {
    const result = await executeDomainProvider(task.domain, { destination: targets[0], ...baseInput });
    return [{ task, status: result.status, data: { destination: targets[0], result: result.data }, evidence: result.evidence, error: result.error }];
  }
  const executions = await Promise.all(targets.map(async (target, index) => {
    const origin = task.domain === "transport" && index > 0 ? { latitude: targets[index - 1].latitude, longitude: targets[index - 1].longitude } : undefined;
    const result = await executeDomainProvider(task.domain, { destination: target, origin, ...baseInput });
    return { target, result };
  }));
  return executions.map(({ target, result }) => ({ task, status: result.status, data: { destination: target, result: result.data }, evidence: result.evidence, error: result.error }));
}

export async function executeResearch(plan: ResearchPlan, context: CanonicalTripContext, locations: ResolvedDestination[]): Promise<ProviderExecution> {
  const results: ResearchResult[] = []; const availableDomains = new Set<string>(); const unavailableDomains = new Set<string>();
  const destinationTask = plan.tasks.find((task) => task.domain === "destination");
  if (destinationTask) { const status: ResearchResult["status"] = locations.length ? "ready" : "error"; results.push({ task: destinationTask, status, data: { locations } }); addStatus(availableDomains, unavailableDomains, "destination", status); }
  const weatherTask = plan.tasks.find((task) => task.domain === "weather");
  if (weatherTask && locations.length) {
    const settled = await Promise.allSettled(locations.map((location) => weatherFor(location, context.dates.start, context.dates.end)));
    const weatherData = settled.map((item, index) => item.status === "fulfilled" ? { destination: locations[index], weather: item.value, status: "ready" as const } : { destination: locations[index], status: "error" as const, error: item.reason instanceof Error ? item.reason.message : "Weather provider error" });
    const readyCount = weatherData.filter((item) => item.status === "ready").length; const status: ResearchResult["status"] = readyCount === locations.length ? "ready" : readyCount > 0 ? "partial" : "error";
    results.push({ task: weatherTask, status, data: weatherData, evidence: readyCount ? [{ source: "Open-Meteo Forecast", checkedAt: new Date().toISOString(), freshness: "live", confidence: "high" }] : undefined, error: status === "error" ? "No se pudo obtener el tiempo de ningún destino." : undefined }); addStatus(availableDomains, unavailableDomains, "weather", status);
  }
  const providerTasks = plan.tasks.filter((task) => !["destination", "weather"].includes(task.domain));
  const taskResults = await Promise.all(providerTasks.map(async (task) => { try { return await executeTask(task, context, locations); } catch (error) { return [{ task, status: "error" as const, error: error instanceof Error ? error.message : "Provider execution error" }]; } }));
  for (const taskResult of taskResults) for (const result of taskResult) { results.push(result); addStatus(availableDomains, unavailableDomains, result.task.domain, result.status); }
  return { results, availableDomains: [...availableDomains], unavailableDomains: [...unavailableDomains] };
}
