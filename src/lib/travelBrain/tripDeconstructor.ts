import type { TripState } from "./types";

export type IntentKind = "destination" | "date" | "duration" | "budget" | "traveler" | "preference" | "constraint" | "interest" | "transport" | "accommodation" | "activity" | "food" | "culture" | "event" | "memory" | "document" | "sharing" | "unknown";

export interface UserIntentFragment { id: string; kind: IntentKind; value: string; confidence: "high" | "medium" | "low"; source: "user-text" | "trip-state"; }
export interface DeconstructedTrip { originalText: string; fragments: UserIntentFragment[]; unresolved: string[]; signals: Record<string, boolean>; }

const RULES: Array<[IntentKind, RegExp, string]> = [
  ["budget", /\b(?:presupuesto|máximo|maximo|hasta)\b|€|eur(?:o)?s?/i, "budget"],
  ["duration", /\b\d+\s*(?:d[ií]as?|semanas?|mes(?:es)?)\b/i, "duration"],
  ["traveler", /\b(?:adultos?|niñ[oa]s?|hij[oa]s?|beb[eé]|pareja|familia|perro|gato|mascota)\b/i, "traveler"],
  ["transport", /\b(?:avión|vuelo|tren|autob[uú]s|bus|metro|coche|conducir|taxi|bicicleta|caminar)\b/i, "transport"],
  ["food", /\b(?:comida|comer|gastronom[ií]a|restaurante|vino|cerveza|mercado|plato)\b/i, "food"],
  ["culture", /\b(?:cultura|museo|historia|arte|tradici[oó]n|monumento)\b/i, "culture"],
  ["event", /\b(?:evento|festival|concierto|feria|partido|fiesta)\b/i, "event"],
  ["activity", /\b(?:actividad|senderismo|surf|excursi[oó]n|aventura|ba[ñn]o|playa)\b/i, "activity"],
  ["memory", /\b(?:foto|fotos|v[ií]deo|recuerdo|memoria|[aá]lbum)\b/i, "memory"],
  ["sharing", /\b(?:compartir|amigos|grupo|participantes|gastos|votaci[oó]n)\b/i, "sharing"],
  ["document", /\b(?:pasaporte|visado|seguro|billete|entrada|documento|reserva)\b/i, "document"],
  ["constraint", /\b(?:sin|no quiero|no queremos|evitar|prohibido|importante|necesito)\b/i, "constraint"],
];

export function deconstructTripText(text: string, trip?: TripState): DeconstructedTrip {
  const fragments: UserIntentFragment[] = [];
  for (const [kind, pattern, token] of RULES) {
    const match = text.match(pattern);
    if (match) fragments.push({ id: `intent:${token}`, kind, value: match[0], confidence: "medium", source: "user-text" });
  }
  if (trip) {
    if (trip.destino) fragments.push({ id: "state:destination", kind: "destination", value: trip.destino, confidence: "high", source: "trip-state" });
    if (trip.fechaSalida || trip.fechaRegreso) fragments.push({ id: "state:dates", kind: "date", value: `${trip.fechaSalida ?? ""} ${trip.fechaRegreso ?? ""}`.trim(), confidence: "high", source: "trip-state" });
    if (trip.contexto.presupuestoTotal) fragments.push({ id: "state:budget", kind: "budget", value: String(trip.contexto.presupuestoTotal), confidence: "high", source: "trip-state" });
  }
  return { originalText: text, fragments, unresolved: [], signals: Object.fromEntries(fragments.map((f) => [f.kind, true])) };
}
