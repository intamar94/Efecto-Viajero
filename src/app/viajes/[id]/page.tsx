"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { EstadoBadge } from "@/components/EstadoBadge";
import { useData } from "@/lib/store";
import { calcularRequisitos, ORDEN_ESTADO } from "@/lib/requisitos";
import { buscarDestinoPorId, buscarDestinoPorNombre } from "@/lib/destinos";
import { alojamientosDe, actividadesDe } from "@/lib/catalogo";
import { calcularPresupuesto, sugerirAjustePresupuesto } from "@/lib/compatibilidad";
import { resumenViaje } from "@/lib/travelBrain";
import type { EstadoRequisito, ModoPlanificacion } from "@/lib/types";

const MODOS: { valor: ModoPlanificacion; etiqueta: string; descripcion: string }[] = [
  { valor: "completo", etiqueta: "🗓️ Planificarlo completo", descripcion: "Días, horarios y actividades definidos." },
  { valor: "poco_a_poco", etiqueta: "🧩 Organizarlo poco a poco", descripcion: "Solo lo importante; el resto se completa después." },
  { valor: "dejarse_llevar", etiqueta: "🌿 Dejarse llevar", descripcion: "Vuelos y alojamiento fijos; el resto queda abierto." },
];

const SECCIONES = [
  { href: "transporte", icono: "🚆", titulo: "Transporte" },
  { href: "alojamiento", icono: "🏨", titulo: "Alojamiento" },
  { href: "actividades", icono: "🎒", titulo: "Actividades" },
  { href: "vault", icono: "📁", titulo: "Travel Vault" },
  { href: "souvenirs", icono: "🎁", titulo: "Souvenirs" },
  { href: "compartido", icono: "👥", titulo: "Compartido" },
  { href: "recuerdos", icono: "📸", titulo: "Recuerdos" },
] as const;

