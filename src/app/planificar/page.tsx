"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { interpretarTexto, type NecesidadesViaje } from "@/lib/explorador";
import type { Etapa, TipoViaje } from "@/lib/types";

type LugarResuelto = { id: string; name: string; country: string; countryCode: string; region?: string; latitude: number; longitude: number; type: string; displayName: string };
type Analisis = { deconstructed: { locationCandidates: string[]; fragments: Array<{ kind: string; value: string }> }; locations: LugarResuelto[]; unresolved: string[]; countryCode?: string };

const EJEMPLOS = [
  "Quiero ir a Colombia y visitar Pereira, Santander y Leticia durante 10 días, comer bien y conocer naturaleza.",
  "Quiero viajar 7 días con mi hija y nuestro perro. Naturaleza, pueblos bonitos y comer bien, sin conducir mucho.",
  "Dos semanas por Japón: Tokio, Kioto y Osaka, con trenes, mercados y templos.",
];

function resumen(n: NecesidadesViaje | null) {
  if (!n) return [];
  const out: string[] = [];
  if (n.duracionDias) out.push(`${n.duracionDias} días`);
  if (n.numAdultos) out.push(`${n.numAdultos} adultos`);
  n.edadesMenores.forEach((e) => out.push(`menor de ${e} años`));
  if (n.mascota) out.push("mascota");
  if (n.presupuestoMax) out.push(`hasta ${n.presupuestoMax} €`);
  if (n.ciudadOrigen) out.push(`desde ${n.ciudadOrigen}`);
  if (n.ritmo) out.push(`ritmo ${n.ritmo}`);
  if (n.sinConducirMucho) out.push("sin conducir mucho");
  return [...out, ...n.intereses];
}

