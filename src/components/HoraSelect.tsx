"use client";

import { useEffect, useRef, useState } from "react";

const ALTO_FILA = 36;
const FILAS_VISIBLES = 3;
const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function RuedaColumna({ valores, valor, onChange }: { valores: string[]; valor: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignorarScroll = useRef(false);

  // Centra el valor actual cuando cambia desde fuera (ej. al escribirlo a
  // mano), sin disparar de vuelta un evento de scroll que lo pise.
  useEffect(() => {
    const idx = Math.max(0, valores.indexOf(valor));
    const el = ref.current;
    if (!el) return;
    ignorarScroll.current = true;
    el.scrollTop = idx * ALTO_FILA;
    const t = setTimeout(() => {
      ignorarScroll.current = false;
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, valores]);

  function handleScroll() {
    if (ignorarScroll.current) return;
    if (timer.current) clearTimeout(timer.current);
    // Como al desplazarse con el dedo (rueda de alarma): se espera a que
    // el scroll se detenga y se ajusta al valor más cercano al centro.
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ALTO_FILA);
      const clamped = Math.min(Math.max(idx, 0), valores.length - 1);
      const nuevo = valores[clamped];
      el.scrollTo({ top: clamped * ALTO_FILA, behavior: "smooth" });
      if (nuevo !== valor) onChange(nuevo);
    }, 130);
  }

  return (
    <div className="relative" style={{ height: ALTO_FILA * FILAS_VISIBLES, width: 52 }}>
      <div
        ref={ref}
        onScroll={handleScroll}
        className="rueda-scroll h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ paddingTop: ALTO_FILA, paddingBottom: ALTO_FILA, scrollbarWidth: "none" }}
      >
        {valores.map((v) => (
          <div
            key={v}
            onClick={() => onChange(v)}
            className={`flex cursor-pointer items-center justify-center snap-center text-base tabular-nums transition ${
              v === valor ? "font-semibold text-marino-900" : "text-neutral-300"
            }`}
            style={{ height: ALTO_FILA }}
          >
            {v}
          </div>
        ))}
      </div>
      {/* Marco central, solo visual: indica qué fila cuenta como seleccionada. */}
      <div className="pointer-events-none absolute inset-x-0 border-y border-marino-300" style={{ top: ALTO_FILA, height: ALTO_FILA }} />
    </div>
  );
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

// Sustituye al <input type="time">, que en móvil abre un reloj analógico
// poco intuitivo. Esta rueda se desplaza con el dedo como el selector de
// alarma del sistema; el lápiz permite escribir la hora directamente para
// quien lo prefiera.
export function HoraSelect({ value, onChange }: Props) {
  const [modoTexto, setModoTexto] = useState(false);
  const [horaActual, minutoActual] = value ? value.split(":") : ["09", "00"];

  return (
    <div className="inline-flex items-center gap-1.5">
      <style>{`.rueda-scroll::-webkit-scrollbar{display:none}`}</style>
      {modoTexto ? (
        <input
          type="text"
          inputMode="numeric"
          className="input w-20 text-sm"
          defaultValue={value}
          autoFocus
          onBlur={(e) => {
            const m = e.target.value.trim().match(/^(\d{1,2}):?(\d{2})$/);
            if (m) {
              const h = String(Math.min(23, Number(m[1]))).padStart(2, "0");
              const min = String(Math.min(59, Number(m[2]))).padStart(2, "0");
              onChange(`${h}:${min}`);
            }
            setModoTexto(false);
          }}
          placeholder="HH:MM"
        />
      ) : (
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-1.5 py-1">
          <RuedaColumna valores={HORAS} valor={horaActual} onChange={(h) => onChange(`${h}:${minutoActual}`)} />
          <span className="text-neutral-400">:</span>
          <RuedaColumna valores={MINUTOS} valor={minutoActual} onChange={(m) => onChange(`${horaActual}:${m}`)} />
        </div>
      )}
      <button
        type="button"
        onClick={() => setModoTexto((v) => !v)}
        className="text-xs text-neutral-400 hover:text-neutral-700"
        title={modoTexto ? "Usar la rueda" : "Escribir la hora"}
      >
        {modoTexto ? "🎡" : "✏️"}
      </button>
    </div>
  );
}
