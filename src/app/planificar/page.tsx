"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { interpretarTexto, type NecesidadesViaje } from "@/lib/explorador";
import { normalizarInvestigacion } from "@/lib/investigacion";
import type { AccesibilidadViaje, Etapa, ModoPlanificacion, PresupuestoViaje, TipoPresupuesto, TipoViaje } from "@/lib/types";

type LugarResuelto = {
  id: string; name: string; country: string; countryCode: string; region?: string;
  latitude: number; longitude: number; type: string; displayName: string;
};

type Analisis = {
  context: { budget: PresupuestoViaje; travelers: { adultos: number; ninos: number; edadesNinos?: number[]; bebes?: number; personasMayores?: number; mascotas?: number }; planningMode: ModoPlanificacion };
  deconstructed: { locationCandidates: string[]; fragments: Array<{ kind: string; value: string }> };
  locations: LugarResuelto[]; unresolved: string[]; countryCode?: string;
  explorer?: { intent: string; searchProfile: { categories: string[]; pace: string; familyFriendly: boolean; accessibilityRequired: boolean; budgetAware: boolean }; companionTips: string[] };
};

const EJEMPLOS = [
  "Quiero ir a Colombia y visitar Pereira, Santander y Leticia durante 10 días. Quiero comer bien y conocer naturaleza.",
  "Quiero viajar 7 días con mi hija. Naturaleza, pueblos bonitos y comer bien, sin conducir mucho.",
  "Dos semanas por Japón: Tokio, Kioto y Osaka, con trenes, mercados y templos.",
];

