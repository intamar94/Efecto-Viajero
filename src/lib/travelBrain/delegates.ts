import type { IntelligenceDelegate, TravelBrainDelegates } from "./types";
import { buildMemoryStoryboard, classifyMedia, filterMemories } from "@/lib/media/intelligence";
import type { EVMediaAsset, MemoryQuery, MemoryVideoRequest } from "@/lib/media/types";

function createDelegate<TInput = unknown, TOutput = unknown>(
  id: string,
  domain: string,
  run: (input: TInput) => Promise<TOutput>,
): IntelligenceDelegate<TInput, TOutput> {
  return { id, domain, run };
}

const passthrough = async <T>(input: T): Promise<T> => input;

const memory = createDelegate<EVMediaAsset, EVMediaAsset>("memory-intelligence", "memory", async (asset) => classifyMedia(asset));
const memorySearch = createDelegate<{ assets: EVMediaAsset[]; query: MemoryQuery }, ReturnType<typeof filterMemories>>(
  "memory-search",
  "memory",
  async ({ assets, query }) => filterMemories(assets, query),
);
const memoryVideo = createDelegate<{ request: MemoryVideoRequest; assets: EVMediaAsset[] }, ReturnType<typeof buildMemoryStoryboard>>(
  "memory-video",
  "memory",
  async ({ request, assets }) => buildMemoryStoryboard(request, assets),
);

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
  memory,
  memorySearch,
  memoryVideo,
  events: createDelegate("events-intelligence", "events", passthrough),
  language: createDelegate("language-intelligence", "language", passthrough),
  currency: createDelegate("currency-intelligence", "currency", passthrough),
  laws: createDelegate("laws-intelligence", "laws", passthrough),
  emergency: createDelegate("emergency-intelligence", "emergency", passthrough),
  social: createDelegate("social-intelligence", "social", passthrough),
  expenses: createDelegate("expense-intelligence", "expenses", passthrough),
};

export function listDelegates(): Array<{ id: string; domain: string }> {
  return Object.values(delegates).map(({ id, domain }) => ({ id, domain }));
}
