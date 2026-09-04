import { DESTINOS, buscarDestinoPorId, buscarDestinoPorNombre } from "./destinos";
import { PAISES, buscarPaisPorCodigo, buscarPaisPorNombre, normalizar, type Pais } from "./paises";
import type { Destino } from "./types";

// Un lugar puede ser un país, una ciudad o un pueblo. La app antes solo
// entendía 12 nombres exactos, así que escribir "Pereira" la dejaba
// completamente vacía. Aquí se resuelve en cascada, de lo más específico
// a lo más general, y si no se reconoce nada se pregunta el país en vez
// de fallar en silencio.

export type TipoLugar = "pais" | "ciudad" | "destino";

export interface LugarResuelto {
  // Lo que escribió la persona, tal cual: es su viaje y su forma de
  // llamarlo, no se sustituye por el nombre del país.
  nombre: string;
  tipo: TipoLugar;
  paisCodigo?: string;
  destinoId?: string;
}

// Ciudades y pueblos → país. Sesgado a propósito hacia Colombia y
// Sudamérica (es el viaje que de verdad se quiere planificar y el que
// menos cubierto estaba), más las capitales y los destinos turísticos
// más buscados del resto del mundo.
const CIUDADES: Record<string, string[]> = {
  CO: [
    "Bogotá", "Medellín", "Cali", "Cartagena", "Barranquilla", "Santa Marta", "Pereira", "Manizales", "Armenia",
    "Bucaramanga", "Cúcuta", "Ibagué", "Villavicencio", "Pasto", "Popayán", "Neiva", "Montería", "Sincelejo",
    "Valledupar", "Riohacha", "Tunja", "Quibdó", "Florencia", "Yopal", "Leticia", "San Andrés", "Providencia",
    "Salento", "Filandia", "Guatapé", "Jardín", "Jericó", "Villa de Leyva", "Barichara", "San Gil", "Mompox",
    "Palomino", "Taganga", "Minca", "Nuquí", "Bahía Solano", "Capurganá", "Guajira", "Cabo de la Vela",
    "Eje Cafetero", "Caño Cristales", "Tayrona", "Cocora", "Zipaquirá", "Honda", "Buenaventura",
  ],
  EC: ["Quito", "Guayaquil", "Cuenca", "Baños", "Montañita", "Otavalo", "Galápagos", "Manta", "Loja", "Mindo", "Riobamba", "Salinas"],
  PE: ["Lima", "Cusco", "Cuzco", "Arequipa", "Machu Picchu", "Trujillo", "Iquitos", "Puno", "Huaraz", "Paracas", "Nazca", "Máncora", "Chiclayo", "Ollantaytambo", "Valle Sagrado"],
  BO: ["La Paz", "Santa Cruz de la Sierra", "Sucre", "Cochabamba", "Uyuni", "Potosí", "Copacabana", "Rurrenabaque", "Oruro", "Tarija"],
  CL: ["Santiago", "Valparaíso", "Viña del Mar", "San Pedro de Atacama", "Puerto Montt", "Puerto Varas", "Punta Arenas", "Torres del Paine", "Pucón", "La Serena", "Chiloé", "Valdivia", "Iquique"],
  AR: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "Bariloche", "Salta", "Ushuaia", "El Calafate", "El Chaltén", "Puerto Iguazú", "Iguazú", "Mar del Plata", "Jujuy", "Purmamarca", "Cafayate", "Tigre"],
  UY: ["Montevideo", "Punta del Este", "Colonia del Sacramento", "Colonia", "Piriápolis", "Cabo Polonio", "Punta del Diablo", "Salto"],
  PY: ["Asunción", "Ciudad del Este", "Encarnación", "Filadelfia"],
  BR: ["Río de Janeiro", "Rio de Janeiro", "São Paulo", "Sao Paulo", "Salvador", "Brasilia", "Florianópolis", "Recife", "Fortaleza", "Manaos", "Manaus", "Foz de Iguazú", "Foz do Iguaçu", "Búzios", "Paraty", "Belo Horizonte", "Curitiba", "Porto Alegre", "Jericoacoara", "Lençóis"],
  VE: ["Caracas", "Maracaibo", "Mérida", "Isla Margarita", "Canaima"],
  PA: ["Ciudad de Panamá", "Panamá City", "Bocas del Toro", "Boquete", "San Blas", "Colón", "David"],
  CR: ["San José", "La Fortuna", "Monteverde", "Manuel Antonio", "Tamarindo", "Puerto Viejo", "Jacó", "Liberia", "Santa Teresa", "Tortuguero"],
  NI: ["Managua", "Granada", "León", "San Juan del Sur", "Ometepe"],
  HN: ["Tegucigalpa", "San Pedro Sula", "Roatán", "Copán"],
  SV: ["San Salvador", "Santa Ana", "El Tunco", "Suchitoto"],
  GT: ["Ciudad de Guatemala", "Antigua", "Antigua Guatemala", "Lago Atitlán", "Panajachel", "Flores", "Tikal", "Xela", "Quetzaltenango", "Semuc Champey"],
  BZ: ["Belice", "Caye Caulker", "San Pedro"],
  MX: ["Ciudad de México", "CDMX", "Cancún", "Playa del Carmen", "Tulum", "Guadalajara", "Monterrey", "Oaxaca", "Puebla", "Mérida", "San Miguel de Allende", "Puerto Escondido", "Sayulita", "Holbox", "Bacalar", "Guanajuato", "Chiapas", "San Cristóbal de las Casas", "Los Cabos", "Puerto Vallarta", "Tijuana"],
  CU: ["La Habana", "Varadero", "Trinidad", "Viñales", "Santiago de Cuba", "Cienfuegos"],
  DO: ["Santo Domingo", "Punta Cana", "Puerto Plata", "Samaná", "Las Terrenas"],
  PR: ["San Juan", "Ponce", "Vieques"],
  US: ["Nueva York", "New York", "Miami", "Los Ángeles", "Los Angeles", "San Francisco", "Chicago", "Las Vegas", "Orlando", "Washington", "Boston", "Seattle", "Nueva Orleans", "San Diego", "Austin", "Denver", "Hawái", "Honolulu"],
  CA: ["Toronto", "Vancouver", "Montreal", "Quebec", "Calgary", "Ottawa", "Banff"],
  ES: ["Madrid", "Barcelona", "Sevilla", "Valencia", "Granada", "Málaga", "Bilbao", "San Sebastián", "Córdoba", "Toledo", "Salamanca", "Santiago de Compostela", "Palma", "Mallorca", "Ibiza", "Tenerife", "Gran Canaria", "Lanzarote", "Cádiz", "Ronda", "Zaragoza", "Oviedo", "Segovia", "Andalucía", "Galicia"],
  PT: ["Lisboa", "Oporto", "Porto", "Faro", "Lagos", "Albufeira", "Sintra", "Madeira", "Azores", "Coimbra", "Braga", "Algarve"],
  FR: ["París", "Paris", "Niza", "Marsella", "Lyon", "Burdeos", "Toulouse", "Estrasburgo", "Cannes", "Aviñón", "Normandía", "Provenza", "Córcega"],
  IT: ["Roma", "Florencia", "Venecia", "Milán", "Nápoles", "Turín", "Bolonia", "Pisa", "Siena", "Verona", "Palermo", "Cerdeña", "Sicilia", "Cinque Terre", "Amalfi", "Capri", "Toscana"],
  DE: ["Berlín", "Múnich", "Munich", "Hamburgo", "Colonia", "Fráncfort", "Frankfurt", "Dresde", "Núremberg", "Heidelberg", "Baviera"],
  AT: ["Viena", "Salzburgo", "Innsbruck", "Graz", "Hallstatt"],
  SI: ["Liubliana", "Ljubljana", "Bled", "Piran", "Bohinj"],
  GR: ["Atenas", "Santorini", "Miconos", "Mykonos", "Creta", "Rodas", "Corfú", "Tesalónica", "Naxos", "Paros"],
  NL: ["Ámsterdam", "Amsterdam", "Róterdam", "La Haya", "Utrecht"],
  BE: ["Bruselas", "Brujas", "Amberes", "Gante"],
  CH: ["Zúrich", "Ginebra", "Berna", "Lucerna", "Interlaken", "Zermatt"],
  IE: ["Dublín", "Galway", "Cork"],
  GB: ["Londres", "Edimburgo", "Mánchester", "Liverpool", "Glasgow", "Oxford", "Cambridge", "Bristol", "Escocia"],
  PL: ["Varsovia", "Cracovia", "Gdansk", "Breslavia"],
  CZ: ["Praga", "Brno", "Cesky Krumlov"],
  HU: ["Budapest"],
  HR: ["Zagreb", "Dubrovnik", "Split", "Hvar", "Zadar"],
  SE: ["Estocolmo", "Gotemburgo", "Malmö"],
  NO: ["Oslo", "Bergen", "Tromsø", "Lofoten"],
  DK: ["Copenhague", "Aarhus"],
  FI: ["Helsinki", "Rovaniemi", "Laponia"],
  IS: ["Reikiavik", "Reykjavik"],
  RO: ["Bucarest", "Brasov", "Transilvania"],
  TR: ["Estambul", "Capadocia", "Antalya", "Éfeso", "Pamukkale", "Izmir"],
  JP: ["Tokio", "Tokyo", "Kioto", "Kyoto", "Osaka", "Hiroshima", "Nara", "Sapporo", "Fukuoka", "Hakone", "Nikko", "Okinawa"],
  TH: ["Bangkok", "Chiang Mai", "Phuket", "Krabi", "Koh Samui", "Ayutthaya", "Pai", "Koh Phi Phi", "Koh Tao"],
  VN: ["Hanói", "Ho Chi Minh", "Saigón", "Hoi An", "Hue", "Halong", "Sapa", "Da Nang"],
  ID: ["Bali", "Yakarta", "Ubud", "Yogyakarta", "Lombok", "Gili"],
  MY: ["Kuala Lumpur", "Penang", "Langkawi", "Malaca", "Borneo"],
  SG: ["Singapur"],
  PH: ["Manila", "Cebú", "Palawan", "El Nido", "Boracay", "Siargao"],
  IN: ["Nueva Delhi", "Delhi", "Bombay", "Mumbai", "Jaipur", "Agra", "Goa", "Varanasi", "Kerala", "Udaipur"],
  NP: ["Katmandú", "Pokhara", "Everest"],
  KR: ["Seúl", "Busan", "Jeju"],
  CN: ["Pekín", "Beijing", "Shanghái", "Shanghai", "Hong Kong", "Xi'an", "Chengdu", "Guilin"],
  AE: ["Dubái", "Dubai", "Abu Dabi"],
  IL: ["Jerusalén", "Tel Aviv"],
  JO: ["Amán", "Petra", "Wadi Rum"],
  MA: ["Marrakech", "Fez", "Chefchaouen", "Casablanca", "Rabat", "Esauira", "Merzouga", "Tánger", "Sáhara"],
  EG: ["El Cairo", "Cairo", "Luxor", "Asuán", "Hurghada", "Sharm el Sheij"],
  ZA: ["Ciudad del Cabo", "Johannesburgo", "Kruger", "Durban"],
  KE: ["Nairobi", "Masái Mara", "Mombasa"],
  TZ: ["Zanzíbar", "Kilimanjaro", "Serengeti", "Arusha"],
  AU: ["Sídney", "Sydney", "Melbourne", "Brisbane", "Cairns", "Perth", "Gold Coast"],
  NZ: ["Auckland", "Queenstown", "Wellington", "Christchurch"],
};

