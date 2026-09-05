"use client";

import { todosLosEventos, eventosEnPeriodo } from "@/lib/eventosEstacionales";
import type { EventoEstacional } from "@/lib/eventosEstacionales";

interface EventosEstacionalesDestinoProps {
  pais: string;
  mesInicio?: number;
  mesFin?: number;
}

const NOMBRE_MES: Record<number, string> = {
  1: "enero",
  2: "febrero",
  3: "marzo",
  4: "abril",
  5: "mayo",
  6: "junio",
  7: "julio",
  8: "agosto",
  9: "septiembre",
  10: "octubre",
  11: "noviembre",
  12: "diciembre",
};

const ICONO_TIPO: Record<string, string> = {
  festival: "🎭",
  mercado: "🛍️",
  feria: "🎪",
  celebracion: "🎉",
  evento: "🎟️",
};

export function EventosEstacionalesDestino({
  pais,
  mesInicio,
  mesFin,
}: EventosEstacionalesDestinoProps) {
  const eventos = mesInicio && mesFin ? eventosEnPeriodo(pais, mesInicio, mesFin) : todosLosEventos(pais);

  if (!eventos.length) return null;

  // Agrupar por mes
  const eventosPorMes = eventos.reduce(
    (acc, evento) => {
      if (!acc[evento.mes]) {
        acc[evento.mes] = [];
      }
      acc[evento.mes].push(evento);
      return acc;
    },
    {} as Record<number, EventoEstacional[]>
  );

  const mesesOrdenados = Object.keys(eventosPorMes)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="mb-1 font-medium text-amber-900">
        📅 Eventos y festivales en {pais}
      </h2>
      <p className="mb-4 text-xs text-amber-700/70">
        Festivales, mercados y celebraciones a lo largo del año.
      </p>

      <div className="space-y-4">
        {mesesOrdenados.map((mes) => (
          <div key={mes} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-amber-900">
              {NOMBRE_MES[mes]}
            </h3>

            <div className="space-y-2">
              {eventosPorMes[mes].map((evento, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-white px-4 py-3 border-l-4 border-amber-400"
                >
                  <div className="flex gap-2 items-start mb-2">
                    <span className="text-lg shrink-0">
                      {ICONO_TIPO[evento.tipo]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-amber-900 text-sm">
                        {evento.nombre}
                      </p>
                      {evento.ciudad && (
                        <p className="text-xs text-neutral-600">📍 {evento.ciudad}</p>
                      )}
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded shrink-0">
                      {evento.diasAproximados || `${NOMBRE_MES[evento.mes]}`}
                    </span>
                  </div>

                  <p className="text-sm text-neutral-700 mb-2">{evento.descripcion}</p>

                  {evento.notas && (
                    <div className="mb-2 rounded bg-neutral-50 px-2.5 py-2">
                      <p className="text-xs text-neutral-600">💡 {evento.notas}</p>
                    </div>
                  )}

                  {evento.sitioWeb && (
                    <a
                      href={evento.sitioWeb}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-amber-600 hover:text-amber-700 underline inline-flex items-center gap-1"
                    >
                      Más información →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
