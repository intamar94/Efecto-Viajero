import type { ModoPlanificacion } from "./types";

// Un solo sitio para las tres formas de organizar un viaje: estaban
// definidas por duplicado en /planificar y en el hub, y ya se habían
// desincronizado (el mismo modo se llamaba distinto en cada pantalla).
export const MODOS: { valor: ModoPlanificacion; etiqueta: string; descripcion: string }[] = [
  { valor: "completo", etiqueta: "🗓️ Todo planificado", descripcion: "Días y actividades definidos antes de salir." },
  { valor: "poco_a_poco", etiqueta: "🧩 Poco a poco", descripcion: "Lo importante ahora; el resto, luego." },
  { valor: "dejarse_llevar", etiqueta: "🌿 Dejarme llevar", descripcion: "Solo vuelos y cama; el resto, improvisado." },
];