const CIUDAD_A_PAIS = new Map<string, string>();
for (const [codigo, ciudades] of Object.entries(CIUDADES)) {
  for (const ciudad of ciudades) CIUDAD_A_PAIS.set(normalizar(ciudad), codigo);
}

// Los nombres largos primero: así "San Pedro de Atacama" gana a
// "San Pedro" cuando se buscan lugares dentro de una frase.
const CIUDADES_ORDENADAS = [...CIUDAD_A_PAIS.keys()].sort((a, b) => b.length - a.length);
const PAISES_ORDENADOS = PAISES.flatMap((p) => [p.nombre, ...(p.alias ?? [])])
  .map(normalizar)
  .sort((a, b) => b.length - a.length);
const DESTINOS_ORDENADOS = DESTINOS.map((d) => normalizar(d.nombre)).sort((a, b) => b.length - a.length);

export function resolverLugar(texto: string): LugarResuelto | undefined {
  const nombre = texto.trim();
  if (!nombre) return undefined;
  const clave = normalizar(nombre);

  const destino = buscarDestinoPorNombre(nombre);
  if (destino) return { nombre, tipo: "destino", paisCodigo: destino.paisCodigo, destinoId: destino.id };

  const pais = buscarPaisPorNombre(nombre);
  if (pais) return { nombre, tipo: "pais", paisCodigo: pais.codigo };

  const codigoCiudad = CIUDAD_A_PAIS.get(clave);
  if (codigoCiudad) return { nombre, tipo: "ciudad", paisCodigo: codigoCiudad };

  // Reconocido como lugar, pero no sabemos de qué país: quien lo use
  // preguntará por el país en vez de dejar la pantalla vacía.
  return { nombre, tipo: "ciudad" };
}

