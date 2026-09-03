"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { alojamientosDe } from "@/lib/catalogo";
import { buscarDestinoPorId, buscarDestinoPorNombre } from "@/lib/destinos";
import { urlBusquedaAlojamiento } from "@/lib/afiliados";

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
            No hay referencia de precios disponible para &quot;{viaje.destino}&quot; (no coincide con ningún destino del sistema).
          </p>
        </div>
      </main>
    );
  }

  const opciones = alojamientosDe(destino);
  const usadaEnPresupuesto = opciones.find((o) => o.id === viaje.alojamientoId);

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Alojamiento" subtitulo={`Reservar en ${destino.nombre} y estimar el gasto de alojamiento.`} volverA={`/viajes/${viaje.id}`} />

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 font-medium">Reservar de verdad</h2>
          <a
            href={urlBusquedaAlojamiento(destino.nombre, viaje.fechaSalida, viaje.fechaRegreso)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            🏨 Buscar en Booking.com
          </a>
          <p className="mt-3 text-sm text-neutral-500">
            Cuando confirmes la reserva, guarda el documento en el{" "}
            <Link href={`/viajes/${viaje.id}/vault`} className="underline">
              Travel Vault
            </Link>{" "}
            para tenerlo a mano en el viaje.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-1 font-medium">Cuánto puedes esperar pagar</h2>
          <p className="mb-4 text-xs text-neutral-400">
            Referencia orientativa por zona — no son alojamientos reales ni una reserva. Sirve solo para calcular el presupuesto del viaje.
          </p>
          <ul className="space-y-3">
            {opciones.map((o) => {
              const usada = viaje.alojamientoId === o.id;
              return (
                <li key={o.id} className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium capitalize">{o.ubicacion}</p>
                      <p className="text-sm text-neutral-500">{o.nombre}</p>
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

                  <button
                    onClick={() => actualizarViaje(viaje.id, { alojamientoId: usada ? undefined : o.id })}
                    className={`mt-3 text-sm underline ${usada ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-900"}`}
                  >
                    {usada ? "✓ En tu presupuesto — quitar" : "Usar para mi presupuesto"}
                  </button>
                </li>
              );
            })}
          </ul>
          {!usadaEnPresupuesto && (
            <p className="mt-4 text-xs text-neutral-400">
              Elige una zona de referencia para que el presupuesto del viaje cuente el alojamiento.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
