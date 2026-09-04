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
import { delegates } from "./delegates";
import { buildResearchPlan, adaptResearchPlan, researchTrip } from "./researchOrchestrator";
import { deconstructTripText } from "./tripDeconstructor";

/** The single entry point for trip intelligence. It deconstructs user intent,
 * builds the full delegation plan and executes all independent domains. */
export async function prepareTrip(trip: TripState): Promise<TripState> {
  const intentText = trip.intent?.rawText ?? trip.destino;
  const deconstructed = deconstructTripText(intentText, trip);
  const plan = adaptResearchPlan(buildResearchPlan(trip), trip);
  const results = await researchTrip(trip);
  const inventory = [...trip.inventory];
  for (const result of results) {
    if (result.status !== "ready" || !result.data) continue;
    if (Array.isArray(result.data)) {
      for (const item of result.data) {
        if (item && typeof item === "object" && "id" in item && "name" in item) inventory.push(item as TripState["inventory"][number]);
      }
    }
  }
  return { ...trip, intent: { ...(trip.intent ?? { rawText: intentText, interests: [], travelers: { childrenAges: [] } }), rawText: intentText }, inventory, _intelligence: { deconstructed, plan, results } } as TripState;
}

export { buildResearchPlan, adaptResearchPlan, researchTrip, deconstructTripText, delegates };
