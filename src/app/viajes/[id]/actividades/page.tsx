"use client";

import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { actividadesDe } from "@/lib/catalogo";
import { buscarDestinoPorId, buscarDestinoPorNombre } from "@/lib/destinos";
import type { EstadoActividad } from "@/lib/types";

const ETIQUETA_ESTADO: Record<EstadoActividad, string> = {
  disponible: "Disponible",
  planificada: "Planificada",
  reservada: "Reservada",
  realizada: "Realizada",
  descartada: "Descartada",
};

const ESTILO_ESTADO: Record<EstadoActividad, string> = {
  disponible: "bg-neutral-100 text-neutral-600",
  planificada: "bg-blue-50 text-blue-700",
  reservada: "bg-violet-50 text-violet-700",
  realizada: "bg-emerald-50 text-emerald-700",
  descartada: "bg-neutral-100 text-neutral-400",
};

export default function ActividadesPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);
  const destino = viaje ? buscarDestinoPorId(viaje.destinoId) ?? buscarDestinoPorNombre(viaje.destino) : undefined;

  if (!viaje) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  if (!destino) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Actividades" volverA={`/viajes/${viaje.id}`} />
          <p className="text-sm text-neutral-500">
            No hay catálogo disponible para &quot;{viaje.destino}&quot; (no coincide con ningún destino del sistema).
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

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Bolsa de posibilidades" subtitulo={`Actividades para ${destino.nombre}.`} volverA={`/viajes/${viaje.id}`} />

        <ul className="space-y-3">
          {catalogo.map((act) => {
            const entrada = viaje.actividades.find((a) => a.actividadId === act.id);
            const estado = entrada?.estado ?? "disponible";
            return (
              <li key={act.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{act.nombre}</p>
                    <p className="text-sm text-neutral-500">{act.descripcion}</p>
                    <p className="mt-1 text-xs text-neutral-400">
                      ~{act.duracionHoras}h · {act.costeEstimado > 0 ? `${act.costeEstimado}€` : "Gratis"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTILO_ESTADO[estado]}`}>
                    {ETIQUETA_ESTADO[estado]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {estado === "disponible" && (
                    <button onClick={() => setEstado(act.id, "planificada")} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700">
                      + Añadir al viaje
                    </button>
                  )}
                  {estado === "planificada" && (
                    <>
                      <button onClick={() => setEstado(act.id, "reservada")} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:border-neutral-900">
                        Reservar
                      </button>
                      <button onClick={() => setEstado(act.id, "realizada")} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:border-neutral-900">
                        Marcar realizada
                      </button>
                      <button onClick={() => setEstado(act.id, null)} className="rounded-lg px-3 py-1.5 text-sm text-neutral-400 hover:text-red-600">
                        Quitar
                      </button>
                    </>
                  )}
                  {estado === "reservada" && (
                    <>
                      <button onClick={() => setEstado(act.id, "realizada")} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:border-neutral-900">
                        Marcar realizada
                      </button>
                      <button onClick={() => setEstado(act.id, null)} className="rounded-lg px-3 py-1.5 text-sm text-neutral-400 hover:text-red-600">
                        Quitar
                      </button>
                    </>
                  )}
                  {estado === "realizada" && (
                    <button onClick={() => setEstado(act.id, "planificada")} className="rounded-lg px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-900">
                      Deshacer
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
