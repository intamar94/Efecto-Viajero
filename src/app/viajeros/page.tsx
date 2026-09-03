"use client";

import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { calcularEdad } from "@/lib/edad";

export default function ViajerosPage() {
  const { hidratado, viajeros } = useData();

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo="Viajeros" subtitulo="Personas y mascotas. Estos datos se reutilizan en todos los viajes." />

        <Link
          href="/viajeros/nuevo"
          className="mb-6 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + Añadir viajero
        </Link>

        {!hidratado ? (
          <p className="text-neutral-400">Cargando…</p>
        ) : viajeros.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center text-neutral-500">
            Todavía no hay viajeros. Añade el primero para poder crear un viaje.
          </div>
        ) : (
          <ul className="space-y-3">
            {viajeros.map((v) => {
              const edad = calcularEdad(v.fechaNacimiento);
              return (
                <li key={v.id}>
                  <Link
                    href={`/viajeros/${v.id}`}
                    className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4 hover:border-neutral-900"
                  >
                    <span className="text-2xl">{v.tipo === "persona" ? "🧑" : "🐾"}</span>
                    <span className="flex-1">
                      <span className="block font-medium">
                        {v.nombre} {v.tipo === "persona" ? v.apellido ?? "" : ""}
                      </span>
                      <span className="block text-sm text-neutral-500">
                        {v.tipo === "persona"
                          ? [edad !== null ? `${edad} años` : null, v.nacionalidad].filter(Boolean).join(" · ") || "Sin datos adicionales"
                          : [v.especie, v.raza].filter(Boolean).join(" · ") || "Mascota"}
                      </span>
                    </span>
                    <span className="text-neutral-300">→</span>
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
