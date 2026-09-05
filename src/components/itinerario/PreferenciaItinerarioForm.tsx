"use client";

import { useState } from "react";
import { HoraSelect } from "@/components/HoraSelect";
import type { PreferenciaItinerario } from "@/lib/types";

interface Props {
  inicial?: PreferenciaItinerario;
  onGenerar: (prefs: PreferenciaItinerario) => void;
  cargando?: boolean;
}

export function PreferenciaItinerarioForm({ inicial, onGenerar, cargando }: Props) {
  const [ritmo, setRitmo] = useState<"tranquilo" | "normal" | "intenso">(
    inicial?.ritmo ?? "normal"
  );
  const [descansos, setDescansos] = useState(inicial?.permitirDescansos ?? true);
  const [madrugadas, setMadrugadas] = useState(inicial?.permitirMadrugadas ?? false);
  const [horaLlegada, setHoraLlegada] = useState(inicial?.horaLlegada ?? "09:00");
  const [horaSalida, setHoraSalida] = useState(inicial?.horaSalida ?? "21:00");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerar({
      ritmo,
      permitirDescansos: descansos,
      permitirMadrugadas: madrugadas,
      horaLlegada,
      horaSalida,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h3 className="font-medium">Cómo generar tu itinerario</h3>

      <div>
        <label className="block text-sm font-medium mb-2">Ritmo del viaje</label>
        <div className="flex gap-2">
          {(["tranquilo", "normal", "intenso"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRitmo(r)}
              className={`flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg border transition ${
                ritmo === r
                  ? "border-marino-500 bg-marino-50 text-marino-800"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              <span className="hidden sm:inline">
                {r === "tranquilo" && "🚶 Tranquilo (4-6h)"}
                {r === "normal" && "🚴 Normal (6-8h)"}
                {r === "intenso" && "⚡ Intenso (8+ h)"}
              </span>
              <span className="sm:hidden">
                {r === "tranquilo" && "🚶 Tranquilo"}
                {r === "normal" && "🚴 Normal"}
                {r === "intenso" && "⚡ Intenso"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={descansos}
            onChange={(e) => setDescansos(e.target.checked)}
            className="rounded"
          />
          Un día de descanso cada 2-3 días
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={madrugadas}
            onChange={(e) => setMadrugadas(e.target.checked)}
            className="rounded"
          />
          Permitir actividades antes de las 8am
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Hora de llegada</label>
          <HoraSelect value={horaLlegada} onChange={setHoraLlegada} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Última actividad</label>
          <HoraSelect value={horaSalida} onChange={setHoraSalida} />
        </div>
      </div>

      <button type="submit" disabled={cargando} className="btn-primary w-full">
        {cargando ? "Generando..." : "Generar itinerario"}
      </button>
    </form>
  );
}
