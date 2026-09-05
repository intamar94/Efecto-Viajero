"use client";

import type { DiaItinerario } from "@/lib/types";

interface Props {
  dia: DiaItinerario;
}

export function RutaDiaVisual({ dia }: Props) {
  if (dia.descansoTotal) {
    return (
      <div className="card bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-200">
        <p className="text-center font-medium text-emerald-900">😴 Día de descanso</p>
        {dia.notas && <p className="mt-2 text-sm text-emerald-800">{dia.notas}</p>}
      </div>
    );
  }

  // Calcular duración total del día
  let horaInicio = "09:00";
  let horaFin = "21:00";

  if (dia.actividades.length > 0) {
    horaInicio = dia.actividades[0].horaInicio;
    horaFin = dia.actividades[dia.actividades.length - 1].horaFin;
  }

  const parseHora = (hora: string) => {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
  };

  const formatoHora = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const inicioMinutos = parseHora(horaInicio);
  const finMinutos = parseHora(horaFin);
  const duracionTotal = finMinutos - inicioMinutos;

  // Barra de tiempo del día
  const getPositionPorcentaje = (hora: string) => {
    const minutos = parseHora(hora);
    return ((minutos - inicioMinutos) / duracionTotal) * 100;
  };

  const getDuracionPorcentaje = (horaInicio: string, horaFin: string) => {
    const inicio = parseHora(horaInicio);
    const fin = parseHora(horaFin);
    return ((fin - inicio) / duracionTotal) * 100;
  };

  return (
    <div className="card space-y-4">
      {/* Resumen del día */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
        <div>
          <p className="font-medium text-neutral-900">
            {horaInicio} → {horaFin}
          </p>
          <p className="text-xs text-neutral-500">
            {Math.floor(duracionTotal / 60)}h {duracionTotal % 60}min de actividades
          </p>
        </div>
        {dia.actividades.length > 0 && (
          <span className="text-xs bg-marino-100 text-marino-700 px-2 py-1 rounded">
            {dia.actividades.length} {dia.actividades.length === 1 ? "actividad" : "actividades"}
          </span>
        )}
      </div>

      {/* Timeline visual */}
      {dia.actividades.length > 0 && (
        <div className="space-y-3">
          {/* Barra de tiempo */}
          <div className="h-8 bg-gradient-to-r from-amber-100 to-coral-100 rounded-lg overflow-hidden relative">
            {dia.actividades.map((act, idx) => {
              const posicion = getPositionPorcentaje(act.horaInicio);
              const duracion = getDuracionPorcentaje(act.horaInicio, act.horaFin);

              return (
                <div
                  key={idx}
                  className={`absolute h-full border border-neutral-300 transition-opacity hover:opacity-75 ${
                    act.confirmada
                      ? "bg-marino-400"
                      : "bg-neutral-300"
                  }`}
                  style={{
                    left: `${posicion}%`,
                    width: `${Math.max(duracion, 3)}%`,
                  }}
                  title={`${act.horaInicio}-${act.horaFin}`}
                />
              );
            })}
          </div>

          {/* Leyenda de horas */}
          <div className="flex justify-between text-xs text-neutral-500 px-1">
            <span>{horaInicio}</span>
            <span>{formatoHora(inicioMinutos + duracionTotal / 2)}</span>
            <span>{horaFin}</span>
          </div>

          {/* Lista de actividades */}
          <div className="space-y-2 pt-2">
            {dia.actividades.map((act, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="shrink-0 w-16 text-right">
                  <p className="text-sm font-medium text-neutral-900">{act.horaInicio}</p>
                  <p className="text-xs text-neutral-500">{act.horaFin}</p>
                </div>

                <div className="flex-1 rounded-lg bg-neutral-50 p-3 border-l-4" style={{
                  borderLeftColor: act.confirmada ? "#2563eb" : "#d1d5db"
                }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-neutral-900 text-sm">
                      {act.confirmada && "✓ "}
                      Actividad
                    </p>
                    <span className="text-xs text-neutral-500 shrink-0">
                      {Math.round((parseHora(act.horaFin) - parseHora(act.horaInicio)) / 60 * 10) / 10}h
                    </span>
                  </div>
                  {act.notas && (
                    <p className="text-xs text-neutral-600 mt-1">💭 {act.notas}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notas del día */}
      {dia.notas && dia.actividades.length > 0 && (
        <div className="pt-2 border-t border-neutral-200">
          <p className="text-xs font-medium text-neutral-700 mb-1">📝 Notas:</p>
          <p className="text-sm text-neutral-600">{dia.notas}</p>
        </div>
      )}

      {/* Sin actividades */}
      {dia.actividades.length === 0 && (
        <p className="text-center text-sm text-neutral-500 py-2">
          Sin actividades planificadas para este día
        </p>
      )}
    </div>
  );
}
