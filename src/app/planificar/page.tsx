"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { detectarDestinoExplicito, interpretarTexto, type NecesidadesViaje } from "@/lib/explorador";
import { buscarDestinoPorNombre } from "@/lib/destinos";
import { MODOS } from "@/lib/modos";
import type { ModoPlanificacion } from "@/lib/types";

const EJEMPLOS = [
  "Comer bien, pasear por pueblos con calma y nada de madrugar.",
  "Playa por la mañana y algo de aventura por la tarde, con nuestra hija de 6 años.",
  "Museos, mercados y sitios donde podamos llevar al perro.",
];

// Lo que el texto revela sin preguntar. Se muestra para que se vea que se
// ha leído, no para que haya que tocarlo.
function resumenLegible(n: NecesidadesViaje): string[] {
  const partes: string[] = [];
  if (n.numAdultos) partes.push(`${n.numAdultos} adultos`);
  for (const edad of n.edadesMenores) partes.push(`menor de ${edad} años`);
  if (n.mascota) partes.push("🐾 con mascota");
  if (n.presupuestoMax) partes.push(`hasta ${n.presupuestoMax}€`);
  if (n.ritmo) partes.push(`ritmo ${n.ritmo}`);
  if (n.sinConducirMucho) partes.push("sin conducir mucho");
  partes.push(...n.intereses);
  return partes;
}

export default function PlanificarPage() {
  const router = useRouter();
  const { crearViaje } = useData();

  const [paso, setPaso] = useState<"describir" | "completar">("describir");
  const [texto, setTexto] = useState("");
  const [necesidades, setNecesidades] = useState<NecesidadesViaje | null>(null);
  const [creando, setCreando] = useState(false);

  const [destinoInput, setDestinoInput] = useState("");
  const [origenInput, setOrigenInput] = useState("");
  const [fechaSalida, setFechaSalida] = useState("");
  const [fechaRegreso, setFechaRegreso] = useState("");
  const [duracionInput, setDuracionInput] = useState("");
  const [modo, setModo] = useState<ModoPlanificacion | null>(null);

  // El texto libre ya no sirve para elegir destino entre una lista de
  // porcentajes: sirve para saber qué quiere hacer el viajero. Los datos
  // duros (dónde, desde dónde, cuándo, cómo) se preguntan una sola vez y
  // solo los que no se hayan podido leer del texto.
  function describir(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const n = interpretarTexto(texto);
    setNecesidades(n);
    setDestinoInput(detectarDestinoExplicito(texto)?.nombre ?? "");
    setOrigenInput(n.ciudadOrigen ?? "");
    setDuracionInput(n.duracionDias ? String(n.duracionDias) : "");
    setPaso("completar");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!necesidades || !destinoInput.trim()) return;
    setCreando(true);

    const destinoTexto = destinoInput.trim();
    const catalogado = buscarDestinoPorNombre(destinoTexto);
    const dias = Number.parseInt(duracionInput, 10);

    const nuevo = crearViaje({
      destino: catalogado?.nombre ?? destinoTexto,
      destinoId: catalogado?.id,
      viajerosIds: [],
      fechaSalida: fechaSalida || undefined,
      fechaRegreso: fechaRegreso || undefined,
      modoPlanificacion: modo ?? undefined,
      contexto: {
        presupuestoTotal: necesidades.presupuestoMax,
        duracionDias: Number.isNaN(dias) ? undefined : dias,
        numAdultos: necesidades.numAdultos,
        edadesMenores: necesidades.edadesMenores.length > 0 ? necesidades.edadesMenores : undefined,
        mascota: necesidades.mascota || undefined,
        ciudadOrigen: origenInput.trim() || undefined,
      },
    });
    router.push(`/viajes/${nuevo.id}`);
  }

  if (paso === "describir") {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Planificar un viaje" subtitulo="Empecemos por lo que te apetece hacer." />

          <form onSubmit={describir} className="card mb-3">
            <label className="mb-2 block text-sm font-medium text-neutral-700">¿Qué esperas hacer en este viaje?</label>
            <textarea
              className="input min-h-32 resize-y"
              placeholder="Escríbelo como se lo contarías a un amigo: qué te apetece, con quién vas, qué no quieres. Los datos concretos (dónde, cuándo) te los pedimos después, y solo los que hagan falta."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button type="submit" className="btn-primary mt-3 w-full">
              Continuar →
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {EJEMPLOS.map((ej) => (
              <button
                key={ej}
                onClick={() => setTexto(ej)}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-500 transition hover:border-coral-300 hover:text-neutral-900"
              >
                {ej.length > 42 ? `${ej.slice(0, 42)}…` : ej}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const entendido = necesidades ? resumenLegible(necesidades) : [];

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Solo faltan estos datos" subtitulo="Lo demás ya lo hemos leído de lo que escribiste." />

        {entendido.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-2xl bg-marino-50 px-4 py-3 text-sm">
            <span className="text-marino-700">Hemos entendido:</span>
            {entendido.map((parte, i) => (
              <span key={i} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-marino-800">
                {parte}
              </span>
            ))}
          </div>
        )}

        <form onSubmit={crear} className="card space-y-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              ¿A dónde vas? <span className="text-coral-600">*</span>
            </span>
            <input
              className="input"
              placeholder="ej. Japón, Toscana, Algarve…"
              value={destinoInput}
              onChange={(e) => setDestinoInput(e.target.value)}
              autoFocus={!destinoInput}
              required
            />
            {destinoInput && buscarDestinoPorNombre(destinoInput.trim()) && (
              <span className="mt-1 block text-xs text-emerald-700">
                ✓ Tenemos requisitos, actividades y transporte local de este destino.
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">¿Desde dónde sales?</span>
            <input className="input" placeholder="ej. Madrid" value={origenInput} onChange={(e) => setOrigenInput(e.target.value)} />
            <span className="mt-1 block text-xs text-neutral-400">Lo necesitamos para buscar vuelos y trenes de verdad.</span>
          </label>

          <div>
            <span className="mb-1 block text-sm font-medium text-neutral-700">¿Cuándo?</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-500">Salida</span>
                <input type="date" className="input" value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-neutral-500">Regreso</span>
                <input type="date" className="input" value={fechaRegreso} onChange={(e) => setFechaRegreso(e.target.value)} />
              </label>
            </div>
            {/* Sin fechas cerradas todavía se puede planificar: con los días
                basta para calcular presupuesto y llenar el plan. */}
            <label className="mt-2 block">
              <span className="mb-1 block text-xs text-neutral-500">Si aún no tienes fechas, ¿cuántos días?</span>
              <input
                type="number"
                min="1"
                className="input"
                placeholder="ej. 10"
                value={duracionInput}
                onChange={(e) => setDuracionInput(e.target.value)}
              />
            </label>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-neutral-700">¿Cómo quieres que se desarrolle?</span>
            <div className="grid gap-2">
              {MODOS.map((m) => (
                <button
                  key={m.valor}
                  type="button"
                  onClick={() => setModo(modo === m.valor ? null : m.valor)}
                  className={`rounded-xl border p-3 text-left transition ${
                    modo === m.valor ? "border-marino-500 bg-marino-50" : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <span className="block text-sm font-medium">{m.etiqueta}</span>
                  <span className="block text-xs text-neutral-500">{m.descripcion}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 border-t border-neutral-100 pt-4">
            <button type="submit" disabled={creando || !destinoInput.trim()} className="btn-primary flex-1">
              {creando ? "Creando…" : "Crear el viaje →"}
            </button>
            <button type="button" onClick={() => setPaso("describir")} className="btn-secondary">
              Volver
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
