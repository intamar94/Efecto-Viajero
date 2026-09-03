"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { buscarDestinoPorId } from "@/lib/destinos";

export default function NuevoViajePage() {
  return (
    <Suspense fallback={null}>
      <NuevoViajeInner />
    </Suspense>
  );
}

function NuevoViajeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { viajeros, crearViaje } = useData();

  const destinoIdInicial = searchParams.get("destinoId") ?? undefined;
  const duracionInicial = searchParams.get("duracion");
  const presupuestoInicial = searchParams.get("presupuesto");
  const destinoSugerido = buscarDestinoPorId(destinoIdInicial);

  const [destinoId] = useState(destinoIdInicial);
  const [destino, setDestino] = useState(destinoSugerido?.nombre ?? "");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [fechaSalida, setFechaSalida] = useState("");
  const [fechaRegreso, setFechaRegreso] = useState("");
  const [presupuesto, setPresupuesto] = useState(presupuestoInicial ?? "");

  function toggleViajero(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSalidaChange(valor: string) {
    setFechaSalida(valor);
    if (valor && duracionInicial && !fechaRegreso) {
      const dias = Number.parseInt(duracionInicial, 10);
      if (!Number.isNaN(dias)) {
        const salida = new Date(valor);
        salida.setDate(salida.getDate() + dias);
        setFechaRegreso(salida.toISOString().slice(0, 10));
      }
    }
  }

  function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!destino.trim() || !fechaSalida || !fechaRegreso || seleccionados.size === 0) return;

    const nuevo = crearViaje({
      destino: destino.trim(),
      destinoId,
      viajerosIds: Array.from(seleccionados),
      fechaSalida,
      fechaRegreso,
      contexto: {
        presupuestoTotal: presupuesto ? Number.parseFloat(presupuesto) : undefined,
        duracionDias: duracionInicial ? Number.parseInt(duracionInicial, 10) : undefined,
        intereses: [],
        restricciones: [],
      },
    });
    router.push(`/viajes/${nuevo.id}`);
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Nuevo viaje" volverA="/viajes" />

        <form onSubmit={crear} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6">
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">¿Quién viaja?</p>
            {viajeros.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Todavía no hay viajeros guardados.{" "}
                <Link href="/viajeros/nuevo" className="underline">
                  Añade uno primero
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-2">
                {viajeros.map((v) => (
                  <label key={v.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm">
                    <input type="checkbox" checked={seleccionados.has(v.id)} onChange={() => toggleViajero(v.id)} />
                    <span>
                      {v.tipo === "persona" ? "🧑" : "🐾"} {v.nombre}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Destino</span>
            <input className="input" value={destino} onChange={(e) => setDestino(e.target.value)} required />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Salida</span>
              <input type="date" className="input" value={fechaSalida} onChange={(e) => onSalidaChange(e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Regreso</span>
              <input type="date" className="input" value={fechaRegreso} onChange={(e) => setFechaRegreso(e.target.value)} required />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Presupuesto total (opcional)</span>
            <input type="number" className="input" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} />
          </label>

          <button
            type="submit"
            disabled={seleccionados.size === 0}
            className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Crear viaje
          </button>
        </form>
      </div>
    </main>
  );
}
