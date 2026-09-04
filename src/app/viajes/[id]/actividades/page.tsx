"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { actividadesDe, alojamientosDe } from "@/lib/catalogo";
import { destinoPrincipal } from "@/lib/viaje";
import type { ActividadDestino, EstadoActividad } from "@/lib/types";

const ETIQUETA_ESTADO: Record<EstadoActividad, string> = {
  disponible: "Disponible",
  planificada: "Planificada",
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

type Adaptacion = "lluvia" | "cansancio" | "transporte_perdido" | null;
type Filtro = "todo" | "exterior" | "interior" | "gratis" | "mascotas";

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: "todo", etiqueta: "Todo" },
  { valor: "exterior", etiqueta: "☀️ Al aire libre" },
  { valor: "interior", etiqueta: "🏛️ En interior" },
  { valor: "gratis", etiqueta: "🆓 Gratis" },
  { valor: "mascotas", etiqueta: "🐾 Con mascota" },
];

type Item = ActividadDestino & { esPropia: boolean };

function cumpleFiltro(a: Item, filtro: Filtro): boolean {
  if (filtro === "todo") return true;
  // "mixto" cuenta para exterior y para interior: una ruta gastronómica
  // sirve tanto si llueve como si no, y esconderla en cualquiera de los
  // dos filtros sería peor que mostrarla en ambos.
  if (filtro === "exterior") return a.entorno === "exterior" || a.entorno === "mixto";
  if (filtro === "interior") return a.entorno === "interior" || a.entorno === "mixto";
  if (filtro === "gratis") return a.costeEstimado === 0;
  return a.admiteMascotas;
}

