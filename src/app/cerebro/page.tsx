"use client";

import { useState } from "react";
import { Cabecera } from "@/components/Cabecera";

const DEMO_TEXT = "Somos una familia que viaja desde Madrid a Colombia del 10 al 24 de abril de 2027 durante 14 días: dos adultos, dos niños de 6 y 11 años, un bebé, una abuela de 72 años y nuestro perro mediano Nilo. Queremos Bogotá, Medellín y Cartagena, sin conducir, a ritmo tranquilo, con un presupuesto total flexible de 6000 EUR. Queremos actividades para todos pero no siempre juntos, alternativas si llueve, opciones de descanso, alojamiento adecuado para bebé, abuela y perro, gastronomía colombiana, transporte compatible, documentación y requisitos de cada viajero y mascota, seguro, emergencias, moneda, mapa, gastos y un paquete offline. No inventar información: lo que no pueda comprobarse debe quedar pendiente.";

type Action = { id: string; type: string; target: string; reason: string; priority: string; status: string; expectedOutput?: string[] };
type Brain = {
  phase?: string;
  completeness?: number;
  confidence?: number;
  cycles?: number;
  facts?: unknown[];
  evidence?: Array<{ source?: string; confidence?: string; freshness?: string; checkedAt?: string }>;
  conflicts?: Array<{ key?: string; reason?: string }>;
  pendingActions?: Action[];
  completedActions?: Action[];
  blockers?: Array<{ type?: string; target?: string; reason?: string; severity?: string }>;
  decision?: { action?: Action | null; rationale?: string; confidence?: number; blockingIssues?: string[] };
  changeSets?: Array<{ reason?: string; affectedNodes?: string[]; invalidatedFacts?: string[]; recompute?: string[] }>;
  optimization?: { status?: string; selected?: { label?: string; score?: number; reasons?: string[] }; candidates?: Array<{ label?: string; score?: number; reasons?: string[] }>; missingInputs?: string[]; objective?: string[] };
};

type Analysis = {
  context?: { dates?: { start?: string; end?: string }; budget?: { moneda?: string; cantidad?: number; tipo?: string }; travelers?: { adultos?: number; ninos?: number; bebes?: number; personasMayores?: number; mascotas?: number } };
  deconstructed?: { locationCandidates?: string[]; unresolved?: string[] };
  draft?: Array<{ day: number; date?: string; destination?: string; focus?: string[]; status?: string }>;
  ranked?: Array<{ destination?: { displayName?: string }; score?: number; reasons?: string[] }>;
  unresolved?: string[];
  pendingCount?: number;
  capabilityAudit?: { operational?: string[]; partial?: string[]; blocked?: string[]; items?: Array<{ domain: string; status: string; provider?: string }> };
  brain?: Brain;
};

