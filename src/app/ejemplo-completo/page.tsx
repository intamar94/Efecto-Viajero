"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { CASO_PRUEBA } from "@/lib/casoPrueba";

type Analysis = {
  context?: { destinations?: string[]; planningMode?: string };
  deconstructed: { fragments: Array<{ kind: string; value: string }>; unresolved: string[] };
  plan: { tasks: Array<{ id: string; domain: string; priority: string; phase: string }> };
  reverseEngineering: { requirements: Array<{ id: string; domain: string; dataType: string; question: string; priority: string; status: string; agentId: string }>; agents: Array<{ id: string; name: string; domain: string; mode: string }> };
  results: Array<{ task: { domain: string }; status: string; evidence?: Array<{ source: string; confidence: string }>; error?: string }>;
  capabilityAudit?: { entries?: Array<{ domain: string; status: string }> };
  unresolved: string[];
  brain?: { phase?: string; cycles?: number; completeness?: number; confidence?: number; blockers?: string[]; pendingActions?: Array<{ type?: string; target?: string; reason?: string }> };
};

export default function EjemploCompletoPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/trips/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(CASO_PRUEBA) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "No se pudo ejecutar el caso de prueba."); if (active) setAnalysis(data as Analysis); })
      .catch((e) => active && setError(e instanceof Error ? e.message : "No se pudo ejecutar el caso de prueba."));
    return () => { active = false; };
  }, []);

  const r = analysis?.reverseEngineering;
  const ready = analysis?.results.filter((x) => x.status === "ready").length ?? 0;
  const partial = analysis?.results.filter((x) => x.status === "partial" || x.status === "needs_review").length ?? 0;
  const blocked = analysis?.results.filter((x) => x.status === "unavailable" || x.status === "error").length ?? 0;

  return <main className="flex-1 px-5 py-7"><div className="mx-auto max-w-4xl">
    <Cabecera titulo="Recorrido real del cerebro" volverA="/" />
    <section className="card mb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Nuevo caso de prueba</p><h1 className="mt-2 text-2xl font-semibold">Viaje cultural a Japón</h1><p className="mt-3 text-sm leading-6 text-neutral-600">Berlín → Tokio → Kioto · 12 días · 2 adultos + adolescente de 15 años · 4.500 EUR.</p><p className="mt-3 rounded-2xl bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">Caso diseñado para probar accesibilidad, transporte público, gastronomía vegetariana, clima, presupuesto, comparación de ciudades, descansos y capacidad de reacción. Todo dato no verificable debe quedar pendiente.</p></section>
    <section className="mb-5 grid gap-3 sm:grid-cols-4"><div className="card"><p className="text-xs text-neutral-500">Viajeros</p><p className="mt-1 text-2xl font-semibold">3</p><p className="text-xs text-neutral-500">2 adultos + 15 años</p></div><div className="card"><p className="text-xs text-neutral-500">Agentes</p><p className="mt-1 text-2xl font-semibold">{r?.agents.length ?? "…"}</p><p className="text-xs text-neutral-500">requisitos atómicos</p></div><div className="card"><p className="text-xs text-neutral-500">Resultados</p><p className="mt-1 text-2xl font-semibold">{analysis ? `${ready}/${analysis.results.length}` : "…"}</p><p className="text-xs text-neutral-500">{partial} parciales · {blocked} bloqueados</p></div><div className="card"><p className="text-xs text-neutral-500">Cerebro</p><p className="mt-1 text-lg font-semibold">{analysis?.brain?.phase ?? "…"}</p><p className="text-xs text-neutral-500">{analysis?.brain?.cycles ?? "…"} ciclos</p></div></section>
    {error && <section className="card mb-5 border-red-200 bg-red-50 text-sm text-red-700">{error}</section>}
    {!analysis && !error && <section className="card mb-5 text-sm text-neutral-500">Ejecutando el recorrido completo…</section>}
    {analysis && <>
      <section className="card mb-5"><h2 className="font-semibold">1. Entender y deconstruir</h2><div className="mt-3 flex flex-wrap gap-2">{analysis.deconstructed.fragments.map((f, i) => <span key={`${f.kind}-${i}`} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs"><strong>{f.kind}</strong>: {f.value}</span>)}</div>{analysis.deconstructed.unresolved.length > 0 && <p className="mt-3 text-xs text-amber-700">Pendiente: {analysis.deconstructed.unresolved.join(" · ")}</p>}</section>
      <section className="card mb-5"><h2 className="font-semibold">2. Planificar investigación</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{analysis.plan.tasks.map((t) => <div key={t.id} className="rounded-xl border border-neutral-200 p-3"><p className="font-medium text-sm">{t.domain}</p><p className="text-xs text-neutral-500">{t.phase} · prioridad {t.priority}</p></div>)}</div></section>
      <section className="card mb-5"><h2 className="font-semibold">3. Ingeniería inversa</h2><p className="mt-1 text-sm text-neutral-500">Las necesidades se convierten en requisitos verificables.</p><div className="mt-4 space-y-2">{r?.requirements.map((q) => <div key={q.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex flex-wrap items-center gap-2"><span className="font-medium text-sm">{q.domain}.{q.dataType}</span><span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px]">{q.priority}</span><span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px]">{q.status}</span></div><p className="mt-1 text-xs text-neutral-600">{q.question}</p><p className="mt-1 text-[10px] text-neutral-400">→ {q.agentId}</p></div>)}</div></section>
      <section className="card mb-5"><h2 className="font-semibold">4. Ejecutar agentes y recoger evidencia</h2><div className="mt-4 space-y-2">{analysis.results.map((x, i) => <div key={`${x.task.domain}-${i}`} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{x.task.domain}</p><p className="text-[10px] text-neutral-500">{x.evidence?.map((e) => `${e.source} · ${e.confidence}`).join(" | ") || x.error || "sin evidencia disponible"}</p></div><span className="text-xs font-medium">{x.status}</span></div>)}</div></section>
      <section className="card mb-5"><h2 className="font-semibold">5. Validar, detectar faltantes y decidir</h2><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-neutral-500">Completitud</p><p className="mt-1 font-semibold">{Math.round((analysis.brain?.completeness ?? 0) * 100)}%</p></div><div><p className="text-xs text-neutral-500">Confianza</p><p className="mt-1 font-semibold">{Math.round((analysis.brain?.confidence ?? 0) * 100)}%</p></div><div><p className="text-xs text-neutral-500">Acciones pendientes</p><p className="mt-1 font-semibold">{analysis.brain?.pendingActions?.length ?? 0}</p></div></div>{(analysis.brain?.blockers?.length ?? 0) > 0 && <p className="mt-4 text-sm text-amber-700">Bloqueos: {analysis.brain?.blockers?.join(" · ")}</p>}</section>
      <section className="card mb-5"><h2 className="font-semibold">6. Resultado para el viajero</h2><p className="mt-2 text-sm leading-6 text-neutral-700">El resultado no fuerza una falsa certeza: separa lo obtenido de lo que necesita más investigación y conserva los puntos que no pueden verificarse.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{(analysis.capabilityAudit?.entries ?? []).map((x) => <div key={x.domain} className="rounded-xl border border-neutral-200 p-3 text-sm"><span className="font-medium">{x.domain}</span><span className="ml-2 text-xs text-neutral-500">{x.status}</span></div>)}</div></section>
    </>}
    <Link href="/planificar" className="text-sm text-neutral-500 underline">← Probar desde Planificar</Link>
  </div></main>;
}
