"use client";

import { useMemo, useState } from "react";
import { Cabecera } from "@/components/Cabecera";

const DEMO_TEXT = "Somos una familia que viaja desde Madrid a Colombia del 10 al 24 de abril de 2027 durante 14 días: dos adultos, dos niños de 6 y 11 años, un bebé, una abuela de 72 años y nuestro perro mediano Nilo. Queremos Bogotá, Medellín y Cartagena, sin conducir, a ritmo tranquilo, con un presupuesto total flexible de 6000 EUR. Queremos actividades para todos pero no siempre juntos, alternativas si llueve, opciones de descanso, alojamiento adecuado para bebé, abuela y perro, gastronomía colombiana, transporte compatible, documentación y requisitos de cada viajero y mascota, seguro, emergencias, moneda, mapa, gastos y un paquete offline. No inventar información: lo que no pueda comprobarse debe quedar pendiente.";

type Status = "ready" | "partial" | "unavailable" | "error" | "needs_review" | "operational" | "blocked" | "failed" | "not_exercised";
type Requirement = { id: string; domain: string; dataType: string; question: string; priority: string };
type Agent = { id: string; name: string; domain: string; mode: string };
type Report = { domain: string; status: string; unresolved?: string[]; findings?: unknown[]; evidence?: Array<{ source: string; checkedAt?: string; confidence?: string; freshness?: string }> };
type Capability = { domain: string; status: Status; implementation: string; provider?: string; blockers?: string[]; improvements?: string[]; lastEvidence?: string[] };

type Analysis = {
  context?: { dates?: { start?: string; end?: string }; budget?: { moneda?: string; tipo?: string; cantidad?: number }; travelers?: { adultos?: number; ninos?: number; bebes?: number; personasMayores?: number; mascotas?: number }; destinations?: string[]; transport?: string[]; food?: string[]; constraints?: string[] };
  deconstructed?: { fragments?: unknown[]; locationCandidates?: string[]; unresolved?: string[] };
  reverseEngineering?: { requirements?: Requirement[]; agents?: Agent[] };
  reports?: Report[];
  departmentReports?: Report[];
  capabilityAudit?: { operational?: string[]; partial?: string[]; blocked?: string[]; failed?: string[]; notExercised?: string[]; accessRequests?: Array<{ domain: string; capability: string; priority: string; requestedFromCeo: string }>; items?: Capability[] };
  neuralCycles?: Array<{ cycle: number; fired?: string[]; inhibited?: string[]; followUps?: Array<{ id: string; domain: string; dataType: string; reason: string }> }>;
  workingMemory?: { facts?: unknown[]; signals?: unknown[]; conflicts?: Array<{ key: string; reason: string }>; decisions?: Array<{ action: string; reason: string; priority: string }>; cycles?: unknown[] };
  supervisorUpdate?: { status?: string; nextActions?: string[]; decisions?: unknown[]; summary?: string };
  draft?: Array<{ day: number; date?: string; destination?: string; focus?: string[]; notes?: string[]; status?: string }>;
  ranked?: Array<{ destination?: { displayName?: string }; score?: number; reasons?: string[] }>;
  unresolved?: string[];
  availableDomains?: string[];
  unavailableDomains?: string[];
  pendingCount?: number;
  orchestration?: { selected?: string[]; skipped?: string[]; explicitSignals?: string[]; inferredSignals?: string[] };
};

const tabs = [
  ["overview", "Resumen"], ["trip", "Viaje"], ["capabilities", "Capacidades"], ["agents", "Agentes"], ["evidence", "Evidencia"], ["brain", "Cerebro"],
] as const;

function badge(status?: string) {
  const value = String(status ?? "unknown");
  if (["ready", "operational"].includes(value)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["partial", "needs_review", "not_exercised"].includes(value)) return "bg-amber-50 text-amber-700 border-amber-200";
  if (["blocked", "unavailable", "failed", "error"].includes(value)) return "bg-red-50 text-red-700 border-red-200";
  return "bg-neutral-100 text-neutral-600 border-neutral-200";
}

function label(value?: string) {
  return String(value ?? "—").replaceAll("_", " ");
}