export default function ActividadesPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje, viajeros } = useData();
  const viaje = obtenerViaje(params.id);
  const destino = viaje ? destinoPrincipal(viaje) : undefined;

  const [horasLibres, setHorasLibres] = useState("");
  const [adaptacion, setAdaptacion] = useState<Adaptacion>(null);
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [horasNueva, setHorasNueva] = useState("");
  const [costeNueva, setCosteNueva] = useState("");
  const [entornoNueva, setEntornoNueva] = useState<"exterior" | "interior" | "mixto">("exterior");
  const [mascotaNueva, setMascotaNueva] = useState(false);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  // Catálogo del destino (si lo tenemos) MÁS las actividades que haya
  // puesto el viajero. Antes, sin destino curado esta pantalla no dejaba
  // hacer nada: ahora siempre se puede construir el plan a mano.
  const delCatalogo: Item[] = destino ? actividadesDe(destino).map((a) => ({ ...a, esPropia: false })) : [];
  const propias: Item[] = viaje.actividades
    .filter((a) => a.propia)
    .map((a) => ({
      id: a.actividadId,
      nombre: a.propia!.nombre,
      tipo: "propia",
      duracionHoras: a.propia!.duracionHoras ?? 0,
      costeEstimado: a.propia!.costeEstimado ?? 0,
      apta: [],
      entorno: a.propia!.entorno ?? "mixto",
      admiteMascotas: a.propia!.admiteMascotas ?? false,
      descripcion: "Actividad añadida por ti.",
      esPropia: true,
    }));
  const catalogo: Item[] = [...propias, ...delCatalogo];

  function setEstado(actividadId: string, estado: EstadoActividad | null) {
    if (!viaje) return;
    const entrada = viaje.actividades.find((a) => a.actividadId === actividadId);
    // Quitar una actividad propia la borra; quitar una del catálogo solo
    // la devuelve a "disponible", porque el catálogo sigue existiendo.
    if (estado === null) {
      actualizarViaje(viaje.id, { actividades: viaje.actividades.filter((a) => a.actividadId !== actividadId) });
      return;
    }
    const actividades = entrada
      ? viaje.actividades.map((a) => (a.actividadId === actividadId ? { ...a, estado } : a))
      : [...viaje.actividades, { actividadId, estado }];
    actualizarViaje(viaje.id, { actividades });
  }

  function anadirPropia(e: React.FormEvent) {
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
    setMostrarForm(false);
  }

  const hoy = new Date();
  const salida = viaje.fechaSalida ? new Date(viaje.fechaSalida) : undefined;
  const regreso = viaje.fechaRegreso ? new Date(viaje.fechaRegreso) : undefined;
  const enCurso = !!salida && !!regreso && hoy >= salida && hoy <= regreso;

  const alojamiento = destino ? alojamientosDe(destino).find((a) => a.id === viaje.alojamientoId) : undefined;
  const proximoTramo = [...viaje.transporte]
    .filter((t) => t.horaSalida)
    .sort((a, b) => (a.horaSalida ?? "").localeCompare(b.horaSalida ?? ""))
    .find((t) => new Date(t.horaSalida!) >= hoy);
  const actividadesPendientes = viaje.actividades.filter((a) => a.estado === "planificada" || a.estado === "reservada").length;

  const horas = Number.parseFloat(horasLibres);
  const sugerenciasHorasLibres =
    !Number.isNaN(horas) && horas > 0
      ? catalogo
          .filter((a) => a.duracionHoras > 0 && a.duracionHoras <= horas && !viaje.actividades.some((v) => v.actividadId === a.id && v.estado !== "disponible"))
          .slice(0, 3)
      : [];

  const sugerenciasAdaptacion = (() => {
    if (adaptacion === "lluvia") return catalogo.filter((a) => a.entorno === "interior" || a.entorno === "mixto").slice(0, 3);
    if (adaptacion === "cansancio") return catalogo.filter((a) => a.apta.includes("tranquilo") || (a.duracionHoras > 0 && a.duracionHoras <= 1.5)).slice(0, 3);
    return [];
  })();

  const filtradas = catalogo.filter((a) => cumpleFiltro(a, filtro));

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <Cabecera
          titulo="Actividades"
          subtitulo={destino ? `Todo lo que puedes hacer en ${destino.nombre}.` : `Lo que quieras hacer en ${viaje.destino}.`}
          volverA={`/viajes/${viaje.id}`}
        />
        <ViajeToolsNav viajeId={viaje.id} />

        <section className="card mb-6">
          <h2 className="mb-3 font-medium">Ahora</h2>
          {!enCurso ? (
            <p className="text-sm text-neutral-500">
              {salida && hoy < salida
                ? `Este viaje empieza el ${viaje.fechaSalida}.`
                : salida
                  ? "Este viaje ya ha terminado."
                  : "Todavía no tienes fechas confirmadas para este viaje."}
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <p>
                📍 Estás en <strong>{viaje.destino}</strong>
              </p>
              {proximoTramo ? (
                <p>
                  🚆 Próximo transporte: {proximoTramo.origen} → {proximoTramo.destino} ({proximoTramo.horaSalida?.replace("T", " ")})
                </p>
              ) : (
                <p className="text-neutral-400">Sin próximos transportes programados.</p>
              )}
              {alojamiento ? <p>🏨 {alojamiento.nombre}</p> : <p className="text-neutral-400">Sin alojamiento de referencia todavía.</p>}
              <p>🎒 {actividadesPendientes} actividad(es) pendientes.</p>
              <p className="text-neutral-500">🧑‍🤝‍🧑 {viajeros.filter((v) => viaje.viajerosIds.includes(v.id)).length} viajero(s) en este viaje.</p>
            </div>
          )}
        </section>

        <section className="card mb-6">
          <h2 className="mb-3 font-medium">Tengo un rato libre</h2>
          <input type="number" step="0.5" className="input" placeholder="¿Cuántas horas tienes?" value={horasLibres} onChange={(e) => setHorasLibres(e.target.value)} />
          {sugerenciasHorasLibres.length > 0 && (
            <ul className="mt-3 space-y-2">
              {sugerenciasHorasLibres.map((a) => (
                <li key={a.id} className="rounded-xl bg-neutral-50 px-3 py-2 text-sm">
                  <span className="font-medium">{a.nombre}</span>
                  <span className="text-neutral-500"> — ~{a.duracionHoras}h, {a.costeEstimado > 0 ? `${a.costeEstimado}€` : "gratis"}</span>
                </li>
              ))}
            </ul>
          )}
          {horas > 0 && sugerenciasHorasLibres.length === 0 && (
            <p className="mt-3 text-sm text-neutral-400">Nada en tu lista cabe en ese tiempo.</p>
          )}
        </section>

        <section className="card mb-6">
          <h2 className="mb-3 font-medium">Algo ha cambiado</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["lluvia", "🌧️ Está lloviendo"],
                ["cansancio", "😴 Estamos cansados"],
                ["transporte_perdido", "🚫 Perdimos el transporte"],
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

          {adaptacion === "transporte_perdido" && (
            <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-3 text-sm">
              <p className="mb-2 text-neutral-600">Alternativas orientativas (comprueba horarios reales in situ):</p>
              <ul className="space-y-1">
                <li>1. Siguiente tramo del mismo tipo, ~30 min después</li>
                <li>2. Autobús alternativo, si existe en la zona</li>
                <li>3. Taxi/transfer + conexión con el resto del plan</li>
              </ul>
            </div>
          )}

          {(adaptacion === "lluvia" || adaptacion === "cansancio") && (
            <ul className="mt-3 space-y-2">
              {sugerenciasAdaptacion.length === 0 && <li className="text-sm text-neutral-400">No hay alternativas claras en tu lista.</li>}
              {sugerenciasAdaptacion.map((a) => (
                <li key={a.id} className="rounded-xl bg-neutral-50 px-3 py-2 text-sm">
                  <span className="font-medium">{a.nombre}</span>
                  {a.duracionHoras > 0 && <span className="text-neutral-500"> — ~{a.duracionHoras}h</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-medium">{destino ? "Todo lo disponible" : "Tu lista"}</h2>
          <span className="text-xs text-neutral-400">
            {filtradas.length} de {catalogo.length}
          </span>
        </div>

        {catalogo.length > 0 && (
          <div className="mb-4 -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                onClick={() => setFiltro(f.valor)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  filtro === f.valor ? "border-marino-700 bg-marino-700 text-white" : "border-neutral-200 text-neutral-600 hover:border-marino-500"
                }`}
              >
                {f.etiqueta}
              </button>
            ))}
          </div>
        )}

        {!destino && (
          <p className="mb-3 rounded-xl bg-neutral-100 px-4 py-3 text-xs text-neutral-600">
            No tenemos catálogo propio de {viaje.destino}, así que aquí mandas tú: añade lo que quieras hacer y contará
            para el presupuesto y para las sugerencias de &quot;tengo un rato libre&quot;.
          </p>
        )}

        {catalogo.length > 0 && (
          <ul className="space-y-3">
            {filtradas.map((act) => {
              const entrada = viaje.actividades.find((a) => a.actividadId === act.id);
              const estado = entrada?.estado ?? "disponible";
              return (
                <li key={act.id} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{act.nombre}</p>
                      <p className="text-sm text-neutral-500">{act.descripcion}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTILO_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {act.duracionHoras > 0 && <span className="chip">⏱️ {act.duracionHoras}h</span>}
                    <span className="chip">{act.costeEstimado > 0 ? `💵 ${act.costeEstimado}€` : "🆓 Gratis"}</span>
                    <span className="chip">
                      {act.entorno === "exterior" ? "☀️ Al aire libre" : act.entorno === "interior" ? "🏛️ En interior" : "🌤️ Interior y exterior"}
                    </span>
                    {act.admiteMascotas && <span className="chip">🐾 Admite mascotas</span>}
                    {act.esPropia && <span className="chip">✍️ Tuya</span>}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {estado === "disponible" && (
                      <button onClick={() => setEstado(act.id, "planificada")} className="btn-primary px-3 py-1.5 text-xs">
                        + Añadir al viaje
                      </button>
                    )}
                    {(estado === "planificada" || estado === "reservada") && (
                      <>
                        {estado === "planificada" && (
                          <button onClick={() => setEstado(act.id, "reservada")} className="btn-secondary px-3 py-1.5 text-xs">
                            Reservada
                          </button>
                        )}
                        <button onClick={() => setEstado(act.id, "realizada")} className="btn-secondary px-3 py-1.5 text-xs">
                          Ya la hicimos
                        </button>
                        <button onClick={() => setEstado(act.id, null)} className="px-2 py-1.5 text-xs text-neutral-400 hover:text-red-600">
                          Quitar
                        </button>
                      </>
                    )}
                    {estado === "realizada" && (
                      <button onClick={() => setEstado(act.id, "planificada")} className="px-2 py-1.5 text-xs text-neutral-400 hover:text-neutral-900">
                        Deshacer
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Poder añadir lo tuyo es lo que hace que esta pantalla sirva en
            cualquier destino, tengamos catálogo o no. */}
        {mostrarForm ? (
          <form onSubmit={anadirPropia} className="card mt-4 space-y-3">
            <p className="text-sm font-medium text-neutral-700">Añadir una actividad tuya</p>
            <input className="input" placeholder="¿Qué quieres hacer? (ej. Finca cafetera en Salento)" value={nombreNueva} onChange={(e) => setNombreNueva(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.5" min="0" className="input" placeholder="Horas" value={horasNueva} onChange={(e) => setHorasNueva(e.target.value)} />
              <input type="number" min="0" className="input" placeholder="Coste €" value={costeNueva} onChange={(e) => setCosteNueva(e.target.value)} />
            </div>
            <select className="input" value={entornoNueva} onChange={(e) => setEntornoNueva(e.target.value as typeof entornoNueva)}>
              <option value="exterior">☀️ Al aire libre</option>
              <option value="interior">🏛️ En interior</option>
              <option value="mixto">🌤️ Interior y exterior</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input type="checkbox" checked={mascotaNueva} onChange={(e) => setMascotaNueva(e.target.checked)} />
              Admite mascotas
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">
                Añadir
              </button>
              <button type="button" onClick={() => setMostrarForm(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setMostrarForm(true)} className="mt-4 text-sm text-neutral-500 underline hover:text-neutral-900">
            + Añadir una actividad tuya
          </button>
        )}

        {destino && (
          <p className="mt-6 text-xs text-neutral-400">
            El catálogo es orientativo y se genera a partir de las características del destino: duraciones y costes son
            estimaciones para dimensionar el día y el presupuesto, no entradas reales a la venta.
          </p>
        )}
      </div>
    </main>
  );
}
