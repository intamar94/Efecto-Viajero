"use client";

import { useState } from "react";
import type { DiaItinerario, ActividadEnHorario } from "@/lib/types";

interface Props {
  dia: DiaItinerario;
  onChange: (diaActualizado: DiaItinerario) => void;
}

export function EditorItinerarioDia({ dia, onChange }: Props) {
  const [editando, setEditando] = useState(false);
  const [notasDia, setNotasDia] = useState(dia.notas ?? "");

  const handleAgregarNota = () => {
    onChange({ ...dia, notas: notasDia });
    setEditando(false);
  };

  const handleCambiarActividad = (idx: number, cambios: Partial<ActividadEnHorario>) => {
    const nuevas = [...dia.actividades];
    nuevas[idx] = { ...nuevas[idx], ...cambios };
    onChange({ ...dia, actividades: nuevas });
  };

  const handleEliminarActividad = (idx: number) => {
    onChange({
      ...dia,
      actividades: dia.actividades.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-medium">
            Día {dia.dia} ·{" "}
            {new Date(dia.fecha).toLocaleDateString("es-ES", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
          {dia.etapa && <p className="text-sm text-neutral-500">📍 {dia.etapa}</p>}
        </div>
        {dia.descansoTotal && <span className="chip">😴 Descanso</span>}
      </div>

      {dia.descansoTotal ? (
        <p className="text-sm text-neutral-500 mb-3">Día libre para descansar</p>
      ) : (
        <>
          {dia.actividades.length > 0 && (
            <div className="space-y-2 mb-4">
              {dia.actividades.map((act, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-neutral-50 p-3 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {act.horaInicio} - {act.horaFin}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">{/* nombre actividad */}</p>
                    {act.notas && <p className="text-xs text-neutral-600 mt-1">{act.notas}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleCambiarActividad(idx, { confirmada: !act.confirmada })}
                      className="text-xs px-2 py-1 rounded border border-neutral-300 hover:border-marino-500"
                      title={act.confirmada ? "Desconfirmar" : "Confirmar"}
                    >
                      {act.confirmada ? "✓" : "○"}
                    </button>
                    <button
                      onClick={() => handleEliminarActividad(idx)}
                      className="text-xs px-2 py-1 rounded border border-neutral-300 hover:border-red-500 text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editando ? (
            <div className="space-y-2 mb-3">
              <textarea
                value={notasDia}
                onChange={(e) => setNotasDia(e.target.value)}
                placeholder="Notas del día..."
                className="input text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <button onClick={handleAgregarNota} className="btn-primary text-xs px-3">
                  Guardar
                </button>
                <button onClick={() => setEditando(false)} className="btn-secondary text-xs px-3">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditando(true)}
              className="text-xs text-neutral-500 hover:text-neutral-700 underline"
            >
              {notasDia ? "✏️ Editar notas" : "➕ Añadir notas"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
