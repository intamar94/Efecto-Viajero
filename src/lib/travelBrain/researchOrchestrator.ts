import type { TripState, IntelligenceDelegate } from "./types";
import { delegates } from "./delegates";

export type ResearchDomain = "destination" | "events" | "culture" | "transport" | "accommodation" | "gastronomy" | "nature" | "activities" | "requirements" | "weather" | "language" | "currency" | "laws" | "emergency" | "map" | "offline" | "social" | "expenses" | "memory";
export type ResearchStatus = "queued" | "running" | "ready" | "partial" | "error" | "skipped";
export type ResearchPriority = "critical" | "high" | "normal" | "background";

export interface ResearchTask { id: string; domain: ResearchDomain; priority: ResearchPriority; reason: string; dependsOn: string[]; status: ResearchStatus; }
export interface ResearchTaskResult extends ResearchTask { data: unknown; error?: string; startedAt?: string; finishedAt?: string; }
export interface ResearchPlan { tripId: string; generatedAt: string; tasks: ResearchTask[]; }

const REASONS: Record<ResearchDomain, string> = {
  destination: "Resolver y normalizar todos los lugares mencionados.", events: "Eventos relevantes para fechas y preferencias.", culture: "Contexto cultural y lugares con significado.", transport: "Llegada, conexiones, transporte local y restricciones.", accommodation: "Alojamiento compatible con viajeros, presupuesto y ruta.", gastronomy: "Comida, bebida y experiencias gastronómicas.", nature: "Naturaleza y actividades exteriores compatibles.", activities: "Actividades adecuadas al contexto.", requirements: "Documentación, entrada, salud, conducción y mascotas.", weather: "Condiciones meteorológicas que afectan al plan.", language: "Idioma y frases útiles.", currency: "Moneda, equivalencias y pagos.", laws: "Leyes, normas y restricciones locales.", emergency: "Emergencias, SOS y autoridades.", map: "Mapa y ruta diaria personalizada.", offline: "Información que debe estar disponible sin conexión.", social: "Viaje compartido, participantes y elementos compartibles.", expenses: "Presupuesto, gastos y reparto.", memory: "Fotos, vídeos y recuerdos del viaje.", activities: "Actividades adecuadas al contexto." };

const PRIORITY: Record<ResearchDomain, ResearchPriority> = {
  destination: "critical", requirements: "critical", laws: "critical", emergency: "critical", transport: "high", accommodation: "high", weather: "high", map: "high", events: "normal", culture: "normal", gastronomy: "normal", nature: "normal", activities: "normal", language: "normal", currency: "normal", offline: "background", social: "background", expenses: "background", memory: "background",
};

function makeTask(domain: ResearchDomain, dependsOn: string[] = []): ResearchTask { return { id: `research:${domain}`, domain, priority: PRIORITY[domain], reason: REASONS[domain], dependsOn, status: "queued" }; }

/** Deconstructs the whole trip into one auditable research plan. */
export function buildResearchPlan(trip: TripState): ResearchPlan {
  const hasPlace = Boolean(trip.destination || trip.etapas?.length || trip.destino);
  const tasks: ResearchTask[] = [];
  if (hasPlace) tasks.push(makeTask("destination"));
  const placeDependent: ResearchDomain[] = ["requirements", "laws", "emergency", "transport", "accommodation", "weather", "gastronomy", "culture", "nature", "activities", "events", "language", "currency", "map"];
  for (const domain of placeDependent) tasks.push(makeTask(domain, hasPlace ? ["research:destination"] : []));
  tasks.push(makeTask("expenses", ["research:transport", "research:accommodation"]));
  tasks.push(makeTask("memory"));
  tasks.push(makeTask("social"));
  tasks.push(makeTask("offline", ["research:requirements", "research:emergency", "research:map"]));
  return { tripId: trip.id, generatedAt: new Date().toISOString(), tasks };
}

function textOf(trip: TripState): string { return [trip.destino, trip.contexto.ciudadOrigen, trip.tipo, trip.etapas?.map((e) => e.nombre).join(" ")].filter(Boolean).join(" ").toLowerCase(); }

/** Explicit intent promotes relevant delegates but never removes safety/factual work. */
export function adaptResearchPlan(plan: ResearchPlan, trip: TripState): ResearchPlan {
  const text = textOf(trip);
  const promote = new Set<ResearchDomain>();
  if (/perro|gato|mascota/.test(text) || trip.contexto.mascota) ["requirements", "transport", "accommodation", "laws"].forEach((d) => promote.add(d as ResearchDomain));
  if (/niñ|hij|beb[eé]|famil/.test(text) || (trip.contexto.edadesMenores?.length ?? 0) > 0) ["accommodation", "activities", "transport"].forEach((d) => promote.add(d as ResearchDomain));
  if (/comida|comer|gastronom|vino|cerveza|restaurante/.test(text)) promote.add("gastronomy");
  if (/evento|festival|concierto|feria/.test(text)) promote.add("events");
  if (/camp|acampar|caravana|naturaleza|sender/.test(text)) ["nature", "laws"].forEach((d) => promote.add(d as ResearchDomain));
  if (/idioma|frase|hablar/.test(text)) promote.add("language");
  if (/dinero|presupuesto|moneda|pagar/.test(text) || trip.contexto.presupuestoTotal) promote.add("currency");
  if (/coche|conduc|tren|bus|autob[uú]s|metro/.test(text) || trip.contexto.ciudadOrigen) promote.add("transport");
  return { ...plan, tasks: plan.tasks.map((t) => promote.has(t.domain) ? { ...t, priority: t.priority === "critical" ? "critical" : "high" } : t) };
}

async function runTask(t: ResearchTask, trip: TripState): Promise<ResearchTaskResult> {
  const startedAt = new Date().toISOString();
  const delegate = delegates[t.domain] as IntelligenceDelegate<TripState, unknown> | undefined;
  if (!delegate) return { ...t, status: "skipped", data: null, error: "No delegate registered", startedAt, finishedAt: new Date().toISOString() };
  try { const data = await delegate.run(trip); return { ...t, status: "ready", data, startedAt, finishedAt: new Date().toISOString() }; }
  catch (error) { return { ...t, status: "error", data: null, error: error instanceof Error ? error.message : "Unknown research error", startedAt, finishedAt: new Date().toISOString() }; }
}

/** Every requested domain is delegated independently; partial failure is isolated. */
export async function researchTrip(trip: TripState, domains?: ResearchDomain[]): Promise<ResearchTaskResult[]> {
  let plan = adaptResearchPlan(buildResearchPlan(trip), trip);
  if (domains?.length) plan = { ...plan, tasks: plan.tasks.filter((t) => domains.includes(t.domain)) };
  return Promise.all(plan.tasks.map((t) => runTask(t, trip)));
}
