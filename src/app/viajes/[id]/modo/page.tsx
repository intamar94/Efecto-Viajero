"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { actividadesDe, alojamientosDe } from "@/lib/catalogo";
import { buscarDestinoPorId, buscarDestinoPorNombre } from "@/lib/destinos";

type Adaptacion = "lluvia" | "cansancio" | "transporte_perdido" | null;

export default function TravelModePage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, viajeros } = useData();
  const viaje = obtenerViaje(params.id);
  const destino = viaje ? buscarDestinoPorId(viaje.destinoId) ?? buscarDestinoPorNombre(viaje.destino) : undefined;

  const [horasLibres, setHorasLibres] = useState("");
  const [adaptacion, setAdaptacion] = useState<Adaptacion>(null);

  if (!viaje) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  const hoy = new Date();
  const salida = new Date(viaje.fechaSalida);
  const regreso = new Date(viaje.fechaRegreso);
  const enCurso = hoy >= salida && hoy <= regreso;

  const catalogo = destino ? actividadesDe(destino) : [];
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
          .filter((a) => a.duracionHoras <= horas && !viaje.actividades.some((v) => v.actividadId === a.id && v.estado !== "disponible"))
          .slice(0, 3)
      : [];

  const sugerenciasAdaptacion = (() => {
    if (adaptacion === "lluvia") return catalogo.filter((a) => a.apta.includes("interior")).slice(0, 3);
    if (adaptacion === "cansancio") return catalogo.filter((a) => a.apta.includes("tranquilo") || a.duracionHoras <= 1.5).slice(0, 3);
    return [];
  })();

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Modo viaje" subtitulo="Lo justo para saber qué toca ahora." volverA={`/viajes/${viaje.id}`} />

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 font-medium">Ahora</h2>
          {!enCurso ? (
            <p className="text-sm text-neutral-500">
              {hoy < salida ? `Este viaje empieza el ${viaje.fechaSalida}.` : "Este viaje ya ha terminado."}
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
              {alojamiento ? <p>🏨 {alojamiento.nombre}</p> : <p className="text-neutral-400">Sin alojamiento elegido todavía.</p>}
              <p>🎒 {actividadesPendientes} actividad(es) pendientes.</p>
              <p className="text-neutral-500">🧑‍🤝‍🧑 {viajeros.filter((v) => viaje.viajerosIds.includes(v.id)).length} viajero(s) en este viaje.</p>
            </div>
          )}
        </section>

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 font-medium">Tengo tiempo libre</h2>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.5"
              className="input"
              placeholder="Horas disponibles"
              value={horasLibres}
              onChange={(e) => setHorasLibres(e.target.value)}
            />
          </div>
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

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 font-medium">Algo ha cambiado</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAdaptacion(adaptacion === "lluvia" ? null : "lluvia")}
              className={`rounded-full border px-3 py-1.5 text-sm ${adaptacion === "lluvia" ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"}`}
            >
              🌧️ Está lloviendo
            </button>
            <button
              onClick={() => setAdaptacion(adaptacion === "cansancio" ? null : "cansancio")}
              className={`rounded-full border px-3 py-1.5 text-sm ${adaptacion === "cansancio" ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"}`}
            >
              😴 Estamos cansados
            </button>
            <button
              onClick={() => setAdaptacion(adaptacion === "transporte_perdido" ? null : "transporte_perdido")}
              className={`rounded-full border px-3 py-1.5 text-sm ${adaptacion === "transporte_perdido" ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"}`}
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
      </div>
    </main>
  );
}
