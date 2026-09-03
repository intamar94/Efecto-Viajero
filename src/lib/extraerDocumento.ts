import type { CategoriaDocumento } from "./types";

// Lectura real de documentos de reserva (PDF o texto pegado de un email),
// 100% en el navegador — no se sube a ningún servidor.
//
// La clasificación es por puntuación de señales (palabras del documento +
// nombre del archivo), no por la primera coincidencia: un billete de avión
// suele mencionar también "hotel" en la letra pequeña, y con la primera
// coincidencia acababa archivado donde no era. Se guarda marcado como
// automático para poder corregirlo en un clic si falla.
export async function extraerTextoDePdf(archivo: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await archivo.arrayBuffer();
  const documento = await pdfjs.getDocument({ data: buffer }).promise;

  let texto = "";
  for (let i = 1; i <= documento.numPages; i++) {
    const pagina = await documento.getPage(i);
    const contenido = await pagina.getTextContent();
    texto += contenido.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
  }
  return texto;
}

export const ETIQUETA_CATEGORIA: Record<CategoriaDocumento, { etiqueta: string; icono: string }> = {
  vuelo: { etiqueta: "Vuelos", icono: "✈️" },
  tren_bus: { etiqueta: "Tren y autobús", icono: "🚆" },
  alojamiento: { etiqueta: "Alojamiento", icono: "🏨" },
  transporte_local: { etiqueta: "Transporte local", icono: "🎫" },
  entrada: { etiqueta: "Entradas y visitas", icono: "🎟️" },
  seguro: { etiqueta: "Seguros", icono: "🛡️" },
  documento_personal: { etiqueta: "Documentos personales", icono: "🛂" },
  otro: { etiqueta: "Otros", icono: "📄" },
};

// Orden en que se muestran los grupos: primero lo que se necesita antes
// y con más urgencia durante el viaje.
export const ORDEN_CATEGORIAS: CategoriaDocumento[] = [
  "vuelo",
  "tren_bus",
  "alojamiento",
  "transporte_local",
  "entrada",
  "seguro",
  "documento_personal",
  "otro",
];

const SENALES: { categoria: CategoriaDocumento; patrones: RegExp[]; peso: number }[] = [
  {
    categoria: "vuelo",
    peso: 3,
    patrones: [/tarjeta de embarque/i, /boarding\s?pass/i, /\bpnr\b/i, /n[uú]mero de vuelo/i, /flight\s?(number|no)/i],
  },
  { categoria: "vuelo", peso: 1, patrones: [/\bvuelo\b/i, /\bflight\b/i, /aeropuerto|airport/i, /equipaje de mano/i, /iberia|vueling|ryanair|easyjet|lufthansa|air\s?europa|air\s?france|\bklm\b/i] },
  {
    categoria: "tren_bus",
    peso: 3,
    patrones: [/billete de tren/i, /train ticket/i, /coche\s?\d+\s?plaza/i, /\bandén\b/i, /billete de autob[uú]s/i],
  },
  { categoria: "tren_bus", peso: 1, patrones: [/\btren\b/i, /\btrain\b/i, /autob[uú]s|\bbus\b/i, /renfe|trenitalia|sncf|deutsche bahn|trainline|alsa|flixbus|shinkansen|\boncf\b/i] },
  {
    categoria: "alojamiento",
    peso: 3,
    // [\s\S] en vez de . con el flag `s`, que exige target ES2018.
    patrones: [/check-?in[\s\S]*check-?out/i, /confirmaci[oó]n de reserva[\s\S]*hotel/i, /n[uú]mero de habitaci[oó]n/i, /reservation confirmed/i],
  },
  { categoria: "alojamiento", peso: 1, patrones: [/hotel|hostal|albergue|apartamento|alojamiento/i, /check-?in|check-?out/i, /booking\.com|airbnb|hostelworld|expedia|hotels\.com/i, /\bnoches\b|\bnights\b/i] },
  {
    categoria: "transporte_local",
    peso: 3,
    patrones: [/abono de transporte/i, /travel\s?card/i, /city\s?pass/i, /tarjeta recargable/i, /suica|pasmo|icoca|urbana|viva viagem|tullave|c[ií]vica|rabbit card|oyster/i],
  },
  { categoria: "transporte_local", peso: 1, patrones: [/metro\b|tranv[ií]a|\bu-?bahn\b|\bs-?bahn\b/i, /transporte p[uú]blico/i, /zona\s?[12]\b/i] },
  {
    categoria: "entrada",
    peso: 3,
    patrones: [/entrada general|entrada reducida/i, /admit one/i, /hora de acceso/i, /skip the line|acceso preferente/i, /n[uú]mero de entradas/i],
  },
  { categoria: "entrada", peso: 1, patrones: [/museo|museum|exposici[oó]n|palacio|monumento|parque tem[aá]tico|concierto|espect[aá]culo|tour guiado|visita guiada/i, /\bticket(s)?\b/i] },
  { categoria: "seguro", peso: 3, patrones: [/n[uú]mero de p[oó]liza/i, /policy number/i, /condiciones generales del seguro/i] },
  { categoria: "seguro", peso: 1, patrones: [/\bseguro\b|insurance|asistencia en viaje|cobertura m[eé]dica/i] },
  {
    categoria: "documento_personal",
    peso: 3,
    patrones: [/n[uú]mero de pasaporte/i, /passport\s?(no|number)/i, /permiso de residencia/i, /certificado de vacunaci[oó]n/i, /visado|\bvisa\b.*(concedid|approved|grant)/i],
  },
  { categoria: "documento_personal", peso: 1, patrones: [/pasaporte|passport|\bdni\b|carn[eé] de conducir|driving licence/i, /vacuna|vaccination/i] },
];

