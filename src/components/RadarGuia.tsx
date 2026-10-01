"use client";

import { distanciaMetros } from "@/lib/geoAudio";
import { diferenciaAngular, rumboEntre } from "@/lib/orientacion";

export interface SitioRadar {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

const TAM = 300;
const C = TAM / 2;
const R = C - 14;
export const ANGULO_MIRA = 18;

// Radar tipo Pokémon GO: tú en el centro, "arriba" = hacia donde apunta el
// teléfono (brújula), cada punto es un sitio real a su distancia y rumbo.
export function RadarGuia({
  posicion,
  rumbo,
  sitios,
  radioMetros,
  seleccionadoId,
  onSeleccionar,
}: {
  posicion: { lat: number; lon: number };
  rumbo: number | null;
  sitios: SitioRadar[];
  radioMetros: number;
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
}) {
  const giro = rumbo ?? 0;
  return (
    <svg viewBox={`0 0 ${TAM} ${TAM}`} className="mx-auto w-full max-w-[320px] select-none" role="img" aria-label="Radar of places around you">
      <defs>
        <clipPath id="radar-clip">
          <circle cx={C} cy={C} r={R} />
        </clipPath>
      </defs>
      <circle cx={C} cy={C} r={R} fill="var(--color-marino-50)" stroke="var(--color-marino-200)" strokeWidth={1.5} />
      <circle cx={C} cy={C} r={R * 0.66} fill="none" stroke="var(--color-marino-200)" strokeWidth={1} strokeDasharray="3 4" />
      <circle cx={C} cy={C} r={R * 0.33} fill="none" stroke="var(--color-marino-200)" strokeWidth={1} strokeDasharray="3 4" />
      <g clipPath="url(#radar-clip)">
        <path
          d={`M ${C} ${C} L ${C + R * Math.sin((ANGULO_MIRA * Math.PI) / 180)} ${C - R * Math.cos((ANGULO_MIRA * Math.PI) / 180)} A ${R} ${R} 0 0 0 ${C - R * Math.sin((ANGULO_MIRA * Math.PI) / 180)} ${C - R * Math.cos((ANGULO_MIRA * Math.PI) / 180)} Z`}
          fill="var(--color-marino-500)" fillOpacity={0.2}
        />
      </g>
      {rumbo !== null && (
        <text x={C + (R - 2) * Math.sin((-giro * Math.PI) / 180)} y={C - (R - 2) * Math.cos((-giro * Math.PI) / 180) + 4} textAnchor="middle" fill="var(--color-coral-600)" fontSize={11} fontWeight={700}>
          N
        </text>
      )}
      {sitios.map((s) => {
        const d = distanciaMetros(posicion.lat, posicion.lon, s.lat, s.lon);
        if (d > radioMetros) return null;
        const ang = diferenciaAngular(rumboEntre(posicion.lat, posicion.lon, s.lat, s.lon), giro);
        const r = Math.max(14, (d / radioMetros) * R);
        const x = C + r * Math.sin((ang * Math.PI) / 180);
        const y = C - r * Math.cos((ang * Math.PI) / 180);
        const sel = s.id === seleccionadoId;
        const enMira = rumbo !== null && Math.abs(ang) <= ANGULO_MIRA;
        return (
          <g key={s.id} onClick={() => onSeleccionar(s.id)} className="cursor-pointer">
            <circle cx={x} cy={y} r={16} fill="transparent" />
            <circle cx={x} cy={y} r={sel ? 9 : 6} fill={sel ? "var(--color-coral-500)" : enMira ? "var(--color-marino-600)" : "var(--color-marino-500)"} stroke="#fff" strokeWidth={2} />
          </g>
        );
      })}
      <circle cx={C} cy={C} r={7} fill="#10b981" stroke="#fff" strokeWidth={2.5} />
      <path d={`M ${C} ${C - 16} l -5 9 h 10 Z`} fill="#10b981" />
    </svg>
  );
}
