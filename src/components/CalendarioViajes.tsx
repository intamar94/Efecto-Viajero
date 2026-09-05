"use client";

import { useState } from "react";
import Link from "next/link";
import type { Viaje, Viajero } from "@/lib/types";

interface CalendarioVijesProps {
  viajes: Viaje[];
  viajeros: Viajero[];
}

export function CalendarioViajes({ viajes, viajeros }: CalendarioVijesProps) {
  const [mesActual, setMesActual] = useState(new Date());

  const obtenerNombresMes = (fecha: Date) => {
    return fecha.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  };

  const obtenerViajesdelmMes = (año: number, mes: number) => {
    return viajes.filter((v) => {
      if (!v.fechaSalida) return false;
      const [año_salida, mes_salida] = v.fechaSalida.split("-").map(Number);
      return año_salida === año && mes_salida === mes;
    });
  };

  const obtenerViajesesEnRango = (año: number, mes: number) => {
    return viajes.filter((v) => {
      if (!v.fechaSalida || !v.fechaRegreso) return false;
      const [año_salida, mes_salida, dia_salida] = v.fechaSalida.split("-").map(Number);
      const [año_regreso, mes_regreso, dia_regreso] = v.fechaRegreso.split("-").map(Number);

      const fecha_inicio = new Date(año_salida, mes_salida - 1, dia_salida);
      const fecha_fin = new Date(año_regreso, mes_regreso - 1, dia_regreso);
      const primer_dia = new Date(año, mes - 1, 1);
      const ultimo_dia = new Date(año, mes, 0);

      return fecha_inicio <= ultimo_dia && fecha_fin >= primer_dia;
    });
  };

  const viajesDeMes = obtenerViajesdelmMes(mesActual.getFullYear(), mesActual.getMonth() + 1);
  const viajesTodosDelMes = obtenerViajesesEnRango(mesActual.getFullYear(), mesActual.getMonth() + 1);

  const cambiarMes = (offset: number) => {
    setMesActual((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const colorporIndice = (index: number) => {
    const colores = [
      "bg-coral-100 border-coral-300 text-coral-900",
      "bg-marino-100 border-marino-300 text-marino-900",
      "bg-emerald-100 border-emerald-300 text-emerald-900",
      "bg-amber-100 border-amber-300 text-amber-900",
      "bg-purple-100 border-purple-300 text-purple-900",
    ];
    return colores[index % colores.length];
  };

  return (
    <div className="card">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {obtenerNombresMes(mesActual).charAt(0).toUpperCase() + obtenerNombresMes(mesActual).slice(1)}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => cambiarMes(-1)}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            ← Anterior
          </button>
          <button
            onClick={() => cambiarMes(1)}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {viajesTodosDelMes.length === 0 ? (
        <p className="text-center text-sm text-neutral-500">No hay viajes este mes</p>
      ) : (
        <div className="space-y-3">
          {viajesTodosDelMes.map((viaje, idx) => {
            const nombresViajeros = viaje.viajerosIds
              .map((id) => viajeros.find((v) => v.id === id)?.nombre)
              .filter(Boolean);

            return (
              <Link
                key={viaje.id}
                href={`/viajes/${viaje.id}`}
                className={`block rounded-lg border-2 px-4 py-3 transition hover:shadow-md ${colorporIndice(idx)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{viaje.destino}</p>
                    <p className="text-xs opacity-75">
                      {viaje.fechaSalida && viaje.fechaRegreso
                        ? `${viaje.fechaSalida} → ${viaje.fechaRegreso}`
                        : "Sin fechas"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{nombresViajeros.join(", ")}</p>
                    <p className="text-xs opacity-75">
                      {viaje.contexto.duracionDias ? `${viaje.contexto.duracionDias} días` : ""}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
