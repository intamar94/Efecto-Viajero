// Mapa offline de verdad: los tiles (las imágenes del mapa) se guardan en
// el propio teléfono con la Cache Storage del navegador — no hace falta
// un service worker aparte, esta API ya está disponible en cualquier
// página normal.
//
// La política de uso de OpenStreetMap prohíbe la descarga masiva de
// tiles (bajarse una ciudad entera o varios niveles de zoom de golpe).
// Por eso esto NUNCA descarga "el mapa" en general: solo los tiles que
// de verdad hacen falta para ver los sitios de UN día concreto, en un
// rango corto de zoom (calle/barrio) — unas pocas decenas de tiles, lo
// mismo que ya se cargarían solo con mirar el mapa de ese día en el
// navegador. Con límite de tiles simultáneos, para no bombardear el
// servidor gratuito.

const NOMBRE_CACHE = "efecto-viajero-tiles-mapa-v1";
const ZOOM_MIN = 14;
const ZOOM_MAX = 16;
const CONCURRENCIA = 3;

function lonALonTile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function latALatTile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
}

function urlTile(z: number, x: number, y: number): string {
  // Sin subdominio {s}: uno solo, fijo, es más fácil de cachear y de no
  // repetir la misma tile con URLs distintas por servidor aleatorio.
  return `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

export function haySoporteMapaOffline(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

interface CoordenadaPunto {
  lat: number;
  lon: number;
}

function tilesDelArea(puntos: CoordenadaPunto[]): string[] {
  const urls = new Set<string>();
  for (let z = ZOOM_MIN; z <= ZOOM_MAX; z++) {
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of puntos) {
      const x = lonALonTile(p.lon, z);
      const y = latALatTile(p.lat, z);
      xMin = Math.min(xMin, x); xMax = Math.max(xMax, x);
      yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
    }
    // Un tile de margen alrededor para no dejar el mapa cortado justo en
    // el borde de dónde están los sitios.
    for (let x = xMin - 1; x <= xMax + 1; x++) {
      for (let y = yMin - 1; y <= yMax + 1; y++) {
        urls.add(urlTile(z, x, y));
      }
    }
  }
  return [...urls];
}

export interface ProgresoDescarga {
  hechos: number;
  total: number;
}

// Descarga y cachea los tiles de un día concreto. Devuelve cuántos se
// guardaron de verdad (los que ya estaban en caché de una visita
// anterior al mapa no cuentan como descarga nueva, pero siguen sirviendo
// offline igual).
export async function descargarMapaDelDia(
  puntos: CoordenadaPunto[],
  onProgreso?: (p: ProgresoDescarga) => void
): Promise<number> {
  if (!haySoporteMapaOffline() || puntos.length === 0) return 0;
  const cache = await caches.open(NOMBRE_CACHE);
  const urls = tilesDelArea(puntos);
  let hechos = 0;
  let nuevos = 0;

  async function descargarUno(url: string) {
    try {
      const yaEsta = await cache.match(url);
      if (!yaEsta) {
        const respuesta = await fetch(url);
        if (respuesta.ok) {
          await cache.put(url, respuesta);
          nuevos++;
        }
      }
    } catch {
      // Un tile suelto que falla no debe tumbar toda la descarga: el
      // mapa offline queda con ese hueco, pero el resto sirve igual.
    } finally {
      hechos++;
      onProgreso?.({ hechos, total: urls.length });
    }
  }

  // Unos pocos a la vez, nunca todos de golpe: es la misma cortesía que
  // ya se aplica en otras llamadas a servicios públicos gratuitos de la
  // app (Nominatim, etc.).
  for (let i = 0; i < urls.length; i += CONCURRENCIA) {
    await Promise.all(urls.slice(i, i + CONCURRENCIA).map(descargarUno));
  }
  return nuevos;
}

// Capa de Leaflet que primero mira la caché offline y solo si no
// encuentra el tile ahí pide la red — y, si la red respondió, lo deja
// guardado para la próxima vez. Sirve tanto para el mapa normal (se va
// guardando solo, sin pedir nada) como para cuando ya se descargó el día
// a propósito y no hay señal.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function crearCapaTilesConCache(L: any) {
  const cache = haySoporteMapaOffline() ? await caches.open(NOMBRE_CACHE) : null;

  const CapaConCache = L.TileLayer.extend({
    createTile(coords: { x: number; y: number; z: number }, done: (error: Error | null, tile: HTMLImageElement) => void) {
      const img = document.createElement("img");
      const url = urlTile(coords.z, coords.x, coords.y);
      img.alt = "";

      (async () => {
        try {
          const enCache = cache ? await cache.match(url) : undefined;
          if (enCache) {
            img.src = URL.createObjectURL(await enCache.blob());
            done(null, img);
            return;
          }
          // Sin caché: una sola petición de red, no dos — se guarda una
          // copia para la próxima vez y se usa la misma respuesta para
          // pintar el tile ahora.
          const respuesta = await fetch(url);
          if (!respuesta.ok) throw new Error("tile");
          if (cache) cache.put(url, respuesta.clone()).catch(() => {});
          img.src = URL.createObjectURL(await respuesta.blob());
          done(null, img);
        } catch {
          done(new Error("tile"), img);
        }
      })();

      return img;
    },
  });

  return new CapaConCache("", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  });
}
