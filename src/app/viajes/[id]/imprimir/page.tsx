"use client";

import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { etapasDe, destinoParaCatalogo, paisesDelViaje } from "@/lib/viaje";
import { actividadesDe, alojamientosDe } from "@/lib/catalogo";
import { formatearFecha, formatearRangoFechas } from "@/lib/formatoFecha";
import type { ActividadDestino, PersonaViajero } from "@/lib/types";

const ICONO_MODO: Record<string, string> = {
  avion: "✈️",
  tren: "🚆",
  autobus: "🚌",
  metro: "🚇",
  taxi: "🚕",
  coche_alquiler: "🚗",
  a_pie: "🚶",
  otro: "•",
};

const ETIQUETA_DOCUMENTO: Record<string, string> = {
  vuelo: "Vuelo",
  tren_bus: "Tren / Autobús",
  alojamiento: "Alojamiento",
  transporte_local: "Transporte local",
  entrada: "Entrada",
  seguro: "Seguro",
  documento_personal: "Documento personal",
  otro: "Otro",
};

export default function ImprimirViajePage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, viajeros } = useData();
  const viaje = obtenerViaje(params.id);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  const etapas = etapasDe(viaje);
  const paises = paisesDelViaje(viaje);
  const viajerosDelViaje = viajeros.filter((v) => viaje.viajerosIds.includes(v.id));
  const destinoPrincipalRef = destinoParaCatalogo(etapas[0]);
  const alojamientoElegido = alojamientosDe(destinoPrincipalRef).find((a) => a.id === viaje.alojamientoId);

  // Para mostrar el nombre real de cada actividad del itinerario, aunque
  // sea del catálogo orientativo y no algo que el viajero escribió a mano.
  const catalogoPorId = new Map<string, ActividadDestino>();
  for (const etapa of etapas) {
    for (const item of actividadesDe(destinoParaCatalogo(etapa))) {
      catalogoPorId.set(item.id, item);
    }
  }
  function nombreActividad(actividadId: string, notas?: string): string {
    if (notas) return notas;
    const enViaje = viaje!.actividades.find((a) => a.actividadId === actividadId);
    if (enViaje?.propia) return enViaje.propia.nombre;
    return catalogoPorId.get(actividadId)?.nombre ?? actividadId;
  }

  return (
    <main className="flex-1 px-5 py-8 print:px-0 print:py-0">
      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body { background: white; }
        }
      `}</style>

      <div className="mx-auto max-w-2xl print:max-w-none">
        <div className="print:hidden">
          <Cabecera titulo="Imprimir viaje" subtitulo="Un resumen completo para llevar o mostrar en migración." volverA={`/viajes/${viaje.id}`} />
          <button onClick={() => window.print()} className="btn-primary mb-6 w-full">
            🖨️ Imprimir o guardar como PDF
          </button>
        </div>

        {/* Portada del documento */}
        <header className="mb-6 border-b-2 border-neutral-900 pb-4">
          <h1 className="text-2xl font-bold">{viaje.destino}</h1>
          <p className="text-neutral-600">
            {viaje.fechaSalida && viaje.fechaRegreso ? formatearRangoFechas(viaje.fechaSalida, viaje.fechaRegreso) : "Fechas por confirmar"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Ruta: {etapas.map((e) => e.nombre).join(" → ")}
            {paises.length > 0 && ` · ${paises.map((p) => p.nombre).join(", ")}`}
          </p>
        </header>

        <section className="mb-6">
          <h2 className="mb-2 font-semibold">Viajeros</h2>
          <ul className="space-y-1 text-sm">
            {viajerosDelViaje.map((v) => (
              <li key={v.id} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">
                  {v.tipo === "persona" ? "🧑" : "🐾"} {v.nombre} {v.tipo === "persona" ? (v as PersonaViajero).apellido ?? "" : ""}
                </span>
                {v.tipo === "persona" && v.nacionalidad && <span className="text-neutral-500">· Nacionalidad: {v.nacionalidad}</span>}
                {v.documentos.length > 0 && (
                  <span className="text-neutral-500">
                    · {v.documentos.map((d) => `${d.tipo}: ${d.nombre}${d.fechaVencimiento ? ` (vence ${d.fechaVencimiento})` : ""}`).join(", ")}
                  </span>
                )}
              </li>
            ))}
            {viajerosDelViaje.length === 0 && <li className="text-neutral-400">Sin viajeros asignados.</li>}
          </ul>
        </section>

        {alojamientoElegido && (
          <section className="mb-6">
            <h2 className="mb-2 font-semibold">Alojamiento de referencia</h2>
            <p className="text-sm">{alojamientoElegido.nombre} — {alojamientoElegido.ubicacion}</p>
          </section>
        )}

        {viaje.transporte.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 font-semibold">Transporte</h2>
            <ul className="space-y-1 text-sm">
              {[...viaje.transporte]
                .sort((a, b) => (a.horaSalida ?? "").localeCompare(b.horaSalida ?? ""))
                .map((t) => (
                  <li key={t.id}>
                    {ICONO_MODO[t.modo] ?? "•"} {t.origen} → {t.destino}
                    {t.horaSalida && ` · ${t.horaSalida.replace("T", " ")}`}
                    {t.notas && ` · ${t.notas}`}
                  </li>
                ))}
            </ul>
          </section>
        )}

        {viaje.documentos.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 font-semibold">Reservas y documentos (Travel Vault)</h2>
            <p className="mb-2 text-xs text-neutral-500">
              Esto es justo lo que suele pedir un agente migratorio: referencia de reserva, proveedor y fechas.
            </p>
            <ul className="space-y-1 text-sm">
              {viaje.documentos.map((d) => (
                <li key={d.id}>
                  <span className="font-medium">{ETIQUETA_DOCUMENTO[d.tipo] ?? d.tipo}:</span> {d.proveedor}
                  {d.referencia && ` · Ref. ${d.referencia}`}
                  {d.fecha && ` · ${d.fecha}${d.hora ? ` ${d.hora}` : ""}`}
                  {d.direccion && ` · ${d.direccion}`}
                  {d.notas && ` · ${d.notas}`}
                </li>
              ))}
            </ul>
          </section>
        )}

        {viaje.itinerario && viaje.itinerario.dias.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 font-semibold">Itinerario día a día</h2>
            <div className="space-y-3">
              {viaje.itinerario.dias.map((dia) => (
                <div key={dia.fecha} className="break-inside-avoid rounded-lg border border-neutral-200 p-3 text-sm">
                  <p className="font-medium">
                    Día {dia.dia} · {formatearFecha(dia.fecha)}
                    {dia.etapa && ` · 📍 ${dia.etapa}`}
                    {dia.descansoTotal && " · Descanso"}
                  </p>
                  {dia.notas && <p className="mt-1 text-neutral-600">{dia.notas}</p>}
                  {dia.actividades.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-neutral-700">
                      {dia.actividades.map((a, i) => (
                        <li key={i}>
                          {a.horaInicio}–{a.horaFin}: {nombreActividad(a.actividadId, a.notas)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-8 border-t border-neutral-200 pt-3 text-xs text-neutral-400 print:mt-4">
          Generado con Efecto Viajero el {formatearFecha(new Date().toISOString().split("T")[0])}.
        </footer>
      </div>
    </main>
  );
}
