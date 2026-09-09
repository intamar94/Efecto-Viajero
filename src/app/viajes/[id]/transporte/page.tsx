"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { TransporteLocalCiudad } from "@/components/TransporteLocalCiudad";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { URL_BUS, URL_TREN, urlBusquedaVuelos } from "@/lib/afiliados";
import { paisesDelViaje, etapasDe } from "@/lib/viaje";
import type { ModoTransporte, TramoTransporte } from "@/lib/types";
import { PRESENTATION_STATUS } from "@/lib/travelBrain/presentation";

const MODOS: { valor: ModoTransporte; etiqueta: string }[] = [
  { valor: "avion", etiqueta: "✈️ Avión" }, { valor: "tren", etiqueta: "🚆 Tren" }, { valor: "autobus", etiqueta: "🚌 Autobús" },
  { valor: "metro", etiqueta: "🚇 Metro/tranvía" }, { valor: "taxi", etiqueta: "🚕 Taxi / transfer" }, { valor: "coche_alquiler", etiqueta: "🚗 Coche de alquiler" },
  { valor: "a_pie", etiqueta: "🚶 A pie" }, { valor: "otro", etiqueta: "Otro" },
];
const ICONO: Record<ModoTransporte, string> = { avion: "✈️", tren: "🚆", autobus: "🚌", metro: "🚇", taxi: "🚕", coche_alquiler: "🚗", a_pie: "🚶", otro: "•" };

function StatusBadge({ status, detail }: { status: keyof typeof PRESENTATION_STATUS; detail?: string }) {
  const meta = PRESENTATION_STATUS[status];
  return <span title={detail} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}><span>{meta.icon}</span>{meta.label}</span>;
}

