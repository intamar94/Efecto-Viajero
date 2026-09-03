"use client";

import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";

export default function ViajesPage() {
  const { hidratado, viajes, viajeros } = useData();
  const ordenados = [...viajes].sort((a, b) => a.fechaSalida.localeCompare(b.fechaSalida));

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo="Mis viajes" subtitulo="Viajes creados, con sus requisitos y estado." />

        <div className="mb-6 flex gap-3">
          <Link href="/viajes/nuevo" className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
            + Nuevo viaje
          </Link>
          <Link href="/explorar" className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:border-neutral-900">
            🧭 Explorar destino primero
          </Link>
        </div>

        {!hidratado ? (
          <p className="text-neutral-400">Cargando…</p>
        ) : ordenados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center text-neutral-500">
            Todavía no has creado ningún viaje.
          </div>
        ) : (
          <ul className="space-y-3">
            {ordenados.map((viaje) => {
              const nombresViajeros = viaje.viajerosIds
                .map((id) => viajeros.find((v) => v.id === id)?.nombre)
                .filter(Boolean);
              return (
                <li key={viaje.id}>
                  <Link href={`/viajes/${viaje.id}`} className="block rounded-xl border border-neutral-200 bg-white px-5 py-4 hover:border-neutral-900">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{viaje.destino}</p>
                      <p className="text-sm text-neutral-500">
                        {viaje.fechaSalida} → {viaje.fechaRegreso}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">
                      {nombresViajeros.length > 0 ? nombresViajeros.join(", ") : "Sin viajeros asignados"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
