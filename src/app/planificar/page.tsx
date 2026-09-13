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

// Ya no son ejemplos de "viaje completo" (el destino ahora se pregunta
// aparte): son inspiración de qué tipo de cosas poner en peticiones
// especiales, que es lo único para lo que sirve ya el texto libre.
const EJEMPLOS_PETICIONES = [
  "Es nuestra luna de miel",
  "Preferimos no caminar mucho",
  "Nos encanta la comida callejera",
  "Queremos evitar sitios muy turísticos",
];

const MODOS: Array<{ id: ModoPlanificacion; icon: string; title: string; text: string }> = [
  { id: "completo", icon: "🗓️", title: "Planificarlo todo", text: "Preparar los días con antelación y poder modificarlos." },
  { id: "poco_a_poco", icon: "🧩", title: "Poco a poco", text: "Ir añadiendo actividades, reservas e ideas antes y durante el viaje." },
  { id: "dejarse_llevar", icon: "🧭", title: "Explorar", text: "Decidir según el momento, el lugar y las circunstancias reales." },
];

export default function PlanificarPage() {
  const router = useRouter();
  const { crearViaje: guardarViaje } = useData();
  // El destino ya no se adivina del texto libre: se pregunta directo. Es
  // la causa raíz de casi todos los bugs de "reconoce mal el destino" —
  // un campo dedicado no tiene ambigüedad que resolver.
  const [destinos, setDestinos] = useState<string[]>([""]);
  const [origen, setOrigen] = useState("");
  const [texto, setTexto] = useState("");
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
    const limpias: Etapa[] = analisisData.locations.map((l) => ({ id: `geo-${l.id}`, nombre: l.name, paisCodigo: l.countryCode, destinoId: l.id }));
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
        textoOriginal: texto,
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
      setError("La fecha de regreso no puede ser anterior a la fecha de salida.");
      return;
    }
    setAnalizando(true); setError(null);
    const tipoCalculado: TipoViaje = destinosLlenos.length > 1 ? "circuito" : "simple";
    // El cerebro necesita un texto para investigar (intereses, comida,
    // etc.); si el viajero no escribió peticiones especiales, se arma uno
    // simple a partir de los destinos en vez de bloquear el flujo pidiendo
    // texto que ya no hace falta.
    const textoEnviado = texto.trim() || `Viaje a ${destinosLlenos.join(", ")}.`;
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
      if (!response.ok) throw new Error(data.error ?? "No se pudo analizar el viaje.");
      if (!data.locations.length) {
        setError("No pudimos ubicar ninguno de los destinos que escribiste. Revisa el nombre e inténtalo de nuevo.");
        return;
      }
      crearViaje(data, interpretarTexto(textoEnviado), tipoCalculado);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo analizar el viaje."); }
    finally { setAnalizando(false); }
  }

  return (
    <main className="flex-1 px-5 py-8"><div className="mx-auto max-w-3xl">
      <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Efecto Viajero</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Cuéntanos tu viaje en unas preguntas.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Responde lo que sepas — puedes dejar cualquier campo sin rellenar y completarlo después.</p></div>

      <form onSubmit={analizar} className="space-y-5">
        <section className="card"><div className="mb-4"><h2 className="font-semibold">¿A dónde quieres ir?</h2><p className="mt-1 text-xs text-neutral-500">Un destino o varios, en el orden en que los visitarás. Solo nombres de lugares aquí — lo que quieras hacer o ver va en "Peticiones especiales" más abajo.</p></div>
          <div className="space-y-2">{destinos.map((d, i) => <div key={i} className="flex gap-2"><input className="input flex-1" value={d} onChange={(e) => actualizarDestino(i, e.target.value)} placeholder={i === 0 ? "Ej. Bogotá, Japón, Roma…" : "Otra parada"} />{destinos.length > 1 && <button type="button" onClick={() => quitarDestino(i)} className="shrink-0 text-neutral-400 hover:text-red-600" aria-label="Quitar destino">×</button>}</div>)}</div>
          <button type="button" onClick={() => setDestinos((p) => [...p, ""])} className="mt-3 text-sm text-marino-700 underline hover:text-marino-900">+ Añadir otro destino</button>
          <label className="mt-4 block border-t border-neutral-100 pt-4 text-sm text-neutral-700">¿Desde dónde sales? <span className="text-neutral-400">(opcional, para buscar vuelos y rutas)</span><input className="input mt-1" value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Ej. Madrid" /></label>
        </section>

        <section className="card"><div className="mb-4"><h2 className="font-semibold">¿Cuándo viajas?</h2><p className="mt-1 text-xs text-neutral-500">Puedes dejarlo sin definir y completarlo después.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-neutral-700">Salida<input type="date" className="input mt-1" value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} /></label><label className="text-sm text-neutral-700">Regreso<input type="date" className="input mt-1" value={fechaRegreso} onChange={(e) => setFechaRegreso(e.target.value)} /></label></div></section>

        {destinosLlenos.length > 0 && <section className="card border-marino-200 bg-marino-50/40"><div className="mb-3"><h2 className="font-semibold">Antes de poner un presupuesto…</h2><p className="mt-1 text-xs text-neutral-600">Estos son buscadores reales — échales un vistazo rápido para que el número que pongas abajo se acerque a la realidad, no sea un cálculo a ciegas.</p></div>
          <div className="flex flex-wrap gap-2">
            <a href={urlBusquedaVuelos(destinosLlenos[0], origen.trim() || undefined, fechaSalida || undefined, fechaRegreso || undefined)} target="_blank" rel="noopener noreferrer" className="rounded-full border border-marino-300 bg-white px-3 py-1.5 text-xs font-medium text-marino-800 hover:border-marino-500">✈️ Ver vuelos a {destinosLlenos[0]}</a>
            {buscadoresAlojamiento(destinosLlenos[0], fechaSalida || undefined, fechaRegreso || undefined).slice(0, 2).map((b) => <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-marino-300 bg-white px-3 py-1.5 text-xs font-medium text-marino-800 hover:border-marino-500">{b.icono} {b.nombre}</a>)}
          </div>
        </section>}

        <section className="card"><div className="mb-4"><h2 className="font-semibold">¿Cuánto quieres gastar?</h2><p className="mt-1 text-xs text-neutral-500">Puedes dejarlo sin definir y completarlo después.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-neutral-700">Presupuesto aproximado<input type="number" min="0" step="50" className="input mt-1" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} placeholder="1.500" /></label><label className="text-sm text-neutral-700">Cómo quieres expresarlo<select className="input mt-1" value={presupuestoTipo} onChange={(e) => setPresupuestoTipo(e.target.value as TipoPresupuesto)}><option value="total">Total del viaje</option><option value="por_persona">Por persona</option><option value="por_dia">Por día</option></select></label></div>{presupuestoTotalCalculado !== undefined && presupuestoTipo !== "total" && <p className="mt-3 text-xs text-neutral-500">Para el seguimiento del gasto lo contamos como <span className="font-medium text-neutral-700">{presupuestoTotalCalculado} € en total</span>.</p>}{presupuesto && presupuestoTipo === "por_dia" && presupuestoTotalCalculado === undefined && <p className="mt-3 text-xs text-neutral-500">Un presupuesto por día necesita saber cuántos días dura el viaje: dinos las fechas o la duración y lo convertimos a total.</p>}<label className="mt-3 flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={presupuestoFlexible} onChange={(e) => setPresupuestoFlexible(e.target.checked)} /> El presupuesto puede variar un poco si mejora la experiencia</label></section>

        <section className="card"><div className="mb-4"><h2 className="font-semibold">¿Quiénes viajan?</h2><p className="mt-1 text-xs text-neutral-500">Esto afecta alojamiento, transporte, actividades, ritmo, recomendaciones y preparación.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Count label="Adultos" value={adultos} onChange={(v) => setAdultos(Math.max(1, v))} min={1}/><Count label="Niños" value={ninos} onChange={syncChildren} min={0}/><Count label="Bebés" value={bebes} onChange={(v) => setBebes(Math.max(0, v))} min={0}/><Count label="Personas mayores" value={personasMayores} onChange={(v) => setPersonasMayores(Math.max(0, v))} min={0}/><Count label="Mascotas" value={mascotas} onChange={(v) => setMascotas(Math.max(0, v))} min={0}/></div>{ninos > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{edadesNinos.map((edad, i) => <label key={i} className="text-sm text-neutral-700">Edad niño {i + 1}<input type="number" min="0" max="17" className="input mt-1" value={edad} onChange={(e) => setEdadesNinos((prev) => prev.map((x, idx) => idx === i ? Number(e.target.value) : x))}/></label>)}</div>}
          <div className="mt-4 border-t border-neutral-100 pt-4"><label className="flex items-center gap-2 text-sm font-medium text-neutral-800"><input type="checkbox" checked={accesibilidad.requiereAccesibilidad} onChange={(e) => setAccesibilidad((a) => ({ ...a, requiereAccesibilidad: e.target.checked }))}/> Hay necesidades de accesibilidad</label>{accesibilidad.requiereAccesibilidad && <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-neutral-700"><Check label="Movilidad reducida / silla de ruedas" checked={accesibilidad.movilidad !== "ninguna"} onChange={(v) => setAccesibilidad((a) => ({ ...a, movilidad: v ? "movilidad_reducida" : "ninguna" }))}/><Check label="Necesidad auditiva" checked={Boolean(accesibilidad.auditiva)} onChange={(v) => setAccesibilidad((a) => ({ ...a, auditiva: v }))}/><Check label="Necesidad visual" checked={Boolean(accesibilidad.visual)} onChange={(v) => setAccesibilidad((a) => ({ ...a, visual: v }))}/><Check label="Necesidad cognitiva" checked={Boolean(accesibilidad.cognitiva)} onChange={(v) => setAccesibilidad((a) => ({ ...a, cognitiva: v }))}/></div>}</div></section>

        <section className="card"><div className="mb-4"><h2 className="font-semibold">¿Cómo quieres vivir el viaje?</h2><p className="mt-1 text-xs text-neutral-500">Puedes cambiar de comportamiento más adelante sin perder el viaje.</p></div><div className="grid gap-3">{MODOS.map((m) => <button key={m.id} type="button" onClick={() => setModo(m.id)} className={`rounded-2xl border p-4 text-left transition ${modo === m.id ? "border-coral-300 bg-coral-50" : "border-neutral-200 bg-white hover:border-neutral-300"}`}><div className="flex items-start gap-3"><span className="text-xl">{m.icon}</span><span><span className="block text-sm font-semibold text-neutral-900">{m.title}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{m.text}</span></span></div></button>)}</div>{modo === "dejarse_llevar" && <div className="mt-3 rounded-2xl bg-marino-50 p-3 text-xs leading-5 text-marino-800">Ejemplo: “Hoy quiero playa y un día tranquilo”. Efecto Viajero combinará lugar + hora + clima + distancia + grupo + presupuesto + condiciones locales antes de recomendar.</div>}</section>

        <section className="card"><div className="mb-2 flex items-center justify-between"><label className="text-sm font-medium text-neutral-800">¿Algo más? Peticiones especiales</label><span className="text-xs text-neutral-400">Opcional</span></div><p className="mb-2 text-xs text-neutral-500">Todo lo de arriba ya queda guardado. Usa esto solo para lo que no cabe en una pregunta: intereses, ocasión especial, cosas a evitar…</p><textarea value={texto} onChange={(e) => setTexto(e.target.value)} className="input min-h-28 resize-y text-base leading-6" placeholder="Ej. Queremos comer bien, nos gusta caminar y es nuestro aniversario."/><div className="mt-3 flex flex-wrap gap-2">{EJEMPLOS_PETICIONES.map((ej) => <button key={ej} type="button" onClick={() => setTexto((t) => t ? `${t} ${ej}.` : `${ej}.`)} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-left text-xs text-neutral-500 hover:border-coral-300">{ej}</button>)}</div></section>

        {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <button disabled={!destinosLlenos.length || analizando} className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50">
          {analizando && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {analizando ? "Creando tu viaje…" : "Crear mi viaje →"}
        </button>
        {tardandoMucho && (
          <p className="text-center text-xs text-neutral-500">
            Sigue trabajando: está buscando mapas, clima y sitios reales para tu destino. Un destino menos común puede tardar un poco más.
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
