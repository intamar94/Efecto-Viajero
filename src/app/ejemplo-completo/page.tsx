"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { EJEMPLO_COMPLETO } from "@/lib/ejemploCompleto";

type Analysis = {
  deconstructed: { fragments: Array<{ kind: string; value: string }>; unresolved: string[] };
  plan: { tasks: Array<{ id: string; domain: string; priority: string; phase: string }> };
  reverseEngineering: { requirements: Array<{ id: string; domain: string; dataType: string; question: string; priority: string; status: string; agentId: string }>; agents: Array<{ id: string; name: string; domain: string; mode: string }> };
  results: Array<{ task: { domain: string }; status: string; evidence?: Array<{ source: string; confidence: string }>; error?: string }>;
  capabilityAudit?: { entries?: Array<{ domain: string; status: string }> };
  unresolved: string[];
};

export default function EjemploCompletoPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/trips/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(EJEMPLO_COMPLETO) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "No se pudo ejecutar el ejemplo."); if (active) setAnalysis(data as Analysis); })
      .catch((e) => active && setError(e instanceof Error ? e.message : "No se pudo ejecutar el ejemplo."));
    return () => { active = false; };
  }, []);

  const r = analysis?.reverseEngineering;
  const ready = analysis?.results.filter((x) => x.status === "ready").length ?? 0;
  const partial = analysis?.results.filter((x) => x.status === "partial").length ?? 0;
  const blocked = analysis?.results.filter((x) => x.status === "unavailable" || x.status === "error").length ?? 0;

  return <main className="flex-1 px-5 py-7"><div className="mx-auto max-w-4xl">
    <Cabecera titulo="Ejemplo completo del cerebro" volverA="/" />
    <section className="card mb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Caso de prueba único</p><h1 className="mt-2 text-2xl font-semibold">Familia multigeneracional + mascota</h1><p className="mt-3 text-sm leading-6 text-neutral-600">Colombia · 14 días · Madrid → Bogotá → Medellín → Cartagena · 2 adultos · 2 niños (6/11) · 1 bebé · 1 abuela (72) · 1 perro (Nilo) · 6.000 EUR.</p><p className="mt-3 rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">Este caso fuerza al cerebro a descubrir personas, mascota, documentos, requisitos, transporte, alojamiento, alimentación, actividades diferenciadas, descansos, clima, emergencias, presupuesto, mapa y offline. Lo no verificable debe quedar pendiente.</p></section>
    <section className="mb-5 grid gap-3 sm:grid-cols-3"><div className="card"><p className="text-xs text-neutral-500">Grupo</p><p className="mt-1 text-2xl font-semibold">7</p><p className="text-xs text-neutral-500">6 personas + 1 mascota</p></div><div className="card"><p className="text-xs text-neutral-500">Agentes derivados</p><p className="mt-1 text-2xl font-semibold">{r?.agents.length ?? "…"}</p><p className="text-xs text-neutral-500">uno por requisito atómico</p></div><div className="card"><p className="text-xs text-neutral-500">Ejecución</p><p className="mt-1 text-2xl font-semibold">{analysis ? `${ready}/${analysis.results.length}` : "…"}</p><p className="text-xs text-neutral-500">{partial} parciales · {blocked} bloqueadas</p></div></section>
    {error && <section className="card mb-5 border-red-200 bg-red-50 text-sm text-red-700">{error}</section>}
    {!analysis && !error && <section className="card mb-5 text-sm text-neutral-500">Ejecutando deconstrucción → plan → ingeniería inversa → departamentos…</section>}
    {analysis && <>
      <section className="card mb-5"><h2 className="font-semibold">1. Deconstrucción</h2><div className="mt-3 flex flex-wrap gap-2">{analysis.deconstructed.fragments.map((f, i) => <span key={`${f.kind}-${i}`} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs"><strong>{f.kind}</strong>: {f.value}</span>)}</div>{analysis.deconstructed.unresolved.length > 0 && <p className="mt-3 text-xs text-amber-700">Pendiente: {analysis.deconstructed.unresolved.join(" · ")}</p>}</section>
      <section className="card mb-5"><h2 className="font-semibold">2. Plan de investigación</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{analysis.plan.tasks.map((t) => <div key={t.id} className="rounded-xl border border-neutral-200 p-3"><p className="font-medium text-sm">{t.domain}</p><p className="text-xs text-neutral-500">{t.phase} · prioridad {t.priority}</p></div>)}</div></section>
      <section className="card mb-5"><h2 className="font-semibold">3. Ingeniería inversa</h2><p className="mt-1 text-sm text-neutral-500">Cada necesidad atómica se convierte en requisito verificable y agente.</p><div className="mt-4 space-y-2">{r?.requirements.map((q) => <div key={q.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex flex-wrap items-center gap-2"><span className="font-medium text-sm">{q.domain}.{q.dataType}</span><span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px]">{q.priority}</span><span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px]">{q.status}</span></div><p className="mt-1 text-xs text-neutral-600">{q.question}</p><p className="mt-1 text-[10px] text-neutral-400">→ {q.agentId}</p></div>)}</div></section>
      <section className="card mb-5"><h2 className="font-semibold">4. Agentes</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{r?.agents.map((a) => <div key={a.id} className="rounded-xl border border-neutral-200 p-3"><p className="text-sm font-medium">{a.name}</p><p className="text-[10px] text-neutral-500">{a.mode} · {a.id}</p></div>)}</div></section>
      <section className="card mb-5"><h2 className="font-semibold">5. Ejecución y evidencia</h2><div className="mt-4 space-y-2">{analysis.results.map((x, i) => <div key={`${x.task.domain}-${i}`} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3"><span className="h-2 w-2 rounded-full bg-current" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{x.task.domain}</p><p className="text-[10px] text-neutral-500">{x.evidence?.map((e) => `${e.source} · ${e.confidence}`).join(" | ") || x.error || "sin evidencia disponible"}</p></div><span className="text-xs font-medium">{x.status}</span></div>)}</div></section>
      <section className="card mb-5"><h2 className="font-semibold">6. Capacidad real</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{(analysis.capabilityAudit?.entries ?? []).map((x) => <div key={x.domain} className="rounded-xl border border-neutral-200 p-3 text-sm"><span className="font-medium">{x.domain}</span><span className="ml-2 text-xs text-neutral-500">{x.status}</span></div>)}</div>{analysis.unresolved.length > 0 && <p className="mt-4 text-sm text-amber-700">Incertidumbres conservadas: {analysis.unresolved.join(" · ")}</p>}</section>
    </>}
    <Link href="/" className="text-sm text-neutral-500 underline">← Volver a la portada</Link>
  </div></main>;
}
