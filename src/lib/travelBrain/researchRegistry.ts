import type { ResearchDomain, ResearchPriority } from "./researchOrchestrator";

export interface ResearchDomainDefinition { domain: ResearchDomain; label: string; priority: ResearchPriority; alwaysAvailable: boolean; dependsOn: ResearchDomain[]; }

export const RESEARCH_DOMAINS: ResearchDomainDefinition[] = [
  { domain: "destination", label: "Destino", priority: "critical", alwaysAvailable: true, dependsOn: [] },
  { domain: "requirements", label: "Requisitos", priority: "critical", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "laws", label: "Leyes y normas", priority: "critical", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "emergency", label: "SOS y emergencias", priority: "critical", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "transport", label: "Transporte", priority: "high", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "accommodation", label: "Alojamiento", priority: "high", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "weather", label: "Clima", priority: "high", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "map", label: "Mapa y ruta", priority: "high", alwaysAvailable: true, dependsOn: ["destination", "transport"] },
  { domain: "events", label: "Eventos", priority: "normal", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "gastronomy", label: "Comida y bebida", priority: "normal", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "culture", label: "Cultura", priority: "normal", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "nature", label: "Naturaleza", priority: "normal", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "activities", label: "Actividades", priority: "normal", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "language", label: "Idioma", priority: "normal", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "currency", label: "Moneda", priority: "normal", alwaysAvailable: true, dependsOn: ["destination"] },
  { domain: "memory", label: "Recuerdos", priority: "background", alwaysAvailable: true, dependsOn: [] },
  { domain: "social", label: "Compartir", priority: "background", alwaysAvailable: true, dependsOn: [] },
  { domain: "expenses", label: "Gastos", priority: "background", alwaysAvailable: true, dependsOn: ["transport", "accommodation"] },
  { domain: "offline", label: "Offline", priority: "background", alwaysAvailable: true, dependsOn: ["requirements", "emergency", "map"] },
];
