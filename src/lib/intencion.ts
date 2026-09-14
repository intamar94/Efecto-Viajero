import type { CategoriaActividad } from "./types";

// El "cerebro" de la caja de texto libre en Actividades: en vez de un
// menú desplegable con categorías fijas, el viajero escribe con sus
// propias palabras y esto detecta qué categorías está pidiendo. No es
// IA generativa (no inventa lugares nuevos): filtra y prioriza lo que ya
// investigamos de verdad, según lo que la persona pidió.
// La gente no escribe sustantivos sueltos, escribe frases: "quiero salir
// a bailar", "dónde cenar bien", "ir de shopping". Antes solo estaban los
// sustantivos ("baile", "comida") más un plural regular, así que
// "bailar", "cenar", "desayunar" o "shopping" no se entendían y la
// petición se perdía en silencio — el usuario pedía rumba en Cali y no
// veía nada de vida nocturna. Se listan las formas reales (infinitivos y
// sinónimos incluidos) en vez de intentar conjugar: es un buscador por
// palabras, y explícito es más fácil de corregir que ingenioso.
const PALABRAS_CLAVE: Record<CategoriaActividad, string[]> = {
  museo: [
    "museo", "historia", "historico", "cultura", "cultural", "arte", "galeria", "patrimonio",
    "exposicion", "iglesia", "catedral", "monumento", "centro historico", "casco antiguo",
    "ruinas", "arqueologico", "castillo",
  ],
  parque: [
    "parque", "caminar", "caminata", "pasear", "paseo", "aire libre", "mirador", "vista",
    "senderismo suave", "plaza", "jardin", "picnic", "malecon",
  ],
  restaurante: [
    "restaurante", "comida", "comer", "gastronomia", "gastronomico", "tipica", "tipico",
    "plato", "cocina", "probar", "degustar",
    "cenar", "cena", "almorzar", "almuerzo", "desayunar", "desayuno",
    "tapas", "picar", "comida callejera", "street food", "marisco", "vegetariano", "vegano",
    "restaurantes tipicos", "sabor", "sabores",
  ],
  cine_teatro: [
    "cine", "teatro", "pelicula", "obra de teatro", "espectaculo", "concierto", "show", "musical",
  ],
  discoteca: [
    "discoteca", "disco", "fiesta", "bar", "vida nocturna", "rumba", "salsa", "baile", "noche",
    "bailar", "bailando", "rumbear", "salir de fiesta", "salir a bailar", "copas", "trago",
    "tomar algo", "cerveza", "reggaeton", "antro", "boliche", "after", "nocturna",
  ],
  compras: [
    "compras", "comprar", "mercado", "tienda", "souvenir", "artesania",
    "shopping", "centro comercial", "mall", "regalo", "boutique",
  ],
  naturaleza: [
    "naturaleza", "montana", "senderismo", "rio", "cascada", "aventura", "excursion natural",
    "termales", "termal", "bosque", "selva", "lago", "laguna", "volcan", "trekking", "hiking",
    "avistamiento", "aves", "birdwatching", "reserva natural", "parque natural", "jardin botanico",
    "finca", "cafetal",
  ],
  playa: [
    "playa", "mar", "costa", "isla", "islas", "arena", "bucear", "buceo", "snorkel", "surf", "nadar",
  ],
  pueblos: [
    "pueblo", "excursion", "cerca de la ciudad", "escapada", "alrededores", "afueras", "day trip",
  ],
  aventura: [
    "aventura", "adrenalina", "parapente", "rafting", "canopy", "tirolina", "tirolesa",
    "escalada", "escalar", "rapel", "canyoning", "torrentismo", "buceo", "bucear", "snorkel",
    "surf", "kayak", "canoa", "cabalgata", "caballo", "bicicleta", "ciclismo", "mountain bike",
    "deporte extremo", "deportes extremos", "parapentismo", "kitesurf", "pesca",
    "espeleologia", "cueva", "cuevas", "puenting", "bungee", "salto", "cuatrimoto", "cuatrimotos",
    "quad", "globo", "globo aerostatico", "esqui", "snowboard", "vuelo libre", "tubing",
  ],
  bienestar: [
    "termales", "termal", "spa", "sauna", "masaje", "relajarse", "descansar", "bienestar",
    "aguas termales", "banos termales",
  ],
  todos: [
    "ninos", "nino", "hijos", "familia", "familiar", "acuario", "zoologico", "zoo",
    "parque de diversiones", "parque de atracciones", "parque tematico", "granja",
    "con peques", "para toda la familia", "para todos", "todo publico", "plan familiar",
    "piscina", "piscinas", "balneario", "jardin botanico", "boliche", "bolos",
    "patinaje", "minigolf", "planetario", "adulto mayor", "abuelos",
  ],
  experiencias: [
    "experiencia", "experiencias", "taller", "cata", "degustacion", "vinedo", "bodega",
    "cafetal", "finca cafetera", "tour de cafe", "cerveceria", "artesanal", "mercado local",
  ],
  eventos: [
    "evento", "eventos", "festival", "festivales", "concierto", "conciertos", "feria", "ferias",
    "carnaval", "fiesta popular", "agenda cultural", "que pasa", "partido", "estadio",
    "temporada", "en vivo", "espectaculo deportivo",
  ],
  espiritual: [
    "iglesia", "catedral", "templo", "santuario", "monasterio", "convento", "basilica",
    "mezquita", "sinagoga", "peregrinacion", "camino de santiago", "espiritual", "religioso",
    "retiro", "meditacion", "yoga", "mindfulness", "sagrado",
  ],
  fauna: [
    "aves", "pajaros", "avistamiento", "birdwatching", "fauna", "animales", "ballenas",
    "delfines", "tortugas", "safari", "observacion de aves", "vida silvestre", "monos",
  ],
  astronomia: [
    "estrellas", "estrella", "astronomia", "astronomico", "astroturismo", "observatorio",
    "planetario", "auroras", "aurora boreal", "cielo nocturno", "cielo oscuro", "telescopio",
    "via lactea", "eclipse", "lluvia de estrellas", "meteoros", "starlight", "ver el cielo",
  ],
  ciencia: [
    "biblioteca", "bibliotecas", "libreria", "libros", "ciencia", "cientifico", "tecnologia",
    "museo de ciencia", "centro de ciencia", "innovacion", "universidad", "archivo",
  ],
  arte_urbano: [
    "arte urbano", "mural", "murales", "grafiti", "graffiti", "street art", "arte callejero",
  ],
  memoria: [
    "memorial", "memoria", "cementerio", "historia oscura", "dark tourism", "campo de batalla",
    "guerra", "holocausto", "victimas", "mausoleo", "monumento conmemorativo",
  ],
  industrial: [
    "faro", "faros", "mina", "minas", "tren historico", "ferrocarril", "locomotora",
    "fabrica", "patrimonio industrial", "turismo industrial", "molino",
  ],
  otro: [
    "espontaneo", "sorpresa", "algo diferente", "tour", "free tour",
    "descubrir", "curioso", "insolito", "diferente", "alternativo", "fuera de lo comun",
  ],
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
