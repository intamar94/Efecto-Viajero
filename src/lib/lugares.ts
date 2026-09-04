import { CIUDADES_POR_PAIS } from "./data/ciudades";
import { DESTINOS, buscarDestinoPorId, buscarDestinoPorNombre } from "./destinos";
import { PAISES, buscarPaisPorCodigo, buscarPaisPorNombre, normalizar, type Pais } from "./paises";
import type { Destino } from "./types";

// Un lugar puede ser un país, una ciudad o un pueblo. La app antes solo
// entendía 12 nombres exactos, así que escribir "Pereira" la dejaba
// completamente vacía. Aquí se resuelve en cascada, de lo más específico
// a lo más general:
//
//   destino curado → ciudad del diccionario → país → OpenStreetMap → preguntar
//
// Los tres primeros pasos son instantáneos y funcionan sin conexión. El
// cuarto cubre el resto del planeta y es gratuito. El quinto siempre
// acierta, porque lo contesta quien de verdad lo sabe.

export type TipoLugar = "pais" | "ciudad" | "destino";

export interface LugarResuelto {
  // Lo que escribió la persona, tal cual: es su viaje y su forma de
  // llamarlo, no se sustituye por el nombre del país.
  nombre: string;
  tipo: TipoLugar;
  paisCodigo?: string;
  destinoId?: string;
  // De dónde salió el país, para poder decirlo en pantalla sin fingir
  // más certeza de la que hay.
  fuente?: "catalogo" | "diccionario" | "openstreetmap";
}

const CIUDAD_A_PAIS = new Map<string, string>();
const CIUDAD_NOMBRE = new Map<string, string>();
for (const [codigo, ciudades] of Object.entries(CIUDADES_POR_PAIS)) {
  for (const ciudad of ciudades) {
    const clave = normalizar(ciudad);
    // El primero gana: si un nombre se repite entre países, no se
    // sobrescribe en silencio.
    if (!CIUDAD_A_PAIS.has(clave)) {
      CIUDAD_A_PAIS.set(clave, codigo);
      CIUDAD_NOMBRE.set(clave, ciudad);
    }
  }
}

const PAIS_POR_CLAVE = new Map<string, Pais>();
for (const p of PAISES) {
  PAIS_POR_CLAVE.set(normalizar(p.nombre), p);
  for (const alias of p.alias ?? []) PAIS_POR_CLAVE.set(normalizar(alias), p);
}

const DESTINO_POR_CLAVE = new Map<string, Destino>();
for (const d of DESTINOS) DESTINO_POR_CLAVE.set(normalizar(d.nombre), d);

export function totalCiudadesConocidas(): number {
  return CIUDAD_A_PAIS.size;
}

// Resolución instantánea y sin conexión. Devuelve un lugar siempre que el
// texto no esté vacío; si no reconoce el país, lo deja sin definir para
// que la pantalla lo pregunte o lo busque en OpenStreetMap.
export function resolverLugar(texto: string): LugarResuelto | undefined {
  const nombre = texto.trim();
  if (!nombre) return undefined;
  const clave = normalizar(nombre);

  const destino = buscarDestinoPorNombre(nombre);
  if (destino) return { nombre, tipo: "destino", paisCodigo: destino.paisCodigo, destinoId: destino.id, fuente: "catalogo" };

  const pais = buscarPaisPorNombre(nombre);
  if (pais) return { nombre, tipo: "pais", paisCodigo: pais.codigo, fuente: "diccionario" };

  const codigoCiudad = CIUDAD_A_PAIS.get(clave);
  if (codigoCiudad) return { nombre, tipo: "ciudad", paisCodigo: codigoCiudad, fuente: "diccionario" };

  return { nombre, tipo: "ciudad" };
}

// Respaldo gratuito para el resto del mundo: Nominatim, el buscador de
// OpenStreetMap. Sin clave, sin coste y con cobertura de cualquier aldea
// del planeta.
//
// Su política de uso pide no bombardearlo: por eso esto se llama bajo
// demanda (cuando la persona termina de escribir una parada que no
// reconocemos), nunca en cada tecla ni en bucle. Si falla, no pasa nada:
// se cae al paso de preguntar el país, que no necesita internet.
const URL_NOMINATIM = "https://nominatim.openstreetmap.org/search";

