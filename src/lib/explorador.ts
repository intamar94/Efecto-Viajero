import { DESTINOS } from "./destinos";
import type { Destino, RitmoViaje } from "./types";

// Traductor heurístico de lenguaje natural a variables estructuradas.
// En una versión posterior este parseo lo haría un LLM; aquí se resuelve
// con reglas para que el flujo completo (texto -> compatibilidad -> viaje)
// funcione de extremo a extremo sin depender de un servicio externo.
export interface NecesidadesViaje {
  textoOriginal: string;
  duracionDias?: number;
  presupuestoMax?: number;
  numAdultos?: number;
  edadesMenores: number[];
  mascota: boolean;
  intereses: string[];
  ritmo?: RitmoViaje;
  sinConducirMucho: boolean;
  climaCalido?: boolean;
}

const MAPA_INTERESES: Record<string, string> = {
  naturaleza: "naturaleza",
  "pueblo": "pueblos",
  pueblos: "pueblos",
  playa: "playa",
  playas: "playa",
  "bañarnos": "playa",
  "bañar": "playa",
  aventura: "aventura",
  "romántico": "romantico",
  romantico: "romantico",
  "romántica": "romantico",
  gastronomía: "gastronomia",
  gastronomia: "gastronomia",
  comida: "gastronomia",
  montaña: "montana",
  montana: "montana",
  ciudad: "ciudad",
  cultura: "cultura",
  familiar: "familiar",
  niños: "familiar",
  desierto: "aventura",
  senderismo: "naturaleza",
  lagos: "naturaleza",
};

function extraerNumero(match: RegExpMatchArray | null): number | undefined {
  if (!match) return undefined;
  const limpio = match[1].replace(/\./g, "").replace(",", ".");
  const num = Number.parseFloat(limpio);
  return Number.isNaN(num) ? undefined : num;
}

export function interpretarTexto(texto: string): NecesidadesViaje {
  const t = texto.toLowerCase();

  const duracionDias = extraerNumero(t.match(/(\d+)\s*d[ií]as?/));
  const presupuestoMax = extraerNumero(
    t.match(/(\d[\d.,]*)\s*(?:€|eur\b|euros)/) ?? t.match(/(?:máximo|maximo|hasta)\s*(\d[\d.,]*)/)
  );

  const numAdultosPalabras: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4 };
  let numAdultos: number | undefined;
  const matchAdultosNum = t.match(/(\d+)\s*adult/);
  const matchAdultosPalabra = t.match(/(un|una|dos|tres|cuatro)\s*adult/);
  const matchSomos = t.match(/somos\s+(dos|tres|cuatro|\d+)/);
  if (matchAdultosNum) numAdultos = Number.parseInt(matchAdultosNum[1], 10);
  else if (matchAdultosPalabra) numAdultos = numAdultosPalabras[matchAdultosPalabra[1]];
  else if (matchSomos) numAdultos = numAdultosPalabras[matchSomos[1]] ?? Number.parseInt(matchSomos[1], 10);
  else if (/\bpareja\b|\brom[aá]ntico\b/.test(t)) numAdultos = 2;

  const edadesMenores: number[] = [];
  const regexEdadMenor = /(?:ni[ñn][ao]|hij[ao]|beb[eé])[^.]{0,15}?(\d{1,2})\s*años?/g;
  let m: RegExpExecArray | null;
  while ((m = regexEdadMenor.exec(t))) {
    edadesMenores.push(Number.parseInt(m[1], 10));
  }
  if (/beb[eé]/.test(t) && edadesMenores.length === 0) edadesMenores.push(1);

  const mascota = /\bgato\b|\bperro\b|\bmascota\b/.test(t);

  const intereses = new Set<string>();
  for (const [palabra, tag] of Object.entries(MAPA_INTERESES)) {
    if (t.includes(palabra)) intereses.add(tag);
  }

  let ritmo: RitmoViaje | undefined;
  if (/tranquil/.test(t)) ritmo = "tranquilo";
  else if (/intens|activ|aventur/.test(t)) ritmo = "intenso";

  const sinConducirMucho = /sin conducir|poco conduc|no queremos conducir|nada de conducir/.test(t);

  let climaCalido: boolean | undefined;
  if (/calor|cálido|clima calido/.test(t)) climaCalido = true;
  else if (/fr[ií]o|nieve|invierno/.test(t)) climaCalido = false;
  else if (intereses.has("playa")) climaCalido = true;

  return {
    textoOriginal: texto,
    duracionDias,
    presupuestoMax,
    numAdultos,
    edadesMenores,
    mascota,
    intereses: Array.from(intereses),
    ritmo,
    sinConducirMucho,
    climaCalido,
  };
}

