export * from "./types";
export * from "./delegates";
export * from "./destinationResolver";
export * from "./location";
export * from "./offline";
export * from "./personalizedMap";
export * from "./researchOrchestrator";
export * from "./researchRegistry";
export * from "./tripDeconstructor";
export * from "@/lib/media/types";
export * from "@/lib/media/provider";
export * from "@/lib/media/intelligence";

import type { TripState } from "./types";
import { buildResearchPlan, adaptResearchPlan, researchTrip } from "./researchOrchestrator";
import { deconstructTripText } from "./tripDeconstructor";

/** Single entry point: deconstruct intent, plan every applicable delegate,
 * execute them independently and retain their state for the UI. */
export async function prepareTrip(trip: TripState): Promise<TripState> {
  const rawText = trip.intent?.rawText ?? trip.destino;
  const deconstructed = deconstructTripText(rawText, trip);
  const plan = adaptResearchPlan(buildResearchPlan(trip), trip);
  const results = await researchTrip(trip);
  return {
    ...trip,
    intelligence: { generatedAt: new Date().toISOString(), deconstructed, plan, results },
  };
}

export { buildResearchPlan, adaptResearchPlan, researchTrip, deconstructTripText };
