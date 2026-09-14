"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { EventosEstacionalesDestino } from "@/components/EventosEstacionalesDestino";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { actividadesDe, urlBuscarActividad, urlMapsActividad, platosTipicosDe } from "@/lib/catalogo";
import { destinoParaCatalogo, destinoPrincipal, etapasDe, paisDeEtapa } from "@/lib/viaje";
import { obtenerGuiaWikivoyage, VERSION_WIKIVOYAGE, type TipoListingWikivoyage } from "@/lib/wikivoyage";
import { obtenerResumenLugar, obtenerResumenSitio, type ResumenWikipedia } from "@/lib/wikipedia";
import { entornoCercanoDe } from "@/lib/entornoCercano";
import { buscarEnLaWeb, describirResultadoWeb, type ResultadoBusquedaWeb } from "@/lib/busquedaWeb";
import { enriquecerLugar, hayFuentesComerciales } from "@/lib/enriquecimiento";
import { descubrirLugaresCercanos, VERSION_DESCUBRIMIENTO } from "@/lib/descubrimientoWikidata";
import { interpretarIntencion } from "@/lib/intencion";
import { slug } from "@/lib/puntosGeo";
import { distanciaMetros, formatearDistancia } from "@/lib/geoAudio";
import { acortarTexto } from "@/lib/texto";
import { refrescarAnalisis } from "@/lib/viajes/refrescar-analisis";
import { VERSION_INVESTIGACION, VERSION_ENRIQUECIMIENTO_SITIO, esCadenaConocida, type Investigacion, type SitioReal } from "@/lib/investigacion";
import type { ActividadDestino, CategoriaActividad, EstadoActividad, Etapa } from "@/lib/types";

const ETIQUETA_ESTADO: Record<EstadoActividad, string> = {
  disponible: "Disponible",
  planificada: "En tu itinerario",
  reservada: "Reservada",
  realizada: "Realizada",
  descartada: "Descartada",
};

const ESTILO_ESTADO: Record<EstadoActividad, string> = {
  disponible: "bg-neutral-100 text-neutral-600",
  planificada: "bg-marino-100 text-marino-800",
  reservada: "bg-coral-100 text-coral-700",
  realizada: "bg-emerald-50 text-emerald-700",
  descartada: "bg-neutral-100 text-neutral-400",
};

const ETIQUETA_CATEGORIA: Record<CategoriaActividad, { etiqueta: string; icono: string }> = {
  museo: { etiqueta: "Museos y cultura", icono: "🏛️" },
  parque: { etiqueta: "Parques y paseos", icono: "🌳" },
  restaurante: { etiqueta: "Restaurantes típicos", icono: "🍽️" },
  cine_teatro: { etiqueta: "Cine y teatro", icono: "🎭" },
  discoteca: { etiqueta: "Fiesta", icono: "🎶" },
  compras: { etiqueta: "Compras", icono: "🛍️" },
  naturaleza: { etiqueta: "Naturaleza", icono: "🌿" },
  playa: { etiqueta: "Playa", icono: "🏖️" },
  pueblos: { etiqueta: "Pueblos cercanos", icono: "🏘️" },
  aventura: { etiqueta: "Aventura y deporte", icono: "🪂" },
  bienestar: { etiqueta: "Termales y bienestar", icono: "💆" },
  todos: { etiqueta: "Planes para todos", icono: "🎡" },
  experiencias: { etiqueta: "Experiencias locales", icono: "🎒" },
  otro: { etiqueta: "Otros planes", icono: "✨" },
};

// Frase de búsqueda real para cuando OpenStreetMap no tiene NADA mapeado
// de esta categoría en la ciudad (pasa sobre todo con vida nocturna: los
// bares/discotecas reales rara vez están bien etiquetados en OSM fuera de
// las grandes capitales). En vez de resignarse a la idea genérica del
// catálogo, se prueba una búsqueda web real con el mismo buscador que ya
// se usa por sitio — así Cali (famosa por su vida nocturna) puede mostrar
// discotecas reales encontradas en blogs, en vez de solo "idea orientativa".
const CONSULTA_WEB_CATEGORIA: Record<CategoriaActividad, string> = {
  museo: "mejores museos",
  parque: "parques imprescindibles",
  restaurante: "restaurantes típicos recomendados",
  cine_teatro: "cines y teatros",
  discoteca: "mejores discotecas y bares de rumba",
  compras: "mejores lugares para comprar",
  naturaleza: "naturaleza y senderos",
  playa: "mejores playas",
  pueblos: "pueblos cercanos que visitar",
  aventura: "deportes de aventura y adrenalina",
  bienestar: "termales y spa",
  todos: "planes para toda la familia",
  experiencias: "tours y experiencias locales",
  otro: "planes turísticos recomendados",
};

// Un punto de referencia real ("~800 m del centro") ayuda mucho más que
// una dirección suelta a decidir si vale la pena ir — pero solo cuando de
// verdad sabemos dónde está el centro de la ciudad (etapa.lat/lon, que se
// guarda desde /planificar; los viajes creados antes de esto no lo
// tienen, y entonces no se muestra nada en vez de adivinar).
function distanciaDelCentro(etapa: Etapa, lat?: number, lon?: number): string | undefined {
  if (etapa.lat === undefined || etapa.lon === undefined || lat === undefined || lon === undefined) return undefined;
  const metros = distanciaMetros(etapa.lat, etapa.lon, lat, lon);
  if (metros < 150) return "En el centro";
  return `${formatearDistancia(metros)} del centro`;
}

// Prioridad de fuentes para describir un sitio real, de la más a la
// menos fiable: su propio artículo de Wikipedia > qué hay de verdad
// alrededor (OSM) > un fragmento real de una búsqueda web (blogs,
// reseñas) > solo la categoría, sin relleno, si ninguna tuvo nada. Cada
// nivel es una cadena vacía "" cuando ya se buscó y no había nada (no
// undefined, que significa "todavía no se buscó") — por eso se
// comprueba explícito nivel por nivel en vez de encadenar "||", que
// saltaría un nivel real pero vacío como si no existiera.
// Nombres típicos de eventos/festivales (no lugares fijos) que a veces
// aparecen como listings "do" de Wikivoyage — se filtran de la grilla de
// sitios reales, ver el comentario donde se usa.
const PARECE_EVENTO = /\b(festival|feria|carnaval|bienal|maratón|maraton|concurso|congreso|cumbre|mundial de|copa (mundial|américa|america)|semana santa|temporada de)\b/i;

function descripcionDeSitio(s: SitioReal): string {
  if (s.resumenWikipedia) return s.resumenWikipedia;
  // La cocina real (cuando OpenStreetMap la trae etiquetada) es justo lo
  // que hace falta para decidir un restaurante — "Restaurante." solo no
  // dice si es de carnes, mariscos o comida colombiana. Se suma a la
  // categoría base, nunca se inventa si el dato no está.
  const categoriaLabel = s.detalle ? `${s.detalle[0].toUpperCase()}${s.detalle.slice(1)}.` : "Lugar cercano.";
  const base = s.cocina ? `${categoriaLabel} Cocina: ${s.cocina}.` : categoriaLabel;
  if (s.entornoCercano) return `${base} ${s.entornoCercano}`;
  if (s.resumenWeb) return `${base} ${s.resumenWeb}`;
  return base;
}

// Lo que cada categoría promete, en un lenguaje que invita en vez de
// describir con frialdad: se usa para presentar la ciudad conectando lo
// que el viajero pidió al crear el viaje (o lo que de verdad encontramos)
// con la emoción de ir a descubrirlo, no solo el dato duro de Wikipedia.
// Sin "y" dentro de cada frase: al combinar dos categorías con el
// conector de fraseDeseo ("A y B"), una frase que ya trae su propio "y"
// da una doble conjunción rara de leer ("su historia y su cultura y su
// gastronomía").
const DESEO_CATEGORIA: Partial<Record<CategoriaActividad, string>> = {
  museo: "su patrimonio cultural",
  restaurante: "su gastronomía",
  cine_teatro: "su escena cultural",
  discoteca: "su vida nocturna",
  compras: "su artesanía local",
  naturaleza: "su naturaleza",
  playa: "sus playas",
  pueblos: "los pueblos de alrededor",
};

function fraseDeseo(categorias: CategoriaActividad[]): string {
  const frases = categorias.map((c) => DESEO_CATEGORIA[c]).filter((f): f is string => Boolean(f));
  if (frases.length === 0) return "todo lo que tiene para descubrir";
  if (frases.length === 1) return frases[0];
  return `${frases.slice(0, -1).join(", ")} y ${frases[frases.length - 1]}`;
}

