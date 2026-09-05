"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { EventosEstacionalesDestino } from "@/components/EventosEstacionalesDestino";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { actividadesDe, urlBuscarActividad, urlMapsActividad, queProbarDe } from "@/lib/catalogo";
import { destinoParaCatalogo, destinoPrincipal, etapasDe } from "@/lib/viaje";
import { obtenerGuiaWikivoyage, type TipoListingWikivoyage } from "@/lib/wikivoyage";
import { obtenerResumenLugar, type ResumenWikipedia } from "@/lib/wikipedia";
import { interpretarIntencion } from "@/lib/intencion";
import { slug } from "@/lib/puntosGeo";
import type { CategoriaSitio, SitioReal } from "@/lib/investigacion";
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
  discoteca: { etiqueta: "Vida nocturna", icono: "🎶" },
  compras: { etiqueta: "Compras", icono: "🛍️" },
  naturaleza: { etiqueta: "Naturaleza", icono: "🌿" },
  playa: { etiqueta: "Playa", icono: "🏖️" },
  pueblos: { etiqueta: "Pueblos cercanos", icono: "🏘️" },
  otro: { etiqueta: "Otros planes", icono: "✨" },
};

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
  "otro",
];

const CATEGORIA_DE_SITIO: Record<CategoriaSitio, CategoriaActividad> = {
  gastronomia: "restaurante",
  cultura: "museo",
  naturaleza: "naturaleza",
  experiencias: "otro",
};

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
};

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
    <li className="rounded-lg bg-neutral-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{it.nombre}</p>
          <p className="text-xs text-neutral-500">{it.descripcion}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTILO_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="chip">
          {ETIQUETA_CATEGORIA[it.categoria].icono} {ETIQUETA_CATEGORIA[it.categoria].etiqueta}
        </span>
        {it.duracionHoras > 0 && <span className="chip">⏱️ {it.duracionHoras}h</span>}
        {it.notaPrecio ? (
          <span className="chip">💵 {it.notaPrecio}</span>
        ) : it.esSitioReal ? (
          <span className="chip">💵 Consultar precio</span>
        ) : (
          <span className="chip">{it.costeEstimado > 0 ? `💵 ${it.costeEstimado}€` : "🆓 Gratis"}</span>
        )}
        {it.horario && <span className="chip">🕐 {it.horario}</span>}
        {it.horarioHabitual && <span className="chip">🕐 {it.horarioHabitual}</span>}
        {it.admiteMascotas && <span className="chip">🐾 Mascotas</span>}
        {it.esPropia && <span className="chip">✍️ Tuya</span>}
        {it.fuenteEtiqueta && <span className="chip">🌍 {it.fuenteEtiqueta}</span>}
        {it.esGenerica && <span className="chip">💡 Idea general</span>}
      </div>

      {it.esGenerica && (
        <p className="mt-2 text-xs text-amber-700">
          Todavía no encontramos un sitio concreto para esto en {it.etapaNombre}: es una idea orientativa, no un lugar investigado.
        </p>
      )}

      {it.direccion && <p className="mt-2 text-xs text-neutral-500">📍 {it.direccion}</p>}

      {it.consejo && <p className="mt-2 text-xs text-neutral-500">💡 {it.consejo}</p>}

      {it.categoria === "restaurante" && !it.esSitioReal && it.pais && queProbarDe(it.pais).length > 0 && (
        <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2">
          <p className="text-xs font-medium text-amber-800">🍴 Si no sabes qué pedir, prueba:</p>
          <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
            {queProbarDe(it.pais).map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.nombre}</span> — {s.descripcion}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap gap-2">
        {it.mapaUrl && (
          <a href={it.mapaUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:border-marino-500">
            📍 {it.fuenteEtiqueta ? "Mapa" : "Ver opciones reales en el mapa"}
          </a>
        )}
        {it.webUrl && (
          <a href={it.webUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1.5 rounded-lg bg-marino-50 border border-marino-200 text-marino-700 hover:bg-marino-100">
            {it.webEsDirecta ? "🔗 Sitio web" : "🔎 Buscar en Google"}
          </a>
        )}
        {estado === "disponible" && (
          <button onClick={() => onCambiarEstado("planificada")} className="btn-primary px-3 py-1.5 text-xs">
            + Añadir al itinerario
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
    </li>
  );
}

export default function ActividadesPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);
  const destino = viaje ? destinoPrincipal(viaje) : undefined;

  const [adaptacion, setAdaptacion] = useState<"lluvia" | "cansancio" | null>(null);
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
  // Por ciudad: cada etapa tiene su propia búsqueda de intención, ya que
  // "quiero comida típica" en Cartagena no debería mostrar resultados de
  // Bogotá.
  const [textosIntencion, setTextosIntencion] = useState<Record<string, string>>({});
  const [categoriasBuscadasPorEtapa, setCategoriasBuscadasPorEtapa] = useState<Record<string, CategoriaActividad[] | null>>({});

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
        if (acumulado[etapa.nombre]) {
          setEstadoWikivoyage((prev) => ({ ...prev, [etapa.nombre]: "listo" }));
          continue;
        }
        setEstadoWikivoyage((prev) => ({ ...prev, [etapa.nombre]: "cargando" }));
        try {
          const guia = await obtenerGuiaWikivoyage(etapa.nombre);
          if (cancelado) return;
          if (guia) {
            acumulado = { ...acumulado, [etapa.nombre]: guia };
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
        const resumen = await obtenerResumenLugar(etapa.nombre);
        if (cancelado) return;
        setResumenCiudad((prev) => ({ ...prev, [etapa.nombre]: resumen ?? "sin_datos" }));
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id]);

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
        categoria: CATEGORIA_DE_SITIO[s.categoria],
        duracionHoras: 0,
        costeEstimado: 0,
        apta: [],
        entorno: s.categoria === "naturaleza" ? "exterior" : "interior",
        admiteMascotas: false,
        descripcion: s.detalle ?? "Sitio real cercano (OpenStreetMap).",
        esPropia: false,
        esSitioReal: true,
        fuenteEtiqueta: "OpenStreetMap",
        etapaId: etapa.id,
        etapaNombre: etapa.nombre,
        notaPrecio: s.precioAprox,
        horario: s.horarioApertura ? `${s.horarioApertura}${s.horarioCierre ? ` - ${s.horarioCierre}` : ""}` : undefined,
        mapaUrl: s.lat && s.lon ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}` : undefined,
        webUrl: s.url,
        webEsDirecta: !!s.url,
      }));

    // Guía real de Wikivoyage (nombre, dirección, horario, precio, web ya
    // escritos por otros viajeros): sustituye la búsqueda genérica en
    // Google por datos concretos, cuando el artículo los trae.
    const guiaWikivoyage = viaje!.wikivoyage?.[etapa.nombre];
    const idsWikivoyageYaAñadidos = idsPropiosYaAñadidos;
    const deWikivoyage: Item[] = (guiaWikivoyage?.listings ?? []).flatMap((l) => {
      const categoria = CATEGORIA_DE_LISTING[l.tipo];
      if (!categoria || !l.nombre) return [];
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
          descripcion: l.contenido || "Recomendado en la guía Wikivoyage de la ciudad.",
          esPropia: false,
          esSitioReal: true,
          fuenteEtiqueta: "Wikivoyage",
          etapaId: etapa.id,
          etapaNombre: etapa.nombre,
          notaPrecio: l.precio,
          horario: l.horario,
          direccion: l.direccion,
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

    // El mismo lugar real puede aparecer en más de una fuente (tu propia
    // nota, un sitio de OpenStreetMap, un listing de Wikivoyage, o la idea
    // genérica del catálogo): se prioriza la fuente más fiable — lo que tú
    // añadiste, luego investigación real, luego la idea orientativa — y no
    // se repite la misma tarjeta con el mismo nombre varias veces.
    const nombresYaMostrados = new Set(propiasDeEtapa.map((it) => slug(it.nombre)));
    const sinDuplicar = (lista: Item[]) =>
      lista.filter((it) => !nombresYaMostrados.has(slug(it.nombre)) && nombresYaMostrados.add(slug(it.nombre)));

    return [...propiasDeEtapa, ...sinDuplicar(deSitiosReales), ...sinDuplicar(deWikivoyage), ...sinDuplicar(delCatalogo)];
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

            // Lo que la persona describió al crear el viaje ("restaurantes
            // típicos, naturaleza, museos de historia...") ya dice qué le
            // interesa: se usa como punto de partida en cada ciudad, sin
            // obligar a volver a escribirlo — pero solo mientras esta etapa
            // no tenga su propia búsqueda (ni una activa ni un "Limpiar"
            // explícito, que también debe respetarse).
            const textoOriginalViaje = viaje.contexto.textoOriginal;
            const categoriasSugeridas = textoOriginalViaje ? interpretarIntencion(textoOriginalViaje) : [];
            const haySugerenciaDelViaje = categoriasBuscadasPorEtapa[etapa.id] === undefined && categoriasSugeridas.length > 0;

            const textoIntencion = textosIntencion[etapa.id] ?? (haySugerenciaDelViaje ? textoOriginalViaje ?? "" : "");
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
            const listaMostrada = [...(categoriasBuscadas !== null ? resultadosBusqueda : items)].sort(
              (a, b) => ORDEN_CATEGORIAS.indexOf(a.categoria) - ORDEN_CATEGORIAS.indexOf(b.categoria)
            );

            function buscarPorIntencion(e: React.FormEvent) {
              e.preventDefault();
              setCategoriasBuscadasPorEtapa((prev) => ({ ...prev, [etapa.id]: interpretarIntencion(textoIntencion) }));
            }

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
                      if (!resumen || resumen === "cargando" || resumen === "sin_datos") return null;
                      return (
                        <div className="rounded-xl bg-gradient-to-br from-marino-50 to-coral-50 p-4">
                          <p className="mb-1 text-sm font-medium text-marino-900">🌎 Sobre {etapa.nombre}</p>
                          <p className="text-sm leading-relaxed text-neutral-700">{resumen.extracto}</p>
                          <a href={resumen.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-xs text-marino-600 underline hover:text-marino-800">
                            Seguir leyendo en Wikipedia
                          </a>
                        </div>
                      );
                    })()}

                    <div className="rounded-xl border border-dashed border-marino-200 bg-marino-50/50 p-3">
                      <p className="mb-1 text-sm font-medium text-marino-900">✨ ¿Qué te gustaría hacer en {etapa.nombre}?</p>
                      <p className="mb-2 text-xs text-neutral-500">
                        Describe en pocas palabras qué buscas: comida típica, museos, naturaleza, rutas para caminar, ferias, vida nocturna…
                      </p>
                      <form onSubmit={buscarPorIntencion} className="space-y-2">
                        <textarea
                          className="input text-sm"
                          rows={2}
                          placeholder="Ej: comida típica, museos de historia, caminar por miradores"
                          value={textoIntencion}
                          onChange={(e) => setTextosIntencion((prev) => ({ ...prev, [etapa.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="btn-primary text-sm px-3 py-1.5">
                            🔎 Buscar
                          </button>
                          {categoriasBuscadas !== null && (
                            <button
                              type="button"
                              onClick={() => {
                                setCategoriasBuscadasPorEtapa((prev) => ({ ...prev, [etapa.id]: null }));
                                setTextosIntencion((prev) => ({ ...prev, [etapa.id]: "" }));
                              }}
                              className="btn-secondary text-sm px-3 py-1.5"
                            >
                              Limpiar
                            </button>
                          )}
                        </div>
                      </form>

                      {categoriasBuscadas !== null && (
                        <div className="mt-3 border-t border-marino-100 pt-3">
                          {categoriasBuscadas.length === 0 ? (
                            <p className="text-sm text-neutral-400">
                              No detectamos categorías conocidas. Prueba con &quot;restaurantes&quot;, &quot;naturaleza&quot;,
                              &quot;museos&quot;, &quot;caminar&quot; o &quot;vida nocturna&quot;.
                            </p>
                          ) : (
                            <p className="text-xs text-neutral-500">
                              {haySugerenciaDelViaje ? "✨ Basado en lo que describiste al crear el viaje: " : "Detectamos: "}
                              {categoriasBuscadas.map((c) => ETIQUETA_CATEGORIA[c].etiqueta).join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {estadoWikivoyage[etapa.nombre] === "sin_datos" && (
                      <p className="text-xs text-neutral-400">
                        📖 No encontramos una guía Wikivoyage con datos extraíbles para {etapa.nombre}. El catálogo
                        orientativo y los sitios de OpenStreetMap de abajo siguen disponibles igual.
                      </p>
                    )}

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
