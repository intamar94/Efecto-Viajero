"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { etapasDe } from "@/lib/viaje";
import type { Viaje } from "@/lib/types";
import type { BrainInput } from "@/lib/travelBrain/brainController";

function Estado({ ok, texto }: { ok: boolean; texto: string }) {
  return <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ok ? "✓" : "!"} {texto}</span>;
}

type Action = { id: string; type: string; target: string; reason: string; priority: string; status: string };
type DepartmentReport = { domain: string; status: string; unresolved: string[]; conflicts: string[] };
type Brain = {
  phase?: string; completeness?: number; confidence?: number; cycles?: number;
  evidence?: unknown[]; conflicts?: Array<{ key?: string; reason?: string }>;
  pendingActions?: Action[]; blockers?: Array<{ type?: string; target?: string; reason?: string }>;
  decision?: { action?: Action | null; rationale?: string };
};
type Analysis = {
  unresolved?: string[];
  orchestration?: { selected: string[]; skipped: string[]; reasons: Record<string, string> };
  plan?: { tasks: Array<{ id: string; domain: string; priority: string; dependsOn: string[] }> };
  departmentReports?: DepartmentReport[];
  brain?: Brain;
};

function pct(value?: number) { return `${Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100)}%`; }
function label(value?: string) { return String(value ?? "—").replaceAll("_", " "); }
function tone(status?: string) {
  if (["complete", "ready", "converged", "completed"].includes(String(status))) return "bg-emerald-50 text-emerald-700";
  if (["blocked", "error", "failed", "unavailable"].includes(String(status))) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

// Traduce el viaje real (no un texto de ejemplo) a lo que pide el cerebro:
// si el viaje se creó en /planificar ya tiene una descripción libre; si no,
// se arma una a partir de lo que sí sabemos (destino, etapas, fechas).
function construirEntradaCerebro(viaje: Viaje): BrainInput {
  const etapas = etapasDe(viaje);
  const composicion = viaje.contexto.viajeros;
  const destinations = etapas.length ? etapas.map((e) => e.nombre) : [viaje.destino];
  const textoBase = viaje.contexto.textoOriginal?.trim();
  const text = textoBase && textoBase.length > 0 ? textoBase : `Viaje a ${destinations.join(", ")}.`;
  return {
    text,
    fechaSalida: viaje.fechaSalida,
    fechaRegreso: viaje.fechaRegreso,
    presupuesto: viaje.contexto.presupuestoTotal ?? viaje.contexto.presupuesto?.importe,
    moneda: viaje.contexto.presupuesto?.moneda,
    presupuestoTipo: viaje.contexto.presupuesto?.tipo,
    adultos: composicion?.adultos ?? viaje.contexto.numAdultos,
    ninos: composicion?.ninos,
    edadesNinos: composicion?.edadesNinos ?? viaje.contexto.edadesMenores,
    bebes: composicion?.bebes,
    personasMayores: composicion?.personasMayores,
    mascotas: composicion?.mascotas ?? (viaje.contexto.mascota ? 1 : undefined),
    accesibilidad: composicion?.accesibilidad ?? viaje.contexto.accesibilidad,
    modoPlanificacion: viaje.modoPlanificacion,
    origen: viaje.contexto.ciudadOrigen,
    interests: viaje.contexto.intereses,
    food: viaje.contexto.preferenciasComida,
    transport: viaje.contexto.preferenciasTransporte,
    constraints: viaje.contexto.restricciones,
    destinations,
  };
}

export default function DecisionesPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje } = useData();
  const viaje = obtenerViaje(params.id);

  const [analizando, setAnalizando] = useState(false);
  const [analisis, setAnalisis] = useState<Analysis | null>(null);
  const [errorAnalisis, setErrorAnalisis] = useState("");

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

  async function analizarConCerebro() {
    if (!viaje || analizando) return;
    setAnalizando(true);
    setErrorAnalisis("");
    try {
      const entrada = construirEntradaCerebro(viaje);
      const response = await fetch("/api/trips/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entrada),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "El cerebro no pudo completar el análisis.");
      setAnalisis(data as Analysis);
    } catch (e) {
      setErrorAnalisis(e instanceof Error ? e.message : "No se pudo analizar el viaje.");
    } finally {
      setAnalizando(false);
    }
  }

  const brain = analisis?.brain;
  const next = brain?.decision?.action;
  const pending = brain?.pendingActions ?? [];
  const conflicts = brain?.conflicts ?? [];
  const blockers = brain?.blockers ?? [];
  const tasks = analisis?.plan?.tasks ?? [];
  const reportsByDomain = new Map((analisis?.departmentReports ?? []).map((r) => [r.domain, r]));
  const selected = analisis?.orchestration?.selected ?? [];
  const skipped = analisis?.orchestration?.skipped ?? [];

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

        <section className="card mb-5">
          <h2 className="font-medium text-neutral-900">Siguiente acción</h2>
          <p className="mt-1 text-sm text-neutral-500">No necesitas revisar todo. Empieza por lo que puede bloquear el viaje.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {transportes === 0 && <Link href={`/viajes/${viaje.id}/transporte`} className="btn-primary">Revisar transporte</Link>}
            {documentos === 0 && <Link href={`/viajes/${viaje.id}/vault`} className="btn-secondary">Abrir Travel Vault</Link>}
            {itinerario === 0 && <Link href={`/viajes/${viaje.id}/ruta`} className="btn-secondary">Construir itinerario</Link>}
            {pendientes.length === 0 && <Link href={`/viajes/${viaje.id}/actividades`} className="btn-primary">Explorar planes</Link>}
          </div>
        </section>

        {/* El cerebro: investiga tu viaje real (no un ejemplo) por dominios —
            transporte, alojamiento, clima, cultura, requisitos, etc. — y
            reparte el trabajo entre "departamentos" que se autocorrigen
            antes de reportar. Se ejecuta solo cuando lo pides, porque llama
            a servicios reales (OpenStreetMap, Open-Meteo...) y no tiene
            sentido repetirlo en cada visita. */}
        <section className="card mb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-marino-600">El cerebro</p>
              <h2 className="mt-1 text-xl font-semibold text-neutral-900">Análisis profundo de tu viaje</h2>
            </div>
            <button onClick={analizarConCerebro} disabled={analizando} className="btn-primary shrink-0 disabled:opacity-60">
              {analizando ? "Analizando…" : analisis ? "🔄 Repetir" : "▶ Analizar"}
            </button>
          </div>
          <p className="mt-2 text-sm text-neutral-500">Reparte tu viaje entre departamentos (transporte, alojamiento, clima, cultura, requisitos…), cada uno con sus propios agentes, y solo te avisa de lo que de verdad quedó sin resolver.</p>

          {errorAnalisis && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorAnalisis}</p>}

          {brain && (
            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Entendido</p><p className="mt-1 text-2xl font-semibold">{pct(brain.completeness)}</p></div>
                <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Confianza</p><p className="mt-1 text-2xl font-semibold">{pct(brain.confidence)}</p></div>
                <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Pendiente</p><p className="mt-1 text-2xl font-semibold">{pending.length}</p></div>
                <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-500">Ciclos</p><p className="mt-1 text-2xl font-semibold">{brain.cycles ?? 0}</p></div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Ahora mismo</p>
                <p className="mt-1 font-medium">{next ? `${label(next.type)} · ${label(next.target)}` : "No hay una acción inmediata"}</p>
                <p className="mt-1 text-sm text-neutral-500">{brain.decision?.rationale ?? "Todavía no hay suficiente estado para explicar una decisión."}</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${tone(brain.phase)}`}>{label(brain.phase)}</span>
              </div>

              {(analisis?.unresolved?.length || blockers.length) ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Qué falta</p>
                  <div className="mt-2 space-y-1.5">
                    {[...new Set([...(analisis?.unresolved ?? []), ...blockers.map((b) => b.target ?? "").filter(Boolean)])].slice(0, 8).map((item) => (
                      <div key={item} className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-900">{item}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-500">No hay faltantes globales registrados.</p>
              )}

              {conflicts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Conflictos entre departamentos</p>
                  <div className="mt-2 space-y-1.5">
                    {conflicts.map((c) => (
                      <div key={c.key} className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800"><b>{c.key}</b> — {c.reason}</div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-baseline justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Departamentos</p>
                  <p className="text-xs text-neutral-400">{selected.length} activos · {skipped.length} omitidos</p>
                </div>
                <div className="mt-2 space-y-2">
                  {tasks.map((task) => {
                    const report = reportsByDomain.get(task.domain);
                    return (
                      <div key={task.id} className="rounded-lg border border-neutral-200 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{task.domain}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone(report?.status)}`}>{label(report?.status ?? "pendiente")}</span>
                        </div>
                        {analisis?.orchestration?.reasons?.[task.domain] && <p className="mt-1 text-xs text-neutral-500">{analisis.orchestration.reasons[task.domain]}</p>}
                        {report?.unresolved && report.unresolved.length > 0 && <p className="mt-1 text-xs text-amber-700">Sin resolver: {report.unresolved.slice(0, 3).join(" · ")}</p>}
                      </div>
                    );
                  })}
                </div>
                {skipped.length > 0 && (
                  <p className="mt-2 text-xs text-neutral-400">Omitidos (no aplican a este viaje): {skipped.join(", ")}</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