export default function CerebroPage() {
  const [running, setRunning] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("overview");
  const [filter, setFilter] = useState("all");

  async function ejecutar() {
    if (running) return;
    setRunning(true); setError(""); setAnalysis(null); setTab("overview");
    try {
      const r = await fetch("/api/trips/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: DEMO_TEXT, fechaSalida: "2027-04-10", fechaRegreso: "2027-04-24", adultos: 2, ninos: 2,
          edadesNinos: [6, 11], bebes: 1, personasMayores: 1, mascotas: 1, presupuesto: 6000,
          moneda: "EUR", presupuestoTipo: "total", presupuestoFlexible: true, modoPlanificacion: "completo",
          origen: "Madrid", transport: ["sin conducir", "transporte compatible con familia y mascota"],
          food: ["gastronomía colombiana", "platos típicos"],
          constraints: ["ritmo tranquilo", "alternativas con lluvia", "descanso", "no inventar información"],
          destinations: ["Bogotá", "Medellín", "Cartagena"],
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "El cerebro no pudo completar el análisis.");
      setAnalysis(d);
    } catch (e) { setError(e instanceof Error ? e.message : "Error ejecutando el ejemplo."); }
    finally { setRunning(false); }
  }

  const req = analysis?.reverseEngineering?.requirements ?? [];
  const agents = analysis?.reverseEngineering?.agents ?? [];
  const reports = analysis?.departmentReports ?? analysis?.reports ?? [];
  const capabilities = analysis?.capabilityAudit?.items ?? [];
  const visible = useMemo(() => filter === "all" ? agents : agents.filter((a) => a.domain === filter), [agents, filter]);
  const domains = [...new Set(agents.map((a) => a.domain))];
  const evidence = reports.flatMap((r) => (r.evidence ?? []).map((e) => ({ ...e, domain: r.domain })));
  const operational = analysis?.capabilityAudit?.operational?.length ?? 0;
  const partial = analysis?.capabilityAudit?.partial?.length ?? 0;
  const blocked = analysis?.capabilityAudit?.blocked?.length ?? 0;
  const unresolved = analysis?.unresolved?.length ?? 0;
  const cycleCount = analysis?.neuralCycles?.length ?? 0;

  return (
    <main className="flex-1 px-4 py-5 md:px-6 md:py-7">
      <div className="mx-auto max-w-6xl">
        <Cabecera titulo="Cerebro · Ejemplo maestro" volverA="/" />

        <section className="card mb-5 overflow-hidden border-coral-200 bg-gradient-to-br from-white via-white to-coral-50">
          <div className="flex flex-col gap-5 p-1 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Caso maestro de estrés</p>
              <h1 className="mt-2 text-2xl font-semibold md:text-3xl">Un viaje complejo, visto como un sistema</h1>
              <p className="mt-2 text-sm leading-6 text-neutral-600">La interfaz ya no intenta mostrar toda la maquinaria. Primero responde qué entendimos, qué está listo, qué falta y qué debe hacer el sistema después.</p>
            </div>
            <button onClick={ejecutar} disabled={running} className="btn-primary shrink-0 disabled:opacity-60">
              {running ? "🧠 Ejecutando circuito…" : "▶ Ejecutar cerebro completo"}
            </button>
          </div>
          <div className="mt-5 rounded-2xl bg-neutral-950 p-4 text-sm leading-6 text-neutral-100">{DEMO_TEXT}</div>
        </section>

        {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {running && <section className="card mb-5"><div className="flex items-center gap-3"><div className="h-2 w-2 animate-pulse rounded-full bg-coral-500"/><div><h2 className="font-semibold">Ejecutando el circuito</h2><p className="text-sm text-neutral-500">Entender → descomponer → investigar → delegar → ejecutar → validar → recordar → decidir → volver a investigar.</p></div></div></section>}

        {analysis && <>
          <nav className="sticky top-0 z-10 mb-5 overflow-x-auto rounded-2xl border border-neutral-200 bg-white/95 p-1 shadow-sm backdrop-blur">
            <div className="flex min-w-max gap-1">{tabs.map(([id, text]) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${tab === id ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>{text}</button>)}</div>
          </nav>

          {tab === "overview" && <div className="space-y-5">
            <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {[["Requisitos", req.length], ["Agentes", agents.length], ["Operativas", operational], ["Parciales", partial], ["Bloqueadas", blocked]].map(([l, v]) => <div key={String(l)} className="card"><p className="text-xs text-neutral-500">{l}</p><p className="mt-1 text-2xl font-semibold">{v}</p></div>)}
            </section>
            <section className="grid gap-5 md:grid-cols-2">
              <div className="card"><p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Decisión actual</p><h2 className="mt-2 text-lg font-semibold">{label(analysis.supervisorUpdate?.status)}</h2><p className="mt-2 text-sm leading-6 text-neutral-600">{analysis.supervisorUpdate?.summary ?? "El supervisor todavía no ha generado un resumen."}</p><div className="mt-4 space-y-2">{(analysis.supervisorUpdate?.nextActions ?? []).slice(0, 5).map((x, i) => <div key={i} className="rounded-xl bg-neutral-50 p-3 text-sm">→ {x}</div>)}</div></div>
              <div className="card"><p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Salud del viaje</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-emerald-50 p-3"><b className="text-xl text-emerald-700">{operational}</b><p className="text-[11px] text-emerald-700">listas</p></div><div className="rounded-xl bg-amber-50 p-3"><b className="text-xl text-amber-700">{partial}</b><p className="text-[11px] text-amber-700">parciales</p></div><div className="rounded-xl bg-red-50 p-3"><b className="text-xl text-red-700">{blocked}</b><p className="text-[11px] text-red-700">bloqueadas</p></div></div><p className="mt-4 text-sm text-neutral-500">{unresolved} puntos sin resolver · {analysis.pendingCount ?? 0} tareas pendientes · {cycleCount} ciclos neuronales.</p></div>
            </section>
            <section className="card"><h2 className="font-semibold">Lo que el sistema entendió</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><div><p className="text-xs text-neutral-400">Ruta</p><p className="mt-1 font-medium">{analysis.deconstructed?.locationCandidates?.join(" → ") || "Sin resolver"}</p></div><div><p className="text-xs text-neutral-400">Fechas</p><p className="mt-1 font-medium">{analysis.context?.dates?.start ?? "—"} → {analysis.context?.dates?.end ?? "—"}</p></div><div><p className="text-xs text-neutral-400">Grupo</p><p className="mt-1 font-medium">{analysis.context?.travelers?.adultos ?? 0} adultos · {analysis.context?.travelers?.ninos ?? 0} niños · {analysis.context?.travelers?.bebes ?? 0} bebé · {analysis.context?.travelers?.personasMayores ?? 0} mayor · {analysis.context?.travelers?.mascotas ?? 0} mascota</p></div></div></section>
          </div>}

          {tab === "trip" && <div className="space-y-5">
            <section className="card"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs text-neutral-400">Borrador, no reserva</p><h2 className="mt-1 text-xl font-semibold">{analysis.draft?.length ?? 0} días modelados</h2></div><span className={`rounded-full border px-3 py-1 text-xs ${badge("needs_review")}`}>Necesita validación</span></div><div className="mt-5 space-y-2">{(analysis.draft ?? []).map((day) => <div key={day.day} className="grid gap-3 rounded-2xl border border-neutral-200 p-4 md:grid-cols-[70px_140px_1fr_auto] md:items-center"><div className="font-semibold">Día {day.day}</div><div className="text-sm text-neutral-500">{day.date ?? "Sin fecha"}</div><div><p className="font-medium">{day.destination ?? "Destino pendiente"}</p><p className="mt-1 text-xs text-neutral-500">{day.focus?.join(" · ") || "Sin foco todavía"}</p></div><span className={`w-fit rounded-full border px-2 py-1 text-[10px] uppercase ${badge(day.status)}`}>{label(day.status)}</span></div>)}</div></section>
            <section className="grid gap-5 md:grid-cols-2"><div className="card"><h2 className="font-semibold">Destinos y compatibilidad</h2><div className="mt-4 space-y-2">{(analysis.ranked ?? []).map((r, i) => <div key={i} className="rounded-xl border border-neutral-200 p-3"><div className="flex justify-between"><b>{r.destination?.displayName ?? "Destino"}</b><span>{r.score ?? "—"}</span></div>{r.reasons?.length ? <p className="mt-1 text-xs text-neutral-500">{r.reasons.slice(0, 2).join(" · ")}</p> : null}</div>)}</div></div><div className="card"><h2 className="font-semibold">Señales de planificación</h2><div className="mt-4 flex flex-wrap gap-2">{[...(analysis.orchestration?.explicitSignals ?? []), ...(analysis.orchestration?.inferredSignals ?? [])].map((x, i) => <span key={i} className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs">{label(x)}</span>)}</div></div></section>
          </div>}

          {tab === "capabilities" && <div className="space-y-5">
            <section className="card"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Capacidades reales</h2><p className="text-sm text-neutral-500">Nada se presenta como disponible si el sistema no puede sostenerlo.</p></div><span className="text-xs text-neutral-400">{capabilities.length} dominios</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b text-neutral-500"><th className="p-3">Dominio</th><th className="p-3">Estado</th><th className="p-3">Proveedor</th><th className="p-3">Bloqueador</th><th className="p-3">Evidencia</th></tr></thead><tbody>{capabilities.map((c) => <tr key={c.domain} className="border-b align-top"><td className="p-3 font-medium">{label(c.domain)}</td><td className="p-3"><span className={`rounded-full border px-2 py-1 uppercase ${badge(c.status)}`}>{label(c.status)}</span></td><td className="p-3 text-neutral-500">{c.provider ?? "Nativo / pendiente"}</td><td className="p-3 text-red-600">{c.blockers?.[0] ?? c.improvements?.[0] ?? "—"}</td><td className="p-3 text-neutral-500">{c.lastEvidence?.length ?? 0}</td></tr>)}</tbody></table></div></section>
            <section className="card"><h2 className="font-semibold">Accesos que desbloquean el sistema</h2><div className="mt-4 grid gap-2 md:grid-cols-2">{(analysis.capabilityAudit?.accessRequests ?? []).slice(0, 12).map((x, i) => <div key={i} className="rounded-xl border border-neutral-200 p-3"><div className="flex justify-between gap-3"><b className="text-sm">{label(x.capability)}</b><span className="text-[10px] uppercase text-neutral-400">{x.priority}</span></div><p className="mt-1 text-xs text-neutral-500">{label(x.domain)}</p><p className="mt-2 text-xs">{x.requestedFromCeo}</p></div>)}</div></section>
          </div>}

          {tab === "agents" && <div className="space-y-5"><section className="card"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="font-semibold">Agentes atómicos</h2><p className="text-sm text-neutral-500">El usuario no necesita gestionarlos; esta vista sirve para auditar el cerebro.</p></div><select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-full md:w-auto"><option value="all">Todos</option>{domains.map((d) => <option key={d}>{d}</option>)}</select></div><div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">{visible.map((a) => <div key={a.id} className="rounded-2xl border border-neutral-200 p-4"><div className="flex items-start justify-between gap-2"><span className="font-medium text-sm">{a.name}</span><span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] uppercase">{a.mode}</span></div><p className="mt-2 text-xs text-neutral-500">{label(a.domain)} · {a.id}</p></div>)}</div></section><section className="card"><h2 className="font-semibold">Requisitos atómicos</h2><div className="mt-4 space-y-2">{req.map((r) => <div key={r.id} className="grid gap-2 rounded-xl border border-neutral-200 p-3 md:grid-cols-[130px_160px_1fr_auto] md:items-center"><span className="text-xs font-medium">{label(r.domain)}</span><span className="text-xs text-neutral-500">{label(r.dataType)}</span><span className="text-sm">{r.question}</span><span className={`w-fit rounded-full border px-2 py-1 text-[10px] uppercase ${badge(r.priority === "critical" ? "blocked" : "partial")}`}>{r.priority}</span></div>)}</div></section></div>}

          {tab === "evidence" && <div className="space-y-5"><section className="card"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Evidencia</h2><p className="text-sm text-neutral-500">Cada dato útil debe poder rastrearse a una fuente y a una comprobación.</p></div><span className="text-xs text-neutral-400">{evidence.length} referencias</span></div><div className="mt-4 space-y-2">{evidence.length ? evidence.map((e, i) => <div key={i} className="rounded-2xl border border-neutral-200 p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><b className="text-sm">{e.source}</b><span className={`w-fit rounded-full border px-2 py-1 text-[10px] uppercase ${badge(e.confidence === "high" ? "ready" : "partial")}`}>{e.confidence ?? "unknown"}</span></div><p className="mt-2 text-xs text-neutral-500">{e.domain} · {e.freshness ?? "unknown"} · {e.checkedAt ?? "sin fecha"}</p></div>) : <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">No hay suficiente evidencia verificable todavía. El sistema debe mantener el dato como pendiente.</div>}</div></section><section className="card"><h2 className="font-semibold">Pendientes</h2><div className="mt-3 space-y-2">{(analysis.unresolved ?? []).map((x, i) => <div key={i} className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{x}</div>)}{!analysis.unresolved?.length && <p className="text-sm text-neutral-500">No hay incidencias globales registradas.</p>}</div></section></div>}

          {tab === "brain" && <div className="space-y-5"><section className="card"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Circuito cognitivo</h2><p className="text-sm text-neutral-500">Activación, inhibición, error, aprendizaje y seguimiento.</p></div><span className="rounded-full bg-neutral-950 px-3 py-1 text-xs text-white">{cycleCount} ciclos</span></div><div className="mt-5 space-y-3">{(analysis.neuralCycles ?? []).map((c) => <div key={c.cycle} className="rounded-2xl border border-neutral-200 p-4"><div className="flex items-center justify-between"><b>Ciclo {c.cycle}</b><span className="text-xs text-neutral-400">{c.followUps?.length ?? 0} follow-ups</span></div><div className="mt-3 grid gap-2 md:grid-cols-3"><div className="rounded-xl bg-emerald-50 p-3 text-xs">Activados: {c.fired?.length ?? 0}</div><div className="rounded-xl bg-neutral-100 p-3 text-xs">Inhibidos: {c.inhibited?.length ?? 0}</div><div className="rounded-xl bg-amber-50 p-3 text-xs">Nuevas preguntas: {c.followUps?.length ?? 0}</div></div>{c.followUps?.length ? <div className="mt-3 space-y-2">{c.followUps.slice(0, 6).map((f) => <div key={f.id} className="text-xs text-neutral-600">↳ {label(f.domain)} / {label(f.dataType)} — {f.reason}</div>)}</div> : null}</div>)}</div></section><section className="grid gap-5 md:grid-cols-2"><div className="card"><h2 className="font-semibold">Memoria de trabajo</h2><div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-neutral-50 p-3"><b className="text-xl">{analysis.workingMemory?.facts?.length ?? 0}</b><p className="text-xs text-neutral-500">hechos</p></div><div className="rounded-xl bg-neutral-50 p-3"><b className="text-xl">{analysis.workingMemory?.signals?.length ?? 0}</b><p className="text-xs text-neutral-500">señales</p></div><div className="rounded-xl bg-red-50 p-3"><b className="text-xl text-red-700">{analysis.workingMemory?.conflicts?.length ?? 0}</b><p className="text-xs text-red-700">conflictos</p></div><div className="rounded-xl bg-neutral-50 p-3"><b className="text-xl">{analysis.workingMemory?.decisions?.length ?? 0}</b><p className="text-xs text-neutral-500">decisiones</p></div></div></div><div className="card"><h2 className="font-semibold">Qué falta para cerrar el viaje</h2><div className="mt-4 space-y-2">{(analysis.capabilityAudit?.accessRequests ?? []).slice(0, 6).map((x, i) => <div key={i} className="rounded-xl bg-neutral-50 p-3 text-xs"><b>{label(x.domain)}</b><p className="mt-1 text-neutral-500">{x.requestedFromCeo}</p></div>)}{!(analysis.capabilityAudit?.accessRequests?.length) && <p className="text-sm text-neutral-500">No hay solicitudes de capacidad pendientes.</p>}</div></div></section></div>}
        </>}
      </div>
    </main>
  );
}
