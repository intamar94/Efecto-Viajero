"use client";

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS = ["00", "15", "30", "45"];

interface Props {
  value: string;
  onChange: (value: string) => void;
}

// Reemplaza el <input type="time">: en móvil abre un reloj analógico poco
// intuitivo para elegir una hora exacta. Dos listas desplegables son más
// rápidas de usar con el pulgar y no dependen del picker nativo del SO.
export function HoraSelect({ value, onChange }: Props) {
  const [horaActual, minutoActual] = value ? value.split(":") : ["09", "00"];

  return (
    <div className="flex gap-1.5">
      <select
        value={horaActual}
        onChange={(e) => onChange(`${e.target.value}:${minutoActual}`)}
        className="input text-sm"
        aria-label="Hora"
      >
        {HORAS.map((h) => (
          <option key={h} value={h}>
            {h} h
          </option>
        ))}
      </select>
      <select
        value={MINUTOS.includes(minutoActual) ? minutoActual : "00"}
        onChange={(e) => onChange(`${horaActual}:${e.target.value}`)}
        className="input text-sm"
        aria-label="Minutos"
      >
        {MINUTOS.map((m) => (
          <option key={m} value={m}>
            {m} min
          </option>
        ))}
      </select>
    </div>
  );
}
