// De unas coordenadas GPS (ya extraídas del EXIF de una foto) a un nombre
// de lugar real y legible — mismo servicio gratuito y sin clave que ya usa
// el resto de la app para geocodificar (Nominatim, lugares.ts), pero en
// sentido inverso: coordenadas → nombre, en vez de nombre → coordenadas.
//
// Nominatim pide no bombardearlo: esto se llama una vez por coordenada
// distinta (el que la importa dedupea por foto/lugar antes de llamar),
// nunca en bucle sin control.

const URL_NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

interface DireccionNominatim {
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  state?: string;
  country?: string;
}

interface RespuestaNominatimReverse {
  display_name?: string;
  address?: DireccionNominatim;
}

export interface LugarDeFoto {
  nombre: string;
  lat: number;
  lon: number;
}

export async function lugarDeCoordenadas(lat: number, lon: number, señal?: AbortSignal): Promise<LugarDeFoto | undefined> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lon),
    zoom: "14",
    addressdetails: "1",
    "accept-language": "es",
  });

  try {
    const respuesta = await fetch(`${URL_NOMINATIM_REVERSE}?${params.toString()}`, {
      signal: señal ?? AbortSignal.timeout(8000),
      headers: { Accept: "application/json", "User-Agent": "Efecto-Viajero/1.0" },
    });
    if (!respuesta.ok) return undefined;
    const datos: RespuestaNominatimReverse = await respuesta.json();
    const dir = datos.address;
    const localidad = dir?.city ?? dir?.town ?? dir?.village ?? dir?.suburb;
    const nombre = localidad && dir?.country ? `${localidad}, ${dir.country}` : datos.display_name;
    if (!nombre) return undefined;
    return { nombre, lat, lon };
  } catch {
    // Sin conexión o servicio caído: no es un error que haya que mostrar,
    // simplemente la foto se queda sin lugar identificado.
    return undefined;
  }
}

// Redondea a ~1 km: suficiente para agrupar fotos tomadas en el mismo
// sitio (o el mismo día en la misma zona) bajo una sola llamada real, en
// vez de repetir la consulta foto por foto.
export function claveDeCoordenadas(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}
