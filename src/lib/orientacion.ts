// Brújula del teléfono (giroscopio/magnetómetro) para el radar del Modo
// Guía. Gratis, sin clave: DeviceOrientationEvent del navegador/WebView.

export function rumboEntre(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dLon = rad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Diferencia angular con signo en (-180, 180].
export function diferenciaAngular(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

type EventoOrientacion = DeviceOrientationEvent & { webkitCompassHeading?: number };
type ConPermiso = { requestPermission?: () => Promise<"granted" | "denied"> };

export function hayBrujula(): boolean {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
}

// En iPhone el permiso se pide con un gesto del usuario (un toque). En
// Android no hace falta. Devuelve false si el usuario lo rechaza.
export async function pedirPermisoBrujula(): Promise<boolean> {
  if (!hayBrujula()) return false;
  const ctor = DeviceOrientationEvent as unknown as ConPermiso;
  if (typeof ctor.requestPermission === "function") {
    try {
      return (await ctor.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return true;
}

// Llama a `cb` con el rumbo (0–360, 0 = norte) hacia donde apunta la parte
// de arriba del teléfono. Suaviza el ruido del sensor. Devuelve la función
// para dejar de escuchar.
export function escucharRumbo(cb: (rumbo: number) => void): () => void {
  let ultimo: number | null = null;
  function procesar(e: Event) {
    const ev = e as EventoOrientacion;
    let rumbo: number | null = null;
    if (typeof ev.webkitCompassHeading === "number") rumbo = ev.webkitCompassHeading;
    else if (ev.absolute && typeof ev.alpha === "number") rumbo = (360 - ev.alpha) % 360;
    if (rumbo === null) return;
    ultimo = ultimo === null ? rumbo : (ultimo + diferenciaAngular(rumbo, ultimo) * 0.25 + 360) % 360;
    cb(ultimo);
  }
  window.addEventListener("deviceorientationabsolute", procesar as EventListener, true);
  window.addEventListener("deviceorientation", procesar as EventListener, true);
  return () => {
    window.removeEventListener("deviceorientationabsolute", procesar as EventListener, true);
    window.removeEventListener("deviceorientation", procesar as EventListener, true);
  };
}