// Nombrar algo genérico como "especial" no convence a nadie: lo que de
// verdad da sensación de viaje hecho a la medida es citar sitios reales
// que ya encontramos en ESA ciudad (nunca una idea orientativa del
// catálogo). Para restaurantes se evita destacar una cadena de comida
// rápida o café — real, pero no lo que alguien imagina al pensar en "una
// experiencia gastronómica inolvidable" en un destino nuevo.
function nombresDestacadosDe(items: Item[], categoria: CategoriaActividad): string[] {
  const reales = items.filter((it) => it.categoria === categoria && !it.esGenerica);
  const preferidos = categoria === "restaurante" ? reales.filter((it) => !it.cadenaGenerica) : reales;
  const elegidos = preferidos.length > 0 ? preferidos : reales;
  return elegidos.map((it) => it.nombre).slice(0, 2);
}

function fraseEjemplo(nombresReales: string[], pais: string | undefined, ciudad: string): string {
  if (nombresReales.length > 0) return ` Como ${nombresReales.join(" o ")}.`;
  // Sin un sitio real todavía para presumir, un plato típico real de la
  // ciudad (o del país, si no hay uno propio de esta ciudad) da algo
  // concreto igual — pero solo el nombre no basta: decir de qué se trata
  // es lo que hace sentir que vale la pena probarlo, no solo un nombre
  // suelto.
  if (!pais) return "";
  const sabores = platosTipicosDe(pais, ciudad);
  if (sabores.length === 0) return "";
  const [primero, segundo] = sabores;
  // Solo la primera letra en minúscula (para que fluya tras el guion): en
  // minúscula la frase entera también convertía nombres propios como
  // "Portugal" en "portugal".
  const sinPunto = primero.descripcion.replace(/\.$/, "");
  const detalle = sinPunto.charAt(0).toLowerCase() + sinPunto.slice(1);
  return segundo ? ` Prueba ${primero.nombre} — ${detalle} — o ${segundo.nombre}.` : ` Prueba ${primero.nombre}: ${detalle}.`;
}

// Tres tonos simples según lo que de verdad promete la ciudad (naturaleza,
// cultura, o sin un tema claro todavía): no inventa nada sobre el lugar,
// solo cambia cómo se presenta lo que ya sabemos que hay. Sin repetir el
// nombre de la ciudad: ya aparece justo arriba, en la cabecera de la
// tarjeta y otra vez al inicio del resumen de Wikipedia que sigue debajo
// — nombrarla una tercera vez aquí era la redundancia que se notaba.
function fraseInspiradora(etapaNombre: string, categorias: CategoriaActividad[], nombresReales: string[], pais: string | undefined): string {
  const top = categorias.slice(0, 2);
  const deseo = fraseDeseo(top);
  const ejemplo = fraseEjemplo(nombresReales, pais, etapaNombre);
  if (top.some((c) => c === "naturaleza" || c === "playa")) {
    return `🌴 Puede ser tu propio paraíso — con ${deseo} esperándote.${ejemplo}`;
  }
  if (top.some((c) => c === "museo" || c === "cine_teatro")) {
    return `🏛️ Una joya por descubrir, con ${deseo} a tu alcance.${ejemplo}`;
  }
  if (top.length > 0) {
    return `✨ Tiene ${deseo} esperando a que lo vivas.${ejemplo}`;
  }
  return `✨ Prepárate para descubrir ${etapaNombre}.`;
}

const ORDEN_CATEGORIAS: CategoriaActividad[] = [
  "museo",
  "parque",
  "restaurante",
  "cine_teatro",
  "discoteca",
  "compras",
  "naturaleza",
  "playa",
  "pueblos",
  "aventura",
  "bienestar",
  "todos",
  "experiencias",
  "otro",
];

// "sleep" (alojamiento) no cuenta aquí: eso ya lo cubre la sección de
// Alojamiento, no tiene sentido como "actividad".
const CATEGORIA_DE_LISTING: Partial<Record<TipoListingWikivoyage, CategoriaActividad>> = {
  see: "museo",
  do: "otro",
  buy: "compras",
  eat: "restaurante",
  drink: "discoteca",
};

type Item = ActividadDestino & {
  esPropia: boolean;
  esSitioReal?: boolean;
  esGenerica?: boolean;
  fuenteEtiqueta?: string;
  etapaId: string;
  etapaNombre: string;
  pais?: string;
  notaPrecio?: string;
  horario?: string;
  direccion?: string;
  mapaUrl?: string;
  webUrl?: string;
  webEsDirecta?: boolean;
  // Cadena de comida rápida o café (McDonald's, Burger King, Starbucks...):
  // real, pero no lo que alguien busca al pedir "comida típica" o
  // "gastronomía local" — se guarda aparte de la descripción (que ahora es
  // una frase, no la palabra suelta) para poder filtrarlas sin depender de
  // cómo esté redactado el texto que ve el usuario.
  cadenaGenerica?: boolean;
  // Cocina local/regional real (según la etiqueta de OpenStreetMap): la
  // caja se llama "Restaurantes típicos", así que un sitio con cocina
  // local confirmada debería verse ANTES que uno de cocina genérica sin
  // dato — nunca se asume que algo ES típico sin la etiqueta real.
  cocinaLocal?: boolean;
  imagen?: string;
  accesible?: "si" | "parcial" | "no";
};

const COCINAS_LOCALES = new Set(["colombiana", "regional", "local", "latinoamericana", "arepas", "empanadas"]);

// Insignia de progreso por ciudad: sencilla, sin más objetivo que hacer
// visible el avance de un vistazo, como una barra de nivel.
function medalla(n: number): string {
  if (n >= 6) return "🥇";
  if (n >= 3) return "🥈";
  if (n >= 1) return "🥉";
  return "";
}

