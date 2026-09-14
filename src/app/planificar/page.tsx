"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { interpretarTexto, type NecesidadesViaje } from "@/lib/explorador";
import { diasEntre } from "@/lib/fecha";
import { normalizarInvestigacion } from "@/lib/investigacion";
import { urlBusquedaVuelos, buscadoresAlojamiento } from "@/lib/afiliados";
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

const MODOS: Array<{ id: ModoPlanificacion; icon: string; title: string; text: string }> = [
  { id: "completo", icon: "🗓️", title: "Plan it all", text: "Prepare the days in advance and be able to change them." },
  { id: "poco_a_poco", icon: "🧩", title: "Bit by bit", text: "Add activities, bookings and ideas before and during the trip." },
  { id: "dejarse_llevar", icon: "🧭", title: "Go with the flow", text: "Decide based on the moment, the place and real conditions." },
];

export default function PlanificarPage() {
  const router = useRouter();
  const { crearViaje: guardarViaje } = useData();
  // El destino ya no se adivina del texto libre: se pregunta directo. Es
  // la causa raíz de casi todos los bugs de "reconoce mal el destino" —
  // un campo dedicado no tiene ambigüedad que resolver.
  const [destinos, setDestinos] = useState<string[]>([""]);
  const [origen, setOrigen] = useState("");
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
  const [tardandoMucho, setTardandoMucho] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destinosLlenos = useMemo(() => destinos.map((d) => d.trim()).filter(Boolean), [destinos]);

  // El presupuesto se puede expresar por persona o por día, pero el
  // seguimiento del gasto solo entiende un total. Antes, elegir cualquiera de
  // esas dos opciones hacía desaparecer el presupuesto sin avisar a nadie.
  const presupuestoTotalCalculado = useMemo(() => {
    const importe = presupuesto ? Number(presupuesto) : undefined;
    if (importe === undefined || Number.isNaN(importe) || importe <= 0) return undefined;
    if (presupuestoTipo === "total") return importe;
    if (presupuestoTipo === "por_persona") return importe * Math.max(adultos + ninos + bebes + personasMayores, 1);
    const dias = fechaSalida && fechaRegreso ? Math.max(diasEntre(fechaSalida, fechaRegreso), 1) : undefined;
    return dias !== undefined ? importe * dias : undefined;
  }, [presupuesto, presupuestoTipo, adultos, ninos, bebes, personasMayores, fechaSalida, fechaRegreso]);

  function syncChildren(next: number) {
    const count = Math.max(0, next);
    setNinos(count);
    setEdadesNinos((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? 8));
  }

  function actualizarDestino(i: number, valor: string) {
    setDestinos((prev) => prev.map((d, idx) => (idx === i ? valor : d)));
  }

  function quitarDestino(i: number) {
    setDestinos((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  // El análisis investiga varias fuentes reales (mapas, clima, sitios) y
  // normalmente tarda unos segundos, pero un destino menos común o un
  // proveedor lento puede alargarlo. Sin ningún cambio visual el botón
  // parece congelado; a partir de los 6s se muestra un aviso para dejar
  // claro que sigue trabajando, no bloqueado.
  // Quien llega desde "Explorar el mundo" ya eligió un lugar: llegar
  // aquí y tener que volver a escribirlo sería perder justo el paso que
  // acababa de dar. Se lee de la URL en el navegador (no con
  // useSearchParams) para no obligar a envolver la página en un Suspense
  // solo por esto.
  useEffect(() => {
    const desdeExplorar = new URLSearchParams(window.location.search).get("destino")?.trim();
    if (desdeExplorar) setDestinos([desdeExplorar]);
  }, []);

  useEffect(() => {
    if (!analizando) { setTardandoMucho(false); return; }
    const id = setTimeout(() => setTardandoMucho(true), 6000);
    return () => clearTimeout(id);
  }, [analizando]);

  // Crear el viaje directo, sin una pantalla intermedia de "esto es lo que
  // hemos entendido" que hubiera que revisar y confirmar: eso era un paso
  // extra sin más función que frenar al viajero antes de llegar a su viaje
  // ya creado.
  function crearViaje(analisisData: Analisis, necesidadesData: NecesidadesViaje, tipoCalculado: TipoViaje) {
    const limpias: Etapa[] = analisisData.locations.map((l) => ({ id: `geo-${l.id}`, nombre: l.name, paisCodigo: l.countryCode, destinoId: l.id, lat: l.latitude, lon: l.longitude }));
    const principal = limpias[0];
    const nuevo = guardarViaje({
      destino: tipoCalculado === "circuito" ? limpias.map((e) => e.nombre).join(" → ") : principal.nombre,
      destinoId: principal.destinoId,
      paisCodigo: principal.paisCodigo,
      tipo: tipoCalculado,
      etapas: limpias,
      viajerosIds: [],
      fechaSalida: fechaSalida || undefined,
      fechaRegreso: fechaRegreso || undefined,
      modoPlanificacion: modo,
      // Lo que ya se investigó viaja con el viaje: si no, se pierde al salir
      // de esta pantalla y las consultas se habrían hecho para nada.
      investigacion: normalizarInvestigacion(analisisData as Parameters<typeof normalizarInvestigacion>[0]),
      contexto: {
        presupuestoTotal: presupuestoTotalCalculado,
        duracionDias: necesidadesData.duracionDias,
        numAdultos: adultos,
        edadesMenores: edadesNinos.length ? edadesNinos : undefined,
        mascota: mascotas > 0,
        ciudadOrigen: origen.trim() || necesidadesData.ciudadOrigen || undefined,
        textoOriginal: necesidadesData.textoOriginal,
        presupuesto: { importe: presupuesto ? Number(presupuesto) : undefined, moneda: "EUR", tipo: presupuestoTipo, flexible: presupuestoFlexible },
        viajeros: { adultos, ninos, edadesNinos: edadesNinos.length ? edadesNinos : undefined, bebes: bebes || undefined, personasMayores: personasMayores || undefined, mascotas: mascotas || undefined, accesibilidad },
        accesibilidad,
        intereses: necesidadesData.intereses,
        ritmo: necesidadesData.ritmo,
        restricciones: necesidadesData.sinConducirMucho ? ["sin conducir mucho"] : undefined,
        fechaSalida: fechaSalida || undefined,
        fechaRegreso: fechaRegreso || undefined,
        explorer: { activado: modo === "dejarse_llevar" },
      },
    });
    // Un destino que no se pudo ubicar no debe esconderse en silencio: se
    // avisa una vez en la pantalla del viaje ya creado, sin bloquear la
    // creación por eso.
    const sinUbicar = analisisData.unresolved.map((c) => c.trim()).filter(Boolean);
    router.push(sinUbicar.length ? `/viajes/${nuevo.id}?sinUbicar=${encodeURIComponent(sinUbicar.join(", "))}` : `/viajes/${nuevo.id}`);
  }

  async function analizar(e: React.FormEvent) {
    e.preventDefault();
    if (!destinosLlenos.length || analizando) return;
    if (fechaSalida && fechaRegreso && fechaRegreso < fechaSalida) {
      setError("The return date can't be earlier than the departure date.");
      return;
    }
    setAnalizando(true); setError(null);
    const tipoCalculado: TipoViaje = destinosLlenos.length > 1 ? "circuito" : "simple";
    // El cerebro necesita un texto para investigar (intereses, comida,
    // etc.). Ya no se le pide al viajero que lo escriba — lo que quiera
    // hacer se explora y se filtra directo en las cajas de Actividades,
    // no escribiéndolo aquí para que una IA lo adivine — así que se arma
    // uno simple a partir de los destinos.
    const textoEnviado = `Trip to ${destinosLlenos.join(", ")}.`;
    try {
      const body = {
        text: textoEnviado,
        destinations: destinosLlenos,
        origen: origen.trim() || undefined,
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
      if (!response.ok) throw new Error(data.error ?? "We couldn't analyse the trip.");
      if (!data.locations.length) {
        setError("We couldn't locate any of the destinations you entered. Check the spelling and try again.");
        return;
      }
      crearViaje(data, interpretarTexto(textoEnviado), tipoCalculado);
    } catch (e) { setError(e instanceof Error ? e.message : "We couldn't analyse the trip."); }
    finally { setAnalizando(false); }
  }

  return (
    <main className="flex-1 px-5 py-8"><div className="mx-auto max-w-3xl">
      <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Efecto Viajero</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Tell us about your trip in a few questions.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Answer what you know — you can leave any field empty and fill it in later.</p></div>

      <form onSubmit={analizar} className="space-y-5">
        <section className="card"><div className="mb-4"><h2 className="font-semibold">Where do you want to go?</h2><p className="mt-1 text-xs text-neutral-500">One destination or several, in the order you'll visit them. Place names only here — what you want to do or see goes in "Special requests" below.</p></div>
          <div className="space-y-2">{destinos.map((d, i) => <div key={i} className="flex gap-2"><input className="input flex-1" value={d} onChange={(e) => actualizarDestino(i, e.target.value)} placeholder={i === 0 ? "e.g. Bogotá, Japan, Rome…" : "Another stop"} />{destinos.length > 1 && <button type="button" onClick={() => quitarDestino(i)} className="shrink-0 text-neutral-400 hover:text-red-600" aria-label="Remove destination">×</button>}</div>)}</div>
          <button type="button" onClick={() => setDestinos((p) => [...p, ""])} className="mt-3 text-sm text-marino-700 underline hover:text-marino-900">+ Add another destination</button>
          <label className="mt-4 block border-t border-neutral-100 pt-4 text-sm text-neutral-700">Where are you leaving from? <span className="text-neutral-400">(optional, to search flights and routes)</span><input className="input mt-1" value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="e.g. Madrid" /></label>
        </section>

        <section className="card"><div className="mb-4"><h2 className="font-semibold">When are you travelling?</h2><p className="mt-1 text-xs text-neutral-500">You can leave this open and fill it in later.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-neutral-700">Departure<input type="date" className="input mt-1" value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} /></label><label className="text-sm text-neutral-700">Return<input type="date" className="input mt-1" value={fechaRegreso} onChange={(e) => setFechaRegreso(e.target.value)} /></label></div></section>

        {destinosLlenos.length > 0 && <section className="card border-marino-200 bg-marino-50/40"><div className="mb-3"><h2 className="font-semibold">Before you set a budget…</h2><p className="mt-1 text-xs text-neutral-600">These are real search engines — take a quick look so the number you put below is close to reality, not a blind guess.</p></div>
          <div className="flex flex-wrap gap-2">
            <a href={urlBusquedaVuelos(destinosLlenos[0], origen.trim() || undefined, fechaSalida || undefined, fechaRegreso || undefined)} target="_blank" rel="noopener noreferrer" className="rounded-full border border-marino-300 bg-white px-3 py-1.5 text-xs font-medium text-marino-800 hover:border-marino-500">✈️ See flights to {destinosLlenos[0]}</a>
            {buscadoresAlojamiento(destinosLlenos[0], fechaSalida || undefined, fechaRegreso || undefined).slice(0, 2).map((b) => <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-marino-300 bg-white px-3 py-1.5 text-xs font-medium text-marino-800 hover:border-marino-500">{b.icono} {b.nombre}</a>)}
          </div>
        </section>}

        <section className="card"><div className="mb-4"><h2 className="font-semibold">How much do you want to spend?</h2><p className="mt-1 text-xs text-neutral-500">You can leave this open and fill it in later.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-neutral-700">Approximate budget<input type="number" min="0" step="50" className="input mt-1" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} placeholder="1.500" /></label><label className="text-sm text-neutral-700">How you want to express it<select className="input mt-1" value={presupuestoTipo} onChange={(e) => setPresupuestoTipo(e.target.value as TipoPresupuesto)}><option value="total">Whole trip</option><option value="por_persona">Per person</option><option value="por_dia">Per day</option></select></label></div>{presupuestoTotalCalculado !== undefined && presupuestoTipo !== "total" && <p className="mt-3 text-xs text-neutral-500">For expense tracking we count it as <span className="font-medium text-neutral-700">{presupuestoTotalCalculado} € in total</span>.</p>}{presupuesto && presupuestoTipo === "por_dia" && presupuestoTotalCalculado === undefined && <p className="mt-3 text-xs text-neutral-500">A per-day budget needs to know how long the trip is: tell us the dates or the duration and we'll convert it to a total.</p>}<label className="mt-3 flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={presupuestoFlexible} onChange={(e) => setPresupuestoFlexible(e.target.checked)} /> The budget can flex a little if it makes the trip better</label></section>

        <section className="card"><div className="mb-4"><h2 className="font-semibold">Who's travelling?</h2><p className="mt-1 text-xs text-neutral-500">This affects accommodation, transport, activities, pace, recommendations and preparation.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Count label="Adults" value={adultos} onChange={(v) => setAdultos(Math.max(1, v))} min={1}/><Count label="Children" value={ninos} onChange={syncChildren} min={0}/><Count label="Babies" value={bebes} onChange={(v) => setBebes(Math.max(0, v))} min={0}/><Count label="Older adults" value={personasMayores} onChange={(v) => setPersonasMayores(Math.max(0, v))} min={0}/><Count label="Pets" value={mascotas} onChange={(v) => setMascotas(Math.max(0, v))} min={0}/></div>{ninos > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{edadesNinos.map((edad, i) => <label key={i} className="text-sm text-neutral-700">Child {i + 1} age<input type="number" min="0" max="17" className="input mt-1" value={edad} onChange={(e) => setEdadesNinos((prev) => prev.map((x, idx) => idx === i ? Number(e.target.value) : x))}/></label>)}</div>}
          <div className="mt-4 border-t border-neutral-100 pt-4"><label className="flex items-center gap-2 text-sm font-medium text-neutral-800"><input type="checkbox" checked={accesibilidad.requiereAccesibilidad} onChange={(e) => setAccesibilidad((a) => ({ ...a, requiereAccesibilidad: e.target.checked }))}/> There are accessibility needs</label>{accesibilidad.requiereAccesibilidad && <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-neutral-700"><Check label="Reduced mobility / wheelchair" checked={accesibilidad.movilidad !== "ninguna"} onChange={(v) => setAccesibilidad((a) => ({ ...a, movilidad: v ? "movilidad_reducida" : "ninguna" }))}/><Check label="Hearing needs" checked={Boolean(accesibilidad.auditiva)} onChange={(v) => setAccesibilidad((a) => ({ ...a, auditiva: v }))}/><Check label="Visual needs" checked={Boolean(accesibilidad.visual)} onChange={(v) => setAccesibilidad((a) => ({ ...a, visual: v }))}/><Check label="Cognitive needs" checked={Boolean(accesibilidad.cognitiva)} onChange={(v) => setAccesibilidad((a) => ({ ...a, cognitiva: v }))}/></div>}</div></section>

        <section className="card"><div className="mb-4"><h2 className="font-semibold">How do you want to experience the trip?</h2><p className="mt-1 text-xs text-neutral-500">You can change this later without losing the trip.</p></div><div className="grid gap-3">{MODOS.map((m) => <button key={m.id} type="button" onClick={() => setModo(m.id)} className={`rounded-2xl border p-4 text-left transition ${modo === m.id ? "border-coral-300 bg-coral-50" : "border-neutral-200 bg-white hover:border-neutral-300"}`}><div className="flex items-start gap-3"><span className="text-xl">{m.icon}</span><span><span className="block text-sm font-semibold text-neutral-900">{m.title}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{m.text}</span></span></div></button>)}</div>{modo === "dejarse_llevar" && <div className="mt-3 rounded-2xl bg-marino-50 p-3 text-xs leading-5 text-marino-800">Example: “Today I want beach and a quiet day”. Efecto Viajero will combine place + time + weather + distance + group + budget + local conditions before recommending.</div>}</section>

        {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <button disabled={!destinosLlenos.length || analizando} className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50">
          {analizando && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {analizando ? "Creating your trip…" : "Create my trip →"}
        </button>
        {tardandoMucho && (
          <p className="text-center text-xs text-neutral-500">
            Still working: it's fetching maps, weather and real places for your destination. A less common destination can take a little longer.
          </p>
        )}
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
