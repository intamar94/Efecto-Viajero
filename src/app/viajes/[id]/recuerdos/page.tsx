"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";

export default function RecuerdosPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);

  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [nota, setNota] = useState("");

  if (!viaje) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!viaje || !titulo.trim()) return;
    actualizarViaje(viaje.id, {
      recuerdos: [...viaje.recuerdos, { id: generarId(), titulo: titulo.trim(), fecha: fecha || undefined, nota: nota.trim() || undefined }],
    });
    setTitulo("");
    setFecha("");
    setNota("");
  }

  function eliminar(id: string) {
    if (!viaje) return;
    actualizarViaje(viaje.id, { recuerdos: viaje.recuerdos.filter((r) => r.id !== id) });
  }

  const ordenados = [...viaje.recuerdos].sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Recuerdos" subtitulo="Una línea de tiempo con los momentos del viaje." volverA={`/viajes/${viaje.id}`} />

        {ordenados.length === 0 ? (
          <p className="mb-6 text-sm text-neutral-500">Todavía no hay momentos guardados.</p>
        ) : (
          <ol className="mb-6 space-y-3 border-l border-neutral-200 pl-4">
            {ordenados.map((r) => (
              <li key={r.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-neutral-900" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{r.titulo}</p>
                    {r.fecha && <p className="text-xs text-neutral-400">{r.fecha}</p>}
                    {r.nota && <p className="mt-1 text-sm text-neutral-600">{r.nota}</p>}
                  </div>
                  <button onClick={() => eliminar(r.id)} className="shrink-0 text-neutral-400 hover:text-red-600">
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <form onSubmit={agregar} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
          <input className="input" placeholder="¿Qué pasó?" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <textarea className="input min-h-20" placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
          <button type="submit" className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
            + Guardar momento
          </button>
        </form>
      </div>
    </main>
  );
}
