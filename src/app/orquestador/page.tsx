"use client";

import { useState } from "react";

type Analysis = {
  locations?: Array<{ name?: string; countryCode?: string }>;
  unresolved?: string[];
  plan?: { selectedDomains: string[]; skippedDomains: string[]; selectionReasons: Record<string, string>; tasks: Array<{ id: string; domain: string; priority: string; phase: string; dependsOn: string[] }> };
  results?: Array<{ task: { domain: string; phase: string; priority: string }; status: string; error?: string; evidence?: Array<{ source: string; confidence: string; freshness: string }> }>;
  orchestration?: { selected: string[]; skipped: string[]; reasons: Record<string, string>; explicitSignals: string[]; inferredSignals: string[] };
  departmentReports?: Array<{ domain: string; status: string; unresolved: string[]; conflicts: string[] }>;
};

const examples = [
  "Quiero ir a Colombia con mi hija",
  "Quiero algo barato y no quiero conducir",
  "Quiero comida típica, historia y naturaleza",
  "Somos dos adultos y tres niños",
  "Tengo movilidad reducida",
  "No sé todavía dónde quiero ir",
];

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200">{children}</span>;
}

function statusClass(status: string) {
  if (status === "ready") return "text-emerald-400";
  if (status === "partial" || status === "needs_review") return "text-amber-400";
  if (status === "error" || status === "unavailable") return "text-red-400";
  return "text-zinc-300";
}

export default function OrquestadorPage() {
  const [text, setText] = useState(examples[0]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function inspect() {
    if (!text.trim()) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/trips/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), modoPlanificacion: "completo" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No se pudo analizar la petición.");
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setLoading(false); }
  }

  const selected = analysis?.orchestration?.selected ?? analysis?.plan?.selectedDomains ?? [];
  const skipped = analysis?.orchestration?.skipped ?? analysis?.plan?.skippedDomains ?? [];
  const tasks = analysis?.plan?.tasks ?? [];
  const resultsByDomain = new Map((analysis?.results ?? []).map((r) => [r.task.domain, r]));

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Efecto Viajero · Cerebro</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Orquestador del viaje</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">Desconstruye una petición, selecciona los departamentos necesarios, cierra sus dependencias y muestra qué se ejecutó, qué se omitió y dónde hay bloqueos.</p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <label className="text-sm font-medium">Petición del viajero</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-3 min-h-28 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm outline-none focus:border-zinc-400" />
          <div className="mt-3 flex flex-wrap gap-2">{examples.map((example) => <button key={example} onClick={() => setText(example)} className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200">{example}</button>)}</div>
          <button onClick={inspect} disabled={loading || !text.trim()} className="mt-4 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40">{loading ? "Orquestando…" : "Analizar y delegar"}</button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </section>

        {analysis && <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><p className="text-xs text-zinc-500">Departamentos seleccionados</p><p className="mt-1 text-3xl font-semibold">{selected.length}</p></div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><p className="text-xs text-zinc-500">Omitidos deliberadamente</p><p className="mt-1 text-3xl font-semibold">{skipped.length}</p></div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"><p className="text-xs text-zinc-500">Sin resolver / bloqueos</p><p className="mt-1 text-3xl font-semibold">{analysis.unresolved?.length ?? 0}</p></div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold">1. Deconstrucción</h2>
            <div className="mt-3 flex flex-wrap gap-2"><span className="text-xs text-zinc-500">Explícitas:</span>{(analysis.orchestration?.explicitSignals ?? []).map((x) => <Badge key={x}>{x}</Badge>)}{!(analysis.orchestration?.explicitSignals?.length) && <span className="text-xs text-zinc-500">ninguna</span>}</div>
            <div className="mt-3 flex flex-wrap gap-2"><span className="text-xs text-zinc-500">Inferidas:</span>{(analysis.orchestration?.inferredSignals ?? []).map((x) => <Badge key={x}>{x}</Badge>)}</div>
            <div className="mt-4 text-sm text-zinc-300">Destinos: {analysis.locations?.map((x) => x.name).filter(Boolean).join(", ") || "sin destino resuelto"}</div>
            {(analysis.unresolved?.length ?? 0) > 0 && <div className="mt-2 text-sm text-amber-400">Pendientes: {analysis.unresolved?.join(" · ")}</div>}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold">2. Delegación</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {tasks.map((task) => { const result = resultsByDomain.get(task.domain); return <div key={task.id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{task.domain}</p><p className="mt-1 text-xs text-zinc-500">{task.phase} · {task.priority}</p></div><span className={`text-xs font-medium ${statusClass(result?.status ?? "queued")}`}>{result?.status ?? "queued"}</span></div>
                {task.dependsOn.length > 0 && <p className="mt-3 text-xs text-zinc-500">Depende de: {task.dependsOn.map((d) => d.replace("research:", "")).join(", ")}</p>}
                {analysis.plan?.selectionReasons?.[task.domain] && <p className="mt-2 text-xs text-zinc-400">Motivo: {analysis.plan.selectionReasons[task.domain]}</p>}
                {result?.evidence?.length ? <p className="mt-2 text-xs text-zinc-500">Evidencias: {result.evidence.length} · confianza {result.evidence[0].confidence}</p> : null}
              </div>; })}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold">3. Omitidos</h2>
            <div className="mt-3 flex flex-wrap gap-2">{skipped.map((domain) => <Badge key={domain}>{domain}</Badge>)}</div>
            <p className="mt-3 text-xs text-zinc-500">Omitir un departamento no significa perder capacidad: se activa cuando la petición o una dependencia lo justifican.</p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-semibold">4. Supervisión</h2>
            <div className="mt-4 space-y-2">{(analysis.departmentReports ?? []).map((report) => <div key={report.domain} className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2 text-sm"><span className="font-medium">{report.domain}</span><span className={statusClass(report.status)}>{report.status}</span>{report.unresolved?.length ? <span className="text-xs text-amber-400">{report.unresolved.join(" · ")}</span> : null}{report.conflicts?.length ? <span className="text-xs text-red-400">Conflictos: {report.conflicts.join(" · ")}</span> : null}</div>)}</div>
          </section>
        </>}
      </div>
    </main>
  );
}
