export type IntentKind = "destination" | "date" | "duration" | "budget" | "traveler" | "preference" | "constraint" | "interest" | "transport" | "accommodation" | "activity" | "food" | "culture" | "event" | "memory" | "document" | "sharing" | "unknown";

export interface UserIntentFragment {
  id: string;
  kind: IntentKind;
  value: string;
  confidence: "high" | "medium" | "low";
  source: "user-text" | "trip-state";
}

export interface DeconstructedTrip {
  originalText: string;
  fragments: UserIntentFragment[];
  unresolved: string[];
  locationCandidates: string[];
  signals: Record<string, boolean>;
}

const STOP = new Set(["a", "al", "en", "por", "de", "del", "y", "o", "con", "sin", "hasta", "para", "ir", "viajar", "visitar", "visite", "quiero", "queremos", "pasar", "conocer", "unos", "dias", "días", "semana", "semanas", "mes", "meses", "el", "la", "los", "las", "un", "una"]);

function cleanCandidate(value: string): string {
  return value.replace(/[.!?;:]+$/g, "").replace(/^(?:a|al|en|por|hasta|desde)\s+/i, "").trim();
}

/** Extracts places without assuming a fixed city list. The resolver validates them later. */
export function extractLocationCandidates(text: string): string[] {
  const candidates: string[] = [];
  const push = (value: string) => {
    const cleaned = cleanCandidate(value);
    if (!cleaned) return;
    for (const piece of cleaned.split(/\s*(?:,|;|\by\b)\s*/i)) {
      const p = cleanCandidate(piece);
      if (!p || STOP.has(p.toLowerCase()) || p.length < 2) continue;
      if (/^\d+$/.test(p)) continue;
      if (!candidates.some((x) => x.toLowerCase() === p.toLowerCase())) candidates.push(p);
    }
  };

  const patterns = [
    /\b(?:ir|viajar|viajamos|viajo)\s+(?:a|al)\s+(.+?)(?=\.|!|\?|$)/gi,
    /\b(?:visitar|visito|visitamos|conocer|conoceremos|pasar\s+por)\s+(.+?)(?=\.|!|\?|$)/gi,
    /\b(?:en|por)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.-]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.-]*)*(?:\s*,\s*[^.!?]+)*)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) push(match[1]);
  }

  // Also inspect comma-separated proper-name sequences. This catches
  // "Colombia: Pereira, Santander y Leticia" and similar natural phrasing.
  for (const match of text.matchAll(/(?:^|[:(])\s*([^.!?]+)/g)) {
    const value = match[1];
    if (/,/.test(value)) push(value.replace(/\b(?:desde|hasta|durante|con)\b/gi, ""));
  }
  return candidates;
}

export function deconstructTripText(text: string): DeconstructedTrip {
  const fragments: UserIntentFragment[] = [];
  const add = (kind: IntentKind, value: string, confidence: UserIntentFragment["confidence"] = "medium") => {
    fragments.push({ id: `intent:${kind}:${fragments.length}`, kind, value, confidence, source: "user-text" });
  };
  if (/\d+\s*(?:d[ií]as?|semanas?|mes(?:es)?)/i.test(text)) add("duration", text.match(/\d+\s*(?:d[ií]as?|semanas?|mes(?:es)?)/i)?.[0] ?? "");
  if (/(?:€|eur(?:o)?s?|presupuesto|hasta\s+\d+)/i.test(text)) add("budget", text.match(/(?:€|\d+[\s]*eur(?:o)?s?|presupuesto[^.!?]*)/i)?.[0] ?? "", "medium");
  if (/\b(?:niñ[oa]|hij[oa]|beb[eé]|pareja|familia|perro|gato|mascota|adultos?)\b/i.test(text)) add("traveler", text.match(/\b(?:niñ[oa]|hij[oa]|beb[eé]|pareja|familia|perro|gato|mascota|adultos?)\b/i)?.[0] ?? "");
  if (/\b(?:avión|vuelo|tren|autob[uú]s|bus|metro|coche|conducir|taxi|bicicleta|caminar)\b/i.test(text)) add("transport", text.match(/\b(?:avión|vuelo|tren|autob[uú]s|bus|metro|coche|conducir|taxi|bicicleta|caminar)\b/i)?.[0] ?? "");
  if (/\b(?:comer|comida|gastronom[ií]a|restaurante|mercado|plato|vino)\b/i.test(text)) add("food", "interés gastronómico");
  if (/\b(?:museo|historia|arte|cultura|templo|monumento|tradici[oó]n)\b/i.test(text)) add("culture", "interés cultural");
  if (/\b(?:festival|concierto|feria|evento|partido|fiesta)\b/i.test(text)) add("event", "interés por eventos");
  if (/\b(?:senderismo|surf|playa|aventura|excursi[oó]n|naturaleza)\b/i.test(text)) add("activity", "actividad/naturaleza");
  if (/\b(?:foto|fotos|v[ií]deo|recuerdo|[aá]lbum)\b/i.test(text)) add("memory", "memoria del viaje");
  if (/\b(?:pasaporte|visado|seguro|billete|reserva|documento)\b/i.test(text)) add("document", "documentación");
  if (/\b(?:sin|no quiero|no queremos|evitar|necesito|importante)\b/i.test(text)) add("constraint", text.match(/\b(?:sin|no quiero|no queremos|evitar|necesito|importante)\b[^.!?]*/i)?.[0] ?? "");

  const locationCandidates = extractLocationCandidates(text);
  locationCandidates.forEach((location) => add("destination", location, "high"));
  const signals = Object.fromEntries(fragments.map((fragment) => [fragment.kind, true]));
  return { originalText: text, fragments, unresolved: [], locationCandidates, signals };
}
