// Utilidades del Modo Guía: distancia real entre dos coordenadas y la
// voz que narra el sitio. Todo con APIs del navegador (Geolocation y
// SpeechSynthesis), sin clave ni servicio de pago.

export function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const rad = (n: number) => (n * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Redondea a un número de metros/kilómetros fácil de leer de un vistazo,
// en vez de una cifra falsamente precisa ("847 m") que nadie necesita al
// caminar. Se reutiliza en cualquier sitio de la app que muestre una
// distancia real calculada con distanciaMetros.
export function formatearDistancia(metros: number): string {
  if (metros < 1000) return `~${Math.round(metros / 50) * 50} m`;
  return `~${(metros / 1000).toFixed(1)} km`;
}

export function hablar(texto: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = "es-ES";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function haySintesisDeVoz(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
