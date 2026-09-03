import type { EstadoRequisito } from "@/lib/types";

const ESTILOS: Record<EstadoRequisito, { icono: string; clase: string; texto: string }> = {
  verde: { icono: "🟢", clase: "bg-emerald-50 text-emerald-700 border-emerald-200", texto: "No detectado" },
  amarillo: { icono: "🟡", clase: "bg-amber-50 text-amber-700 border-amber-200", texto: "Revisar" },
  rojo: { icono: "🔴", clase: "bg-red-50 text-red-700 border-red-200", texto: "Obligatorio" },
};

export function EstadoBadge({ estado }: { estado: EstadoRequisito }) {
  const s = ESTILOS[estado];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${s.clase}`}>
      <span>{s.icono}</span>
      {s.texto}
    </span>
  );
}