// El nombre del archivo suele ser la señal más limpia de todas
// ("boarding-pass.pdf", "reserva-hotel.pdf"), así que pesa como una señal
// fuerte cuando coincide.
const SENALES_NOMBRE: { categoria: CategoriaDocumento; patron: RegExp }[] = [
  { categoria: "vuelo", patron: /boarding|embarque|vuelo|flight|itinerario/i },
  { categoria: "tren_bus", patron: /tren|train|bus|autobus|renfe|flixbus/i },
  { categoria: "alojamiento", patron: /hotel|booking|airbnb|hostel|alojamiento|reserva.*(hab|room)/i },
  { categoria: "transporte_local", patron: /abono|pass|travelcard|metro/i },
  { categoria: "entrada", patron: /entrada|ticket|museo|tour/i },
  { categoria: "seguro", patron: /seguro|insurance|poliza/i },
  { categoria: "documento_personal", patron: /pasaporte|passport|dni|visado|visa|vacuna/i },
];

export interface Clasificacion {
  categoria: CategoriaDocumento;
  // Cuántas señales han apoyado la categoría elegida. 0 = no se ha
  // reconocido nada y se archiva en "Otros".
  confianza: number;
}

export function clasificarDocumento(texto: string, nombreArchivo?: string): Clasificacion {
  const puntos = new Map<CategoriaDocumento, number>();
  const sumar = (categoria: CategoriaDocumento, peso: number) => puntos.set(categoria, (puntos.get(categoria) ?? 0) + peso);

  for (const senal of SENALES) {
    for (const patron of senal.patrones) {
      if (patron.test(texto)) sumar(senal.categoria, senal.peso);
    }
  }

  if (nombreArchivo) {
    for (const senal of SENALES_NOMBRE) {
      if (senal.patron.test(nombreArchivo)) sumar(senal.categoria, 3);
    }
  }

  let mejor: CategoriaDocumento = "otro";
  let mejorPuntos = 0;
  for (const [categoria, valor] of puntos) {
    if (valor > mejorPuntos) {
      mejor = categoria;
      mejorPuntos = valor;
    }
  }

  return { categoria: mejor, confianza: mejorPuntos };
}

const PROVEEDORES_CONOCIDOS = [
  "Iberia",
  "Vueling",
  "Ryanair",
  "EasyJet",
  "Air Europa",
  "Air France",
  "Lufthansa",
  "KLM",
  "Renfe",
  "Trenitalia",
  "SNCF",
  "Deutsche Bahn",
  "Trainline",
  "ALSA",
  "FlixBus",
  "Booking.com",
  "Airbnb",
  "Hostelworld",
  "Expedia",
  "Hotels.com",
  "Couchsurfing",
];

function detectarProveedor(texto: string): string | undefined {
  return PROVEEDORES_CONOCIDOS.find((p) => texto.toLowerCase().includes(p.toLowerCase()));
}

function detectarReferencia(texto: string): string | undefined {
  const m = texto.match(/(?:localizador|locator|pnr|booking reference|c[oó]digo de reserva|n[uú]mero de reserva)[:\s]+([A-Z0-9]{4,8})/i);
  return m ? m[1].toUpperCase() : undefined;
}

function detectarFecha(texto: string): string | undefined {
  const iso = texto.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = texto.match(/\b(\d{2})[/-](\d{2})[/-](20\d{2})\b/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return undefined;
}

function detectarHora(texto: string): string | undefined {
  const m = texto.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : undefined;
}

function detectarDireccion(texto: string): string | undefined {
  const m = texto.match(/(?:direcci[oó]n|address)[:\s]+([^\n]{5,80})/i);
  return m ? m[1].trim() : undefined;
}

// Nombre legible para el documento cuando no se reconoce el proveedor:
// mejor el nombre del archivo sin extensión que un "Sin nombre".
function nombreLegible(nombreArchivo?: string): string {
  if (!nombreArchivo) return "Documento sin identificar";
  return nombreArchivo.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Documento sin identificar";
}

export interface ReservaExtraida {
  categoria: CategoriaDocumento;
  confianza: number;
  proveedor: string;
  referencia?: string;
  fecha?: string;
  hora?: string;
  direccion?: string;
}

export function interpretarReserva(texto: string, nombreArchivo?: string): ReservaExtraida {
  const { categoria, confianza } = clasificarDocumento(texto, nombreArchivo);
  return {
    categoria,
    confianza,
    proveedor: detectarProveedor(texto) ?? nombreLegible(nombreArchivo),
    referencia: detectarReferencia(texto),
    fecha: detectarFecha(texto),
    hora: detectarHora(texto),
    direccion: detectarDireccion(texto),
  };
}
