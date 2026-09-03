"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { EstadoBadge } from "@/components/EstadoBadge";
import { useData } from "@/lib/store";
import { calcularRequisitos, ORDEN_ESTADO } from "@/lib/requisitos";
import type { EstadoRequisito } from "@/lib/types";

export default function ViajeDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { obtenerViaje, viajeros, eliminarViaje } = useData();
  const viaje = obtenerViaje(params.id);

  const viajerosDelViaje = useMemo(
    () => (viaje ? viajeros.filter((v) => viaje.viajerosIds.includes(v.id)) : []),
    [viaje, viajeros]
  );

  const requisitos = useMemo(() => (viaje ? calcularRequisitos(viaje, viajeros) : []), [viaje, viajeros]);

  if (!viaje) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  function borrarViaje() {
    if (!viaje) return;
    if (!confirm(`¿Eliminar el viaje a ${viaje.destino}?`)) return;
    eliminarViaje(viaje.id);
    router.push("/viajes");
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Cabecera
          titulo={viaje.destino}
          subtitulo={`${viaje.fechaSalida} → ${viaje.fechaRegreso}`}
          volverA="/viajes"
        />

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-3 font-medium">Viajeros</h2>
          <div className="flex flex-wrap gap-2">
            {viajerosDelViaje.map((v) => (
              <span key={v.id} className="rounded-full border border-neutral-200 px-3 py-1 text-sm">
                {v.tipo === "persona" ? "🧑" : "🐾"} {v.nombre}
              </span>
            ))}
          </div>
          {viaje.contexto.presupuestoTotal && (
            <p className="mt-3 text-sm text-neutral-500">Presupuesto total: {viaje.contexto.presupuestoTotal}€</p>
          )}
        </section>

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
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

        <button onClick={borrarViaje} className="text-sm text-red-600 hover:text-red-800">
          Eliminar viaje
        </button>
      </div>
    </main>
  );
}
