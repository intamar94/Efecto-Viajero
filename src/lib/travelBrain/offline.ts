const CACHE_PREFIX = "efecto-viajero:offline:";

export interface OfflineBundle<T = unknown> {
  tripId: string;
  createdAt: string;
  updatedAt: string;
  data: T;
}

function key(tripId: string): string {
  return `${CACHE_PREFIX}${tripId}`;
}

export function saveOfflineBundle<T>(tripId: string, data: T): OfflineBundle<T> | null {
  if (typeof window === "undefined") return null;
  const now = new Date().toISOString();
  const previous = readOfflineBundle<T>(tripId);
  const bundle: OfflineBundle<T> = {
    tripId,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    data,
  };
  localStorage.setItem(key(tripId), JSON.stringify(bundle));
  return bundle;
}

export function readOfflineBundle<T>(tripId: string): OfflineBundle<T> | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key(tripId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OfflineBundle<T>;
  } catch {
    localStorage.removeItem(key(tripId));
    return null;
  }
}

export function removeOfflineBundle(tripId: string): void {
  if (typeof window !== "undefined") localStorage.removeItem(key(tripId));
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