// Varias paradas dentro de una misma frase, para los viajes de circuito:
// "de Colombia a Perú pasando por Ecuador" o "Cusco, La Paz y Uyuni".
export function detectarLugaresEnTexto(texto: string): LugarResuelto[] {
  const t = normalizar(texto);
  const encontrados: { inicio: number; lugar: LugarResuelto }[] = [];
  const ocupado: boolean[] = new Array(t.length).fill(false);

  const registrar = (clave: string, construir: () => LugarResuelto) => {
    const patron = new RegExp(`(^|[^a-z0-9])${clave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "g");
    let m: RegExpExecArray | null;
    while ((m = patron.exec(t))) {
      const inicio = m.index + m[1].length;
      const fin = inicio + clave.length;
      // Sin solapes: si ya hay algo más específico ocupando ese tramo,
      // no se vuelve a marcar (evita "Panamá" dentro de "Ciudad de Panamá").
      if (ocupado.slice(inicio, fin).some(Boolean)) continue;
      for (let i = inicio; i < fin; i++) ocupado[i] = true;
      encontrados.push({ inicio, lugar: construir() });
    }
  };

  for (const clave of DESTINOS_ORDENADOS) {
    const d = DESTINOS.find((x) => normalizar(x.nombre) === clave) as Destino;
    registrar(clave, () => ({ nombre: d.nombre, tipo: "destino", paisCodigo: d.paisCodigo, destinoId: d.id }));
  }
  for (const clave of CIUDADES_ORDENADAS) {
    const codigo = CIUDAD_A_PAIS.get(clave)!;
    const original = (Object.values(CIUDADES).flat() as string[]).find((c) => normalizar(c) === clave)!;
    registrar(clave, () => ({ nombre: original, tipo: "ciudad", paisCodigo: codigo }));
  }
  for (const clave of PAISES_ORDENADOS) {
    const p = PAISES.find((x) => normalizar(x.nombre) === clave || (x.alias ?? []).some((a) => normalizar(a) === clave))!;
    registrar(clave, () => ({ nombre: p.nombre, tipo: "pais", paisCodigo: p.codigo }));
  }

  // En el orden en que aparecen en la frase, que suele ser el orden real
  // del recorrido que la persona tiene en la cabeza.
  return encontrados.sort((a, b) => a.inicio - b.inicio).map((x) => x.lugar);
}

export function paisDeLugar(lugar?: { paisCodigo?: string }): Pais | undefined {
  return buscarPaisPorCodigo(lugar?.paisCodigo);
}

export function destinoDeLugar(lugar?: { destinoId?: string; nombre?: string }): Destino | undefined {
  if (!lugar) return undefined;
  return buscarDestinoPorId(lugar.destinoId) ?? (lugar.nombre ? buscarDestinoPorNombre(lugar.nombre) : undefined);
}
