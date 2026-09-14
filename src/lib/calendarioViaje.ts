// Dos datos que cambian de verdad cómo sale un día de viaje, y que no
// estaban en ninguna fuente que ya usábamos. Ambas APIs son públicas,
// gratis y sin clave ni cuenta — igual que Wikipedia u OpenStreetMap.
//
// 1. Festivos del país (Nager.Date): un museo cerrado o un pueblo entero
//    de fiesta cambia el plan del día, y hasta ahora la app no lo sabía.
// 2. Amanecer y atardecer (sunrise-sunset.org): para el mirador, la
//    caminata o la playa, la hora de luz es el dato que decide.

export interface FestivoPais {
  fecha: string; // YYYY-MM-DD
  nombre: string;
  nombreLocal: string;
}

// Nager.Date sirve los festivos por año y país; un viaje puede cruzar el
// fin de año, así que se consultan todos los años que toque el rango.
export async function festivosEnRango(codigoPais: string, desde: string, hasta: string): Promise<FestivoPais[]> {
  if (!codigoPais || !desde || !hasta) return [];
  const añoInicio = Number(desde.slice(0, 4));
  const añoFin = Number(hasta.slice(0, 4));
  if (!Number.isFinite(añoInicio) || !Number.isFinite(añoFin)) return [];

  const años: number[] = [];
  for (let a = añoInicio; a <= añoFin && años.length < 3; a++) años.push(a);

  const porAño = await Promise.all(
    años.map(async (año) => {
      try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${año}/${codigoPais.toUpperCase()}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];
        return data.flatMap((f: unknown) => {
          const o = f as Record<string, unknown>;
          if (typeof o.date !== "string" || typeof o.name !== "string") return [];
          return [{
            fecha: o.date,
            nombre: o.name,
            // El nombre local es el que la gente del sitio va a usar y el
            // que verás en los carteles; el inglés queda de respaldo.
            nombreLocal: typeof o.localName === "string" ? o.localName : o.name,
          }];
        });
      } catch {
        return [];
      }
    })
  );

  return porAño
    .flat()
    .filter((f) => f.fecha >= desde && f.fecha <= hasta)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export interface LuzDelDia {
  amanecer: string; // "06:12"
  atardecer: string; // "18:05"
}

function horaLocal(iso: string): string | undefined {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return undefined;
  return fecha.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// formatted=0 devuelve las horas en UTC ISO, que el navegador convierte
// solo a la zona del usuario. Pedirlas ya formateadas daría una hora en
// UTC presentada como si fuera local — un error silencioso de varias
// horas justo en el dato que se usa para decidir cuándo salir.
export async function luzDelDia(lat: number, lon: number, fecha: string): Promise<LuzDelDia | undefined> {
  try {
    const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${encodeURIComponent(fecha)}&formatted=0`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return undefined;
    const data = await res.json();
    if (data?.status !== "OK") return undefined;
    const amanecer = typeof data.results?.sunrise === "string" ? horaLocal(data.results.sunrise) : undefined;
    const atardecer = typeof data.results?.sunset === "string" ? horaLocal(data.results.sunset) : undefined;
    if (!amanecer || !atardecer) return undefined;
    return { amanecer, atardecer };
  } catch {
    return undefined;
  }
}

// ── Cielo nocturno ────────────────────────────────────────────────────
// Dos datos que deciden si una noche sirve para mirar el cielo, y que no
// da ninguna otra fuente de la app.

// La luna llena arruina una noche de estrellas: con ese brillo no se ve
// la Vía Láctea ni una lluvia de meteoros. No hace falta ninguna API —
// la fase lunar es cálculo puro a partir de una luna nueva conocida y la
// duración del mes sinódico.
const LUNA_NUEVA_REFERENCIA = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
const MES_SINODICO = 29.530588853;

export interface FaseLunar {
  nombre: string;
  iluminacion: number; // 0 = luna nueva, 1 = llena
  buenaParaEstrellas: boolean;
}

export function faseLunar(fecha: string): FaseLunar | undefined {
  const dias = Date.parse(`${fecha}T00:00:00Z`) / 86400000;
  if (Number.isNaN(dias)) return undefined;
  const ciclo = (((dias - LUNA_NUEVA_REFERENCIA) / MES_SINODICO) % 1 + 1) % 1;
  // Iluminación aproximada: 0 en luna nueva, 1 en llena.
  const iluminacion = (1 - Math.cos(2 * Math.PI * ciclo)) / 2;
  // El nombre sale de la iluminación ya calculada, no de cortes fijos del
  // ciclo: el modelo es una media (las lunaciones reales varían casi un
  // día), así que con cortes fijos salía "gibosa creciente" en una noche
  // 99% iluminada, que para cualquiera es luna llena. El ciclo solo
  // decide si va creciendo o menguando.
  const creciente = ciclo < 0.5;
  const nombre =
    iluminacion >= 0.97 ? "luna llena"
    : iluminacion <= 0.03 ? "luna nueva"
    : Math.abs(iluminacion - 0.5) < 0.06 ? (creciente ? "cuarto creciente" : "cuarto menguante")
    : iluminacion > 0.5 ? (creciente ? "luna gibosa creciente" : "luna gibosa menguante")
    : creciente ? "luna creciente" : "luna menguante";
  return { nombre, iluminacion, buenaParaEstrellas: iluminacion < 0.35 };
}

export interface PronosticoAuroras {
  kpMaximo: number;
  kpNecesario: number;
  hayOportunidad: boolean;
}

// Una aurora se ve desde una latitud u otra según la actividad
// geomagnética (índice Kp): cuanto más alto el Kp, más al sur llega. La
// regla aceptada es que el óvalo auroral baja unos 2° de latitud por cada
// punto de Kp desde los ~66°. Así, en Tromsø basta con Kp bajo y en
// Berlín hace falta una tormenta fuerte.
export function kpNecesarioEn(lat: number): number {
  return Math.max(0, Math.round((66 - Math.abs(lat)) / 2));
}

// Solo tiene sentido preguntarlo donde de verdad puede pasar: por debajo
// de los 45° haría falta una tormenta histórica y anunciarlo sería
// vender humo.
export async function pronosticoAuroras(lat: number): Promise<PronosticoAuroras | undefined> {
  if (Math.abs(lat) < 45) return undefined;
  try {
    const res = await fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return undefined;
    const filas = await res.json();
    if (!Array.isArray(filas) || filas.length < 2) return undefined;
    // La primera fila son las cabeceras; el Kp va en la segunda columna.
    const valores = filas.slice(1).flatMap((f: unknown) => {
      const kp = Number((f as unknown[])?.[1]);
      return Number.isFinite(kp) ? [kp] : [];
    });
    if (valores.length === 0) return undefined;
    const kpMaximo = Math.max(...valores);
    const kpNecesario = kpNecesarioEn(lat);
    return { kpMaximo, kpNecesario, hayOportunidad: kpMaximo >= kpNecesario };
  } catch {
    return undefined;
  }
}
