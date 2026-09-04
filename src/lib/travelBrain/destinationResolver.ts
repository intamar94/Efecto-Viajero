export type DestinationType = "city" | "town" | "village" | "region" | "country" | "unknown";

export interface DestinationEvidence {
  source: string;
  url: string;
  checkedAt: string;
  confidence: "high" | "medium" | "low";
}

export interface ResolvedDestination {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  latitude: number;
  longitude: number;
  type: DestinationType;
  displayName: string;
  evidence: DestinationEvidence;
}

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

function classify(code?: string): DestinationType {
  if (!code) return "unknown";
  if (code.startsWith("PPLC") || code.startsWith("PPLA")) return "city";
  if (code.startsWith("PPL")) return "town";
  if (code.startsWith("ADM")) return "region";
  return "unknown";
}

export async function resolveDestination(query: string, countryCode?: string): Promise<ResolvedDestination[]> {
  const value = query.trim();
  if (!value) return [];
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", value);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");
  if (countryCode) url.searchParams.set("countryCode", countryCode.toUpperCase());

  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`No se pudo resolver ${value}`);
  const data = (await response.json()) as GeocodingResponse;
  const checkedAt = new Date().toISOString();

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
    evidence: {
      source: "Open-Meteo Geocoding",
      url: url.toString(),
      checkedAt,
      confidence: "high",
    },
  }));
}
