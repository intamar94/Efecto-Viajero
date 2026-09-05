import { useCallback } from "react";
import { useData } from "@/lib/store";
import type { Viaje, Itinerario } from "@/lib/types";

export function useItinerario(viajeId: string) {
  const { obtenerViaje, actualizarViaje } = useData();

  const viaje = obtenerViaje(viajeId);

  const guardarItinerario = useCallback(
    (itinerario: Itinerario) => {
      actualizarViaje(viajeId, { itinerario });
    },
    [viajeId, actualizarViaje]
  );

  const limpiarItinerario = useCallback(() => {
    actualizarViaje(viajeId, { itinerario: undefined });
  }, [viajeId, actualizarViaje]);

  return {
    viaje,
    itinerario: viaje?.itinerario,
    guardarItinerario,
    limpiarItinerario,
  };
}
