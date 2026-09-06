"use client";
import { useState } from "react";
import { Cabecera } from "@/components/Cabecera";
import { TravelStatus } from "@/components/TravelStatus";
import type { PresentationStatus } from "@/lib/travelBrain/presentation";

type Action = { id: string; type: string; target: string; reason: string; priority: string; status: string };
type Brain = { phase?: string; completeness?: number; confidence?: number; cycles?: number; facts?: unknown[]; evidence?: unknown[]; pendingActions?: Action[]; blockers?: Array<{ target?: string; reason?: string }>; decision?: { action?: Action | null; rationale?: string } };
type Data = { brain?: Brain; context?: { dates?: { start?: string; end?: string }; travelers?: { adultos?: number; ninos?: number; bebes?: number; personasMayores?: number; mascotas?: number } }; deconstructed?: { locationCandidates?: string[] }; unresolved?: string[] };

const DEMO_TEXT = "Familia desde Madrid a Colombia: Bogotá, Medellín y Cartagena. Dos adultos, dos niños, un bebé, una persona mayor y un perro. Sin conducir, ritmo tranquilo, 6000 EUR. Gastronomía, descanso, lluvia, documentación, seguro, emergencias, moneda, mapa, gastos y offline. No inventar información.";
const actionLabel = (action?: Action) => {
  if (!action) return "Sin siguiente paso";
  const labels: Record<string, string> = { research: "Investigar", verify: "Comprobar", cross_check: "Contrastar", resolve_conflict: "Resolver", request_missing_data: "Pedir un dato", recalculate: "Recalcular" };
  return `${labels[action.type] ?? "Revisar"}: ${action.target}`;
};
const phaseStatus = (phase?: string): PresentationStatus => phase === "blocked" ? "unavailable" : phase === "complete" ? "verified" : phase === "resolving" ? "pending" : "researching";

