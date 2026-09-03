"use client";

import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { alojamientosDe } from "@/lib/catalogo";
import { buscarDestinoPorId, buscarDestinoPorNombre } from "@/lib/destinos";

export default function AlojamientoPage() {
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
          <Cabecera titulo="Alojamiento" volverA={`/viajes/${viaje.id}`} />
          <p className="text-sm text-neutral-500">
            No hay catálogo disponible para &quot;{viaje.destino}&quot; (no coincide con ningún destino del sistema).
          </p>
        </div>
      </main>
    );
  }

  const opciones = alojamientosDe(destino);
  const masBarata = [...opciones].sort((a, b) => a.precioNoche - b.precioNoche)[0];

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Alojamiento" subtitulo={`Opciones para ${destino.nombre}, valoradas en el contexto del viaje completo.`} volverA={`/viajes/${viaje.id}`} />

        <ul className="space-y-3">
          {opciones.map((o) => {
            const elegido = viaje.alojamientoId === o.id;
            const diferenciaVsBarata = o.precioNoche - masBarata.precioNoche;
            return (
              <li key={o.id} className={`rounded-2xl border p-5 ${elegido ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{o.nombre}</p>
                    <p className="text-sm text-neutral-500 capitalize">{o.ubicacion}</p>
                  </div>
                  <p className="text-lg font-semibold tabular-nums">{o.precioNoche}€/noche</p>
                </div>

                <ul className="mt-3 space-y-1 text-sm">
                  {o.pros.map((p, i) => (
                    <li key={i} className="text-emerald-700">✓ {p}</li>
                  ))}
                  {o.contras.map((c, i) => (
                    <li key={i} className="text-neutral-500">✗ {c}</li>
                  ))}
                </ul>

                {diferenciaVsBarata > 0 && (
                  <p className="mt-2 text-xs text-neutral-400">{diferenciaVsBarata}€/noche más que la opción más barata.</p>
                )}

                <button
                  onClick={() => actualizarViaje(viaje.id, { alojamientoId: o.id })}
                  disabled={elegido}
                  className="mt-3 w-full rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-default disabled:opacity-40"
                >
                  {elegido ? "Elegido" : "Elegir este"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
