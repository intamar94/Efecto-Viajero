export type MediaProvider = "device" | "google-photos" | "icloud" | "onedrive" | "dropbox" | "other";
export type MediaType = "photo" | "video";
export type MediaCategory =
  | "food"
  | "sunset"
  | "nature"
  | "landmark"
  | "culture"
  | "people"
  | "family"
  | "activity"
  | "transport"
  | "event"
  | "accommodation"
  | "unknown";

export interface EVMediaAsset {
  id: string;
  provider: MediaProvider;
  providerAssetId?: string;
  type: MediaType;
  name?: string;
  createdAt?: string;
  day?: number;
  latitude?: number;
  longitude?: number;
  thumbnailUrl?: string;
  accessReference?: string;
  tripId?: string;
  categories: MediaCategory[];
  description?: string;
  placeName?: string;
  selectedAsMemory: boolean;
  analyzedAt?: string;
  source?: "metadata" | "vision" | "user";
}

export interface MediaProviderCapabilities {
  provider: MediaProvider;
  connected: boolean;
  readMedia: boolean;
  readMetadata: boolean;
  thumbnails: boolean;
  writeAlbums: boolean;
  exportResults: boolean;
}

export interface MemoryQuery {
  tripId: string;
  categories?: MediaCategory[];
  day?: number;
  from?: string;
  to?: string;
  placeName?: string;
  limit?: number;
}

export interface MemoryResult {
  assets: EVMediaAsset[];
  total: number;
  generatedAt: string;
}

export interface MemoryVideoRequest {
  tripId: string;
  title?: string;
  categories?: MediaCategory[];
  day?: number;
  durationSeconds: 15 | 30 | 60;
  style: "calm" | "dynamic" | "emotional" | "fun" | "cinematic";
}

export interface MemoryVideoStoryboard {
  id: string;
  tripId: string;
  title: string;
  durationSeconds: number;
  scenes: Array<{
    assetId: string;
    seconds: number;
    caption?: string;
  }>;
  generatedAt: string;
  storage: "temporary" | "user-cloud" | "none";
}
