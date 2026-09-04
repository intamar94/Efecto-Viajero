import type { EVMediaAsset, MediaCategory, MemoryQuery, MemoryResult, MemoryVideoRequest, MemoryVideoStoryboard } from "./types";

const CATEGORY_TERMS: Record<MediaCategory, string[]> = {
  food: ["food", "comida", "restaurant", "restaurante", "meal", "cena", "almuerzo", "dish"],
  sunset: ["sunset", "atardecer", "sunrise", "amanecer", "golden hour"],
  nature: ["nature", "naturaleza", "mountain", "montaña", "beach", "playa", "forest", "bosque", "lake", "lago"],
  landmark: ["landmark", "monument", "monumento", "museum", "museo", "palace", "palacio", "cathedral", "catedral"],
  culture: ["culture", "cultura", "market", "mercado", "festival", "tradition", "tradición"],
  people: ["people", "person", "gente", "persona"],
  family: ["family", "familia", "daughter", "hija", "son", "hijo"],
  activity: ["activity", "actividad", "hiking", "senderismo", "tour", "excursion", "excursión"],
  transport: ["train", "tren", "bus", "autobus", "airport", "aeropuerto", "car", "coche"],
  event: ["event", "evento", "concert", "concierto", "show", "festival"],
  accommodation: ["hotel", "hostel", "alojamiento", "room", "habitación"],
  unknown: [],
};

export function classifyMedia(asset: EVMediaAsset): EVMediaAsset {
  const haystack = `${asset.name ?? ""} ${asset.description ?? ""}`.toLowerCase();
  const categories = (Object.entries(CATEGORY_TERMS) as Array<[MediaCategory, string[]]>)
    .filter(([category, terms]) => category !== "unknown" && terms.some((term) => haystack.includes(term)))
    .map(([category]) => category);

  return {
    ...asset,
    categories: categories.length ? categories : asset.categories.length ? asset.categories : ["unknown"],
    analyzedAt: new Date().toISOString(),
    source: asset.source ?? "metadata",
  };
}

export function filterMemories(assets: EVMediaAsset[], query: MemoryQuery): MemoryResult {
  const filtered = assets
    .map(classifyMedia)
    .filter((asset) => !query.categories?.length || query.categories.some((category) => asset.categories.includes(category)))
    .filter((asset) => !query.placeName || asset.placeName?.toLowerCase().includes(query.placeName.toLowerCase()))
    .filter((asset) => !query.day || asset.day === query.day)
    .filter((asset) => !query.from || !asset.createdAt || asset.createdAt >= query.from)
    .filter((asset) => !query.to || !asset.createdAt || asset.createdAt <= query.to)
    .slice(0, query.limit ?? 100);

  return { assets: filtered, total: filtered.length, generatedAt: new Date().toISOString() };
}

export function buildMemoryStoryboard(request: MemoryVideoRequest, assets: EVMediaAsset[]): MemoryVideoStoryboard {
  const selected = assets
    .filter((asset) => !request.categories?.length || request.categories.some((category) => asset.categories.includes(category)))
    .filter((asset) => !request.day || asset.day === request.day)
    .filter((asset) => asset.selectedAsMemory)
    .slice(0, 24);

  const count = Math.max(1, selected.length);
  const seconds = request.durationSeconds / count;

  return {
    id: `memory-${request.tripId}-${Date.now()}`,
    tripId: request.tripId,
    title: request.title ?? "Recuerdo del viaje",
    durationSeconds: request.durationSeconds,
    scenes: selected.map((asset) => ({
      assetId: asset.id,
      seconds: Number(seconds.toFixed(2)),
      caption: asset.placeName,
    })),
    generatedAt: new Date().toISOString(),
    storage: "temporary",
  };
}

export function suggestMemoryPrompt(asset: EVMediaAsset): string | null {
  if (asset.selectedAsMemory) return null;
  const category = asset.categories[0];
  const labels: Partial<Record<MediaCategory, string>> = {
    food: "una comida",
    sunset: "un atardecer",
    nature: "un momento de naturaleza",
    landmark: "un lugar destacado",
    family: "un momento familiar",
    activity: "una actividad",
    event: "un evento",
  };
  const label = labels[category];
  return label ? `Parece ${label}${asset.placeName ? ` en ${asset.placeName}` : ""}. ¿Quieres guardarlo como recuerdo?` : null;
}
