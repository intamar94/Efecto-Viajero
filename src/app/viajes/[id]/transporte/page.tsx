"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import type { ModoTransporte, TramoTransporte } from "@/lib/types";

const MODOS: { valor: ModoTransporte; etiqueta: string }[] = [
  { valor: "avion", etiqueta: "✈️ Avión" },
  { valor: "tren", etiqueta: "🚆 Tren" },
  { valor: "autobus", etiqueta: "🚌 Autobús" },
  { valor: "metro", etiqueta: "🚇 Metro/tranvía" },
  { valor: "taxi", etiqueta: "🚕 Taxi / transfer" },
  { valor: "coche_alquiler", etiqueta: "🚗 Coche de alquiler" },
  { valor: "a_pie", etiqueta: "🚶 A pie" },
  { valor: "otro", etiqueta: "Otro" },
];

const ICONO: Record<ModoTransporte, string> = {
  avion: "✈️",
  tren: "🚆",
  autobus: "🚌",
  metro: "🚇",
  taxi: "🚕",
  coche_alquiler: "🚗",
  a_pie: "🚶",
  otro: "•",
};

export default function TransportePage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);

  const [modo, setModo] = useState<ModoTransporte>("tren");
  const [origen, setOrigen] = useState("");
  const [destinoTramo, setDestinoTramo] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [coste, setCoste] = useState("");

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
    if (!viaje || !origen.trim() || !destinoTramo.trim()) return;
    const nuevo: TramoTransporte = {
      id: generarId(),
      modo,
      origen: origen.trim(),
      destino: destinoTramo.trim(),
      horaSalida: horaSalida || undefined,
      costeEstimado: coste ? Number.parseFloat(coste) : undefined,
    };
    actualizarViaje(viaje.id, { transporte: [...viaje.transporte, nuevo] });
    setOrigen("");
    setDestinoTramo("");
    setHoraSalida("");
    setCoste("");
  }

  function eliminar(id: string) {
    if (!viaje) return;
    actualizarViaje(viaje.id, { transporte: viaje.transporte.filter((t) => t.id !== id) });
  }

  const ordenados = [...viaje.transporte].sort((a, b) => (a.horaSalida ?? "").localeCompare(b.horaSalida ?? ""));

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Transporte" subtitulo="Cómo os movéis durante el viaje, tramo a tramo." volverA={`/viajes/${viaje.id}`} />

        {ordenados.length === 0 ? (
          <p className="mb-6 text-sm text-neutral-500">Todavía no hay tramos de transporte.</p>
        ) : (
          <ol className="mb-6 space-y-2">
            {ordenados.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm">
                <span>
                  {ICONO[t.modo]} {t.origen} → {t.destino}
                  {t.horaSalida && <span className="text-neutral-500"> · {t.horaSalida.replace("T", " ")}</span>}
                  {t.costeEstimado !== undefined && <span className="text-neutral-500"> · {t.costeEstimado}€</span>}
                </span>
                <button onClick={() => eliminar(t.id)} className="text-neutral-400 hover:text-red-600">
                  Eliminar
                </button>
              </li>
            ))}
          </ol>
        )}

        <form onSubmit={agregar} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
          <select className="input" value={modo} onChange={(e) => setModo(e.target.value as ModoTransporte)}>
            {MODOS.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Origen" value={origen} onChange={(e) => setOrigen(e.target.value)} />
            <input className="input" placeholder="Destino" value={destinoTramo} onChange={(e) => setDestinoTramo(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="datetime-local" className="input" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} />
            <input type="number" className="input" placeholder="Coste € (opcional)" value={coste} onChange={(e) => setCoste(e.target.value)} />
          </div>
          <button type="submit" className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
            + Añadir tramo
          </button>
        </form>
      </div>
    </main>
  );
}