export const INTERESES_SUGERIDOS = [
  "naturaleza",
  "pueblos",
  "playa",
  "aventura",
  "romantico",
  "gastronomia",
  "montana",
  "ciudad",
  "familiar",
  "cultura",
];

export interface CriterioEvaluado {
  etiqueta: string;
  cumplido: boolean;
}

export interface DestinoCompatible {
  destino: Destino;
  porcentaje: number;
  criterios: CriterioEvaluado[];
}

// Caso A de la sección 6 del prompt maestro: el viajero ya menciona un
// destino en el texto libre. Caso B (sin coincidencia): se explora por
// compatibilidad en evaluarCompatibilidad().
export function detectarDestinoExplicito(texto: string, destinos: Destino[] = DESTINOS): Destino | undefined {
  const t = texto.toLowerCase();
  return destinos.find((d) => t.includes(d.nombre.toLowerCase()) || t.includes(d.pais.toLowerCase()));
}

export function evaluarCompatibilidad(necesidades: NecesidadesViaje, destinos: Destino[] = DESTINOS): DestinoCompatible[] {
  const resultados = destinos.map((destino) => {
    const criterios: CriterioEvaluado[] = [];
    let puntosObtenidos = 0;
    let puntosPosibles = 0;

    if (necesidades.intereses.length > 0) {
      const peso = 40;
      const coincidencias = necesidades.intereses.filter((i) => destino.tags.includes(i));
      puntosPosibles += peso;
      puntosObtenidos += peso * (coincidencias.length / necesidades.intereses.length);
      for (const interes of necesidades.intereses) {
        criterios.push({ etiqueta: `Interés: ${interes}`, cumplido: destino.tags.includes(interes) });
      }
    }

    if (necesidades.presupuestoMax && necesidades.duracionDias) {
      const peso = 20;
      const estimado = destino.presupuestoDiaEstimado.medio * necesidades.duracionDias;
      puntosPosibles += peso;
      const cumplido = estimado <= necesidades.presupuestoMax;
      const casiCumplido = !cumplido && estimado <= necesidades.presupuestoMax * 1.15;
      puntosObtenidos += cumplido ? peso : casiCumplido ? peso * 0.5 : 0;
      criterios.push({
        etiqueta: `Presupuesto (~${Math.round(estimado)}€ estimados para ${necesidades.duracionDias} días vs. ${necesidades.presupuestoMax}€ máx.)`,
        cumplido,
      });
    }

    if (necesidades.mascota) {
      const peso = 15;
      puntosPosibles += peso;
      puntosObtenidos += destino.mascotaFriendly ? peso : 0;
      criterios.push({ etiqueta: "Compatible con mascota", cumplido: destino.mascotaFriendly });
    }

    if (necesidades.sinConducirMucho) {
      const peso = 10;
      puntosPosibles += peso;
      puntosObtenidos += destino.distanciaConduccionCorta ? peso : 0;
      criterios.push({ etiqueta: "Distancias cortas / sin conducir demasiado", cumplido: destino.distanciaConduccionCorta });
    }

    if (necesidades.ritmo) {
      const peso = 10;
      puntosPosibles += peso;
      const cumplido = destino.ritmo.includes(necesidades.ritmo);
      puntosObtenidos += cumplido ? peso : 0;
      criterios.push({ etiqueta: `Ritmo ${necesidades.ritmo}`, cumplido });
    }

    if (necesidades.climaCalido !== undefined) {
      const peso = 5;
      puntosPosibles += peso;
      const cumplido = destino.climaCalido === necesidades.climaCalido;
      puntosObtenidos += cumplido ? peso : 0;
      criterios.push({ etiqueta: necesidades.climaCalido ? "Clima cálido" : "Clima fresco/frío", cumplido });
    }

    const porcentaje = puntosPosibles === 0 ? 50 : Math.round((puntosObtenidos / puntosPosibles) * 100);

    return { destino, porcentaje, criterios };
  });

  return resultados.sort((a, b) => b.porcentaje - a.porcentaje);
}
