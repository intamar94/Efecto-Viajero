export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationState {
  supported: boolean;
  permission: PermissionState | "unknown";
  position?: GeoPosition;
  error?: string;
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export async function requestLocation(): Promise<LocationState> {
  if (!isGeolocationSupported()) return { supported: false, permission: "unknown", error: "GPS no disponible en este dispositivo." };

  let permission: PermissionState | "unknown" = "unknown";
  try {
    permission = (await navigator.permissions.query({ name: "geolocation" })).state;
  } catch {
    // Algunos navegadores no exponen Permissions API para geolocation.
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        supported: true,
        permission: "granted",
        position: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        },
      }),
      (error) => resolve({
        supported: true,
        permission: error.code === error.PERMISSION_DENIED ? "denied" : permission,
        error: error.message,
      }),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12_000 },
    );
  });
}

export function watchLocation(onChange: (position: GeoPosition) => void): () => void {
  if (!isGeolocationSupported()) return () => undefined;
  const watchId = navigator.geolocation.watchPosition(
    (position) => onChange({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    }),
    () => undefined,
    { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
  );
  return () => navigator.geolocation.clearWatch(watchId);
}
