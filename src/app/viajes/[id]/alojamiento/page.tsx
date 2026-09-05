"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { alojamientosDe } from "@/lib/catalogo";
import { destinoDeEtapa, etapasDe } from "@/lib/viaje";
import { buscadoresAlojamiento } from "@/lib/afiliados";
import { PRESENTATION_STATUS } from "@/lib/travelBrain/presentation";

function StatusBadge({ status, detail }: { status: keyof typeof PRESENTATION_STATUS; detail?: string }) {
  const meta = PRESENTATION_STATUS[status];
  return (
    <span title={detail} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
      <span>{meta.icon}</span>{meta.label}
    </span>
  );
}

export default function AlojamientoPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);
  const [etapaActiva, setEtapaActiva] = useState(0);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl"><Cabecera titulo="Viaje no encontrado" volverA="/viajes" /></div>
      </main>
    );
  }

  const etapas = etapasDe(viaje);
  const etapa = etapas[Math.min(etapaActiva, Math.max(etapas.length - 1, 0))];
  if (!etapa) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl"><ViajeToolsNav viajeId={viaje.id} /><Cabecera titulo="Alojamiento" subtitulo="Añade primero una ciudad en Ruta." volverA={`/viajes/${viaje.id}`} /></div>
      </main>
    );
  }
  const destino = destinoDeEtapa(etapa);
  const buscadores = buscadoresAlojamiento(etapa.nombre, viaje.fechaSalida, viaje.fechaRegreso);
  const referencias = destino ? alojamientosDe(destino) : [];
  const usadaEnPresupuesto = referencias.find((o) => o.id === viaje.alojamientoId);

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera titulo="Alojamiento" subtitulo={`Dónde dormir en ${etapa.nombre}.`} volverA={`/viajes/${viaje.id}`} />

        {etapas.length > 1 && (
          <div className="mb-4 -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {etapas.map((e, i) => (
              <button key={e.id} onClick={() => setEtapaActiva(i)} className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${i === etapaActiva ? "border-marino-700 bg-marino-700 text-white" : "border-neutral-200 text-neutral-600 hover:border-marino-500"}`}>
                {i + 1}. {e.nombre}
              </button>
            ))}
          </div>
        )}

        <section className="card mb-6">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="font-medium">Buscar y reservar</h2>
            <StatusBadge status="researching" detail="Estos enlaces abren buscadores externos; todavía no representan una disponibilidad verificada." />
          </div>
          <p className="mb-4 text-xs text-neutral-400">La reserva se hace en la web del proveedor, con tu destino y fechas ya puestos.</p>
          <ul className="space-y-2">
            {buscadores.map((b) => (
              <li key={b.id}>
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 transition hover:border-marino-500 hover:bg-marino-50">
                  <span className="text-xl">{b.icono}</span>
                  <span className="flex-1"><span className="block text-sm font-medium text-neutral-900">{b.nombre}</span><span className="block text-xs text-neutral-500">{b.descripcion}</span></span>
                  <span className="text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-marino-600">↗</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-neutral-500">Cuando confirmes, sube el documento al <Link href={`/viajes/${viaje.id}/vault`} className="text-marino-600 underline">Travel Vault</Link> y se archiva solo.</p>
        </section>

        {referencias.length > 0 && (
          <section className="tip">
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-coral-700">Consejo</p>
              <StatusBadge status="partial" detail="Son referencias orientativas por zona, no alojamientos reales ni disponibilidad." />
            </div>
            <h2 className="mb-1 font-medium text-neutral-900">Cuánto contar por noche</h2>
            <p className="mb-4 text-sm text-neutral-600">En {destino?.nombre}, según la zona donde duermas, esto es lo que conviene presupuestar. Son cifras orientativas por zona — no son alojamientos reales ni una reserva.</p>
            <ul className="space-y-3">
              {referencias.map((o) => {
                const usada = viaje.alojamientoId === o.id;
                return (
                  <li key={o.id} className="rounded-xl bg-white/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-medium capitalize text-neutral-900">{o.ubicacion}</p><p className="mt-1 text-xs text-emerald-700">✓ {o.pros.join(" · ")}</p><p className="text-xs text-neutral-500">✗ {o.contras.join(" · ")}</p></div>
                      <p className="shrink-0 text-lg font-semibold tabular-nums text-neutral-900">{o.precioNoche}€<span className="block text-right text-xs font-normal text-neutral-400">por noche</span></p>
                    </div>
                    <button onClick={() => actualizarViaje(viaje.id, { alojamientoId: usada ? undefined : o.id })} className={`mt-2 text-xs underline ${usada ? "text-marino-700" : "text-neutral-400 hover:text-neutral-900"}`}>{usada ? "✓ Contando esta zona en el presupuesto — quitar" : "Contar esta zona en mi presupuesto"}</button>
                  </li>
                );
              })}
            </ul>
            {!usadaEnPresupuesto && <p className="mt-4 text-xs text-neutral-500">Elige una zona de referencia y el presupuesto del viaje empezará a contar el alojamiento.</p>}
          </section>
        )}

        {referencias.length === 0 && <p className="text-xs text-neutral-400">No tenemos referencia de precios por zona de {etapa.nombre}. Los buscadores de arriba sí funcionan: mira dos o tres y usa el precio que veas para calcular tu presupuesto.</p>}
      </div>
    </main>
  );
}
