"use client";

import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { souvenirsDe } from "@/lib/catalogo";
import { buscarDestinoPorId, buscarDestinoPorNombre } from "@/lib/destinos";

// Esta pantalla es de consejos, no de gestión: antes pedía "¿para quién?"
// y mantenía una lista de regalos, que obligaba a decidir compras meses
// antes de pisar el destino. Lo útil aquí es saber qué merece la pena,
// cómo distinguir lo auténtico y qué problemas da en la maleta.
export default function SouvenirsPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje } = useData();
  const viaje = obtenerViaje(params.id);
  const destino = viaje ? buscarDestinoPorId(viaje.destinoId) ?? buscarDestinoPorNombre(viaje.destino) : undefined;

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  if (!destino) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Souvenirs" volverA={`/viajes/${viaje.id}`} />
          <ViajeToolsNav viajeId={viaje.id} />
          <p className="text-sm text-neutral-500">
            No tenemos consejos de compras para &quot;{viaje.destino}&quot; (no coincide con ningún destino de nuestro catálogo).
          </p>
        </div>
      </main>
    );
  }

  const consejos = souvenirsDe(destino);

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <Cabecera
          titulo="Qué comprar"
          subtitulo={`Consejos de compras en ${destino.nombre}: qué merece la pena y qué cuidado tiene.`}
          volverA={`/viajes/${viaje.id}`}
        />
        <ViajeToolsNav viajeId={viaje.id} />

        <ul className="space-y-3">
          {consejos.map((s) => (
            <li key={s.id} className="tip">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-neutral-900">{s.nombre}</p>
                <p className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-600">{s.precioAprox}</p>
              </div>
              <p className="mt-1 text-sm text-neutral-600">{s.descripcion}</p>
              <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-neutral-600">💡 {s.datoCurioso}</p>
              {s.avisoEquipaje && (
                <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs text-coral-700">✈️ {s.avisoEquipaje}</p>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-neutral-400">
          Precios orientativos de referencia por tipo de producto, no de tiendas concretas. Los límites de equipaje los
          fija cada aerolínea: confírmalos en tu billete antes de comprar algo voluminoso o líquido.
        </p>
      </div>
    </main>
  );
}