const MODOS: Array<{ id: ModoPlanificacion; icon: string; title: string; text: string }> = [
  { id: "completo", icon: "🗓️", title: "Planificarlo todo", text: "Preparar los días con antelación y poder modificarlos." },
  { id: "poco_a_poco", icon: "🧩", title: "Poco a poco", text: "Ir añadiendo actividades, reservas e ideas antes y durante el viaje." },
  { id: "dejarse_llevar", icon: "🧭", title: "Explorar", text: "Decidir según el momento, el lugar y las circunstancias reales." },
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
  const [modo, setModo] = useState<ModoPlanificacion>("completo");
  const [fechaSalida, setFechaSalida] = useState("");
  const [fechaRegreso, setFechaRegreso] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [presupuestoTipo, setPresupuestoTipo] = useState<TipoPresupuesto>("total");
  const [presupuestoFlexible, setPresupuestoFlexible] = useState(true);
  const [adultos, setAdultos] = useState(1);
  const [ninos, setNinos] = useState(0);
  const [edadesNinos, setEdadesNinos] = useState<number[]>([]);
  const [bebes, setBebes] = useState(0);
  const [personasMayores, setPersonasMayores] = useState(0);
  const [mascotas, setMascotas] = useState(0);
  const [accesibilidad, setAccesibilidad] = useState<AccesibilidadViaje>({ requiereAccesibilidad: false });
  const [analizando, setAnalizando] = useState(false);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [necesidades, setNecesidades] = useState<NecesidadesViaje | null>(null);
  const [etapas, setEtapas] = useState<LugarResuelto[]>([]);
  const [nuevaParada, setNuevaParada] = useState("");
  const [error, setError] = useState<string | null>(null);
  const etiquetas = useMemo(() => resumen(necesidades), [necesidades]);
  const esCircuito = tipo === "circuito";

  function syncChildren(next: number) {
    const count = Math.max(0, next);
    setNinos(count);
    setEdadesNinos((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? 8));
  }

  async function analizar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || analizando) return;
    if (fechaSalida && fechaRegreso && fechaRegreso < fechaSalida) {
      setError("La fecha de regreso no puede ser anterior a la fecha de salida.");
      return;
    }
    setAnalizando(true); setError(null);
    try {
      const body = {
        text: texto,
        fechaSalida: fechaSalida || undefined,
        fechaRegreso: fechaRegreso || undefined,
        presupuesto: presupuesto ? Number(presupuesto) : undefined,
        moneda: "EUR",
        presupuestoTipo,
        presupuestoFlexible,
        adultos,
        ninos,
        edadesNinos,
        bebes,
        personasMayores,
        mascotas,
        accesibilidad,
        modoPlanificacion: modo,
      };
      const response = await fetch("/api/trips/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
    if (!necesidades || etapas.length === 0 || !analisis) return;
    const limpias: Etapa[] = etapas.map((l) => ({ id: `geo-${l.id}`, nombre: l.name, paisCodigo: l.countryCode, destinoId: l.id }));
    const principal = limpias[0];
    const nuevo = guardarViaje({
      destino: esCircuito ? limpias.map((e) => e.nombre).join(" → ") : principal.nombre,
      destinoId: principal.destinoId,
      paisCodigo: principal.paisCodigo,
      tipo,
      etapas: limpias,
      viajerosIds: [],
      fechaSalida: fechaSalida || undefined,
      fechaRegreso: fechaRegreso || undefined,
      modoPlanificacion: modo,
      // Lo que ya se investigó viaja con el viaje: si no, se pierde al salir
      // de esta pantalla y las consultas se habrían hecho para nada.
      investigacion: normalizarInvestigacion(analisis as Parameters<typeof normalizarInvestigacion>[0]),
      contexto: {
        presupuestoTotal: presupuestoTipo === "total" && presupuesto ? Number(presupuesto) : undefined,
        duracionDias: necesidades.duracionDias,
        numAdultos: adultos,
        edadesMenores: edadesNinos.length ? edadesNinos : undefined,
        mascota: mascotas > 0,
        ciudadOrigen: necesidades.ciudadOrigen || undefined,
        textoOriginal: texto,
        presupuesto: { importe: presupuesto ? Number(presupuesto) : undefined, moneda: "EUR", tipo: presupuestoTipo, flexible: presupuestoFlexible },
        viajeros: { adultos, ninos, edadesNinos: edadesNinos.length ? edadesNinos : undefined, bebes: bebes || undefined, personasMayores: personasMayores || undefined, mascotas: mascotas || undefined, accesibilidad },
        accesibilidad,
        intereses: necesidades.intereses,
        ritmo: necesidades.ritmo,
        restricciones: necesidades.sinConducirMucho ? ["sin conducir mucho"] : undefined,
        fechaSalida: fechaSalida || undefined,
        fechaRegreso: fechaRegreso || undefined,
        explorer: { activado: modo === "dejarse_llevar" },
      },
    });
    router.push(`/viajes/${nuevo.id}`);
  }

  function agregarManual() {
    const name = nuevaParada.trim(); if (!name) return;
    setTexto((current) => `${current}${current ? ", " : ""}${name}`); setNuevaParada(""); setAnalisis(null);
  }

  if (analisis) return (
    <main className="flex-1 px-5 py-7"><div className="mx-auto max-w-3xl">
      <button onClick={() => setAnalisis(null)} className="mb-5 text-sm text-neutral-500 hover:text-neutral-900">← Cambiar datos</button>
      <section className="card mb-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Tu viaje</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Esto es lo que hemos entendido.</h1><p className="mt-2 text-sm leading-6 text-neutral-500">El viaje queda preparado según tus fechas, presupuesto, grupo y forma de viajar.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-marino-50 px-3 py-1.5 text-xs font-medium text-marino-800">{MODOS.find((m) => m.id === modo)?.title}</span>
          {fechaSalida && <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs">{fechaSalida}{fechaRegreso ? ` → ${fechaRegreso}` : ""}</span>}
          {presupuesto && <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs">{presupuesto} € · {presupuestoTipo.replace("_", " ")}</span>}
          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs">{adultos} adultos{ninos ? ` · ${ninos} niños` : ""}{bebes ? ` · ${bebes} bebés` : ""}</span>
          {personasMayores > 0 && <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs">{personasMayores} personas mayores</span>}
          {accesibilidad.requiereAccesibilidad && <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs">Accesibilidad</span>}
        </div>
        {etiquetas.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{etiquetas.map((x) => <span key={x} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600">{x}</span>)}</div>}
      </section>

      {modo === "dejarse_llevar" && <section className="card mb-5 border-dashed"><h2 className="font-semibold">🧭 Modo Explorador</h2><p className="mt-1 text-sm text-neutral-500">Durante el viaje podrás decir cosas como “hoy quiero playa y un día tranquilo” y el sistema buscará opciones que encajen con la situación real.</p>{analisis.explorer?.companionTips?.length ? <div className="mt-3 space-y-2">{analisis.explorer.companionTips.map((tip) => <p key={tip} className="text-sm text-neutral-700">• {tip}</p>)}</div> : null}</section>}

      <section className="card mb-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Lugares del viaje</h2><p className="text-xs text-neutral-500">En el orden en que los has indicado.</p></div><span className="text-xs text-neutral-400">{etapas.length} lugares</span></div>
        <div className="space-y-2">{etapas.map((l, i) => <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-marino-50 text-xs font-semibold text-marino-700">{i + 1}</span><div className="min-w-0 flex-1"><p className="font-medium text-neutral-900">{l.name}</p><p className="text-xs text-neutral-500">{[l.region, l.country].filter(Boolean).join(", ")}</p></div><button type="button" onClick={() => setEtapas((p) => p.filter((x) => x.id !== l.id))} className="text-neutral-400 hover:text-red-600" aria-label={`Quitar ${l.name}`}>×</button></div>)}
          {analisis.unresolved.length > 0 && <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">Necesitan confirmación: {analisis.unresolved.join(", ")}</div>}
        </div>
        {esCircuito && <div className="mt-3 flex gap-2"><input className="input flex-1" value={nuevaParada} onChange={(e) => setNuevaParada(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarManual())} placeholder="Añadir otra ciudad o región" /><button type="button" onClick={agregarManual} className="btn-secondary">Añadir</button></div>}
      </section>
      <button disabled={!etapas.length} onClick={crearViaje} className="btn-primary w-full disabled:opacity-50">Crear mi viaje →</button>
    </div></main>
  );

  return (
    <main className="flex-1 px-5 py-8"><div className="mx-auto max-w-3xl">
      <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Efecto Viajero</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Cuéntanos qué viaje tienes en mente.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Empieza con tus propias palabras. Después ajustamos lo necesario para que el viaje se adapte a ti.</p></div>

      <form onSubmit={analizar} className="space-y-5">
        <section className="card"><div className="mb-2 flex items-center justify-between"><label className="text-sm font-medium text-neutral-800">Tu idea de viaje</label><span className="text-xs text-neutral-400">Texto libre</span></div><textarea autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} className="input min-h-44 resize-y text-base leading-6" placeholder="Ej. Quiero ir a Colombia y visitar Pereira, Santander y Leticia durante 10 días. Quiero comer bien y conocer naturaleza."/><div className="mt-3 flex flex-wrap gap-2">{EJEMPLOS.map((ej) => <button key={ej} type="button" onClick={() => setTexto(ej)} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-left text-xs text-neutral-500 hover:border-coral-300">{ej.length > 62 ? `${ej.slice(0, 62)}…` : ej}</button>)}</div></section>

        <section className="card"><div className="mb-4"><h2 className="font-semibold">¿Cuándo y con qué presupuesto?</h2><p className="mt-1 text-xs text-neutral-500">Puedes dejar cualquiera de estos datos sin definir y completarlos después.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-neutral-700">Salida<input type="date" className="input mt-1" value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} /></label><label className="text-sm text-neutral-700">Regreso<input type="date" className="input mt-1" value={fechaRegreso} onChange={(e) => setFechaRegreso(e.target.value)} /></label><label className="text-sm text-neutral-700">Presupuesto aproximado<input type="number" min="0" step="50" className="input mt-1" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} placeholder="1.500" /></label><label className="text-sm text-neutral-700">Cómo quieres expresarlo<select className="input mt-1" value={presupuestoTipo} onChange={(e) => setPresupuestoTipo(e.target.value as TipoPresupuesto)}><option value="total">Total del viaje</option><option value="por_persona">Por persona</option><option value="por_dia">Por día</option></select></label></div><label className="mt-3 flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={presupuestoFlexible} onChange={(e) => setPresupuestoFlexible(e.target.checked)} /> El presupuesto puede variar un poco si mejora la experiencia</label></section>

        <section className="card"><div className="mb-4"><h2 className="font-semibold">¿Quiénes viajan?</h2><p className="mt-1 text-xs text-neutral-500">Esto afecta alojamiento, transporte, actividades, ritmo, recomendaciones y preparación.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Count label="Adultos" value={adultos} onChange={(v) => setAdultos(Math.max(1, v))} min={1}/><Count label="Niños" value={ninos} onChange={syncChildren} min={0}/><Count label="Bebés" value={bebes} onChange={(v) => setBebes(Math.max(0, v))} min={0}/><Count label="Personas mayores" value={personasMayores} onChange={(v) => setPersonasMayores(Math.max(0, v))} min={0}/><Count label="Mascotas" value={mascotas} onChange={(v) => setMascotas(Math.max(0, v))} min={0}/></div>{ninos > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{edadesNinos.map((edad, i) => <label key={i} className="text-sm text-neutral-700">Edad niño {i + 1}<input type="number" min="0" max="17" className="input mt-1" value={edad} onChange={(e) => setEdadesNinos((prev) => prev.map((x, idx) => idx === i ? Number(e.target.value) : x))}/></label>)}</div>}
          <div className="mt-4 border-t border-neutral-100 pt-4"><label className="flex items-center gap-2 text-sm font-medium text-neutral-800"><input type="checkbox" checked={accesibilidad.requiereAccesibilidad} onChange={(e) => setAccesibilidad((a) => ({ ...a, requiereAccesibilidad: e.target.checked }))}/> Hay necesidades de accesibilidad</label>{accesibilidad.requiereAccesibilidad && <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-neutral-700"><Check label="Movilidad reducida / silla de ruedas" checked={accesibilidad.movilidad !== "ninguna"} onChange={(v) => setAccesibilidad((a) => ({ ...a, movilidad: v ? "movilidad_reducida" : "ninguna" }))}/><Check label="Necesidad auditiva" checked={Boolean(accesibilidad.auditiva)} onChange={(v) => setAccesibilidad((a) => ({ ...a, auditiva: v }))}/><Check label="Necesidad visual" checked={Boolean(accesibilidad.visual)} onChange={(v) => setAccesibilidad((a) => ({ ...a, visual: v }))}/><Check label="Necesidad cognitiva" checked={Boolean(accesibilidad.cognitiva)} onChange={(v) => setAccesibilidad((a) => ({ ...a, cognitiva: v }))}/></div>}</div></section>

        <section className="card"><div className="mb-4"><h2 className="font-semibold">¿Cómo quieres vivir el viaje?</h2><p className="mt-1 text-xs text-neutral-500">Puedes cambiar de comportamiento más adelante sin perder el viaje.</p></div><div className="grid gap-3">{MODOS.map((m) => <button key={m.id} type="button" onClick={() => setModo(m.id)} className={`rounded-2xl border p-4 text-left transition ${modo === m.id ? "border-coral-300 bg-coral-50" : "border-neutral-200 bg-white hover:border-neutral-300"}`}><div className="flex items-start gap-3"><span className="text-xl">{m.icon}</span><span><span className="block text-sm font-semibold text-neutral-900">{m.title}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{m.text}</span></span></div></button>)}</div>{modo === "dejarse_llevar" && <div className="mt-3 rounded-2xl bg-marino-50 p-3 text-xs leading-5 text-marino-800">Ejemplo: “Hoy quiero playa y un día tranquilo”. Efecto Viajero combinará lugar + hora + clima + distancia + grupo + presupuesto + condiciones locales antes de recomendar.</div>}</section>

        <section className="card"><div className="mb-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setTipo("simple")} className={`rounded-2xl border p-3 text-left ${tipo === "simple" ? "border-coral-300 bg-coral-50" : "border-neutral-200"}`}>📍 <span className="text-sm font-semibold">Un destino</span></button><button type="button" onClick={() => setTipo("circuito")} className={`rounded-2xl border p-3 text-left ${tipo === "circuito" ? "border-coral-300 bg-coral-50" : "border-neutral-200"}`}>🧭 <span className="text-sm font-semibold">Varios destinos</span></button></div>{error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}<button disabled={!texto.trim() || analizando} className="btn-primary w-full disabled:opacity-50">{analizando ? "Entendiendo tu viaje…" : "Continuar →"}</button></section>
      </form>
    </div></main>
  );
}

function Count({ label, value, onChange, min }: { label: string; value: number; onChange: (value: number) => void; min: number }) {
  return <div className="rounded-2xl border border-neutral-200 p-3"><div className="text-sm font-medium text-neutral-800">{label}</div><div className="mt-2 flex items-center justify-between"><button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="h-9 w-9 rounded-xl border border-neutral-200">−</button><span className="text-lg font-semibold">{value}</span><button type="button" onClick={() => onChange(value + 1)} className="h-9 w-9 rounded-xl border border-neutral-200">+</button></div></div>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 rounded-xl border border-neutral-200 p-3"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}/>{label}</label>;
}