const NIVEL_ESTILO: Record<string, string> = {
  alerta: "border-red-200 bg-red-50 text-red-700",
  aviso: "border-amber-200 bg-amber-50 text-amber-700",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function ViajeDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { obtenerViaje, actualizarViaje, eliminarViaje, viajeros } = useData();
  const [mostrarAjuste, setMostrarAjuste] = useState(false);
  const viaje = obtenerViaje(params.id);

  const destino = viaje ? buscarDestinoPorId(viaje.destinoId) ?? buscarDestinoPorNombre(viaje.destino) : undefined;

  const viajerosDelViaje = useMemo(
    () => (viaje ? viajeros.filter((v) => viaje.viajerosIds.includes(v.id)) : []),
    [viaje, viajeros]
  );

  const requisitos = useMemo(() => (viaje ? calcularRequisitos(viaje, viajeros) : []), [viaje, viajeros]);
  const presupuesto = useMemo(() => (viaje ? calcularPresupuesto(viaje, destino) : null), [viaje, destino]);
  const insights = useMemo(() => (viaje ? resumenViaje(viaje, requisitos, destino) : []), [viaje, requisitos, destino]);

  if (!viaje) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  const alojamientoElegido = destino ? alojamientosDe(destino).find((a) => a.id === viaje.alojamientoId) : undefined;
  const numActividadesDisponibles = destino ? actividadesDe(destino).length : 0;
  const numActividadesEnMarcha = viaje.actividades.filter((a) => a.estado !== "descartada").length;

  const estadoTexto: Record<(typeof SECCIONES)[number]["href"], string> = {
    transporte: viaje.transporte.length > 0 ? `${viaje.transporte.length} tramo(s)` : "Sin definir",
    alojamiento: alojamientoElegido ? alojamientoElegido.nombre : "Sin elegir",
    actividades: `${numActividadesEnMarcha} en marcha · ${numActividadesDisponibles} disponibles`,
    vault: viaje.documentos.length > 0 ? `${viaje.documentos.length} documento(s)` : "Vacío",
    souvenirs: viaje.souvenirs.length > 0 ? `${viaje.souvenirs.length} en la lista` : "Vacío",
    compartido: viaje.participantes.length > 0 ? `${viaje.participantes.length} participante(s)` : "Solo tú",
    recuerdos: viaje.recuerdos.length > 0 ? `${viaje.recuerdos.length} momento(s)` : "Sin momentos aún",
  };

  function borrarViaje() {
    if (!viaje) return;
    if (!confirm(`¿Eliminar el viaje a ${viaje.destino}?`)) return;
    eliminarViaje(viaje.id);
    router.push("/viajes");
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo={viaje.destino} subtitulo={`${viaje.fechaSalida} → ${viaje.fechaRegreso}`} volverA="/viajes" />

        <div className="mb-6 flex gap-2">
          <Link href={`/viajes/${viaje.id}/modo`} className="flex-1 rounded-xl bg-neutral-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-neutral-700">
            📍 Modo viaje
          </Link>
          <Link href={`/viajes/${viaje.id}/resolver`} className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-center text-sm font-medium text-neutral-700 hover:border-neutral-900">
            🆘 Necesito ayuda
          </Link>
        </div>

        {insights.length > 0 && (
          <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 font-medium">Resumen</h2>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${NIVEL_ESTILO[insight.nivel]}`}>
                  <span>{insight.texto}</span>
                  {insight.accion && (
                    <Link href={insight.accion.href} className="shrink-0 whitespace-nowrap underline">
                      {insight.accion.texto}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 font-medium">Viajeros</h2>
          <div className="flex flex-wrap gap-2">
            {viajerosDelViaje.map((v) => (
              <span key={v.id} className="rounded-full border border-neutral-200 px-3 py-1 text-sm">
                {v.tipo === "persona" ? "🧑" : "🐾"} {v.nombre}
              </span>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 font-medium">¿Cómo quieres organizar este viaje?</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODOS.map((m) => (
              <button
                key={m.valor}
                onClick={() => actualizarViaje(viaje.id, { modoPlanificacion: m.valor })}
                className={`rounded-xl border p-3 text-left text-sm transition ${
                  viaje.modoPlanificacion === m.valor ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"
                }`}
              >
                <p className="font-medium">{m.etiqueta}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{m.descripcion}</p>
              </button>
            ))}
          </div>
        </section>

        {presupuesto && presupuesto.presupuestoTotal !== undefined && (
          <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-3 font-medium">Presupuesto</h2>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-500">Planificado</span>
              <span className="font-medium">{presupuesto.total}€ de {presupuesto.presupuestoTotal}€</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className={`h-full rounded-full ${presupuesto.excedido ? "bg-red-500" : "bg-neutral-900"}`}
                style={{ width: `${Math.min((presupuesto.total / presupuesto.presupuestoTotal) * 100, 100)}%` }}
              />
            </div>
            <p className={`mt-2 text-sm ${presupuesto.excedido ? "text-red-600" : "text-neutral-500"}`}>
              {presupuesto.excedido
                ? `Presupuesto excedido en ${Math.abs(presupuesto.disponible ?? 0)}€`
                : `Disponible: ${presupuesto.disponible}€`}
            </p>

            {presupuesto.excedido && (() => {
              const sugerencia = sugerirAjustePresupuesto(viaje, destino);
              if (!sugerencia) {
                return <p className="mt-3 text-sm text-neutral-500">No hay un ajuste automático disponible: revisa transporte o actividades a mano.</p>;
              }
              return mostrarAjuste ? (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm">
                  <p className="mb-2 text-red-700">Podemos: {sugerencia.descripcion}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        actualizarViaje(viaje.id, sugerencia.aplicar(viaje));
                        setMostrarAjuste(false);
                      }}
                      className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
                    >
                      Ajustar automáticamente
                    </button>
                    <button onClick={() => setMostrarAjuste(false)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:border-neutral-900">
                      Decidir yo
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setMostrarAjuste(true)} className="mt-3 text-sm underline text-red-600 hover:text-red-800">
                  Ver cómo resolverlo
                </button>
              );
            })()}
          </section>
        )}

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-medium">Requisitos</h2>
          </div>
          <p className="mb-4 text-xs text-neutral-400">
            Estimación orientativa, no oficial. Verifica siempre en la fuente oficial del país de destino antes de viajar.
          </p>

          {viajerosDelViaje.map((v) => {
            const resultadosViajero = requisitos
              .filter((r) => r.viajeroId === v.id)
              .sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]);
            const peorEstado: EstadoRequisito = resultadosViajero.reduce<EstadoRequisito>(
              (peor, r) => (ORDEN_ESTADO[r.estado] < ORDEN_ESTADO[peor] ? r.estado : peor),
              "verde"
            );

            return (
              <div key={v.id} className="mb-5 border-b border-neutral-100 pb-5 last:mb-0 last:border-none last:pb-0">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">
                    {v.tipo === "persona" ? "🧑" : "🐾"} {v.nombre}
                  </p>
                  <EstadoBadge estado={peorEstado} />
                </div>
                <ul className="space-y-2">
                  {resultadosViajero.map((r, i) => (
                    <li key={i} className="rounded-xl bg-neutral-50 px-4 py-3 text-sm">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="font-medium">{r.titulo}</span>
                        <EstadoBadge estado={r.estado} />
                      </div>
                      <p className="text-neutral-600">{r.motivo}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SECCIONES.map((s) => (
            <Link
              key={s.href}
              href={`/viajes/${viaje.id}/${s.href}`}
              className="rounded-2xl border border-neutral-200 bg-white p-4 hover:border-neutral-900"
            >
              <p className="text-2xl">{s.icono}</p>
              <p className="mt-1 text-sm font-medium">{s.titulo}</p>
              <p className="text-xs text-neutral-500">{estadoTexto[s.href]}</p>
            </Link>
          ))}
        </section>

        <button onClick={borrarViaje} className="text-sm text-red-600 hover:text-red-800">
          Eliminar viaje
        </button>
      </div>
    </main>
  );
}
