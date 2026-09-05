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
