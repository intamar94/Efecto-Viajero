export * from "./types";
export * from "./delegates";
export * from "./destinationResolver";
export * from "./location";
export * from "./offline";
export * from "./personalizedMap";

import type { TripState } from "./types";
import { delegates } from "./delegates";

/**
 * Single orchestration entry point. UI modules should call the brain rather
 * than calling every intelligence module independently.
 */
export async function prepareTrip(trip: TripState): Promise<TripState> {
  const [destination, requirements] = await Promise.all([
    delegates.destination.run(trip.destination),
    delegates.requirements.run(trip),
  ]);

  return {
    ...trip,
    destination: (destination as TripState["destination"]) ?? trip.destination,
    // Requirement engines can later enrich this state with checked results.
    intent: trip.intent,
    inventory: trip.inventory,
    ...((requirements && typeof requirements === "object") ? {} : {}),
  };
}
