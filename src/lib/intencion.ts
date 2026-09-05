import type { CategoriaActividad } from "./types";

// El "cerebro" de la caja de texto libre en Actividades: en vez de un
// menú desplegable con categorías fijas, el viajero escribe con sus
// propias palabras y esto detecta qué categorías está pidiendo. No es
// IA generativa (no inventa lugares nuevos): filtra y prioriza lo que ya
// investigamos de verdad, según lo que la persona pidió.
const PALABRAS_CLAVE: Record<CategoriaActividad, string[]> = {
  museo: ["museo", "historia", "historico", "cultura", "cultural", "arte", "galeria", "patrimonio"],
  parque: ["parque", "caminar", "caminata", "pasear", "paseo", "aire libre", "mirador", "vista", "senderismo suave"],
  restaurante: ["restaurante", "comida", "comer", "gastronomia", "gastronomico", "tipica", "tipico", "plato", "cocina", "probar"],
  cine_teatro: ["cine", "teatro", "pelicula", "obra de teatro", "espectaculo"],
  discoteca: ["discoteca", "fiesta", "bar", "vida nocturna", "rumba", "salsa", "baile", "noche"],
  compras: ["compras", "comprar", "mercado", "tienda", "souvenir", "artesania"],
  naturaleza: ["naturaleza", "montana", "senderismo", "rio", "cascada", "aventura", "excursion natural"],
  playa: ["playa", "mar", "costa", "isla", "islas", "arena"],
  pueblos: ["pueblo", "excursion", "cerca de la ciudad", "escapada"],
  otro: ["feria", "evento", "festival", "fiesta popular", "espontaneo", "sorpresa", "algo diferente"],
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Devuelve las categorías detectadas en el texto, en el orden en que se
// mencionaron (para poder mostrar "detectamos: X, Y, Z" tal como lo pidió
// la persona). Usa límites de palabra (\b): sin esto, "bar" aparecía
// dentro de "probar" y "caminar" dentro de otra palabra podía disparar
// una categoría equivocada por pura coincidencia de subcadena.
//
// El límite de palabra por sí solo era demasiado estricto: "restaurantes
// típicos" (plural, la forma más natural de escribirlo) no coincidía con
// la palabra clave "restaurante" y la categoría entera se perdía en
// silencio. Se admite un plural regular al final ("s" o "es") sin
// convertir esto en un analizador morfológico completo.
export function interpretarIntencion(texto: string): CategoriaActividad[] {
  const normalizado = normalizar(texto);
  if (!normalizado.trim()) return [];

  const posiciones: { categoria: CategoriaActividad; pos: number }[] = [];
  for (const [categoria, palabras] of Object.entries(PALABRAS_CLAVE) as [CategoriaActividad, string[]][]) {
    let mejorPos = -1;
    for (const palabra of palabras) {
      const regex = new RegExp(`\\b${escaparRegex(normalizar(palabra))}(?:es|s)?\\b`);
      const m = regex.exec(normalizado);
      if (m && (mejorPos === -1 || m.index < mejorPos)) mejorPos = m.index;
    }
    if (mejorPos !== -1) posiciones.push({ categoria, pos: mejorPos });
  }

  return posiciones.sort((a, b) => a.pos - b.pos).map((p) => p.categoria);
}