// Una sola tarjeta de actividad, reutilizada tanto en el listado por
// ciudad/categoría como en los resultados de la búsqueda por intención:
// antes eran dos bloques de JSX casi idénticos.
function TarjetaActividad({ it, estado, onCambiarEstado }: { it: Item; estado: EstadoActividad; onCambiarEstado: (e: EstadoActividad | null) => void }) {
  return (
    <li className="overflow-hidden rounded-lg bg-neutral-50">
      {/* Una foto real del sitio dice más que tres líneas de texto para
          decidir si te apetece ir. Sale del artículo de Wikipedia del
          propio lugar, así que solo aparece cuando de verdad existe —
          nunca una imagen genérica de relleno. */}
      {it.imagen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={it.imagen} alt={it.nombre} loading="lazy" className="h-32 w-full object-cover" />
      )}
      <div className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{it.nombre}</p>
          <p className="text-xs text-neutral-500">{it.descripcion}</p>
        </div>
        {/* "Disponible" es el estado por defecto de todo lo que se
            muestra: decirlo en cada tarjeta era obvio y redundante — la
            insignia solo aporta algo para un estado que sí cambió. */}
        {estado !== "disponible" && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTILO_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {it.duracionHoras > 0 && <span className="chip">⏱️ {it.duracionHoras}h</span>}
        {it.notaPrecio ? (
          <span className="chip">💵 {it.notaPrecio}</span>
        ) : it.esSitioReal ? (
          <span className="chip">💵 Consultar precio</span>
        ) : (
          <span className="chip">{it.costeEstimado > 0 ? `💵 ${it.costeEstimado}€` : "🆓 Gratis"}</span>
        )}
        {it.admiteMascotas && <span className="chip">🐾 Mascotas</span>}
        {/* Solo cuando OpenStreetMap lo dice de verdad: sin etiqueta no
            se muestra nada, porque "no sabemos" no es "no accesible". */}
        {it.accesible === "si" && <span className="chip">♿ Accesible</span>}
        {it.accesible === "parcial" && <span className="chip">♿ Parcialmente accesible</span>}
        {it.accesible === "no" && <span className="chip">♿ No accesible</span>}
        {it.esPropia && <span className="chip">✍️ Tuya</span>}
      </div>

      {/* El horario va en su propia línea, no como una etiqueta más: un
          horario con varios días distintos es demasiado texto para una
          píldora de una sola línea — ahí se ve todo apretado y mezclado. */}
      {(it.horario || it.horarioHabitual) && (
        <p className="mt-1.5 text-xs text-neutral-600">🕐 {it.horario ?? it.horarioHabitual}</p>
      )}

      {it.esGenerica && (
        <p className="mt-2 text-xs text-amber-700">
          💡 Idea orientativa, no un lugar concreto — el coste es una referencia, no un precio real.
        </p>
      )}

      {it.direccion && <p className="mt-2 text-xs text-neutral-500">📍 {it.direccion}</p>}

      {it.consejo && <p className="mt-2 text-xs text-neutral-500">💡 {it.consejo}</p>}

      {/* Antes solo se mostraba para el catálogo genérico (esSitioReal
          false): un restaurante REAL encontrado en OpenStreetMap se
          quedaba sin ninguna sugerencia de qué pedir, que es justo el
          dato que más se pidió — un plato típico real no depende de si
          el restaurante en sí es genérico o real, así que se muestra
          para los dos. */}
      {it.categoria === "restaurante" && it.pais && platosTipicosDe(it.pais, it.etapaNombre).length > 0 && (
        <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2">
          <p className="text-xs font-medium text-amber-800">🍴 Si no sabes qué pedir, prueba:</p>
          <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
            {platosTipicosDe(it.pais, it.etapaNombre).map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.nombre}</span> — {s.descripcion}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap gap-2">
        {/* Para una idea genérica (sin lugar real detrás) no se ofrece un
            "buscar en Google" ni un mapa de búsqueda: eso es mandar al
            usuario a averiguarlo por su cuenta en vez de darle información
            completa. Mapa y web solo aparecen cuando hay un lugar real. */}
        {!it.esGenerica && it.mapaUrl && (
          <a href={it.mapaUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:border-marino-500">
            📍 Mapa
          </a>
        )}
        {!it.esGenerica && it.webUrl && it.webEsDirecta && (
          <a href={it.webUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1.5 rounded-lg bg-marino-50 border border-marino-200 text-marino-700 hover:bg-marino-100">
            🔗 Sitio web
          </a>
        )}
        {estado === "disponible" && (
          <button onClick={() => onCambiarEstado("planificada")} className="btn-primary px-2.5 py-1 text-xs shadow-none">
            + Añadir
          </button>
        )}
        {(estado === "planificada" || estado === "reservada") && (
          <>
            {estado === "planificada" && (
              <button onClick={() => onCambiarEstado("reservada")} className="btn-secondary px-3 py-1.5 text-xs">
                Reservada
              </button>
            )}
            <button onClick={() => onCambiarEstado("realizada")} className="btn-secondary px-3 py-1.5 text-xs">
              Ya la hicimos
            </button>
            <button onClick={() => onCambiarEstado(null)} className="px-2 py-1.5 text-xs text-neutral-400 hover:text-red-600">
              Quitar
            </button>
          </>
        )}
        {estado === "realizada" && (
          <button onClick={() => onCambiarEstado("planificada")} className="px-2 py-1.5 text-xs text-neutral-400 hover:text-neutral-900">
            Deshacer
          </button>
        )}
      </div>
      </div>
    </li>
  );
}

export default function ActividadesPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);
  const destino = viaje ? destinoPrincipal(viaje) : undefined;

  const [adaptacion, setAdaptacion] = useState<"lluvia" | "cansancio" | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [errorRefresco, setErrorRefresco] = useState<string | null>(null);
  const [etapasAbiertas, setEtapasAbiertas] = useState<Set<string>>(new Set());
  const [formEtapaId, setFormEtapaId] = useState<string | null>(null);
  const [nombreNueva, setNombreNueva] = useState("");
  const [horasNueva, setHorasNueva] = useState("");
  const [costeNueva, setCosteNueva] = useState("");
  const [categoriaNueva, setCategoriaNueva] = useState<CategoriaActividad>("otro");
  const [entornoNueva, setEntornoNueva] = useState<"exterior" | "interior" | "mixto">("exterior");
  const [mascotaNueva, setMascotaNueva] = useState(false);
  const [estadoWikivoyage, setEstadoWikivoyage] = useState<Record<string, "cargando" | "sin_datos" | "listo">>({});
  const [resumenCiudad, setResumenCiudad] = useState<Record<string, ResumenWikipedia | "cargando" | "sin_datos">>({});
  // Por ciudad: qué categoría está seleccionada, si alguna.
  const [categoriasBuscadasPorEtapa, setCategoriasBuscadasPorEtapa] = useState<Record<string, CategoriaActividad[] | null>>({});
  // Por ciudad+categoría (clave "etapaId:categoria"): resultado de la
  // búsqueda web de respaldo, solo para cuando esa categoría no tiene
  // NINGÚN sitio real de OpenStreetMap en esta ciudad.
  const [busquedaWebCategoria, setBusquedaWebCategoria] = useState<Record<string, ResultadoBusquedaWeb[] | "cargando" | "sin_datos">>({});

  // Investigación bajo demanda: al abrir Actividades, se busca la guía
  // Wikivoyage de cada ciudad que aún no la tenga guardada. Una sola vez
  // por ciudad — luego queda en el propio viaje y funciona sin conexión.
  // Va antes del "if (!viaje)" porque los hooks no pueden depender de una
  // condición: en la primera carga viaje aún no está hidratado.
  //
  // El estado de carga se muestra en pantalla (no solo en consola): antes,
  // si Wikivoyage no encontraba nada para una ciudad, la sección se quedaba
  // en silencio y parecía que la app no había cambiado nada.
  useEffect(() => {
    if (!viaje) return;
    let cancelado = false;
    (async () => {
      // Acumulador local: si se lee `viaje.wikivoyage` desde el cierre del
      // efecto en cada vuelta, ese valor queda congelado en lo que había
      // ANTES de que arrancara el bucle. En un circuito de varias ciudades,
      // cada `actualizarViaje` pisaba entero el objeto con esa foto vieja y
      // borraba lo que la ciudad anterior acababa de guardar en la misma
      // pasada — al terminar solo sobrevivía la última ciudad procesada.
      let acumulado: NonNullable<typeof viaje.wikivoyage> = { ...viaje.wikivoyage };
      for (const etapa of etapasDe(viaje)) {
        // Una guía guardada con una versión anterior (de antes de que
        // existiera la traducción automática, por ejemplo) se vuelve a
        // buscar — si no, un viaje ya creado se quedaría con el inglés sin
        // traducir para siempre, aunque el código ya sepa traducirlo.
        if (acumulado[etapa.nombre] && acumulado[etapa.nombre].version === VERSION_WIKIVOYAGE) {
          setEstadoWikivoyage((prev) => ({ ...prev, [etapa.nombre]: "listo" }));
          continue;
        }
        setEstadoWikivoyage((prev) => ({ ...prev, [etapa.nombre]: "cargando" }));
        try {
          const guia = await obtenerGuiaWikivoyage(
            etapa.nombre,
            paisDeEtapa(etapa)?.nombre,
            etapa.lat !== undefined && etapa.lon !== undefined ? { lat: etapa.lat, lon: etapa.lon } : undefined
          );
          if (cancelado) return;
          if (guia) {
            // Un refresco (p. ej. para traducir una guía vieja) nunca debe
            // dejar la ciudad con MENOS de lo que ya tenía: si esta pasada
            // trajo menos lugares que la guardada, algo salió peor de lo
            // normal (un artículo distinto, una respuesta parcial) — se
            // conserva la lista de lugares anterior, ya real y completa,
            // y solo se actualiza la versión para no reintentar sin fin.
            const anterior = acumulado[etapa.nombre];
            const guiaFinal = anterior && anterior.listings.length > guia.listings.length ? { ...guia, listings: anterior.listings } : guia;
            acumulado = { ...acumulado, [etapa.nombre]: guiaFinal };
            actualizarViaje(viaje.id, { wikivoyage: acumulado });
            setEstadoWikivoyage((prev) => ({ ...prev, [etapa.nombre]: "listo" }));
          } else {
            setEstadoWikivoyage((prev) => ({ ...prev, [etapa.nombre]: "sin_datos" }));
          }
        } catch (err) {
          // Una ciudad con datos raros no debe tirar abajo el resto: se
          // marca sin datos y se sigue con la siguiente etapa.
          console.warn(`Wikivoyage: error inesperado procesando "${etapa.nombre}"`, err);
          if (!cancelado) setEstadoWikivoyage((prev) => ({ ...prev, [etapa.nombre]: "sin_datos" }));
        }
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id]);

  // "Sobre esta ciudad": un resumen real (Wikipedia, sin clave) para
  // invitar a descubrir el lugar al abrir su tarjeta, en vez de que la
  // pantalla sea solo botones y enlaces.
  useEffect(() => {
    if (!viaje) return;
    let cancelado = false;
    (async () => {
      for (const etapa of etapasDe(viaje)) {
        if (resumenCiudad[etapa.nombre]) continue;
        setResumenCiudad((prev) => ({ ...prev, [etapa.nombre]: "cargando" }));
        // Las coordenadas reales de la ciudad (si el viaje las tiene)
        // desambiguan mejor que ningún nombre ni país: preguntan
        // directamente qué artículo hay geolocalizado ahí. El país como
        // contexto de texto queda de respaldo para viajes sin coordenadas
        // guardadas o cuando la búsqueda por coordenadas no encuentra nada
        // que coincida de nombre.
        const resumen = await obtenerResumenLugar(
          etapa.nombre,
          undefined,
          paisDeEtapa(etapa)?.nombre,
          etapa.lat !== undefined && etapa.lon !== undefined ? { lat: etapa.lat, lon: etapa.lon } : undefined
        );
        if (cancelado) return;
        setResumenCiudad((prev) => ({ ...prev, [etapa.nombre]: resumen ?? "sin_datos" }));
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id]);

  // Un sitio real conocido (un parque grande, un museo, un monumento, hasta
  // un bar histórico) a veces tiene su propio artículo de Wikipedia — con
  // lo que de verdad hay ahí (aves, una escultura, su historia), mucho más
  // que la categoría sola ("Parque." / "Atracción."). Se guarda en el
  // propio viaje una sola vez por sitio para no repetir la búsqueda.
  //
  // Se prueba para CUALQUIER categoría de sitio real, no solo naturaleza o
  // museos: restringirlo por categoría hacía que la riqueza de una tarjeta
  // dependiera de en qué cajón cayó el sitio (una atracción histórica sin
  // categoría reconocida quedaba tan vacía como un bar cualquiera), no de
  // si de verdad hay algo que contar. El costo de intentarlo y no
  // encontrar nada es solo una búsqueda de más (se cachea igual, no se
  // repite); el beneficio es no dejar sitios con contenido real (una
  // ciudad amurallada, la casa de un prócer...) mostrando solo su
  // etiqueta genérica por casualidad de categorización.
  //
  // Cuando NO hay artículo (el caso más común: parques chicos, plazas...),
  // en vez de resignarse a la categoría sola se cruza con otra fuente real
  // — OpenStreetMap, qué hay literalmente alrededor del punto (bancos,
  // heladería, baños...) — para dar algo concreto y accionable sin que el
  // viajero tenga que buscarlo por su cuenta. Nunca se inventa nada: si
  // ninguna fuente tiene nada, se queda con la categoría, como antes.
  useEffect(() => {
    if (!viaje) return;
    let cancelado = false;
    (async () => {
      let investigacionActual = viaje.investigacion;
      for (const etapa of etapasDe(viaje)) {
        const sitios = investigacionActual?.sitios?.[etapa.nombre];
        if (!sitios?.length) continue;
        let huboCambios = false;
        const actualizados: SitioReal[] = [];
        for (const s of sitios) {
          let siguiente = s;
          // Reintenta si nunca se buscó, o si se buscó con una versión
          // anterior de la estrategia de búsqueda (p. ej. antes de sumar
          // las coordenadas reales del sitio): un "" viejo no debe quedar
          // marcado como "ya buscado" para siempre si la forma de buscar
          // mejoró después.
          if (siguiente.resumenWikipedia === undefined || siguiente.versionResumen !== VERSION_ENRIQUECIMIENTO_SITIO) {
            const resumen = await obtenerResumenSitio(
              siguiente.nombre,
              etapa.nombre,
              siguiente.lat !== undefined && siguiente.lon !== undefined ? { lat: siguiente.lat, lon: siguiente.lon } : undefined,
              { wikipedia: siguiente.enlaceWikipedia, wikidata: siguiente.enlaceWikidata },
              200
            );
            if (cancelado) return;
            huboCambios = true;
            siguiente = {
              ...siguiente,
              resumenWikipedia: resumen?.extracto ?? "",
              // La foto viene en la MISMA respuesta que el resumen: se
              // guarda aquí para no pedirla aparte.
              imagen: resumen?.imagen ?? "",
              versionResumen: VERSION_ENRIQUECIMIENTO_SITIO,
            };
          }
          // Sin artículo propio: qué hay de verdad cerca, según OSM. Un
          // fallo de red (entornoCercanoDe lanza en ese caso) se deja tal
          // cual está — no se marca como "ya buscado y vacío" — para poder
          // reintentar en una próxima visita en vez de perder el dato para siempre.
          if (!siguiente.resumenWikipedia && siguiente.entornoCercano === undefined && siguiente.lat !== undefined && siguiente.lon !== undefined) {
            try {
              const entorno = await entornoCercanoDe(siguiente.lat, siguiente.lon);
              if (cancelado) return;
              huboCambios = true;
              siguiente = { ...siguiente, entornoCercano: entorno ?? "" };
            } catch {
              if (cancelado) return;
            }
          }
          // Último recurso: ni Wikipedia ni lo que hay alrededor tuvieron
          // nada. Una búsqueda web real (blogs, reseñas — cuando está
          // configurada; si no, buscarEnLaWeb simplemente no devuelve
          // nada y esto no cambia el comportamiento de siempre) puede
          // tener lo que ninguna fuente estructurada tenía.
          if (!siguiente.resumenWikipedia && !siguiente.entornoCercano && siguiente.resumenWeb === undefined) {
            const resultados = await buscarEnLaWeb(siguiente.nombre, etapa.nombre);
            if (cancelado) return;
            huboCambios = true;
            const conFragmento = resultados.find((r) => r.fragmento);
            siguiente = { ...siguiente, resumenWeb: (conFragmento && describirResultadoWeb(conFragmento)) || "" };
          }
          // Horario y precio reales (Foursquare/Yelp) para los sitios a
          // los que OpenStreetMap no se los puso — que es la mayoría, y
          // es justo el dato que hace falta para decidir si ir. Solo se
          // pregunta si esas fuentes están configuradas; si no lo están,
          // hayFuentesComerciales() lo sabe tras la primera respuesta y
          // no se vuelve a preguntar por cada sitio.
          if (
            siguiente.lat !== undefined &&
            siguiente.lon !== undefined &&
            siguiente.horarioComercial === undefined &&
            (!siguiente.horarioApertura || !siguiente.precioAprox) &&
            hayFuentesComerciales()
          ) {
            const datos = await enriquecerLugar({
              nombre: siguiente.nombre,
              lat: siguiente.lat,
              lon: siguiente.lon,
              categoria: siguiente.categoria,
              ciudad: etapa.nombre,
            });
            if (cancelado) return;
            if (hayFuentesComerciales()) {
              huboCambios = true;
              // Foursquare primero: su API nueva ya trae horario y precio,
              // y cubre Latinoamérica bastante mejor que Yelp (que fuera
              // de Norteamérica suele venir vacío). Yelp queda como
              // respaldo para donde sí es fuerte.
              siguiente = {
                ...siguiente,
                horarioComercial: datos.foursquare?.horario ?? datos.yelp?.horario ?? "",
                precioComercial: datos.foursquare?.rangoPrecios ?? datos.yelp?.rangoPrecios ?? "",
                direccionComercial: datos.foursquare?.direccion ?? "",
              };
            }
          }
          actualizados.push(siguiente);
        }
        if (huboCambios && investigacionActual) {
          investigacionActual = { ...investigacionActual, sitios: { ...investigacionActual.sitios, [etapa.nombre]: actualizados } };
          actualizarViaje(viaje.id, { investigacion: investigacionActual });
        }
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id, viaje?.investigacion?.version]);

  // Completar la ciudad sin que nadie tenga que revisarla a mano.
  //
  // OpenStreetMap cubre bien el casco urbano, pero lo que de verdad lleva
  // a alguien a una región suele estar fuera y mal etiquetado: los
  // termales de Santa Rosa, las cascadas de La Florida o un parque
  // natural cerca de Pereira no salían, y "naturaleza" se quedaba con
  // parques de barrio. Wikidata sí conoce esos sitios por nombre y admite
  // buscar a 30 km a la redonda, así que se consulta sola una vez por
  // ciudad y se suma lo que falte — nunca pisa lo que OSM ya trajo.
  useEffect(() => {
    if (!viaje) return;
    let cancelado = false;
    (async () => {
      let investigacionActual = viaje.investigacion;
      if (!investigacionActual) return;
      for (const etapa of etapasDe(viaje)) {
        if (etapa.lat === undefined || etapa.lon === undefined) continue;
        if (investigacionActual.descubrimiento?.[etapa.nombre] === VERSION_DESCUBRIMIENTO) continue;

        const descubiertos = await descubrirLugaresCercanos(etapa.lat, etapa.lon, 30);
        if (cancelado) return;

        const existentes: SitioReal[] = investigacionActual.sitios?.[etapa.nombre] ?? [];
        const yaConocidos = new Set(existentes.map((s) => s.nombre.toLowerCase()));
        const nuevos: SitioReal[] = descubiertos
          .filter((l) => !yaConocidos.has(l.nombre.toLowerCase()))
          // La propia ciudad del viaje aparece en su propio radio: como
          // "sitio que visitar" dentro de sí misma no aporta nada.
          .filter((l) => l.nombre.toLowerCase() !== etapa.nombre.toLowerCase())
          .map((l) => ({
            nombre: l.nombre,
            categoria: l.categoria,
            detalle: l.detalle,
            lat: l.lat,
            lon: l.lon,
            fuente: "wikidata" as const,
          }));

        investigacionActual = {
          ...investigacionActual,
          sitios: { ...investigacionActual.sitios, [etapa.nombre]: [...existentes, ...nuevos] },
          descubrimiento: { ...investigacionActual.descubrimiento, [etapa.nombre]: VERSION_DESCUBRIMIENTO },
        };
        actualizarViaje(viaje.id, { investigacion: investigacionActual });
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id, viaje?.investigacion?.version]);

  // Un fallo parcial (p. ej. Overpass caído justo esa vez, mientras
  // clima/moneda sí respondieron) no debe borrar sitios reales que ya
  // teníamos de una ciudad. Se compara CANTIDAD, no solo "vacío o no": una
  // pasada que trae menos sitios que antes (una respuesta parcial, no
  // necesariamente cero) tampoco debe hacer retroceder lo que el viajero
  // ya veía — se conserva la lista más completa, por ciudad.
  function conservarSitiosSiVacio(anterior: Investigacion | undefined, nueva: Investigacion): Investigacion {
    if (!anterior) return nueva;
    const sitios = { ...nueva.sitios };
    for (const [ciudad, previos] of Object.entries(anterior.sitios)) {
      if (previos.length > (sitios[ciudad]?.length ?? 0)) sitios[ciudad] = previos;
    }
    return { ...nueva, sitios };
  }

  // Un viaje ya creado se queda con la investigación de cuando se analizó
  // la primera vez. Si desde entonces se mejoró cómo investigamos (nuevas
  // categorías reales, más fuentes...), este viaje no lo nota solo — hace
  // falta volver a correr el análisis sobre las mismas ciudades. Si la
  // llamada no trae nada nuevo (undefined), se deja la investigación que
  // ya había: perderla por un fallo de red sería peor que quedarse
  // desactualizada.
  async function actualizarInvestigacion() {
    if (!viaje) return;
    setRefrescando(true);
    setErrorRefresco(null);
    try {
      const nuevaInvestigacion = await refrescarAnalisis(viaje.id, viaje);
      if (nuevaInvestigacion) {
        actualizarViaje(viaje.id, { investigacion: conservarSitiosSiVacio(viaje.investigacion, nuevaInvestigacion) });
      } else {
        setErrorRefresco("No encontramos nada nuevo para actualizar todavía.");
      }
    } catch (err) {
      setErrorRefresco(err instanceof Error ? err.message : "No se pudo actualizar la investigación.");
    } finally {
      setRefrescando(false);
    }
  }

  // La misma actualización, pero automática: un viaje cuya investigación
  // quedó guardada con una versión anterior (o de antes de que existiera
  // este campo) se refresca solo al abrir la pantalla, en vez de depender
  // de que la persona recuerde tocar el botón manual cada vez que
  // mejoramos cómo investigamos.
  useEffect(() => {
    if (!viaje) return;
    if (!viaje.investigacion || viaje.investigacion.version === VERSION_INVESTIGACION) return;
    let cancelado = false;
    (async () => {
      setRefrescando(true);
      try {
        const nuevaInvestigacion = await refrescarAnalisis(viaje.id, viaje);
        if (!cancelado && nuevaInvestigacion) {
          actualizarViaje(viaje.id, { investigacion: conservarSitiosSiVacio(viaje.investigacion, nuevaInvestigacion) });
        }
      } catch {
        // Silencioso: el botón manual sigue disponible si esto falla.
      } finally {
        if (!cancelado) setRefrescando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id, viaje?.investigacion?.version]);

  // Cuando la persona filtra por una sola categoría y ESA categoría no
  // tiene ni un solo sitio real de OpenStreetMap en esta ciudad (el caso
  // de "Fiesta" en ciudades donde OSM no tiene bien mapeada la vida
  // nocturna), en vez de resignarse a la idea genérica del catálogo se
  // prueba una búsqueda web real — el mismo buscador ya usado por sitio.
  // Solo se dispara cuando el usuario de verdad filtró a una categoría
  // (no en cada carga de página): evita búsquedas de más para categorías
  // que nadie está mirando.
  useEffect(() => {
    if (!viaje) return;
    let cancelado = false;
    (async () => {
      for (const etapa of etapasDe(viaje)) {
        const categorias = categoriasBuscadasPorEtapa[etapa.id];
        if (!categorias || categorias.length !== 1) continue;
        const categoria = categorias[0];
        const clave = `${etapa.id}:${categoria}`;
        if (busquedaWebCategoria[clave] !== undefined) continue;
        const sitiosDeCategoria = (viaje.investigacion?.sitios?.[etapa.nombre] ?? []).filter((s) => s.categoria === categoria);
        if (sitiosDeCategoria.length > 0) continue;
        setBusquedaWebCategoria((prev) => ({ ...prev, [clave]: "cargando" }));
        const consulta = `${CONSULTA_WEB_CATEGORIA[categoria]} en ${etapa.nombre}`;
        const resultados = await buscarEnLaWeb(consulta);
        if (cancelado) return;
        setBusquedaWebCategoria((prev) => ({ ...prev, [clave]: resultados.length > 0 ? resultados : "sin_datos" }));
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id, categoriasBuscadasPorEtapa]);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  const etapas = etapasDe(viaje);

  // Todo lo que se puede hacer, ciudad por ciudad: catálogo orientativo +
  // sitios reales (OpenStreetMap) + lo que el viajero ha añadido a mano.
  // Antes esto vivía en tres sitios distintos (catálogo genérico de un solo
  // destino, sitios reales aparte, actividades propias sin ciudad), así que
  // el itinerario nunca sabía de qué ciudad era cada actividad.
  function itemsDeEtapa(etapa: Etapa): Item[] {
    const destinoEtapa = destinoParaCatalogo(etapa);
    const delCatalogo: Item[] = actividadesDe(destinoEtapa).map((a) => ({
      ...a,
      esPropia: false,
      esGenerica: true,
      etapaId: etapa.id,
      etapaNombre: etapa.nombre,
      pais: destinoEtapa.pais,
      // No sabemos el sitio exacto, su horario real ni su web oficial: en
      // vez de inventarlos, un enlace de búsqueda real a un clic.
      mapaUrl: urlMapsActividad(a.nombre, etapa.nombre),
      webUrl: urlBuscarActividad(a.nombre, etapa.nombre),
    }));

    const sitiosDeEtapa = (viaje!.investigacion?.sitios?.[etapa.nombre] ?? []) as SitioReal[];
    const idsPropiosYaAñadidos = new Set(viaje!.actividades.map((a) => a.actividadId));
    const deSitiosReales: Item[] = sitiosDeEtapa
      .filter((s) => !idsPropiosYaAñadidos.has(`sitio-${etapa.id}-${slug(s.nombre)}`))
      .map((s) => ({
        id: `sitio-${etapa.id}-${slug(s.nombre)}`,
        nombre: s.nombre,
        tipo: s.categoria,
        categoria: s.categoria,
        duracionHoras: 0,
        costeEstimado: 0,
        apta: [],
        entorno: s.categoria === "naturaleza" ? "exterior" : "interior",
        admiteMascotas: false,
        // Ver descripcionDeSitio: Wikipedia > entorno cercano (OSM) >
        // búsqueda web > solo la categoría, sin relleno. Decir "real" y
        // repetir "confirma horario y precio antes de ir" en cada tarjeta
        // era redundante con la nota general al pie de la página (que ya lo
        // dice una vez para todos los sitios reales) y no aportaba nada que
        // el usuario no supiera ya.
        descripcion: descripcionDeSitio(s),
        esPropia: false,
        esSitioReal: true,
        fuenteEtiqueta: "OpenStreetMap",
        etapaId: etapa.id,
        etapaNombre: etapa.nombre,
        pais: destinoEtapa.pais,
        // OpenStreetMap primero (es el dato del propio sitio); si no lo
        // tiene, lo que trajo el pipeline comercial. Nunca se inventa: si
        // ninguna fuente lo tiene, la tarjeta lo deja sin decir.
        notaPrecio: s.precioAprox || s.precioComercial || undefined,
        // Ya viene formateado en español (formatearHorario, en investigacion.ts):
        // aquí no hay sintaxis cruda de OpenStreetMap que traducir.
        horario: s.horarioApertura || s.horarioComercial || undefined,
        mapaUrl: s.lat && s.lon ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}` : undefined,
        webUrl: s.url,
        webEsDirecta: !!s.url,
        // No solo por el tipo de OSM (fast_food/cafe): una cadena real de
        // restaurante normal (Crepes & Waffles, El Corral...) no queda
        // tageada como "comida rápida" en OpenStreetMap y aun así es
        // justo lo contrario de "gastronomía típica" cuando alguien lo
        // pide — se reconoce también por el nombre real de la marca.
        cadenaGenerica: s.detalle === "comida rápida" || s.detalle === "cafetería" || esCadenaConocida(s.nombre),
        cocinaLocal: s.cocina ? s.cocina.split(", ").some((c) => COCINAS_LOCALES.has(c)) : false,
        imagen: s.imagen || undefined,
        accesible: s.accesible,
        // La distancia al centro ayuda a decidir, pero una dirección real
        // (cuando alguna fuente la tiene) es lo que de verdad sirve para ir.
        direccion: s.direccionComercial || distanciaDelCentro(etapa, s.lat, s.lon),
      }));

    // Guía real de Wikivoyage (nombre, dirección, horario, precio, web ya
    // escritos por otros viajeros): sustituye la búsqueda genérica en
    // Google por datos concretos, cuando el artículo los trae. Cuando no
    // hay artículo en español, se cae al de inglés (ver wikivoyage.ts) —
    // así que su contenido puede venir en otro idioma; se usa igual (mejor
    // un dato real en otro idioma que ninguno) pero se recorta a lo
    // esencial, porque un párrafo entero sin traducir es aún más difícil
    // de leer si encima es largo.
    const guiaWikivoyage = viaje!.wikivoyage?.[etapa.nombre];
    const idsWikivoyageYaAñadidos = idsPropiosYaAñadidos;
    const deWikivoyage: Item[] = (guiaWikivoyage?.listings ?? []).flatMap((l) => {
      const categoria = CATEGORIA_DE_LISTING[l.tipo];
      if (!categoria || !l.nombre) return [];
      // Un festival o feria no es un sitio al que se pueda ir cualquier
      // día — es un evento con fecha propia, y Wikivoyage no trae esa
      // fecha en estos listings. Mostrarlo con "+Añadir"/mapa como si
      // fuera un lugar fijo (sin poder decir cuándo ocurre) confunde más
      // de lo que ayuda; los eventos reales con fecha ya tienen su
      // propia sección (EventosEstacionalesDestino, con datos curados
      // por país y mes) — aquí se descartan en vez de mostrarse a medias.
      if (PARECE_EVENTO.test(l.nombre)) return [];
      const id = `wv-${etapa.id}-${slug(l.nombre)}`;
      if (idsWikivoyageYaAñadidos.has(id)) return [];
      return [
        {
          id,
          nombre: l.nombre,
          tipo: l.tipo,
          categoria,
          duracionHoras: 0,
          costeEstimado: 0,
          apta: [],
          entorno: "mixto" as const,
          admiteMascotas: false,
          descripcion: l.contenido ? acortarTexto(l.contenido, 160) : "Recomendado en la guía Wikivoyage de la ciudad.",
          esPropia: false,
          esSitioReal: true,
          fuenteEtiqueta: "Wikivoyage",
          etapaId: etapa.id,
          etapaNombre: etapa.nombre,
          notaPrecio: l.precio,
          horario: l.horario,
          // Dirección real (si Wikivoyage la trae) + distancia real al
          // centro (si se conoce): el punto de referencia que de verdad
          // ayuda a decidir si vale la pena ir hasta allá.
          direccion: [l.direccion, distanciaDelCentro(etapa, l.lat, l.lon)].filter(Boolean).join(" · ") || undefined,
          mapaUrl: l.lat && l.lon ? `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lon}` : urlMapsActividad(l.nombre, etapa.nombre),
          webUrl: l.url || urlBuscarActividad(l.nombre, etapa.nombre),
          webEsDirecta: !!l.url,
        },
      ];
    });

    const propiasDeEtapa: Item[] = viaje!.actividades
      .filter((a) => a.propia && !a.propia.esSitioReal && (a.etapaId === etapa.id || (!a.etapaId && etapas.length === 1)))
      .map((a) => ({
        id: a.actividadId,
        nombre: a.propia!.nombre,
        tipo: "propia",
        categoria: a.categoria ?? "otro",
        duracionHoras: a.propia!.duracionHoras ?? 0,
        costeEstimado: a.propia!.costeEstimado ?? 0,
        apta: [],
        entorno: a.propia!.entorno ?? "mixto",
        admiteMascotas: a.propia!.admiteMascotas ?? false,
        descripcion: "Actividad añadida por ti.",
        esPropia: true,
        etapaId: etapa.id,
        etapaNombre: etapa.nombre,
      }));

    // El mismo lugar real a veces lo trae tanto OpenStreetMap (coordenadas,
    // categoría) como Wikivoyage (precio, horario, dirección, escrito por
    // otros viajeros) bajo el mismo nombre. Antes se mostraba solo la
    // primera fuente y la segunda se descartaba entera — así un
    // restaurante con precio real en Wikivoyage podía aparecer como
    // "Consultar precio" solo porque OpenStreetMap lo encontró primero y
    // no traía esa etiqueta. Se combinan en una sola tarjeta con lo mejor
    // de cada fuente en vez de quedarse con la más pobre.
    function fusionarSitio(base: Item, extra: Item): Item {
      return {
        ...base,
        notaPrecio: base.notaPrecio ?? extra.notaPrecio,
        horario: base.horario ?? extra.horario,
        // La de Wikivoyage suele traer dirección real de calle además de
        // la distancia al centro; la de OpenStreetMap (esta función) es
        // solo la distancia — se prefiere la más completa cuando existe.
        direccion: extra.direccion ?? base.direccion,
        webUrl: base.webEsDirecta ? base.webUrl : extra.webEsDirecta ? extra.webUrl : base.webUrl,
        webEsDirecta: base.webEsDirecta || Boolean(extra.webEsDirecta),
        // Una frase real de Wikivoyage (escrita por otro viajero sobre ESE
        // lugar) vale más que la categoría genérica de OpenStreetMap
        // ("restaurante", "playa") — pero solo cuando está en español: la
        // app es en español, y mezclar una frase en inglés con el resto de
        // la interfaz (cuando SÍ hay una alternativa clara en español, la
        // de OpenStreetMap) es peor que quedarse con la más simple.
        descripcion:
          extra.descripcion && extra.descripcion !== "Recomendado en la guía Wikivoyage de la ciudad." && guiaWikivoyage?.idioma === "es"
            ? extra.descripcion
            : base.descripcion,
      };
    }
    const porSlugReal = new Map<string, Item>();
    for (const it of deSitiosReales) porSlugReal.set(slug(it.nombre), it);
    for (const it of deWikivoyage) {
      const clave = slug(it.nombre);
      const existente = porSlugReal.get(clave);
      porSlugReal.set(clave, existente ? fusionarSitio(existente, it) : it);
    }
    const realesDeEtapa = [...porSlugReal.values()];

    // El mismo lugar real puede aparecer también en tu propia nota o en la
    // idea genérica del catálogo: se prioriza la fuente más fiable — lo
    // que tú añadiste, luego investigación real (ya fusionada arriba),
    // luego la idea orientativa — y no se repite la misma tarjeta con el
    // mismo nombre varias veces.
    const nombresYaMostrados = new Set(propiasDeEtapa.map((it) => slug(it.nombre)));
    const sinDuplicar = (lista: Item[]) =>
      lista.filter((it) => !nombresYaMostrados.has(slug(it.nombre)) && nombresYaMostrados.add(slug(it.nombre)));

    // Si ya hay lugares reales de una categoría, la idea genérica del
    // catálogo para esa misma categoría sobra: antes se mostraba igual, con
    // un coste inventado, junto al aviso de que no era un lugar investigado
    // — contradictorio cuando de hecho SÍ había algo real que mostrar.
    const categoriasConDatosReales = new Set(realesDeEtapa.map((it) => it.categoria));
    const delCatalogoUtil = delCatalogo.filter((it) => !categoriasConDatosReales.has(it.categoria));

    return [...propiasDeEtapa, ...sinDuplicar(realesDeEtapa), ...sinDuplicar(delCatalogoUtil)];
  }

  function setEstado(item: Item, estado: EstadoActividad | null) {
    if (!viaje) return;
    if (estado === null) {
      actualizarViaje(viaje.id, { actividades: viaje.actividades.filter((a) => a.actividadId !== item.id) });
      return;
    }
    const entrada = viaje.actividades.find((a) => a.actividadId === item.id);
    if (entrada) {
      actualizarViaje(viaje.id, {
        actividades: viaje.actividades.map((a) => (a.actividadId === item.id ? { ...a, estado } : a)),
      });
      return;
    }
    // Primera vez que se añade: si es un sitio real o del catálogo, se
    // guarda con todo lo que ya sabemos de verdad (nombre, precio, horario)
    // para no perder esa información al pasar por el itinerario.
    actualizarViaje(viaje.id, {
      actividades: [
        ...viaje.actividades,
        {
          actividadId: item.id,
          estado,
          etapaId: item.etapaId,
          etapaNombre: item.etapaNombre,
          categoria: item.categoria,
          ...(item.esSitioReal || !item.esPropia
            ? item.esSitioReal
              ? {
                  propia: {
                    nombre: item.nombre,
                    notaPrecio: item.notaPrecio,
                    horario: item.horario,
                    entorno: item.entorno,
                    esSitioReal: true,
                  },
                }
              : {}
            : {}),
        },
      ],
    });
  }

  function toggleEtapa(id: string) {
    setEtapasAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function anadirPropia(e: React.FormEvent, etapa: Etapa) {
    e.preventDefault();
    if (!viaje || !nombreNueva.trim()) return;
    const horas = Number.parseFloat(horasNueva);
    const coste = Number.parseFloat(costeNueva);
    actualizarViaje(viaje.id, {
      actividades: [
        ...viaje.actividades,
        {
          actividadId: generarId(),
          estado: "planificada",
          etapaId: etapa.id,
          etapaNombre: etapa.nombre,
          categoria: categoriaNueva,
          propia: {
            nombre: nombreNueva.trim(),
            duracionHoras: Number.isNaN(horas) ? undefined : horas,
            costeEstimado: Number.isNaN(coste) ? undefined : coste,
            entorno: entornoNueva,
            admiteMascotas: mascotaNueva,
          },
        },
      ],
    });
    setNombreNueva("");
    setHorasNueva("");
    setCosteNueva("");
    setMascotaNueva(false);
    setFormEtapaId(null);
  }

  const salida = viaje.fechaSalida ? new Date(viaje.fechaSalida) : undefined;
  const regreso = viaje.fechaRegreso ? new Date(viaje.fechaRegreso) : undefined;
  const actividadesPendientes = viaje.actividades.filter((a) => a.estado === "planificada" || a.estado === "reservada").length;

  // Catálogo combinado de todas las etapas, para "algo ha cambiado", que
  // no necesita saber de qué ciudad es cada cosa.
  const catalogoCompleto: Item[] = etapas.flatMap((e) => itemsDeEtapa(e));

  // Está lloviendo: buscamos automáticamente alternativas de interior, sin
  // que la persona tenga que pedirlo. Estamos cansados: en vez de sugerir
  // más planes, mostramos un cuadro para cancelar lo ya planificado.
  const sugerenciasAdaptacion =
    adaptacion === "lluvia" ? catalogoCompleto.filter((a) => a.entorno === "interior" || a.entorno === "mixto").slice(0, 3) : [];

  const actividadesEnCurso = viaje.actividades.filter((a) => a.estado === "planificada" || a.estado === "reservada");

  function nombreDeActividad(a: (typeof actividadesEnCurso)[number]): string {
    return catalogoCompleto.find((it) => it.id === a.actividadId)?.nombre ?? a.propia?.nombre ?? "Actividad";
  }

  function cancelarActividad(actividadId: string) {
    if (!viaje) return;
    actualizarViaje(viaje.id, {
      actividades: viaje.actividades.map((a) => (a.actividadId === actividadId ? { ...a, estado: "descartada" } : a)),
    });
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera
          titulo="Actividades"
          subtitulo="Elige qué hacer en cada ciudad y súmalo directo a tu itinerario."
          volverA={`/viajes/${viaje.id}`}
        />

        <div className="mb-4 flex items-center justify-between gap-3 text-xs">
          <button onClick={actualizarInvestigacion} disabled={refrescando} className="text-neutral-400 underline hover:text-neutral-700 disabled:opacity-50">
            {refrescando ? "🔄 Actualizando investigación real…" : "🔄 Actualizar investigación real"}
          </button>
        </div>
        {errorRefresco && <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{errorRefresco}</p>}

        <section className="card mb-6">
          <h2 className="mb-3 font-medium">Algo ha cambiado</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["lluvia", "🌧️ Está lloviendo"],
                ["cansancio", "😴 Estamos cansados"],
              ] as const
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                onClick={() => setAdaptacion(adaptacion === valor ? null : valor)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  adaptacion === valor ? "border-marino-500 bg-marino-50 text-marino-800" : "border-neutral-200 hover:border-neutral-400"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          {adaptacion === "lluvia" && (
            <ul className="mt-3 space-y-2">
              {sugerenciasAdaptacion.length === 0 && <li className="text-sm text-neutral-400">No hay alternativas de interior claras en tu lista.</li>}
              {sugerenciasAdaptacion.map((a) => (
                <li key={a.id} className="rounded-xl bg-neutral-50 px-3 py-2 text-sm">
                  <span className="font-medium">{a.nombre}</span>
                  {a.duracionHoras > 0 && <span className="text-neutral-500"> — {a.etapaNombre} · ~{a.duracionHoras}h</span>}
                </li>
              ))}
            </ul>
          )}

          {adaptacion === "cansancio" && (
            <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-3 text-sm">
              <p className="mb-2 text-neutral-600">Cancela lo que no vas a poder hacer — queda como descartada, no se borra:</p>
              {actividadesEnCurso.length === 0 ? (
                <p className="text-neutral-400">No tienes actividades planificadas o reservadas todavía.</p>
              ) : (
                <ul className="space-y-1.5">
                  {actividadesEnCurso.map((a) => (
                    <li key={a.actividadId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5">
                      <span>
                        {nombreDeActividad(a)} <span className="text-xs text-neutral-400">— {a.etapaNombre}</span>
                      </span>
                      <button onClick={() => cancelarActividad(a.actividadId)} className="shrink-0 text-xs text-red-500 hover:text-red-700">
                        Cancelar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-medium">Explora por ciudad</h2>
          <span className="text-xs text-neutral-400">{actividadesPendientes} en tu itinerario</span>
        </div>

        <div className="space-y-4">
          {etapas.map((etapa) => {
            const items = itemsDeEtapa(etapa);
            const enItinerarioDeEtapa = viaje.actividades.filter(
              (a) => a.etapaId === etapa.id && (a.estado === "planificada" || a.estado === "reservada")
            ).length;
            const abierta = etapasAbiertas.has(etapa.id) || etapas.length === 1;

            // Solo se ofrecen cajas de categorías que de verdad tienen algo
            // detrás: antes se mostraban las 10 categorías siempre, así que
            // tocar "Playa" en un destino sin nada investigado ahí llevaba a
            // una pantalla vacía — una caja que no lleva a ningún lado no
            // ayuda a nadie.
            const categoriasConContenido = new Set(items.map((it) => it.categoria));
            const categoriasDisponibles = ORDEN_CATEGORIAS.filter((c) => categoriasConContenido.has(c));

            // Lo que la persona describió al crear el viaje ("restaurantes
            // típicos, naturaleza, museos de historia...") ya dice qué le
            // interesa: se usa como punto de partida en cada ciudad, sin
            // obligar a repetirlo — pero solo mientras esta etapa no tenga
            // su propia selección (una caja tocada, o un "Ver todo" explícito).
            const textoOriginalViaje = viaje.contexto.textoOriginal;
            const categoriasSugeridas = (textoOriginalViaje ? interpretarIntencion(textoOriginalViaje) : []).filter((c) => categoriasConContenido.has(c));
            const haySugerenciaDelViaje = categoriasBuscadasPorEtapa[etapa.id] === undefined && categoriasSugeridas.length > 0;

            const categoriasBuscadas =
              categoriasBuscadasPorEtapa[etapa.id] !== undefined
                ? categoriasBuscadasPorEtapa[etapa.id]
                : haySugerenciaDelViaje
                  ? categoriasSugeridas
                  : null;
            const resultadosBusqueda = categoriasBuscadas
              ? categoriasBuscadas.flatMap((cat) => items.filter((it) => it.categoria === cat))
              : [];

            // Sin menú de categorías que abrir y cerrar: se muestra la
            // lista directa, ya sea filtrada por la búsqueda o completa.
            // Dentro de cada categoría: primero lo que de verdad coincide
            // con "típico" (cocina local/regional real, según OSM), luego
            // el resto, y al final una cadena genérica (McDonald's,
            // Crepes & Waffles...) — sigue siendo un resultado real y
            // válido, pero lo primero que se ve al abrir "Restaurantes
            // típicos" no debería ser justo lo que menos se busca al pedir
            // algo típico.
            const listaMostrada = [...(categoriasBuscadas !== null ? resultadosBusqueda : items)].sort(
              (a, b) =>
                ORDEN_CATEGORIAS.indexOf(a.categoria) - ORDEN_CATEGORIAS.indexOf(b.categoria) ||
                Number(Boolean(b.cocinaLocal)) - Number(Boolean(a.cocinaLocal)) ||
                Number(Boolean(a.cadenaGenerica)) - Number(Boolean(b.cadenaGenerica))
            );

            // Para presentar la ciudad: prioriza lo que la persona pidió al
            // crear el viaje sobre lo que simplemente encontramos, y saca de
            // ahí nombres reales (nunca del catálogo genérico) para que la
            // presentación se sienta hecha para ESTA ciudad, no una frase
            // que serviría para cualquier destino.
            const categoriasParaTono = categoriasSugeridas.length > 0 ? categoriasSugeridas : categoriasDisponibles;
            const nombresRealesTono = categoriasParaTono.slice(0, 2).flatMap((c) => nombresDestacadosDe(items, c)).slice(0, 2);
            const paisEtapa = paisDeEtapa(etapa)?.nombre;

            return (
              <div key={etapa.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                <button
                  onClick={() => toggleEtapa(etapa.id)}
                  className="flex w-full items-center justify-between gap-3 bg-marino-50 px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2 font-medium text-marino-900">
                    📍 {etapa.nombre}
                    {medalla(enItinerarioDeEtapa) && <span className="text-lg">{medalla(enItinerarioDeEtapa)}</span>}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-marino-700">
                    {estadoWikivoyage[etapa.nombre] === "cargando" && <span className="animate-pulse">📖 Investigando…</span>}
                    {enItinerarioDeEtapa} en tu itinerario
                    <span className="text-marino-400">{abierta ? "−" : "+"}</span>
                  </span>
                </button>

                {abierta && (
                  <div className="space-y-3 p-4">
                    {(() => {
                      const resumen = resumenCiudad[etapa.nombre];
                      const extracto = resumen && resumen !== "cargando" && resumen !== "sin_datos" ? resumen.extracto : undefined;
                      return (
                        <div className="rounded-xl bg-gradient-to-br from-marino-50 to-coral-50 p-4">
                          <p className="mb-1 text-sm font-medium text-marino-900">
                            {fraseInspiradora(etapa.nombre, categoriasParaTono, nombresRealesTono, paisEtapa)}
                          </p>
                          {extracto ? (
                            <p className="text-sm leading-relaxed text-neutral-700">{extracto}</p>
                          ) : resumen === "cargando" ? (
                            <p className="text-xs text-neutral-400">Buscando algo curioso sobre {etapa.nombre}…</p>
                          ) : null}
                        </div>
                      );
                    })()}

                    {categoriasDisponibles.length > 0 && (
                      <div className="rounded-xl border border-dashed border-marino-200 bg-marino-50/50 p-3">
                        <p className="mb-2 text-sm font-medium text-marino-900">✨ ¿Qué te gustaría hacer en {etapa.nombre}?</p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {categoriasDisponibles.map((c) => {
                            // Se marca CADA categoría activa, no solo cuando
                            // hay exactamente una: si el viaje pedía "comida
                            // típica y salir a bailar", la lista de abajo ya
                            // venía filtrada por esas dos y ninguna caja se
                            // veía encendida — parecía que la ciudad solo
                            // tenía dos sitios, en vez de que estábamos
                            // mostrando justo lo que se pidió.
                            const activo = categoriasBuscadas !== null && categoriasBuscadas.includes(c);
                            return (
                              <button
                                key={c}
                                type="button"
                                // Tocar la única caja encendida quita el filtro;
                                // tocar cualquier otra (o una de varias) filtra
                                // a esa sola, que es lo que se espera al tocarla.
                                onClick={() =>
                                  setCategoriasBuscadasPorEtapa((prev) => ({
                                    ...prev,
                                    [etapa.id]: activo && categoriasBuscadas!.length === 1 ? null : [c],
                                  }))
                                }
                                className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition ${
                                  activo ? "border-coral-300 bg-coral-50" : "border-neutral-200 bg-white hover:border-neutral-300"
                                }`}
                              >
                                <span className="text-xl">{ETIQUETA_CATEGORIA[c].icono}</span>
                                <span className={`text-[11px] font-medium leading-tight ${activo ? "text-coral-700" : "text-neutral-600"}`}>
                                  {ETIQUETA_CATEGORIA[c].etiqueta}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sin esto la lista salía ya filtrada por lo que la
                        persona pidió al crear el viaje, pero nada lo decía:
                        se leía como "en esta ciudad solo hay dos sitios",
                        cuando en realidad estábamos respondiendo justo a lo
                        pedido y el resto seguía ahí detrás. */}
                    {categoriasBuscadas !== null && categoriasBuscadas.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-marino-50 px-3 py-2 text-xs text-marino-800">
                        <span>
                          {haySugerenciaDelViaje ? "Filtrado por lo que pediste al crear el viaje:" : "Estás viendo solo:"}{" "}
                          <span className="font-medium">
                            {categoriasBuscadas.map((c) => ETIQUETA_CATEGORIA[c].etiqueta.toLowerCase()).join(" y ")}
                          </span>
                          .
                        </span>
                        <button
                          type="button"
                          onClick={() => setCategoriasBuscadasPorEtapa((prev) => ({ ...prev, [etapa.id]: null }))}
                          className="font-medium text-marino-700 underline"
                        >
                          Ver todo en {etapa.nombre}
                        </button>
                      </div>
                    )}

                    {estadoWikivoyage[etapa.nombre] === "sin_datos" && (
                      <p className="text-xs text-neutral-400">
                        📖 No encontramos una guía Wikivoyage con datos extraíbles para {etapa.nombre}. El catálogo
                        orientativo y los sitios de OpenStreetMap de abajo siguen disponibles igual.
                      </p>
                    )}

                    {categoriasBuscadas !== null &&
                      categoriasBuscadas.length === 1 &&
                      !resultadosBusqueda.some((it) => it.esSitioReal) &&
                      (() => {
                        const categoria = categoriasBuscadas[0];
                        const estado = busquedaWebCategoria[`${etapa.id}:${categoria}`];
                        if (!estado || estado === "sin_datos") return null;
                        if (estado === "cargando") {
                          return (
                            <p className="text-xs text-neutral-400">
                              🔎 OpenStreetMap no tiene esto mapeado en {etapa.nombre} — buscando en la web…
                            </p>
                          );
                        }
                        return (
                          <div className="rounded-xl border border-dashed border-coral-200 bg-coral-50/50 p-3">
                            <p className="mb-1.5 text-xs font-medium text-coral-800">
                              🔎 OpenStreetMap no tiene esto mapeado en {etapa.nombre}, pero esto se encontró buscando en la web:
                            </p>
                            <ul className="space-y-1.5">
                              {estado.map((r, i) => (
                                <li key={i} className="text-xs text-neutral-700">
                                  {r.url ? (
                                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-coral-700 underline">
                                      {r.titulo}
                                    </a>
                                  ) : (
                                    <span className="font-medium">{r.titulo}</span>
                                  )}
                                  {r.fragmento && <p className="mt-0.5 text-neutral-600">{describirResultadoWeb(r)}</p>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}

                    {listaMostrada.length === 0 ? (
                      <p className="text-sm text-neutral-400">
                        {categoriasBuscadas !== null
                          ? `Todavía no tenemos nada así investigado en ${etapa.nombre}.`
                          : `Añade algo tuyo abajo para empezar en ${etapa.nombre}.`}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {listaMostrada.map((it) => {
                          const entrada = viaje.actividades.find((a) => a.actividadId === it.id);
                          const estado = entrada?.estado ?? "disponible";
                          return <TarjetaActividad key={it.id} it={it} estado={estado} onCambiarEstado={(e) => setEstado(it, e)} />;
                        })}
                      </ul>
                    )}

                    {formEtapaId === etapa.id ? (
                      <form onSubmit={(e) => anadirPropia(e, etapa)} className="rounded-xl border border-dashed border-neutral-300 p-3 space-y-2.5">
                        <p className="text-xs font-medium text-neutral-600">Añadir tu propio plan en {etapa.nombre}</p>
                        <input className="input text-sm" placeholder="¿Qué quieres hacer?" value={nombreNueva} onChange={(e) => setNombreNueva(e.target.value)} />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" step="0.5" min="0" className="input text-sm" placeholder="Horas" value={horasNueva} onChange={(e) => setHorasNueva(e.target.value)} />
                          <input type="number" min="0" className="input text-sm" placeholder="Coste €" value={costeNueva} onChange={(e) => setCosteNueva(e.target.value)} />
                        </div>
                        <select className="input text-sm" value={categoriaNueva} onChange={(e) => setCategoriaNueva(e.target.value as CategoriaActividad)}>
                          {ORDEN_CATEGORIAS.map((c) => (
                            <option key={c} value={c}>
                              {ETIQUETA_CATEGORIA[c].icono} {ETIQUETA_CATEGORIA[c].etiqueta}
                            </option>
                          ))}
                        </select>
                        <select className="input text-sm" value={entornoNueva} onChange={(e) => setEntornoNueva(e.target.value as typeof entornoNueva)}>
                          <option value="exterior">☀️ Al aire libre</option>
                          <option value="interior">🏛️ En interior</option>
                          <option value="mixto">🌤️ Interior y exterior</option>
                        </select>
                        <label className="flex items-center gap-2 text-xs text-neutral-600">
                          <input type="checkbox" checked={mascotaNueva} onChange={(e) => setMascotaNueva(e.target.checked)} />
                          Admite mascotas
                        </label>
                        <div className="flex gap-2">
                          <button type="submit" className="btn-primary flex-1 text-sm">
                            Añadir
                          </button>
                          <button type="button" onClick={() => setFormEtapaId(null)} className="btn-secondary text-sm">
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button onClick={() => setFormEtapaId(etapa.id)} className="text-xs text-neutral-500 underline hover:text-neutral-900">
                        + Añadir tu propio plan en {etapa.nombre}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-neutral-400">
          El catálogo por categoría es orientativo (duración, coste y días gratis son estimaciones para organizar el día
          y el presupuesto). Los sitios marcados como &quot;Sitio real&quot; existen de verdad en OpenStreetMap: confirma
          horario y precio antes de ir.
        </p>

        {destino && (
          <div className="mt-8">
            <EventosEstacionalesDestino
              pais={destino.pais}
              mesInicio={salida ? salida.getMonth() + 1 : undefined}
              mesFin={regreso ? regreso.getMonth() + 1 : undefined}
            />
          </div>
        )}
      </div>
    </main>
  );
}