export const ATRIBUCION_OSM = "Búsqueda de lugares © colaboradores de OpenStreetMap";

interface RespuestaNominatim {
  name?: string;
  display_name?: string;
  address?: { country_code?: string };
}

export async function resolverLugarRemoto(texto: string, señal?: AbortSignal): Promise<LugarResuelto | undefined> {
  const nombre = texto.trim();
  if (!nombre) return undefined;

  const params = new URLSearchParams({
    q: nombre,
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    "accept-language": "es",
  });

  try {
    const respuesta = await fetch(`${URL_NOMINATIM}?${params.toString()}`, { signal: señal, headers: { Accept: "application/json" } });
    if (!respuesta.ok) return undefined;
    const datos: RespuestaNominatim[] = await respuesta.json();
    const primero = datos[0];
    const codigo = primero?.address?.country_code?.toUpperCase();
    // Solo sirve si además tenemos ficha de ese país: si no, devolver el
    // código no aportaría nada y daría falsa sensación de acierto.
    if (!codigo || !buscarPaisPorCodigo(codigo)) return undefined;
    return { nombre, tipo: "ciudad", paisCodigo: codigo, fuente: "openstreetmap" };
  } catch {
    // Sin conexión, bloqueado o caído: no es un error del que haya que
    // informar, simplemente se pregunta el país.
    return undefined;
  }
}

// Varias paradas dentro de una misma frase, para los viajes de circuito:
// "de Colombia a Perú pasando por Ecuador" o "Cusco, La Paz y Uyuni".
//
// Barrido por n-gramas en vez de una expresión regular por ciudad: con
// miles de entradas, lo segundo significaba miles de pasadas sobre el
// texto. Así se recorre el texto UNA vez, probando de 4 palabras a 1, y
// el nombre más largo gana ("Ciudad de Panamá" antes que "Panamá").
const MAX_PALABRAS = 4;

export function detectarLugaresEnTexto(texto: string): LugarResuelto[] {
  const normalizado = normalizar(texto);
  const palabras = normalizado.split(/[^a-z0-9'’-]+/).filter(Boolean);
  const encontrados: LugarResuelto[] = [];
  const yaVisto = new Set<string>();

  let i = 0;
  while (i < palabras.length) {
    let avance = 1;

    for (let n = Math.min(MAX_PALABRAS, palabras.length - i); n >= 1; n--) {
      const clave = palabras.slice(i, i + n).join(" ");

      const destino = DESTINO_POR_CLAVE.get(clave);
      const pais = PAIS_POR_CLAVE.get(clave);
      const ciudad = CIUDAD_A_PAIS.get(clave);
      if (!destino && !pais && !ciudad) continue;

      if (!yaVisto.has(clave)) {
        yaVisto.add(clave);
        if (destino) {
          encontrados.push({ nombre: destino.nombre, tipo: "destino", paisCodigo: destino.paisCodigo, destinoId: destino.id, fuente: "catalogo" });
        } else if (ciudad) {
          // La ciudad manda sobre el país cuando el nombre coincide con
          // ambos (Guatemala, Panamá, Singapur...): quien escribe el
          // nombre de una ciudad quiere esa ciudad.
          encontrados.push({ nombre: CIUDAD_NOMBRE.get(clave) ?? clave, tipo: "ciudad", paisCodigo: ciudad, fuente: "diccionario" });
        } else if (pais) {
          encontrados.push({ nombre: pais.nombre, tipo: "pais", paisCodigo: pais.codigo, fuente: "diccionario" });
        }
      }

      avance = n;
      break;
    }

    i += avance;
  }

  return encontrados;
}

export function paisDeLugar(lugar?: { paisCodigo?: string }): Pais | undefined {
  return buscarPaisPorCodigo(lugar?.paisCodigo);
}

export function destinoDeLugar(lugar?: { destinoId?: string; nombre?: string }): Destino | undefined {
  if (!lugar) return undefined;
  return buscarDestinoPorId(lugar.destinoId) ?? (lugar.nombre ? buscarDestinoPorNombre(lugar.nombre) : undefined);
}