export default function TransportePage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);
  const [modo, setModo] = useState<ModoTransporte>("tren");
  const [origen, setOrigen] = useState(""); const [destinoTramo, setDestinoTramo] = useState(""); const [horaSalida, setHoraSalida] = useState(""); const [coste, setCoste] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false); const [ciudadOrigenInput, setCiudadOrigenInput] = useState(""); const [editandoOrigen, setEditandoOrigen] = useState(false);

  if (!viaje) return <main className="flex-1 px-5 py-8"><div className="mx-auto max-w-xl"><Cabecera titulo="Viaje no encontrado" volverA="/viajes" /></div></main>;

  function agregar(e: React.FormEvent) {
    e.preventDefault(); if (!viaje || !origen.trim() || !destinoTramo.trim()) return;
    const nuevo: TramoTransporte = { id: generarId(), modo, origen: origen.trim(), destino: destinoTramo.trim(), horaSalida: horaSalida || undefined, costeEstimado: coste ? Number.parseFloat(coste) : undefined };
    actualizarViaje(viaje.id, { transporte: [...viaje.transporte, nuevo] }); setOrigen(""); setDestinoTramo(""); setHoraSalida(""); setCoste(""); setMostrarFormulario(false);
  }
  function eliminar(id: string) { if (viaje) actualizarViaje(viaje.id, { transporte: viaje.transporte.filter((t) => t.id !== id) }); }
  function guardarOrigen(e: React.FormEvent) { e.preventDefault(); if (!viaje) return; actualizarViaje(viaje.id, { contexto: { ...viaje.contexto, ciudadOrigen: ciudadOrigenInput.trim() || undefined } }); setEditandoOrigen(false); }

  const ordenados = [...viaje.transporte].sort((a, b) => (a.horaSalida ?? "").localeCompare(b.horaSalida ?? ""));
  const paises = paisesDelViaje(viaje); const etapas = etapasDe(viaje);

  return (
    <main className="flex-1 px-5 py-8"><div className="mx-auto max-w-xl">
      <ViajeToolsNav viajeId={viaje.id} />
      <Cabecera titulo="Transporte" subtitulo="Cómo llegar y cómo moverte una vez allí." volverA={`/viajes/${viaje.id}`} />

      <section className="card mb-6">
        <div className="mb-1 flex items-center justify-between gap-3"><h2 className="font-medium">Cómo llegar</h2><StatusBadge status="researching" detail="Estos enlaces abren buscadores externos; todavía no representan una ruta, tarifa o disponibilidad verificada." /></div>
        <p className="mb-3 text-xs text-neutral-400">Te lleva a la web real del proveedor para completar la reserva. Vuelve aquí y guarda el ticket en el Travel Vault.</p>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm"><span className="text-neutral-500">Saliendo desde:</span>
          {editandoOrigen ? <form onSubmit={guardarOrigen} className="flex flex-1 gap-2"><input className="input flex-1" placeholder="ej. Madrid" value={ciudadOrigenInput} onChange={(e) => setCiudadOrigenInput(e.target.value)} autoFocus /><button type="submit" className="btn-primary shrink-0 px-3 py-1.5 text-xs">Guardar</button></form> : <button type="button" onClick={() => { setCiudadOrigenInput(viaje.contexto.ciudadOrigen ?? ""); setEditandoOrigen(true); }} className="font-medium text-marino-700 underline hover:text-marino-900">{viaje.contexto.ciudadOrigen ?? "sin definir — añadir"}</button>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={urlBusquedaVuelos(viaje.destino, viaje.contexto.ciudadOrigen, viaje.fechaSalida, viaje.fechaRegreso)} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs">✈️ Buscar vuelos</a>
          <a href={URL_TREN} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs">🚆 Trainline</a>
          <a href={URL_BUS} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs">🚌 FlixBus</a>
        </div>
        <p className="mt-3 text-sm text-neutral-500">Cuando reserves, guarda el ticket en el <Link href={`/viajes/${viaje.id}/vault`} className="text-marino-600 underline">Travel Vault</Link>.</p>
      </section>

      <h2 className="mb-3 font-medium">Moverte en cada ciudad</h2>
      {etapas.length === 0 ? <section className="card mb-6"><p className="text-sm text-neutral-500">Especifica las ciudades de tu viaje (en Ruta) para ver transporte local detallado.</p></section> : etapas.map((etapa) => <TransporteLocalCiudad key={etapa.id} ciudad={etapa.nombre} />)}

      <div className="mb-2 flex items-center justify-between gap-3"><h2 className="font-medium">Tus tramos</h2>{ordenados.length > 0 && <StatusBadge status="pending" detail="Estos tramos son datos introducidos por ti; no implican una reserva verificada por Efecto Viajero." />}</div>
      {ordenados.length === 0 ? <p className="mb-4 text-sm text-neutral-500">Todavía no hay tramos guardados.</p> : <ol className="mb-4 space-y-2">{ordenados.map((t) => <li key={t.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"><span>{ICONO[t.modo]} {t.origen} → {t.destino}{t.horaSalida && <span className="text-neutral-500"> · {t.horaSalida.replace("T", " ")}</span>}{t.costeEstimado !== undefined && <span className="text-neutral-500"> · {t.costeEstimado}€</span>}</span><button onClick={() => eliminar(t.id)} className="text-xs text-neutral-400 hover:text-red-600">Eliminar</button></li>)}</ol>}

      {mostrarFormulario ? <form onSubmit={agregar} className="card space-y-3"><select className="input" value={modo} onChange={(e) => setModo(e.target.value as ModoTransporte)}>{MODOS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}</select><div className="grid grid-cols-2 gap-3"><input className="input" placeholder="Origen" value={origen} onChange={(e) => setOrigen(e.target.value)} /><input className="input" placeholder="Destino" value={destinoTramo} onChange={(e) => setDestinoTramo(e.target.value)} /></div><div className="grid grid-cols-2 gap-3"><input type="datetime-local" className="input" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} /><input type="number" className="input" placeholder="Coste € (opcional)" value={coste} onChange={(e) => setCoste(e.target.value)} /></div><button type="submit" className="btn-primary w-full">+ Añadir tramo</button></form> : <button onClick={() => setMostrarFormulario(true)} className="text-sm text-neutral-500 underline hover:text-neutral-900">+ Añadir tramo a mano</button>}
    </div></main>
  );
}
