export type IntentKind = "destination" | "date" | "duration" | "budget" | "traveler" | "preference" | "constraint" | "interest" | "transport" | "accommodation" | "activity" | "food" | "culture" | "event" | "memory" | "document" | "sharing" | "unknown";
export interface UserIntentFragment { id: string; kind: IntentKind; value: string; confidence: "high" | "medium" | "low"; source: "user-text" | "trip-state"; }
export interface DeconstructedTrip { originalText: string; fragments: UserIntentFragment[]; unresolved: string[]; locationCandidates: string[]; signals: Record<string, boolean>; }

const STOP = new Set(["a", "al", "en", "por", "de", "del", "y", "o", "con", "sin", "hasta", "para", "ir", "viajar", "visitar", "visite", "quiero", "queremos", "pasar", "conocer", "unos", "dias", "días", "semana", "semanas", "mes", "meses", "el", "la", "los", "las", "un", "una", "durante"]);
function clean(value: string) { return value.replace(/[.!?;:]+$/g, "").replace(/^(?:a|al|en|por|hasta|desde)\s+/i, "").trim(); }

export function extractLocationCandidates(text: string): string[] {
  const candidates: string[] = [];
  const push = (value: string) => {
    const cleaned = clean(value)
      .replace(/\bdurante\b.*$/i, "")
      .replace(/\b(?:\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*(?:d[ií]as?|semanas?|mes(?:es)?)\b.*$/i, "")
      .replace(/\b(?:y|e)\s+(?:comer|conocer|hacer|ver|disfrutar)\b.*$/i, "");
    for (const piece of cleaned.split(/\s*(?:,|;|\by\b|\be\b)\s*/i)) {
      const p = clean(piece).replace(/^visitar\s+/i, "").replace(/^conocer\s+/i, "").replace(/^pasar\s+por\s+/i, "");
      if (!p || STOP.has(p.toLowerCase()) || p.length < 2 || /^\d+$/.test(p)) continue;
      if (!candidates.some((x) => x.toLowerCase() === p.toLowerCase())) candidates.push(p);
    }
  };

  const countryPart = text.match(/\b(?:ir|viajar|viajamos|viajo)\s+(?:a|al)\s+(.+?)(?=\b(?:visitar|conocer|pasar\s+por)\b|[.!?]|$)/i);
  if (countryPart) push(countryPart[1]);
  const visitPart = text.match(/\b(?:visitar|visito|visitamos|conocer|conoceremos|pasar\s+por)\s+(.+?)(?=\bdurante\b|[.!?]|$)/i);
  if (visitPart) push(visitPart[1]);
  for (const match of text.matchAll(/(?:^|[:(])\s*([^.!?]+)/g)) if (/,/.test(match[1])) push(match[1]);
  return candidates;
}

export function deconstructTripText(text: string): DeconstructedTrip {
  const fragments: UserIntentFragment[] = [];
  const unresolved: string[] = [];
  const add = (kind: IntentKind, value: string, confidence: UserIntentFragment["confidence"] = "medium") => fragments.push({ id: `intent:${kind}:${fragments.length}`, kind, value, confidence, source: "user-text" });

  const duration = text.match(/\d+\s*(?:d[ií]as?|semanas?|mes(?:es)?)/i); if (duration) add("duration", duration[0], "high");
  const budget = text.match(/\d[\d.,]*\s*(?:€|eur(?:o)?s?)/i); if (budget) add("budget", budget[0], "high");
  if (/\b(?:barato|barata|econ[oó]mico|econ[oó]mica|gastar poco|poco dinero|bajo presupuesto|lujo|premium|5 estrellas|caro|cara)\b/i.test(text)) add("budget", text.match(/\b(?:barato|barata|econ[oó]mico|econ[oó]mica|gastar poco|poco dinero|bajo presupuesto|lujo|premium|5 estrellas|caro|cara)\b/i)?.[0] ?? "preferencia de presupuesto", "high");

  const traveler = text.match(/\b(?:niñ[oa]s?|hij[oa]s?|beb[eé]s?|pareja|familia|adultos?|personas mayores|perro|gato|mascota)\b/i); if (traveler) add("traveler", traveler[0]);
  if (/\b(?:hija|hijo|niña|niño)\b/i.test(text)) add("traveler", "viaje con menor", "high");
  if (/\b(?:movilidad reducida|silla de ruedas|accesibilidad|accesible|discapacidad)\b/i.test(text)) add("constraint", "necesidad de accesibilidad", "high");
  if (/\b(?:mascota|perro|gato)\b/i.test(text)) add("constraint", "viaje con mascota", "high");

  if (/\b(?:avión|vuelo|tren|autob[uú]s|bus|metro|coche|conducir|taxi|bicicleta|caminar|transporte)\b/i.test(text)) add("transport", text.match(/\b(?:avión|vuelo|tren|autob[uú]s|bus|metro|coche|conducir|taxi|bicicleta|caminar|transporte)\b/i)?.[0] ?? "transporte");
  if (/\b(?:sin conducir|no quiero conducir|no queremos conducir)\b/i.test(text)) add("constraint", "no conducir", "high");
  if (/\b(?:hotel|alojamiento|apartamento|hostal|resort|dormir)\b/i.test(text)) add("accommodation", "preferencia de alojamiento");
  if (/\b(?:comer|comida|gastronom[ií]a|restaurante|mercado|plato|vino|típica|típico)\b/i.test(text)) add("food", "interés gastronómico");
  if (/\b(?:museo|historia|arte|cultura|templo|monumento|tradici[oó]n|patrimonio)\b/i.test(text)) add("culture", "interés cultural");
  if (/\b(?:festival|concierto|feria|evento|partido|fiesta|agenda)\b/i.test(text)) add("event", "interés por eventos");
  if (/\b(?:senderismo|surf|playa|aventura|excursi[oó]n|naturaleza|montaña|bosque|parque natural)\b/i.test(text)) add("activity", "actividad/naturaleza");
  if (/\b(?:foto|fotos|v[ií]deo|video|recuerdo|[aá]lbum|memoria)\b/i.test(text)) add("memory", "memoria del viaje");
  if (/\b(?:pasaporte|visado|visa|seguro|billete|reserva|documento|documentaci[oó]n)\b/i.test(text)) add("document", "documentación");
  if (/\b(?:sin|no quiero|no queremos|evitar|necesito|importante)\b/i.test(text)) add("constraint", text.match(/\b(?:sin|no quiero|no queremos|evitar|necesito|importante)\b[^.!?]*/i)?.[0] ?? "");

  const locationCandidates = extractLocationCandidates(text);
  locationCandidates.forEach((location) => add("destination", location, "high"));
  if (!locationCandidates.length && /\b(?:no sé|no se|todavía no|aún no)\b.*\b(?:dónde|donde|destino)\b/i.test(text)) unresolved.push("destino aún no definido");
  if (!fragments.length) unresolved.push("intención de viaje no determinada");

  return { originalText: text, fragments, unresolved, locationCandidates, signals: Object.fromEntries(fragments.map((f) => [f.kind, true])) };
}
