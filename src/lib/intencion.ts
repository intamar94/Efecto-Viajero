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
// Las listas llevan los mismos conceptos en español Y en inglés: la
// interfaz está en inglés porque las fuentes libres (Wikivoyage, OSM,
// Wikipedia) tienen mucho más contenido ahí, pero quien escribe puede
// hacerlo en cualquiera de los dos idiomas y tiene que entenderse igual.
// Se evitan a propósito las palabras funcionales del inglés: "night" a
// secas haría que "night sky" (astronomía) cayera en vida nocturna.
const PALABRAS_CLAVE: Record<CategoriaActividad, string[]> = {
  museo: [
    "museo", "historia", "historico", "cultura", "cultural", "arte", "galeria", "patrimonio",
    "exposicion", "iglesia", "catedral", "monumento", "centro historico", "casco antiguo",
    "ruinas", "arqueologico", "castillo",
    // English
    "museum", "history", "historical", "heritage", "gallery", "exhibition",
    "cathedral", "monument", "old town", "ruins", "archaeological", "castle",
    "cultural",
  ],
  parque: [
    "parque", "caminar", "caminata", "pasear", "paseo", "aire libre", "mirador", "vista",
    "senderismo suave", "plaza", "jardin", "picnic", "malecon",
    // English
    "park", "walk", "walking", "stroll", "viewpoint", "garden",
    "picnic", "promenade", "waterfront", "outdoors",
  ],
  restaurante: [
    "restaurante", "comida", "comer", "gastronomia", "gastronomico", "tipica", "tipico",
    "plato", "cocina", "probar", "degustar",
    "cenar", "cena", "almorzar", "almuerzo", "desayunar", "desayuno",
    "tapas", "picar", "comida callejera", "street food", "marisco", "vegetariano", "vegano",
    "restaurantes tipicos", "sabor", "sabores",
    // English
    "restaurant", "food", "eat", "eating", "cuisine", "gastronomy",
    "typical food", "local food", "dish", "dishes", "cooking", "taste",
    "tasting", "dinner", "lunch", "breakfast", "seafood", "vegetarian",
    "vegan", "foodie", "culinary", "flavours", "flavors", "traditional food",
  ],
  cine_teatro: [
    "cine", "teatro", "pelicula", "obra de teatro", "espectaculo", "concierto", "show", "musical",
    // English
    "cinema", "theatre", "theater", "movie", "opera", "musical",
  ],
  discoteca: [
    "discoteca", "disco", "fiesta", "bar", "vida nocturna", "rumba", "salsa", "baile", "noche",
    "bailar", "bailando", "rumbear", "salir de fiesta", "salir a bailar", "copas", "trago",
    "tomar algo", "cerveza", "reggaeton", "antro", "boliche", "nocturna",
    // English
    "nightlife", "nightclub", "night out", "party", "partying", "clubbing",
    "dancing", "drinks", "beer", "pub crawl",
  ],
  compras: [
    "compras", "comprar", "mercado", "tienda", "souvenir", "artesania",
    "shopping", "centro comercial", "mall", "regalo", "boutique",
    // English
    "shops", "crafts", "souvenirs", "handicraft", "market stalls",
  ],
  naturaleza: [
    "naturaleza", "montana", "senderismo", "rio", "cascada", "aventura", "excursion natural",
    "termales", "termal", "bosque", "selva", "lago", "laguna", "volcan", "trekking", "hiking",
    "avistamiento", "aves", "birdwatching", "reserva natural", "parque natural", "jardin botanico",
    "finca", "cafetal",
    "caminar", "caminata", "sendero", "senderos", "ruta", "rutas", "camino", "andar",
    "acampar", "camping", "glaciar", "acantilado", "mirador", "miradores", "cueva", "cuevas",
    "refugio", "aire libre", "al aire libre", "contacto con la naturaleza", "paisaje", "paisajes",
    "bahia", "playa natural", "manantial", "geiser", "parque nacional", "area protegida",
    // English
    "nature", "mountain", "mountains", "trail", "trails", "waterfall",
    "waterfalls", "forest", "jungle", "lake", "lakes", "river",
    "rivers", "volcano", "wilderness", "landscape", "landscapes", "scenery",
    "countryside", "trek", "national park", "nature reserve", "canyon", "valley",
    "cave", "caves", "fjord", "tundra", "desert", "greenery",
    "open air",
  ],
  playa: [
    "playa", "mar", "costa", "isla", "islas", "arena", "bucear", "buceo", "snorkel", "surf", "nadar",
    // English
    "beach", "beaches", "sea", "coast", "coastal", "island",
    "islands", "sand", "swim", "swimming", "seaside", "shore",
  ],
  pueblos: [
    "pueblo", "excursion", "cerca de la ciudad", "escapada", "alrededores", "afueras", "day trip",
    // English
    "village", "villages", "small town", "small towns", "historic town", "hamlet",
    "old village", "nearby towns",
  ],
  aventura: [
    "aventura", "adrenalina", "parapente", "rafting", "canopy", "tirolina", "tirolesa",
    "escalada", "escalar", "rapel", "canyoning", "torrentismo", "buceo", "bucear", "snorkel",
    "surf", "kayak", "canoa", "cabalgata", "caballo", "bicicleta", "ciclismo", "mountain bike",
    "deporte extremo", "deportes extremos", "parapentismo", "kitesurf", "pesca",
    "espeleologia", "cueva", "cuevas", "puenting", "bungee", "salto", "cuatrimoto", "cuatrimotos",
    "quad", "globo", "globo aerostatico", "esqui", "snowboard", "vuelo libre", "tubing",
    // English
    "adventure", "adrenaline", "paragliding", "zipline", "zip line", "climbing",
    "abseiling", "horseback", "cycling", "biking", "mountain biking", "extreme sports",
    "skiing", "caving", "hot air balloon", "via ferrata",
  ],
  bienestar: [
    "termales", "termal", "spa", "sauna", "masaje", "relajarse", "descansar", "bienestar",
    "aguas termales", "banos termales",
    // English
    "hot springs", "thermal baths", "massage", "relax", "relaxing", "wellness",
    "unwind", "retreat spa",
  ],
  todos: [
    "ninos", "nino", "hijos", "familia", "familiar", "acuario", "zoologico", "zoo",
    "parque de diversiones", "parque de atracciones", "parque tematico", "granja",
    "con peques", "para toda la familia", "para todos", "todo publico", "plan familiar",
    "piscina", "piscinas", "balneario", "jardin botanico", "boliche", "bolos",
    "patinaje", "minigolf", "planetario", "adulto mayor", "abuelos",
    // English
    "kids", "children", "family", "family friendly", "aquarium", "theme park",
    "amusement park", "water park", "playground", "all ages", "grandparents", "swimming pool",
  ],
  experiencias: [
    "experiencia", "experiencias", "taller", "cata", "degustacion", "vinedo", "bodega",
    "cafetal", "finca cafetera", "tour de cafe", "cerveceria", "artesanal", "mercado local",
    // English
    "workshop", "winery", "wineries", "vineyard", "vineyards", "wine",
    "brewery", "distillery", "coffee farm", "coffee tour", "food tour", "local market",
    "cooking class",
  ],
  eventos: [
    "evento", "eventos", "festival", "festivales", "concierto", "conciertos", "feria", "ferias",
    "carnaval", "fiesta popular", "agenda cultural", "que pasa", "partido", "estadio",
    "temporada", "en vivo", "espectaculo deportivo",
    // English
    "event", "festival", "festivals", "concert", "concerts", "carnival",
    "live music", "stadium",
  ],
  espiritual: [
    "iglesia", "catedral", "templo", "santuario", "monasterio", "convento", "basilica",
    "mezquita", "sinagoga", "peregrinacion", "camino de santiago", "espiritual", "religioso",
    "retiro", "meditacion", "yoga", "mindfulness", "sagrado",
    // English
    "church", "churches", "temple", "shrine", "monastery", "convent",
    "basilica", "mosque", "synagogue", "pilgrimage", "spiritual", "religious",
    "sacred", "meditation",
  ],
  fauna: [
    "aves", "pajaros", "avistamiento", "birdwatching", "fauna", "animales", "ballenas",
    "delfines", "tortugas", "safari", "observacion de aves", "vida silvestre", "monos",
    // English
    "birds", "birding", "wildlife", "animals", "whales", "whale watching",
    "dolphins", "turtles", "monkeys", "wildlife watching", "national wildlife",
  ],
  astronomia: [
    "estrellas", "estrella", "astronomia", "astronomico", "astroturismo", "observatorio",
    "planetario", "auroras", "aurora boreal", "cielo nocturno", "cielo oscuro", "telescopio",
    "via lactea", "eclipse", "lluvia de estrellas", "meteoros", "starlight", "ver el cielo",
    // English
    "stars", "stargazing", "astronomy", "astrotourism", "observatory", "planetarium",
    "northern lights", "aurora", "auroras", "night sky", "dark sky", "dark skies",
    "telescope", "milky way", "meteor shower", "meteors", "southern lights",
  ],
  ciencia: [
    "biblioteca", "bibliotecas", "libreria", "libros", "ciencia", "cientifico", "tecnologia",
    "museo de ciencia", "centro de ciencia", "innovacion", "universidad", "archivo",
    // English
    "library", "libraries", "bookshop", "bookstore", "books", "science",
    "technology", "science museum", "archive",
  ],
  arte_urbano: [
    "arte urbano", "mural", "murales", "grafiti", "graffiti", "street art", "arte callejero",
    // English
    "mural", "murals", "street mural",
  ],
  memoria: [
    "memorial", "memoria", "cementerio", "historia oscura", "dark tourism", "campo de batalla",
    "guerra", "holocausto", "victimas", "mausoleo", "monumento conmemorativo",
    // English
    "memory", "cemetery", "battlefield", "war", "mausoleum", "remembrance",
  ],
  industrial: [
    "faro", "faros", "mina", "minas", "tren historico", "ferrocarril", "locomotora",
    "fabrica", "patrimonio industrial", "turismo industrial", "molino",
    // English
    "lighthouse", "lighthouses", "mine", "mines", "historic train", "railway",
    "locomotive", "factory", "industrial heritage", "mill", "windmill", "watermill",
  ],
  nautica: [
    "barco", "barcos", "bote", "botes", "lancha", "velero", "yate", "navegar", "navegacion",
    "alquilar barco", "rentar bote", "casa flotante", "casa bote", "marina", "puerto deportivo",
    "pescar", "pesca", "muelle", "paseo en barco", "crucero", "catamaran",
    // "Quiero bucear" no caía en ninguna caja de agua: se entendía como
    // playa y aventura, que es donde nadie busca un arrecife.
    "bucear", "buceo", "submarinismo", "snorkel", "esnorquel", "arrecife", "arrecifes",
    "sumergirse", "fondo marino", "vida marina", "kayak", "remar", "piraguismo",
    // English
    "boat", "boats", "sailing", "sail", "yacht", "sailboat",
    "boat rental", "rent a boat", "houseboat", "harbour", "harbor", "fishing",
    "pier", "dock", "boat trip", "cruise", "diving", "dive",
    "scuba", "snorkelling", "snorkeling", "reef", "reefs", "kayaking",
    "canoeing", "rowing", "underwater", "marine life", "jetty",
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
