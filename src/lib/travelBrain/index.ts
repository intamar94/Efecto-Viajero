export * from "./types";
export * from "./delegates";
export * from "./destinationResolver";
export * from "./location";
export * from "./offline";
export * from "./personalizedMap";
export * from "./researchOrchestrator";
export * from "@/lib/media/types";
export * from "@/lib/media/provider";
export * from "@/lib/media/intelligence";

import type { TripState } from "./types";
import { delegates } from "./delegates";
import { researchTrip } from "./researchOrchestrator";

export async function prepareTrip(trip: TripState): Promise<TripState> {
  const [destination, requirements] = await Promise.all([
    delegates.destination.run(trip.destination),
    delegates.requirements.run(trip),
  ]);
  return {
    ...trip,
    destination: (destination as TripState["destination"]) ?? trip.destination,
    intent: trip.intent,
    inventory: trip.inventory,
    ...((requirements && typeof requirements === "object") ? {} : {}),
  };
}

/** Runs all applicable intelligence delegates concurrently. Each delegate
 * may later be backed by an external provider; the brain keeps the UI unified. */
export { researchTrip };
