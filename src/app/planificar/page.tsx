"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { interpretarTexto, type NecesidadesViaje } from "@/lib/explorador";
import { normalizarInvestigacion } from "@/lib/investigacion";
import type { AccesibilidadViaje, Etapa, ModoPlanificacion, PresupuestoViaje, TipoViaje } from "@/lib/types";

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

// Todo lo que antes se preguntaba aquí (presupuesto, quién viaja,
// origen, cómo planear) sigue existiendo en la app — solo que ya no
// hace falta responderlo para crear el viaje: se edita después, cada
// cosa en su sitio real (origen en Transporte, quién viaja en el hub del
// viaje, modo de planeación también en el hub). Pedido directo: la
// puerta de entrada es solo destino y duración.
const ACCESIBILIDAD_DEFECTO: AccesibilidadViaje = { requiereAccesibilidad: false };
const MODO_DEFECTO: ModoPlanificacion = "completo";

export default function PlanificarPage() {
  const router = useRouter();
  const { crearViaje: guardarViaje } = useData();
  const [destinos, setDestinos] = useState<string[]>([""]);
  const [dias, setDias] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [tardandoMucho, setTardandoMucho] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destinosLlenos = useMemo(() => destinos.map((d) => d.trim()).filter(Boolean), [destinos]);
  const diasNumero = useMemo(() => {
    const n = Number(dias);
    return dias.trim() && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
  }, [dias]);

  function actualizarDestino(i: number, valor: string) {
    setDestinos((prev) => prev.map((d, idx) => (idx === i ? valor : d)));
  }

  function quitarDestino(i: number) {
    setDestinos((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

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
      modoPlanificacion: MODO_DEFECTO,
      // Lo que ya se investigó viaja con el viaje: si no, se pierde al salir
      // de esta pantalla y las consultas se habrían hecho para nada.
      investigacion: normalizarInvestigacion(analisisData as Parameters<typeof normalizarInvestigacion>[0]),
      contexto: {
        duracionDias: diasNumero ?? necesidadesData.duracionDias,
        numAdultos: 1,
        textoOriginal: necesidadesData.textoOriginal,
        accesibilidad: ACCESIBILIDAD_DEFECTO,
        intereses: necesidadesData.intereses,
        ritmo: necesidadesData.ritmo,
        explorer: { activado: false },
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
        adultos: 1,
        ninos: 0,
        bebes: 0,
        personasMayores: 0,
        mascotas: 0,
        accesibilidad: ACCESIBILIDAD_DEFECTO,
        modoPlanificacion: MODO_DEFECTO,
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
      <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Efecto Viajero</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Where to, and for how long?</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Everything else — dates, budget, who's travelling — you set later, right where it's used.</p></div>

      <form onSubmit={analizar} className="space-y-5">
        <section className="card"><div className="mb-4"><h2 className="font-semibold">Where do you want to go?</h2><p className="mt-1 text-xs text-neutral-500">One destination or several, in the order you'll visit them.</p></div>
          <div className="space-y-2">{destinos.map((d, i) => <div key={i} className="flex gap-2"><input className="input flex-1" value={d} onChange={(e) => actualizarDestino(i, e.target.value)} placeholder={i === 0 ? "e.g. Bogotá, Japan, Rome…" : "Another stop"} />{destinos.length > 1 && <button type="button" onClick={() => quitarDestino(i)} className="shrink-0 text-neutral-400 hover:text-red-600" aria-label="Remove destination">×</button>}</div>)}</div>
          <button type="button" onClick={() => setDestinos((p) => [...p, ""])} className="mt-3 text-sm text-marino-700 underline hover:text-marino-900">+ Add another destination</button>
        </section>

        <section className="card"><div className="mb-4"><h2 className="font-semibold">How many days?</h2><p className="mt-1 text-xs text-neutral-500">A rough number is fine — set exact dates later.</p></div>
          <input type="number" min="1" step="1" className="input max-w-[10rem]" value={dias} onChange={(e) => setDias(e.target.value)} placeholder="e.g. 10" />
        </section>

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
