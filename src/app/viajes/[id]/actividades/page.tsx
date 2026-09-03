"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { actividadesDe, alojamientosDe } from "@/lib/catalogo";
import { buscarDestinoPorId, buscarDestinoPorNombre } from "@/lib/destinos";
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

function cumpleFiltro(a: ActividadDestino, filtro: Filtro): boolean {
  if (filtro === "todo") return true;
  // "mixto" cuenta para exterior y para interior: una ruta gastronómica
  // sirve tanto si llueve como si no, y esconderla en cualquiera de los
  // dos filtros sería peor que mostrarla en ambos.
  if (filtro === "exterior") return a.entorno === "exterior" || a.entorno === "mixto";
  if (filtro === "interior") return a.entorno === "interior" || a.entorno === "mixto";
  if (filtro === "gratis") return a.costeEstimado === 0;
  return a.admiteMascotas;
}

function ClasificacionChips({ a }: { a: ActividadDestino }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="chip">⏱️ {a.duracionHoras}h</span>
      <span className="chip">{a.costeEstimado > 0 ? `💵 ${a.costeEstimado}€` : "🆓 Gratis"}</span>
      <span className="chip">
        {a.entorno === "exterior" ? "☀️ Al aire libre" : a.entorno === "interior" ? "🏛️ En interior" : "🌤️ Interior y exterior"}
      </span>
      {a.admiteMascotas && <span className="chip">🐾 Admite mascotas</span>}
    </div>
  );
}

