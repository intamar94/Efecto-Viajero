"use client";

import { useState } from "react";
import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { CalendarioViajes } from "@/components/CalendarioViajes";
import { useData } from "@/lib/store";

type Vista = "lista" | "calendario";

export default function ViajesPage() {
  const { hidratado, viajes, viajeros } = useData();
  const [vista, setVista] = useState<Vista>("lista");
  const ordenados = [...viajes].sort((a, b) => (a.fechaSalida ?? "9999").localeCompare(b.fechaSalida ?? "9999"));

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo="Mis viajes" subtitulo="Viajes creados, con sus requisitos y estado." />

        <div className="mb-6 flex items-center gap-3">
          <Link href="/planificar" className="btn-primary flex-1">
            ➕ Planificar un viaje
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
              📋 Lista
            </button>
            <button
              onClick={() => setVista("calendario")}
              className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                vista === "calendario"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              📅 Calendario
            </button>
          </div>
        </div>

        {!hidratado ? (
          <p className="text-neutral-400">Cargando…</p>
        ) : ordenados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center text-neutral-500">
            Todavía no has creado ningún viaje.
          </div>
        ) : vista === "lista" ? (
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
                        {viaje.fechaSalida && viaje.fechaRegreso
                          ? `${viaje.fechaSalida} → ${viaje.fechaRegreso}`
                          : viaje.contexto.duracionDias
                            ? `~${viaje.contexto.duracionDias} días · sin fechas`
                            : "Sin fechas"}
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
        ) : (
          <CalendarioViajes viajes={ordenados} viajeros={viajeros} />
        )}
      </div>
    </main>
  );
}