function pct(value?: number) { return `${Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100)}%`; }
function label(value?: string) { return String(value ?? "—").replaceAll("_", " "); }
function tone(status?: string) {
  if (["complete", "ready", "converged", "completed"].includes(String(status))) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["blocked", "error", "failed"].includes(String(status))) return "border-red-200 bg-red-50 text-red-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default function CerebroPage() {
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"traveler" | "diagnostic">("traveler");

  async function ejecutar() {
    if (running) return;
    setRunning(true); setError(""); setData(null);
    try {
      const response = await fetch("/api/trips/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: DEMO_TEXT,
          fechaSalida: "2027-04-10", fechaRegreso: "2027-04-24",
          adultos: 2, ninos: 2, edadesNinos: [6, 11], bebes: 1, personasMayores: 1, mascotas: 1,
          presupuesto: 6000, moneda: "EUR", presupuestoTipo: "total", presupuestoFlexible: true,
          modoPlanificacion: "completo", origen: "Madrid",
          transport: ["sin conducir", "transporte compatible con familia y mascota"],
          food: ["gastronomía colombiana", "platos típicos"],
          constraints: ["ritmo tranquilo", "alternativas con lluvia", "descanso", "no inventar información"],
          destinations: ["Bogotá", "Medellín", "Cartagena"],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "El cerebro no pudo completar el análisis.");
      setData(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Error ejecutando el cerebro."); }
    finally { setRunning(false); }
  }

  const brain = data?.brain;
  const next = brain?.decision?.action;
  const pending = brain?.pendingActions ?? [];
  const conflicts = brain?.conflicts ?? [];
  const blockers = brain?.blockers ?? [];
  const changes = brain?.changeSets?.at(-1);
  const optimization = brain?.optimization;

  return (
    <main className="flex-1 px-4 py-5 md:px-6 md:py-7">
      <div className="mx-auto max-w-6xl">
        <Cabecera titulo="Cerebro · Estado de tu viaje" volverA="/" />

        <section className="card mb-5 overflow-hidden border-coral-200 bg-gradient-to-br from-white via-white to-coral-50">
          <div className="flex flex-col gap-5 p-1 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Vista del viajero</p>
              <h1 className="mt-2 text-2xl font-semibold md:text-3xl">Tu viaje, entendido y en movimiento</h1>
              <p className="mt-2 text-sm leading-6 text-neutral-600">Aquí no necesitas entender agentes ni proveedores. Esta vista traduce el estado del cerebro en lo que realmente te importa: qué entendió, qué está listo, qué falta y qué hará después.</p>
            </div>
            <button onClick={ejecutar} disabled={running} className="btn-primary shrink-0 disabled:opacity-60">{running ? "🧠 Analizando…" : "▶ Analizar mi viaje"}</button>
          </div>
          <div className="mt-5 rounded-2xl bg-neutral-950 p-4 text-sm leading-6 text-neutral-100">{DEMO_TEXT}</div>
        </section>

        {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {running && <section className="card mb-5"><div className="flex items-center gap-3"><div className="h-2 w-2 animate-pulse rounded-full bg-coral-500"/><div><h2 className="font-semibold">El cerebro está trabajando</h2><p className="text-sm text-neutral-500">Entender → investigar → comprobar → decidir → actualizar.</p></div></div></section>}

        {data && brain && <>
          <div className="mb-5 flex gap-2 rounded-2xl border border-neutral-200 bg-white p-1">
            <button onClick={() => setView("traveler")} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium ${view === "traveler" ? "bg-neutral-950 text-white" : "text-neutral-600"}`}>Para ti</button>
            <button onClick={() => setView("diagnostic")} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium ${view === "diagnostic" ? "bg-neutral-950 text-white" : "text-neutral-600"}`}>Diagnóstico</button>
          </div>

          {view === "traveler" ? <div className="space-y-5">
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="card"><p className="text-xs text-neutral-500">Entendido</p><p className="mt-1 text-3xl font-semibold">{pct(brain.completeness)}</p><p className="mt-1 text-xs text-neutral-500">del plan estructurado</p></div>
              <div className="card"><p className="text-xs text-neutral-500">Confianza</p><p className="mt-1 text-3xl font-semibold">{pct(brain.confidence)}</p><p className="mt-1 text-xs text-neutral-500">según evidencia disponible</p></div>
              <div className="card"><p className="text-xs text-neutral-500">Pendiente</p><p className="mt-1 text-3xl font-semibold">{pending.length}</p><p className="mt-1 text-xs text-neutral-500">acciones del sistema</p></div>
              <div className="card"><p className="text-xs text-neutral-500">Ciclos</p><p className="mt-1 text-3xl font-semibold">{brain.cycles ?? 0}</p><p className="mt-1 text-xs text-neutral-500">de razonamiento</p></div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div className="card">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Ahora mismo</p>
                <h2 className="mt-2 text-xl font-semibold">{next ? `${label(next.type)} · ${label(next.target)}` : "No hay una acción inmediata"}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{brain.decision?.rationale ?? "El sistema todavía no tiene suficiente estado para explicar una decisión."}</p>
                {next && <div className="mt-4 rounded-2xl bg-neutral-50 p-4"><p className="text-xs font-medium text-neutral-500">Por qué</p><p className="mt-1 text-sm">{next.reason}</p><p className="mt-3 text-xs text-neutral-500">Prioridad: <b>{label(next.priority)}</b></p></div>}
              </div>
              <div className="card">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Estado del viaje</p>
                <div className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-sm font-medium ${tone(brain.phase)}`}>{label(brain.phase)}</div>
                <div className="mt-4 space-y-2 text-sm">
                  <p>✓ {brain.facts?.length ?? 0} hechos consolidados</p>
                  <p>✓ {brain.evidence?.length ?? 0} referencias de evidencia</p>
                  <p>{conflicts.length ? `⚠ ${conflicts.length} conflictos por resolver` : "✓ Sin conflictos registrados"}</p>
                  <p>{blockers.length ? `⚠ ${blockers.length} bloqueos` : "✓ Sin bloqueos críticos registrados"}</p>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Lo que hemos entendido</h2><p className="text-sm text-neutral-500">Puedes comprobar que nada importante se perdió.</p></div></div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-400">Ruta</p><p className="mt-1 font-medium">{data.deconstructed?.locationCandidates?.join(" → ") || "Pendiente"}</p></div>
                <div className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-400">Fechas</p><p className="mt-1 font-medium">{data.context?.dates?.start ?? "—"} → {data.context?.dates?.end ?? "—"}</p></div>
                <div className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-400">Grupo</p><p className="mt-1 font-medium">{data.context?.travelers?.adultos ?? 0} adultos · {data.context?.travelers?.ninos ?? 0} niños · {data.context?.travelers?.bebes ?? 0} bebé · {data.context?.travelers?.personasMayores ?? 0} mayor · {data.context?.travelers?.mascotas ?? 0} mascota</p></div>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div className="card"><h2 className="font-semibold">Qué falta</h2><div className="mt-3 space-y-2">{[...new Set([...(data.unresolved ?? []), ...blockers.map((b) => b.target ?? "").filter(Boolean)])].slice(0, 8).map((item) => <div key={item} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{item}</div>)}{!data.unresolved?.length && !blockers.length && <p className="text-sm text-neutral-500">No hay faltantes globales registrados.</p>}</div></div>
              <div className="card"><h2 className="font-semibold">Qué hará después</h2><div className="mt-3 space-y-2">{pending.slice(0, 6).map((action) => <div key={action.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex justify-between gap-3"><b className="text-sm">{label(action.type)}</b><span className="text-[10px] uppercase text-neutral-400">{label(action.priority)}</span></div><p className="mt-1 text-sm">{action.target}</p><p className="mt-1 text-xs text-neutral-500">{action.reason}</p></div>)}{!pending.length && <p className="text-sm text-neutral-500">No hay acciones pendientes derivadas del estado actual.</p>}</div></div>
            </section>

            <section className="card"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Cambios y recalculación</h2><p className="text-sm text-neutral-500">Cuando algo cambia, el sistema identifica qué queda afectado en vez de rehacer todo.</p></div><span className="rounded-full border border-neutral-200 px-3 py-1 text-xs">{changes?.affectedNodes?.length ?? 0} afectados</span></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div><p className="text-xs text-neutral-400">Cambia</p><p className="mt-1 text-sm">{changes?.reason ?? "Sin cambios registrados"}</p></div><div><p className="text-xs text-neutral-400">Recalcular</p><p className="mt-1 text-sm">{changes?.recompute?.join(", ") || "Nada pendiente"}</p></div><div><p className="text-xs text-neutral-400">Conservar</p><p className="mt-1 text-sm">{Math.max(0, (changes?.affectedNodes?.length ?? 0) - (changes?.recompute?.length ?? 0))} nodos no afectados</p></div></div></section>

            <section className="card"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Optimización</h2><p className="text-sm text-neutral-500">La propuesta no se presenta como definitiva mientras falten datos reales.</p></div><span className={`rounded-full border px-3 py-1 text-xs ${tone(optimization?.status)}`}>{label(optimization?.status)}</span></div>{optimization?.selected ? <div className="mt-4 rounded-2xl bg-neutral-50 p-4"><div className="flex items-center justify-between"><b>{optimization.selected.label}</b><b>{Math.round((optimization.selected.score ?? 0) * 100)}%</b></div><div className="mt-3 flex flex-wrap gap-2">{(optimization.selected.reasons ?? []).map((reason) => <span key={reason} className="rounded-full border border-neutral-200 px-3 py-1 text-xs">{reason}</span>)}</div></div> : <p className="mt-4 text-sm text-neutral-600">Aún no hay una selección responsable. Faltan: {optimization?.missingInputs?.join(", ") || "datos de decisión"}.</p>}</section>

            <section className="card"><h2 className="font-semibold">Borrador del viaje</h2><p className="mt-1 text-sm text-neutral-500">Es un modelo de planificación; reservas y precios deben verificarse.</p><div className="mt-4 space-y-2">{(data.draft ?? []).slice(0, 14).map((day) => <div key={day.day} className="grid gap-2 rounded-xl border border-neutral-200 p-3 md:grid-cols-[70px_130px_1fr_auto]"><b>Día {day.day}</b><span className="text-sm text-neutral-500">{day.date ?? "—"}</span><div><p className="font-medium">{day.destination ?? "Destino pendiente"}</p><p className="text-xs text-neutral-500">{day.focus?.join(" · ") || "Sin foco"}</p></div><span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] uppercase text-amber-800">{label(day.status ?? "needs_review")}</span></div>)}{!data.draft?.length && <p className="text-sm text-neutral-500">Todavía no hay días modelados.</p>}</div></section>
          </div> : <div className="space-y-5">
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4"><div className="card"><p className="text-xs text-neutral-500">Requisitos</p><p className="mt-1 text-2xl font-semibold">{brain.requirements?.length ?? 0}</p></div><div className="card"><p className="text-xs text-neutral-500">Agentes</p><p className="mt-1 text-2xl font-semibold">{brain.agents?.length ?? 0}</p></div><div className="card"><p className="text-xs text-neutral-500">Evidencia</p><p className="mt-1 text-2xl font-semibold">{brain.evidence?.length ?? 0}</p></div><div className="card"><p className="text-xs text-neutral-500">Acciones completadas</p><p className="mt-1 text-2xl font-semibold">{brain.completedActions?.length ?? 0}</p></div></section>
            <section className="card"><h2 className="font-semibold">Acciones del cerebro</h2><div className="mt-4 space-y-2">{pending.map((action) => <div key={action.id} className="grid gap-2 rounded-xl border border-neutral-200 p-3 md:grid-cols-[130px_1fr_auto]"><span className="text-xs font-semibold uppercase">{label(action.type)}</span><div><b className="text-sm">{action.target}</b><p className="text-xs text-neutral-500">{action.reason}</p></div><span className="text-[10px] uppercase text-neutral-400">{label(action.status)}</span></div>)}{!pending.length && <p className="text-sm text-neutral-500">Sin acciones pendientes.</p>}</div></section>
            <section className="grid gap-5 md:grid-cols-2"><div className="card"><h2 className="font-semibold">Conflictos</h2><div className="mt-3 space-y-2">{conflicts.map((c) => <div key={c.key} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm"><b>{c.key}</b><p className="mt-1">{c.reason}</p></div>)}{!conflicts.length && <p className="text-sm text-neutral-500">Sin conflictos registrados.</p>}</div></div><div className="card"><h2 className="font-semibold">Bloqueadores</h2><div className="mt-3 space-y-2">{blockers.map((b) => <div key={`${b.type}:${b.target}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><b>{label(b.type)} · {b.target}</b><p className="mt-1">{b.reason}</p></div>)}{!blockers.length && <p className="text-sm text-neutral-500">Sin bloqueadores.</p>}</div></div></section>
            <section className="card"><h2 className="font-semibold">Evidencia</h2><div className="mt-4 grid gap-2 md:grid-cols-2">{(brain.evidence ?? []).slice(0, 20).map((e, i) => <div key={`${e.source}-${i}`} className="rounded-xl border border-neutral-200 p-3"><b className="text-sm">{e.source ?? "Fuente pendiente"}</b><p className="mt-1 text-xs text-neutral-500">{e.confidence ?? "sin confianza"} · {e.freshness ?? "sin frescura"} · {e.checkedAt ?? "sin comprobación"}</p></div>)}</div></section>
          </div>}
        </>}
      </div>
    </main>
  );
}
