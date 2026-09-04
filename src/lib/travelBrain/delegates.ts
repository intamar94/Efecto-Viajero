import type { IntelligenceDelegate, TravelBrainDelegates } from "./types";

function createDelegate<TInput = unknown, TOutput = unknown>(
  id: string,
  domain: string,
  run: (input: TInput) => Promise<TOutput>,
): IntelligenceDelegate<TInput, TOutput> {
  return { id, domain, run };
}

// Delegates are deliberately small orchestration boundaries. They do not
// pretend to know facts: providers/data sources are plugged into them later.
const passthrough = async <T>(input: T): Promise<T> => input;

export const delegates: TravelBrainDelegates = {
  destination: createDelegate("destination-resolver", "destination", passthrough),
  accommodation: createDelegate("accommodation-intelligence", "accommodation", passthrough),
  transport: createDelegate("transport-intelligence", "transport", passthrough),
  activities: createDelegate("activity-intelligence", "activities", passthrough),
  culture: createDelegate("culture-intelligence", "culture", passthrough),
  gastronomy: createDelegate("gastronomy-intelligence", "gastronomy", passthrough),
  nature: createDelegate("nature-intelligence", "nature", passthrough),
  requirements: createDelegate("requirements-intelligence", "requirements", passthrough),
  weather: createDelegate("weather-intelligence", "weather", passthrough),
  map: createDelegate("personalized-map", "map", passthrough),
  offline: createDelegate("offline-travel", "offline", passthrough),
};

export function listDelegates(): Array<{ id: string; domain: string }> {
  return Object.values(delegates).map(({ id, domain }) => ({ id, domain }));
}
