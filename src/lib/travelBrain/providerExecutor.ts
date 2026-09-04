import type { CanonicalTripContext } from "./tripContext";
import type { ResearchPlan, ResearchResult } from "./researchOrchestrator";
import type { ResolvedDestination } from "./destinationResolver";
import { executeDomainProvider } from "./domainProviders";

export interface WeatherSnapshot {
  latitude: number; longitude: number; timezone: string;
  current: { temperatureC?: number; precipitation?: number; weatherCode?: number; windKmh?: number };
  daily?: { date: string; minC?: number; maxC?: number; precipitationProbability?: number; weatherCode?: number }[];
}
export interface ProviderExecution { results: ResearchResult[]; availableDomains: string[]; unavailableDomains: string[]; }

async function weatherFor(destination: ResolvedDestination, start?: string, end?: string): Promise<WeatherSnapshot> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(destination.latitude)); url.searchParams.set("longitude", String(destination.longitude));
  url.searchParams.set("current", "temperature_2m,precipitation,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code"); url.searchParams.set("timezone", "auto");
  if (start) url.searchParams.set("start_date", start); if (end) url.searchParams.set("end_date", end);
  const response = await fetch(url, { next: { revalidate: 1800 } });
  if (!response.ok) throw new Error(`No se pudo obtener el tiempo de ${destination.name}`);
  const data = await response.json() as { timezone?: string; current?: { temperature_2m?: number; precipitation?: number; weather_code?: number; wind_speed_10m?: number }; daily?: { time?: string[]; temperature_2m_min?: number[]; temperature_2m_max?: number[]; precipitation_probability_max?: number[]; weather_code?: number[] } };
  const daily = (data.daily?.time ?? []).map((date, i) => ({ date, minC: data.daily?.temperature_2m_min?.[i], maxC: data.daily?.temperature_2m_max?.[i], precipitationProbability: data.daily?.precipitation_probability_max?.[i], weatherCode: data.daily?.weather_code?.[i] }));
  return { latitude: destination.latitude, longitude: destination.longitude, timezone: data.timezone ?? "auto", current: { temperatureC: data.current?.temperature_2m, precipitation: data.current?.precipitation, weatherCode: data.current?.weather_code, windKmh: data.current?.wind_speed_10m }, daily };
}

export async function executeResearch(plan: ResearchPlan, context: CanonicalTripContext, locations: ResolvedDestination[]): Promise<ProviderExecution> {
  const results: ResearchResult[] = []; const availableDomains = new Set<string>(); const unavailableDomains = new Set<string>();
  const destinationTask = plan.tasks.find((t) => t.domain === "destination");
  if (destinationTask) { results.push({ task: destinationTask, status: locations.length ? "ready" : "error", data: { locations } }); if (locations.length) availableDomains.add("destination"); }
  const weatherTask = plan.tasks.find((t) => t.domain === "weather");
  if (weatherTask && locations.length) {
    try { const weather = await Promise.all(locations.map((location) => weatherFor(location, context.dates.start, context.dates.end))); availableDomains.add("weather"); results.push({ task: weatherTask, status: "ready", data: locations.map((location, i) => ({ destination: location, weather: weather[i] })), evidence: [{ source: "Open-Meteo Forecast", checkedAt: new Date().toISOString(), freshness: "live", confidence: "high" }] }); }
    catch (error) { results.push({ task: weatherTask, status: "error", error: error instanceof Error ? error.message : "Weather provider error" }); }
  }
  const providerTasks = plan.tasks.filter((t) => !["destination", "weather"].includes(t.domain));
  for (const task of providerTasks) {
    if (!locations.length && !["currency"].includes(task.domain)) { unavailableDomains.add(task.domain); results.push({ task, status: "unavailable", data: { reason: "Falta un destino resuelto." } }); continue; }
    const targets = task.domain === "currency" ? [undefined] : locations;
    for (const target of targets) {
      const result = await executeDomainProvider(task.domain, { destination: target ?? locations[0], start: context.dates.start, end: context.dates.end, currency: context.budget.moneda, query: task.domain === "experiences" ? "tourism=attraction" : undefined });
      results.push({ task, status: result.status, data: target ? { destination: target, result: result.data } : result.data, evidence: result.evidence, error: result.error });
      if (result.status === "ready") availableDomains.add(task.domain); else if (result.status === "unavailable") unavailableDomains.add(task.domain);
    }
  }
  return { results, availableDomains: [...availableDomains], unavailableDomains: [...unavailableDomains] };
}
