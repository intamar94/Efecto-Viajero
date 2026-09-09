import type { CanonicalTripContext } from "./tripContext";
import type { ResearchDomain, ResearchTask } from "./researchOrchestrator";

export interface OrchestrationSignals {
  explicit: Set<ResearchDomain>;
  inferred: Set<ResearchDomain>;
  reasons: Partial<Record<ResearchDomain, string>>;
}

const DOMAIN_KEYWORDS: Array<[ResearchDomain, RegExp]> = [
  ["transport", /\b(avión|vuelo|tren|autob[uú]s|bus|metro|coche|conducir|taxi|bicicleta|caminar|transporte|sin conducir|no quiero conducir)\b/i],
  ["accommodation", /\b(hotel|alojamiento|apartamento|hostal|resort|airbnb|dormir|estancia|lujo|5 estrellas)\b/i],
  ["gastronomy", /\b(comida|comer|gastronom[ií]a|restaurante|plato|típica|típico|mercado|cocina)\b/i],
  ["culture", /\b(historia|museo|arte|cultura|templo|monumento|tradici[oó]n|patrimonio)\b/i],
  ["nature", /\b(naturaleza|senderismo|montaña|bosque|parque natural|playa|aventura|surf)\b/i],
  ["events", /\b(evento|festival|concierto|feria|partido|fiesta|agenda)\b/i],
  ["budget", /\b(presupuesto|barato|barata|econ[oó]mico|econ[oó]mica|gastar poco|poco dinero|lujo|premium|caro|cara|5 estrellas|€|eur(?:o)?s?)\b/i],
  ["experiences", /\b(experiencia|actividad|actividades|qué hacer|cosas que hacer|excursi[oó]n)\b/i],
  ["memory", /\b(foto|fotos|vídeo|video|recuerdo|álbum|memoria)\b/i],
  ["social", /\b(compartir|amigos|grupo|social|familiares)\b/i],
  ["offline", /\b(sin conexi[oó]n|offline|sin internet|internet limitado)\b/i],
  ["requirements", /\b(pasaporte|visado|visa|entrada|requisitos|seguro de viaje|documentaci[oó]n)\b/i],
  ["laws", /\b(ley|legal|normativa|reglas|permiso|prohibido)\b/i],
  ["emergency", /\b(emergencia|urgencia|hospital|seguridad|polic[ií]a|sos)\b/i],
];

export function deriveOrchestrationSignals(context: CanonicalTripContext): OrchestrationSignals {
  const text = context.rawText || "";
  const explicit = new Set<ResearchDomain>();
  const inferred = new Set<ResearchDomain>();
  const reasons: Partial<Record<ResearchDomain, string>> = {};

  for (const [domain, pattern] of DOMAIN_KEYWORDS) {
    if (pattern.test(text)) {
      explicit.add(domain);
      reasons[domain] = "Detectado explícitamente en la petición.";
    }
  }

  if (context.transport.length) { explicit.add("transport"); reasons.transport = "Preferencia de transporte estructurada."; }
  if (context.food.length) { explicit.add("gastronomy"); reasons.gastronomy = "Preferencia gastronómica estructurada."; }
  if (context.interests.length) { explicit.add("experiences"); reasons.experiences = "Intereses del viajero."; }
  if (context.destinations.length || /\b(colombia|ecuador|per[uú]|bolivia|chile|espa[ñn]a|alemania|francia|italia|jap[oó]n|m[eé]xico|brasil|argentina)\b/i.test(text)) {
    inferred.add("destination");
  }

  const travelers = context.travelers;
  if ((travelers.ninos ?? 0) > 0 || (travelers.bebes ?? 0) > 0 || (travelers.mascotas ?? 0) > 0 || context.accessibility.requiereAccesibilidad) {
    inferred.add("requirements");
    inferred.add("transport");
    inferred.add("accommodation");
    reasons.requirements = "La composición o necesidades del viajero requieren comprobaciones adicionales.";
  }
  if (travelers.mascotas) reasons.accommodation = "Viaje con mascota: se debe comprobar compatibilidad del alojamiento.";
  if (context.accessibility.requiereAccesibilidad) reasons.transport = "Se requiere transporte y alojamiento accesibles.";

  if (context.budget.importe !== undefined || context.budget.flexible) explicit.add("budget");

  // Para cualquier viaje con destino, estas capas son estructurales, no opcionales.
  if (context.destinations.length || explicit.has("destination") || inferred.has("destination")) {
    for (const domain of ["destination", "requirements", "laws", "emergency", "weather", "map", "language", "currency"] as ResearchDomain[]) {
      if (!explicit.has(domain)) inferred.add(domain);
    }
    for (const domain of ["transport", "accommodation", "experiences"] as ResearchDomain[]) {
      if (!explicit.has(domain)) inferred.add(domain);
    }
  }

  // Si hay fechas, clima y eventos pueden afectar decisiones reales del plan.
  if (context.dates.start || context.dates.end) {
    inferred.add("weather");
    if (!explicit.has("events")) inferred.add("events");
  }

  // Presupuesto necesita sus entradas de transporte/alojamiento y gastos consume el presupuesto.
  if (explicit.has("budget") || inferred.has("budget")) inferred.add("expenses");
  if (explicit.has("offline")) inferred.add("offline");

  return { explicit, inferred, reasons };
}

export function selectResearchDomains(context: CanonicalTripContext, definitions: Array<[ResearchDomain, ResearchTask["priority"], ResearchDomain[], ResearchTask["phase"]]>): Set<ResearchDomain> {
  const { explicit, inferred } = deriveOrchestrationSignals(context);
  const selected = new Set<ResearchDomain>([...explicit, ...inferred]);

  // Siempre cerramos el grafo sobre dependencias: una misión no puede ejecutarse
  // si no está presente su prerequisito.
  const deps = new Map(definitions.map(([domain, , dependencies]) => [domain, dependencies]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const domain of [...selected]) {
      for (const dependency of deps.get(domain) ?? []) {
        if (!selected.has(dependency)) {
          selected.add(dependency);
          changed = true;
        }
      }
    }
  }
  return selected;
}
