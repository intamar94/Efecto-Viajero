"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";

function Estado({ ok, texto }: { ok: boolean; texto: string }) {
  return <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ok ? "✓" : "!"} {texto}</span>;
}

export default function DecisionesPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje } = useData();
  const viaje = obtenerViaje(params.id);

  if (!viaje) return <main className="flex-1 px-5 py-8"><div className="mx-auto max-w-xl"><Cabecera titulo="Viaje no encontrado" volverA="/viajes" /></div></main>;

  const documentos = viaje.documentos.length;
  const transportes = viaje.transporte.length;
  const actividades = viaje.actividades.filter((a) => a.estado !== "descartada").length;
  const reservas = viaje.actividades.filter((a) => a.estado === "reservada").length;
  const itinerario = viaje.itinerario?.dias.length ?? 0;
  const pendientes = [
    transportes === 0 ? "Añadir o investigar los tramos de transporte." : null,
    documentos === 0 ? "Guardar documentación y reservas en Travel Vault." : null,
    itinerario === 0 ? "Construir el itinerario día por día." : null,
  ].filter(Boolean) as string[];

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera titulo="Centro de decisiones" subtitulo="Lo importante para avanzar en tu viaje, sin tener que revisar todo." volverA={`/viajes/${viaje.id}`} />

        <section className="card mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Estado del viaje</p>
              <h2 className="mt-1 text-xl font-semibold text-neutral-900">{pendientes.length ? "Hay cosas por cerrar" : "Base del viaje completa"}</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${pendientes.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{pendientes.length} pendientes</span>
          </div>
          {pendientes.length > 0 && <ul className="mt-4 space-y-2">{pendientes.map((p) => <li key={p} className="rounded-lg bg-amber-50/70 px-3 py-2 text-sm text-amber-800">! {p}</li>)}</ul>}
        </section>

        <section className="mb-5 grid grid-cols-2 gap-3">
          <div className="card"><p className="text-2xl font-semibold">{actividades}</p><p className="text-xs text-neutral-500">planes activos</p></div>
          <div className="card"><p className="text-2xl font-semibold">{reservas}</p><p className="text-xs text-neutral-500">planes reservados</p></div>
          <div className="card"><p className="text-2xl font-semibold">{transportes}</p><p className="text-xs text-neutral-500">tramos guardados</p></div>
          <div className="card"><p className="text-2xl font-semibold">{documentos}</p><p className="text-xs text-neutral-500">documentos</p></div>
        </section>

        <section className="card mb-5">
          <h2 className="font-medium text-neutral-900">Qué está listo</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Estado ok={actividades > 0} texto="Actividades" />
            <Estado ok={transportes > 0} texto="Transporte" />
            <Estado ok={documentos > 0} texto="Documentos" />
            <Estado ok={itinerario > 0} texto="Itinerario" />
          </div>
        </section>

        <section className="card">
          <h2 className="font-medium text-neutral-900">Siguiente acción</h2>
          <p className="mt-1 text-sm text-neutral-500">No necesitas revisar todo. Empieza por lo que puede bloquear el viaje.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {transportes === 0 && <Link href={`/viajes/${viaje.id}/transporte`} className="btn-primary">Revisar transporte</Link>}
            {documentos === 0 && <Link href={`/viajes/${viaje.id}/vault`} className="btn-secondary">Abrir Travel Vault</Link>}
            {itinerario === 0 && <Link href={`/viajes/${viaje.id}/ruta`} className="btn-secondary">Construir itinerario</Link>}
            {pendientes.length === 0 && <Link href={`/viajes/${viaje.id}/actividades`} className="btn-primary">Explorar planes</Link>}
          </div>
        </section>
      </div>
    </main>
  );
}
