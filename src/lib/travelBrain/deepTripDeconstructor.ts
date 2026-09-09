import type { DeconstructedTrip, UserIntentFragment } from "./tripDeconstructor";

export function deepenTripDeconstruction(base: DeconstructedTrip, text: string): DeconstructedTrip {
  const fragments = [...base.fragments];
  const add = (kind: UserIntentFragment["kind"], value: string) => {
    if (!fragments.some((f) => f.kind === kind && f.value.toLowerCase() === value.toLowerCase())) fragments.push({ id: `intent:${kind}:deep:${fragments.length}`, kind, value, confidence: "high", source: "user-text" });
  };
  const ages = [...text.matchAll(/\b(?:niñ[oa]s?|hij[oa]s?)\s*(?:de\s*)?(\d+)\s*(?:y|e)\s*(\d+)\s*años\b/gi)];
  for (const match of ages) add("traveler", `niños de ${match[1]} y ${match[2]} años`);
  if (/\b(?:beb[eé]|bebé|lactante)\b/i.test(text)) add("traveler", "bebé");
  const elder = text.match(/\b(?:abuela|abuelo|persona mayor)\b(?:[^.\n]{0,40})?(\d{2})\s*años?/i);
  add("traveler", elder ? `persona mayor de ${elder[1]} años` : "persona mayor");
  const pet = text.match(/\b(?:perro|gato|mascota)\b(?:\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ-]*))?/i);
  if (pet) add("traveler", pet[1] ? `mascota: ${pet[0]}` : `mascota: ${pet[0]}`);
  if (/\b(?:documentos?|pasaportes?|certificados?|seguro|microchip|vacuna|documentaci[oó]n)\b/i.test(text)) add("document", "documentación individual de cada viajero y mascota");
  if (/\b(?:para todos|todos juntos|no necesariamente todos|cada miembro|niños|bebé|abuela|mascota)\b/i.test(text)) add("activity", "actividades diferenciadas por perfil");
  if (/\b(?:descansos?|ritmo tranquilo|no agotador|fatiga)\b/i.test(text)) add("constraint", "gestión de fatiga y descansos");
  if (/\b(?:bajo techo|interior|si llueve|lluvia)\b/i.test(text)) add("constraint", "plan alternativo bajo techo");
  if (/\b(?:presupuesto|\d[\d.,]*\s*(?:€|eur(?:o)?s?))\b/i.test(text)) add("budget", "presupuesto familiar total y costes por perfil");
  return { ...base, fragments, signals: Object.fromEntries(fragments.map((f) => [f.kind, true])) };
}
