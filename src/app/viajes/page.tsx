"use client";

import { useState } from "react";
import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { CalendarioViajes } from "@/components/CalendarioViajes";
import { useData } from "@/lib/store";
import { formatearRangoFechas } from "@/lib/formatoFecha";

type Vista = "lista" | "calendario";

export default function ViajesPage() {
  const { hidratado, viajes, viajeros } = useData();
  const [vista, setVista] = useState<Vista>("lista");
  const ordenados = [...viajes].sort((a, b) => (a.fechaSalida ?? "9999").localeCompare(b.fechaSalida ?? "9999"));

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo="My trips" subtitulo="Trips you've created, with their requirements and status." />

        <div className="mb-6 flex items-center gap-3">
          <Link href="/planificar" className="btn-primary flex-1">
            ➕ Plan a trip
          </Link>
          <div className="inline-flex gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
            <button
              onClick={() => setVista("lista")}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                vista === "lista"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              📋 List
            </button>
            <button
              onClick={() => setVista("calendario")}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                vista === "calendario"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              📅 Calendar
            </button>
          </div>
        </div>

        {!hidratado ? (
          <p className="text-neutral-400">Loading…</p>
        ) : ordenados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center text-neutral-500">
            You haven't created any trips yet.
          </div>
        ) : vista === "lista" ? (
          <ul className="space-y-3">
            {ordenados.map((viaje) => (
              <li key={viaje.id}>
                <Link href={`/viajes/${viaje.id}`} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 hover:border-neutral-900">
                  <p className="font-medium">{viaje.destino}</p>
                  <p className="text-sm text-neutral-500">
                    {viaje.fechaSalida && viaje.fechaRegreso
                      ? formatearRangoFechas(viaje.fechaSalida, viaje.fechaRegreso)
                      : viaje.contexto.duracionDias
                        ? `~${viaje.contexto.duracionDias} days`
                        : "No dates"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <CalendarioViajes viajes={ordenados} viajeros={viajeros} />
        )}
      </div>
    </main>
  );
}
