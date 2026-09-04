import type { ResolvedDestination, SourceEvidence } from "./types";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

interface GeocodingResponse {
  results?: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
    admin1?: string;
    feature_code?: string;
  }>;
}

function classify(featureCode?: string): ResolvedDestination["type"] {
  if (!featureCode) return "unknown";
  if (featureCode.startsWith("PPLC") || featureCode.startsWith("PPLA")) return "city";
  if (featureCode.startsWith("PPL")) return "town";
  if (featureCode.startsWith("ADM")) return "region";
  return "unknown";
}

function evidence(url: string): SourceEvidence {
  return {
    source: "Open-Meteo Geocoding",
    url,
    checkedAt: new Date().toISOString(),
    freshness: "live",
    confidence: "high",
  };
}

export async function resolveDestination(query: string): Promise<ResolvedDestination[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", q);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`Destination resolver failed: ${response.status}`);

  const data = (await response.json()) as GeocodingResponse;
  return (data.results ?? []).map((item) => ({
    id: `geo:${item.id}`,
    name: item.name,
    country: item.country ?? "",
    countryCode: item.country_code ?? "",
    region: item.admin1,
    latitude: item.latitude,
    longitude: item.longitude,
    type: classify(item.feature_code),
    displayName: [item.name, item.admin1, item.country].filter(Boolean).join(", "),
    source: evidence(url.toString()),
  }));
}
