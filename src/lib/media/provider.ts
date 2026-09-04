import type { EVMediaAsset, MediaProvider, MediaProviderCapabilities, MemoryQuery, MemoryResult } from "./types";

export interface MediaProviderAdapter {
  readonly provider: MediaProvider;
  capabilities(): Promise<MediaProviderCapabilities>;
  search(query: MemoryQuery): Promise<MemoryResult>;
  getAsset(id: string): Promise<EVMediaAsset | null>;
}

const unsupported = async (provider: MediaProvider): Promise<MediaProviderCapabilities> => ({
  provider,
  connected: false,
  readMedia: false,
  readMetadata: false,
  thumbnails: false,
  writeAlbums: false,
  exportResults: false,
});

export const mediaProviders: Record<MediaProvider, MediaProviderAdapter> = {
  device: {
    provider: "device",
    capabilities: async () => ({
      provider: "device",
      connected: true,
      readMedia: true,
      readMetadata: true,
      thumbnails: true,
      writeAlbums: false,
      exportResults: true,
    }),
    search: async () => ({ assets: [], total: 0, generatedAt: new Date().toISOString() }),
    getAsset: async () => null,
  },
  "google-photos": { provider: "google-photos", capabilities: () => unsupported("google-photos"), search: async () => empty(), getAsset: async () => null },
  icloud: { provider: "icloud", capabilities: () => unsupported("icloud"), search: async () => empty(), getAsset: async () => null },
  onedrive: { provider: "onedrive", capabilities: () => unsupported("onedrive"), search: async () => empty(), getAsset: async () => null },
  dropbox: { provider: "dropbox", capabilities: () => unsupported("dropbox"), search: async () => empty(), getAsset: async () => null },
  other: { provider: "other", capabilities: () => unsupported("other"), search: async () => empty(), getAsset: async () => null },
};

function empty(): MemoryResult {
  return { assets: [], total: 0, generatedAt: new Date().toISOString() };
}

export async function providerCapabilities(): Promise<MediaProviderCapabilities[]> {
  return Promise.all(Object.values(mediaProviders).map((provider) => provider.capabilities()));
}

export function getMediaProvider(provider: MediaProvider): MediaProviderAdapter {
  return mediaProviders[provider];
}
