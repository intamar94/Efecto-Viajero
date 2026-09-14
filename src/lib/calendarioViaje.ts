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
