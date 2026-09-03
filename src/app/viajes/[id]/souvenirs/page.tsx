"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { souvenirsDe } from "@/lib/catalogo";
import { buscarDestinoPorId, buscarDestinoPorNombre } from "@/lib/destinos";
import { generarId } from "@/lib/id";

export default function SouvenirsPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);
  const destino = viaje ? buscarDestinoPorId(viaje.destinoId) ?? buscarDestinoPorNombre(viaje.destino) : undefined;
  const [nombrePorSouvenir, setNombrePorSouvenir] = useState<Record<string, string>>({});

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
          <Cabecera titulo="Souvenirs" volverA={`/viajes/${viaje.id}`} />
          <p className="text-sm text-neutral-500">
            No hay catálogo disponible para &quot;{viaje.destino}&quot; (no coincide con ningún destino del sistema).
          </p>
        </div>
      </main>
    );
  }

  const catalogo = souvenirsDe(destino);

  function anadir(souvenirId: string) {
    if (!viaje) return;
    const nombre = (nombrePorSouvenir[souvenirId] ?? "").trim();
    if (!nombre) return;
    actualizarViaje(viaje.id, { souvenirs: [...viaje.souvenirs, { id: generarId(), souvenirId, paraNombre: nombre }] });
    setNombrePorSouvenir((prev) => ({ ...prev, [souvenirId]: "" }));
  }

  function quitar(id: string) {
    if (!viaje) return;
    actualizarViaje(viaje.id, { souvenirs: viaje.souvenirs.filter((s) => s.id !== id) });
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Souvenirs" subtitulo={`Ideas típicas de ${destino.nombre}.`} volverA={`/viajes/${viaje.id}`} />
        <ViajeToolsNav viajeId={viaje.id} />

        <ul className="mb-6 space-y-3">
          {catalogo.map((s) => (
            <li key={s.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{s.nombre}</p>
                <p className="shrink-0 text-sm font-medium text-neutral-700">{s.precioAprox}</p>
              </div>
              <p className="text-sm text-neutral-500">{s.descripcion}</p>
              <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">💡 {s.datoCurioso}</p>
              {s.avisoEquipaje && <p className="mt-2 text-xs text-amber-700">✈️ {s.avisoEquipaje}</p>}
              <div className="mt-3 flex gap-2">
                <input
                  className="input"
                  placeholder="¿Para quién? (ej. Mamá)"
                  value={nombrePorSouvenir[s.id] ?? ""}
                  onChange={(e) => setNombrePorSouvenir((prev) => ({ ...prev, [s.id]: e.target.value }))}
                />
                <button onClick={() => anadir(s.id)} className="shrink-0 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700">
                  + Añadir
                </button>
              </div>
            </li>
          ))}
        </ul>

        <section>
          <h2 className="mb-3 font-medium">Mi lista de regalos</h2>
          {viaje.souvenirs.length === 0 ? (
            <p className="text-sm text-neutral-500">Todavía no has añadido ningún regalo.</p>
          ) : (
            <ul className="space-y-2">
              {viaje.souvenirs.map((asignado) => {
                const souvenir = catalogo.find((s) => s.id === asignado.souvenirId);
                return (
                  <li key={asignado.id} className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-2 text-sm">
                    <span>
                      <strong>{asignado.paraNombre}</strong> — {souvenir?.nombre ?? "Souvenir"}
                    </span>
                    <button onClick={() => quitar(asignado.id)} className="text-neutral-400 hover:text-red-600">
                      Quitar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
