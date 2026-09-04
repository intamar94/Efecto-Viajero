import type { Etapa, ModoPlanificacion, Viaje } from "@/lib/types";

export type Confidence = "high" | "medium" | "low";
export type DataFreshness = "live" | "recent" | "cached" | "curated" | "user-provided";

export interface SourceEvidence {
  source: string;
  url?: string;
  checkedAt: string;
  freshness: DataFreshness;
  confidence: Confidence;
}

export interface ResolvedDestination {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  latitude: number;
  longitude: number;
  type: "city" | "town" | "village" | "region" | "country" | "area" | "unknown";
  displayName: string;
  source: SourceEvidence;
}

export interface TripIntent {
  rawText: string;
  destinationText?: string;
  originText?: string;
  durationDays?: number;
  budgetMax?: number;
  interests: string[];
  pace?: "tranquilo" | "medio" | "intenso";
  avoidDriving?: boolean;
  travelers: { adults?: number; childrenAges: number[]; pet?: boolean };
}

export interface TripItem {
  id: string;
  category: "place" | "activity" | "restaurant" | "transport" | "accommodation" | "event";
  name: string;
  latitude?: number;
  longitude?: number;
  day?: number;
  startTime?: string;
  endTime?: string;
  estimatedCost?: number;
  status: "discovered" | "considered" | "selected" | "planned" | "reserved" | "done" | "discarded" | "unavailable";
  evidence?: SourceEvidence;
  reasons: string[];
}

export interface TripState extends Viaje {
  destination?: ResolvedDestination;
  intent?: TripIntent;
  inventory: TripItem[];
  activeDay?: number;
}

export interface BuilderDecision {
  kind: "add" | "remove" | "move" | "replace" | "set";
  target: string;
  value?: unknown;
  reason?: string;
}

export interface BuilderResult { trip: TripState; decisions: BuilderDecision[]; warnings: string[] }

export interface IntelligenceDelegate<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly domain: string;
  run(input: TInput): Promise<TOutput>;
}

export interface TravelBrainDelegates {
  destination: IntelligenceDelegate;
  accommodation: IntelligenceDelegate;
  transport: IntelligenceDelegate;
  activities: IntelligenceDelegate;
  culture: IntelligenceDelegate;
  gastronomy: IntelligenceDelegate;
  nature: IntelligenceDelegate;
  requirements: IntelligenceDelegate;
  weather: IntelligenceDelegate;
  map: IntelligenceDelegate;
  offline: IntelligenceDelegate;
  memory: IntelligenceDelegate;
  memorySearch: IntelligenceDelegate;
  memoryVideo: IntelligenceDelegate;
  events: IntelligenceDelegate;
  language: IntelligenceDelegate;
  currency: IntelligenceDelegate;
  laws: IntelligenceDelegate;
  emergency: IntelligenceDelegate;
  social: IntelligenceDelegate;
  expenses: IntelligenceDelegate;
}

export interface TripSeed { destination?: ResolvedDestination; etapas: Etapa[]; modoPlanificacion?: ModoPlanificacion }