export default function ActividadesPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje, viajeros } = useData();
  const viaje = obtenerViaje(params.id);
  const destino = viaje ? buscarDestinoPorId(viaje.destinoId) ?? buscarDestinoPorNombre(viaje.destino) : undefined;

  const [horasLibres, setHorasLibres] = useState("");
  const [adaptacion, setAdaptacion] = useState<Adaptacion>(null);
  const [filtro, setFiltro] = useState<Filtro>("todo");

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  if (!destino) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Actividades" volverA={`/viajes/${viaje.id}`} />
          <ViajeToolsNav viajeId={viaje.id} />
          <p className="text-sm text-neutral-500">
            No hay catálogo disponible para &quot;{viaje.destino}&quot; (no coincide con ningún destino de nuestro catálogo).
          </p>
        </div>
      </main>
    );
  }

  const catalogo = actividadesDe(destino);

  function setEstado(actividadId: string, estado: EstadoActividad | null) {
    if (!viaje) return;
    if (estado === null) {
      actualizarViaje(viaje.id, { actividades: viaje.actividades.filter((a) => a.actividadId !== actividadId) });
      return;
    }
    const existe = viaje.actividades.some((a) => a.actividadId === actividadId);
    const actividades = existe
      ? viaje.actividades.map((a) => (a.actividadId === actividadId ? { ...a, estado } : a))
      : [...viaje.actividades, { actividadId, estado }];
    actualizarViaje(viaje.id, { actividades });
  }

  // Modo espontáneo: qué toca ahora, qué encaja con el tiempo/ánimo del
  // momento — vivía como página propia (Modo viaje) y se ha fundido aquí
  // porque su única fuente de datos es este mismo catálogo de actividades.
  const hoy = new Date();
  const salida = viaje.fechaSalida ? new Date(viaje.fechaSalida) : undefined;
  const regreso = viaje.fechaRegreso ? new Date(viaje.fechaRegreso) : undefined;
  const enCurso = !!salida && !!regreso && hoy >= salida && hoy <= regreso;

  const alojamiento = alojamientosDe(destino).find((a) => a.id === viaje.alojamientoId);
  const proximoTramo = [...viaje.transporte]
    .filter((t) => t.horaSalida)
    .sort((a, b) => (a.horaSalida ?? "").localeCompare(b.horaSalida ?? ""))
    .find((t) => new Date(t.horaSalida!) >= hoy);
  const actividadesPendientes = viaje.actividades.filter((a) => a.estado === "planificada" || a.estado === "reservada").length;

  const horas = Number.parseFloat(horasLibres);
  const sugerenciasHorasLibres =
    !Number.isNaN(horas) && horas > 0
      ? catalogo
          .filter((a) => a.duracionHoras <= horas && !viaje.actividades.some((v) => v.actividadId === a.id && v.estado !== "disponible"))
          .slice(0, 3)
      : [];

  const sugerenciasAdaptacion = (() => {
    if (adaptacion === "lluvia") return catalogo.filter((a) => a.entorno === "interior" || a.entorno === "mixto").slice(0, 3);
    if (adaptacion === "cansancio") return catalogo.filter((a) => a.apta.includes("tranquilo") || a.duracionHoras <= 1.5).slice(0, 3);
    return [];
  })();

  const filtradas = catalogo.filter((a) => cumpleFiltro(a, filtro));

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Actividades" subtitulo={`Todo lo que puedes hacer en ${destino.nombre}.`} volverA={`/viajes/${viaje.id}`} />
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
          <input
            type="number"
            step="0.5"
            className="input"
            placeholder="¿Cuántas horas tienes?"
            value={horasLibres}
            onChange={(e) => setHorasLibres(e.target.value)}
          />
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
            <p className="mt-3 text-sm text-neutral-400">No hay actividades del catálogo que quepan en ese tiempo.</p>
          )}
        </section>

        <section className="card mb-6">
          <h2 className="mb-3 font-medium">Algo ha cambiado</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAdaptacion(adaptacion === "lluvia" ? null : "lluvia")}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${adaptacion === "lluvia" ? "border-marino-500 bg-marino-50 text-marino-800" : "border-neutral-200 hover:border-neutral-400"}`}
            >
              🌧️ Está lloviendo
            </button>
            <button
              onClick={() => setAdaptacion(adaptacion === "cansancio" ? null : "cansancio")}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${adaptacion === "cansancio" ? "border-marino-500 bg-marino-50 text-marino-800" : "border-neutral-200 hover:border-neutral-400"}`}
            >
              😴 Estamos cansados
            </button>
            <button
              onClick={() => setAdaptacion(adaptacion === "transporte_perdido" ? null : "transporte_perdido")}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${adaptacion === "transporte_perdido" ? "border-marino-500 bg-marino-50 text-marino-800" : "border-neutral-200 hover:border-neutral-400"}`}
            >
              🚫 Perdimos el transporte
            </button>
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
              {sugerenciasAdaptacion.length === 0 && <li className="text-sm text-neutral-400">No hay alternativas claras en el catálogo de este destino.</li>}
              {sugerenciasAdaptacion.map((a) => (
                <li key={a.id} className="rounded-xl bg-neutral-50 px-3 py-2 text-sm">
                  <span className="font-medium">{a.nombre}</span>
                  <span className="text-neutral-500"> — ~{a.duracionHoras}h</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-medium">Todo lo disponible</h2>
          <span className="text-xs text-neutral-400">
            {filtradas.length} de {catalogo.length}
          </span>
        </div>

        {/* Los filtros son las tres preguntas que de verdad deciden el plan
            del día: si llueve, si va el perro y si hay que pagar. */}
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

        {filtradas.length === 0 ? (
          <p className="text-sm text-neutral-500">Ninguna actividad del catálogo cumple ese filtro en este destino.</p>
        ) : (
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
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTILO_ESTADO[estado]}`}>
                      {ETIQUETA_ESTADO[estado]}
                    </span>
                  </div>

                  <ClasificacionChips a={act} />

                  <div className="mt-3 flex flex-wrap gap-2">
                    {estado === "disponible" && (
                      <button onClick={() => setEstado(act.id, "planificada")} className="btn-primary px-3 py-1.5 text-xs">
                        + Añadir al viaje
                      </button>
                    )}
                    {estado === "planificada" && (
                      <>
                        <button onClick={() => setEstado(act.id, "reservada")} className="btn-secondary px-3 py-1.5 text-xs">
                          Reservada
                        </button>
                        <button onClick={() => setEstado(act.id, "realizada")} className="btn-secondary px-3 py-1.5 text-xs">
                          Ya la hicimos
                        </button>
                        <button onClick={() => setEstado(act.id, null)} className="px-2 py-1.5 text-xs text-neutral-400 hover:text-red-600">
                          Quitar
                        </button>
                      </>
                    )}
                    {estado === "reservada" && (
                      <>
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

        <p className="mt-6 text-xs text-neutral-400">
          Catálogo orientativo por tipo de plan, generado a partir de las características del destino: duraciones y
          costes son estimaciones para dimensionar el día y el presupuesto, no entradas reales a la venta.
        </p>
      </div>
    </main>
  );
}
