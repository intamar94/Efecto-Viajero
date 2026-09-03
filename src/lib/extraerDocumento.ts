// Lectura real de documentos de reserva (PDF o texto pegado de un email),
// 100% en el navegador — no se sube a ningún servidor ni pasa por una IA.
// La extracción de campos es heurística (igual que requisitos.ts o
// explorador.ts): reduce el trabajo manual, pero el usuario revisa y
// confirma antes de guardar, porque un documento real puede venir en
// cualquier formato.
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
  "Expedia",
  "Hotels.com",
];

function detectarTipo(texto: string): string {
  const t = texto.toLowerCase();
  if (/vuelo|flight|boarding|tarjeta de embarque|aeropuerto/.test(t)) return "vuelo";
  if (/\btren\b|train|renfe|billete de tren/.test(t)) return "tren";
  if (/autob[uú]s|\bbus\b|flixbus|alsa/.test(t)) return "autobus";
  if (/hotel|check-?in|check-?out|alojamiento|apartamento/.test(t)) return "hotel";
  if (/seguro|p[oó]liza|insurance/.test(t)) return "seguro";
  return "otro";
}

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

export interface ReservaExtraida {
  tipo: string;
  proveedor?: string;
  referencia?: string;
  fecha?: string;
  hora?: string;
  direccion?: string;
}

export function interpretarReserva(texto: string): ReservaExtraida {
  return {
    tipo: detectarTipo(texto),
    proveedor: detectarProveedor(texto),
    referencia: detectarReferencia(texto),
    fecha: detectarFecha(texto),
    hora: detectarHora(texto),
    direccion: detectarDireccion(texto),
  };
}
