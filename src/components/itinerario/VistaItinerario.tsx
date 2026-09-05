"use client";

import { useState } from "react";
import { PreferenciaItinerarioForm } from "./PreferenciaItinerarioForm";
import { EditorItinerarioDia } from "./EditorItinerarioDia";
import { GeneradorItinerario } from "@/lib/generador-itinerario";
import { actividadesDe } from "@/lib/catalogo";
import { destinoParaCatalogo, etapasDe } from "@/lib/viaje";
import type { ActividadDestino, Viaje, Itinerario, DiaItinerario, PreferenciaItinerario } from "@/lib/types";

interface Props {
  viaje: Viaje;
  onActualizar: (cambios: Partial<Viaje>) => void;
}

export function VistaItinerario({ viaje, onActualizar }: Props) {
  const [itinerario, setItinerario] = useState<Itinerario | null>(viaje.itinerario ?? null);
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState<"preferencias" | "edicion">(viaje.itinerario ? "edicion" : "preferencias");

  const handleGenerarItinerario = async (prefs: PreferenciaItinerario) => {
    setCargando(true);
    try {
      // Duraciones reales del catálogo por ciudad (museos, restaurantes,
      // etc.), no un placeholder fijo de 2h para todo: así el itinerario
      // respeta cuánto ocupa cada actividad de verdad.
      const catalogoPorId = new Map<string, ActividadDestino>();
      for (const etapa of etapasDe(viaje)) {
        for (const item of actividadesDe(destinoParaCatalogo(etapa))) {
          catalogoPorId.set(item.id, item);
        }
      }

      const actividadesMap = new Map<string, { id: string; duracionHoras: number }>();
      for (const act of viaje.actividades) {
        const delCatalogo = catalogoPorId.get(act.actividadId);
        actividadesMap.set(act.actividadId, {
          id: act.actividadId,
          duracionHoras: act.propia?.duracionHoras ?? delCatalogo?.duracionHoras ?? 1.5,
        });
      }

      const generador = new GeneradorItinerario(viaje, actividadesMap);
      const nuevoItinerario = generador.generarItinerario(prefs);
      setItinerario(nuevoItinerario);
      setPaso("edicion");
    } finally {
      setCargando(false);
    }
  };

  const handleActualizarDia = (diaIdx: number, diaActualizado: DiaItinerario) => {
    if (!itinerario) return;
    const diasActualizados = [...itinerario.dias];
    diasActualizados[diaIdx] = diaActualizado;
    const itinerarioActualizado = { ...itinerario, dias: diasActualizados };
    setItinerario(itinerarioActualizado);
  };

  const handleGuardar = () => {
    if (itinerario) {
      onActualizar({ itinerario });
    }
  };

  if (!itinerario) {
    return <PreferenciaItinerarioForm onGenerar={handleGenerarItinerario} cargando={cargando} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Tu itinerario</h2>
        <button
          onClick={() => setPaso("preferencias")}
          className="text-xs text-neutral-500 hover:text-neutral-700"
        >
          ↻ Regenerar
        </button>
      </div>

      {paso === "preferencias" && (
        <PreferenciaItinerarioForm
          inicial={itinerario.preferencias}
          onGenerar={handleGenerarItinerario}
          cargando={cargando}
        />
      )}

      {paso === "edicion" && (
        <>
          <div className="space-y-3 pb-24">
            {itinerario.dias.map((dia, idx) => (
              <EditorItinerarioDia
                key={dia.fecha}
                dia={dia}
                onChange={(diaActualizado) => handleActualizarDia(idx, diaActualizado)}
              />
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-5 py-3 flex gap-3">
            <button onClick={handleGuardar} className="btn-primary flex-1">
              💾 Guardar itinerario
            </button>
            <button onClick={() => setPaso("preferencias")} className="btn-secondary flex-1 sm:flex-none">
              Editar preferencias
            </button>
          </div>
        </>
      )}
    </div>
  );
}