export default function PlanificarPage() {
  const router = useRouter();
  const { crearViaje: guardarViaje } = useData();
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<TipoViaje>("simple");
  const [analizando, setAnalizando] = useState(false);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [necesidades, setNecesidades] = useState<NecesidadesViaje | null>(null);
  const [etapas, setEtapas] = useState<LugarResuelto[]>([]);
  const [nuevaParada, setNuevaParada] = useState("");
  const [error, setError] = useState<string | null>(null);
  const etiquetas = useMemo(() => resumen(necesidades), [necesidades]);
  const esCircuito = tipo === "circuito";

  async function analizar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || analizando) return;
    setAnalizando(true); setError(null);
    try {
      const response = await fetch("/api/trips/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: texto }) });
      const data = await response.json() as Analisis & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo analizar el viaje.");
      setNecesidades(interpretarTexto(texto));
      setAnalisis(data);
      setEtapas(data.locations);
      setTipo(data.locations.length > 1 ? "circuito" : "simple");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo analizar el viaje."); }
    finally { setAnalizando(false); }
  }

  function crearViaje() {
    if (!necesidades || etapas.length === 0) return;
    const limpias: Etapa[] = etapas.map((l) => ({ id: `geo-${l.id}`, nombre: l.name, paisCodigo: l.countryCode, destinoId: l.id }));
    const principal = limpias[0];
    const nuevo = guardarViaje({
      destino: esCircuito ? limpias.map((e) => e.nombre).join(" → ") : principal.nombre,
      destinoId: principal.destinoId,
      paisCodigo: principal.paisCodigo,
      tipo,
      etapas: limpias,
      viajerosIds: [],
      contexto: { presupuestoTotal: necesidades.presupuestoMax, duracionDias: necesidades.duracionDias, numAdultos: necesidades.numAdultos, edadesMenores: necesidades.edadesMenores.length ? necesidades.edadesMenores : undefined, mascota: necesidades.mascota || undefined, ciudadOrigen: necesidades.ciudadOrigen || undefined },
    });
    router.push(`/viajes/${nuevo.id}`);
  }

  if (analisis) return (
    <main className="flex-1 px-5 py-7"><div className="mx-auto max-w-2xl">
      <button onClick={() => setAnalisis(null)} className="mb-5 text-sm text-neutral-500 hover:text-neutral-900">← Cambiar viaje</button>
      <section className="card mb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Tu viaje</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Esto es lo que hemos entendido.</h1><p className="mt-2 text-sm leading-6 text-neutral-500">Puedes corregirlo. Los lugares se han resuelto individualmente y se usarán como contexto común.</p>{etiquetas.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{etiquetas.map((x) => <span key={x} className="rounded-full bg-marino-50 px-3 py-1.5 text-xs font-medium text-marino-800">{x}</span>)}</div>}</section>
      <section className="card mb-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Lugares del viaje</h2><p className="text-xs text-neutral-500">En el orden en que los has indicado.</p></div><span className="text-xs text-neutral-400">{etapas.length} lugares</span></div>
        <div className="space-y-2">{etapas.map((l, i) => <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marino-50 text-xs font-semibold text-marino-700">{i + 1}</span><div className="min-w-0 flex-1"><p className="font-medium text-neutral-900">{l.name}</p><p className="text-xs text-neutral-500">{[l.region, l.country].filter(Boolean).join(", ")}</p></div><button type="button" onClick={() => setEtapas((p) => p.filter((x) => x.id !== l.id))} className="text-neutral-400 hover:text-red-600" aria-label={`Quitar ${l.name}`}>×</button></div>)}
        {analisis.unresolved.length > 0 && <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">Necesitan confirmación: {analisis.unresolved.join(", ")}</div>}</div>
        {esCircuito && <div className="mt-3 flex gap-2"><input className="input flex-1" value={nuevaParada} onChange={(e) => setNuevaParada(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarManual())} placeholder="Añadir otra ciudad o región" /><button type="button" onClick={agregarManual} className="btn-secondary">Añadir</button></div>}
      </section>
      <button disabled={!etapas.length} onClick={crearViaje} className="btn-primary w-full disabled:opacity-50">Continuar con mi viaje →</button>
    </div></main>
  );

  function agregarManual() {
    const name = nuevaParada.trim(); if (!name) return;
    setTexto((current) => `${current}${current ? ", " : ""}${name}`); setNuevaParada(""); setAnalisis(null);
  }

  return (
    <main className="flex-1 px-5 py-8"><div className="mx-auto max-w-2xl">
      <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Efecto Viajero</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Cuéntanos qué viaje tienes en mente.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">Escríbelo como quieras. No necesitas saber todavía cómo organizarlo.</p></div>
      <div className="mb-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setTipo("simple")} className={`rounded-2xl border p-4 text-left ${tipo === "simple" ? "border-coral-300 bg-coral-50" : "border-neutral-200 bg-white"}`}><span className="text-xl">📍</span><span className="mt-2 block text-sm font-semibold">Un destino</span></button><button type="button" onClick={() => setTipo("circuito")} className={`rounded-2xl border p-4 text-left ${tipo === "circuito" ? "border-coral-300 bg-coral-50" : "border-neutral-200 bg-white"}`}><span className="text-xl">🧭</span><span className="mt-2 block text-sm font-semibold">Varios destinos</span></button></div>
      <form onSubmit={analizar} className="card"><label className="mb-2 block text-sm font-medium text-neutral-800">¿Qué quieres hacer?</label><textarea autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} className="input min-h-44 resize-y text-base leading-6" placeholder="Ej. Quiero ir a Colombia y visitar Pereira, Santander y Leticia durante 10 días. Quiero comer bien y conocer naturaleza."/><div className="mt-3 flex flex-wrap gap-2">{EJEMPLOS.map((ej) => <button key={ej} type="button" onClick={() => setTexto(ej)} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-left text-xs text-neutral-500 hover:border-coral-300">{ej.length > 62 ? `${ej.slice(0, 62)}…` : ej}</button>)}</div>{error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}<button disabled={!texto.trim() || analizando} className="btn-primary mt-4 w-full disabled:opacity-50">{analizando ? "Entendiendo el viaje…" : "Continuar →"}</button></form>
      <p className="mt-4 text-center text-xs text-neutral-400">La complejidad queda detrás de esta pantalla.</p>
    </div></main>
  );
}
