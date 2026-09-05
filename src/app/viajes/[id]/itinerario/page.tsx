"use client";

import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { VistaItinerario } from "@/components/itinerario/VistaItinerario";

export default function ItinerarioPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera
          titulo="Itinerario"
          subtitulo="Día a día con horarios"
          volverA={`/viajes/${viaje.id}`}
        />
        <div className="mt-6">
          <VistaItinerario viaje={viaje} onActualizar={(cambios) => actualizarViaje(viaje.id, cambios)} />
        </div>
      </div>
    </main>
  );
}