export default function CerebroPage() {
  const [data, setData] = useState<Data | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [diagnostic, setDiagnostic] = useState(false);

  async function run() {
    setRunning(true); setError("");
    try {
      const response = await fetch("/api/trips/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: DEMO_TEXT, fechaSalida: "2027-04-10", fechaRegreso: "2027-04-24", adultos: 2, ninos: 2, edadesNinos: [6, 11], bebes: 1, personasMayores: 1, mascotas: 1, presupuesto: 6000, moneda: "EUR", presupuestoTipo: "total", presupuestoFlexible: true, modoPlanificacion: "completo", origen: "Madrid", transport: ["sin conducir"], food: ["gastronomía colombiana"], constraints: ["ritmo tranquilo", "lluvia", "descanso", "no inventar información"], destinations: ["Bogotá", "Medellín", "Cartagena"] }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo analizar el viaje.");
      setData(payload);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo analizar el viaje."); }
    finally { setRunning(false); }
  }

  const brain = data?.brain;
  const next = brain?.decision?.action ?? undefined;
  const pending = brain?.pendingActions ?? [];
  const blockers = brain?.blockers ?? [];

  return <main className="flex-1 px-4 py-5 md:px-6 md:py-7"><div className="mx-auto max-w-5xl"><Cabecera titulo="Estado de tu viaje" volverA="/" />
    <section className="card mb-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-coral-600">Cerebro de viaje</p><h1 className="mt-2 text-2xl font-semibold">Entender, comprobar y decidir.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">Te mostramos el resultado del trabajo, no la maquinaria interna.</p></div><button onClick={run} disabled={running} className="btn-primary">{running ? "Analizando…" : "Analizar viaje"}</button></div></section>
    {error && <div className="status-error mb-5 rounded-2xl border p-4 text-sm">{error}</div>}
    {running && <div className="card mb-5"><p className="font-medium">Estamos trabajando en tu viaje</p><p className="mt-1 text-sm text-neutral-500">Entender → investigar → comprobar → decidir.</p></div>}
    {data && brain && <><div className="mb-5 flex gap-2 rounded-2xl border border-neutral-200 bg-white p-1"><button className={`flex-1 rounded-xl px-4 py-2 text-sm ${!diagnostic ? "bg-neutral-950 text-white" : "text-neutral-600"}`} onClick={() => setDiagnostic(false)}>Para ti</button><button className={`flex-1 rounded-xl px-4 py-2 text-sm ${diagnostic ? "bg-neutral-950 text-white" : "text-neutral-600"}`} onClick={() => setDiagnostic(true)}>Diagnóstico</button></div>
      {!diagnostic ? <div className="space-y-5"><section className="grid gap-3 md:grid-cols-3"><div className="card"><p className="text-xs text-neutral-500">Comprensión</p><p className="mt-1 text-3xl font-semibold">{Math.round((brain.completeness ?? 0) * 100)}%</p></div><div className="card"><p className="text-xs text-neutral-500">Confianza</p><p className="mt-1 text-3xl font-semibold">{Math.round((brain.confidence ?? 0) * 100)}%</p></div><div className="card"><p className="text-xs text-neutral-500">Estado</p><div className="mt-2"><TravelStatus status={phaseStatus(brain.phase)} /></div></div></section><section className="grid gap-5 md:grid-cols-2"><div className="card"><p className="text-xs uppercase tracking-wider text-neutral-400">Ahora</p><h2 className="mt-2 text-xl font-semibold">{actionLabel(next)}</h2><p className="mt-2 text-sm leading-6 text-neutral-600">{brain.decision?.rationale ?? "El sistema está determinando el siguiente paso."}</p></div><div className="card"><h2 className="font-semibold">Lo que hemos entendido</h2><div className="mt-3 space-y-2 text-sm"><p>Ruta: {data.deconstructed?.locationCandidates?.join(" → ") || "Pendiente"}</p><p>Fechas: {data.context?.dates?.start ?? "—"} → {data.context?.dates?.end ?? "—"}</p><p>Grupo: {data.context?.travelers?.adultos ?? 0} adultos · {data.context?.travelers?.ninos ?? 0} niños · {data.context?.travelers?.bebes ?? 0} bebé · {data.context?.travelers?.personasMayores ?? 0} persona mayor · {data.context?.travelers?.mascotas ?? 0} mascota</p></div></div></section><section className="grid gap-5 md:grid-cols-2"><div className="card"><h2 className="font-semibold">Qué falta</h2><div className="mt-3 space-y-2">{[...(data.unresolved ?? []), ...blockers.map(item => item.target).filter(Boolean)].slice(0, 8).map(item => <div key={item} className="status-pending rounded-xl border p-3 text-sm">{item}</div>)}{!data.unresolved?.length && !blockers.length && <p className="text-sm text-neutral-500">No se han detectado bloqueos críticos.</p>}</div></div><div className="card"><h2 className="font-semibold">Qué ocurrirá después</h2><div className="mt-3 space-y-2">{pending.slice(0, 6).map(action => <div key={action.id} className="rounded-xl border border-neutral-200 p-3 text-sm">{actionLabel(action)}</div>)}{!pending.length && <p className="text-sm text-neutral-500">No hay acciones pendientes.</p>}</div></div></section></div>
      : <div className="space-y-5"><section className="card"><h2 className="font-semibold">Diagnóstico técnico</h2><div className="mt-4 grid gap-3 md:grid-cols-4"><div><p className="text-xs text-neutral-400">Fase</p><p className="font-medium">{brain.phase ?? "—"}</p></div><div><p className="text-xs text-neutral-400">Ciclos</p><p className="font-medium">{brain.cycles ?? 0}</p></div><div><p className="text-xs text-neutral-400">Hechos</p><p className="font-medium">{brain.facts?.length ?? 0}</p></div><div><p className="text-xs text-neutral-400">Evidencias</p><p className="font-medium">{brain.evidence?.length ?? 0}</p></div></div></section><section className="card"><h2 className="font-semibold">Bloqueos</h2><div className="mt-3 space-y-2">{blockers.map((item, index) => <div key={index} className="status-error rounded-xl border p-3 text-sm">{item.target}: {item.reason}</div>)}{!blockers.length && <p className="text-sm text-neutral-500">Sin bloqueos registrados.</p>}</div></section></div>}
    </>}</div></main>;
}
