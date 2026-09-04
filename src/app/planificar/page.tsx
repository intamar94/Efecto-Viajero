"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { interpretarTexto, type NecesidadesViaje } from "@/lib/explorador";
import { ATRIBUCION_OSM, detectarLugaresEnTexto, resolverLugar, resolverLugarRemoto, type LugarResuelto } from "@/lib/lugares";
import { PAISES, buscarPaisPorCodigo } from "@/lib/paises";
import { MODOS } from "@/lib/modos";
import type { Etapa, ModoPlanificacion, TipoViaje } from "@/lib/types";

const EJEMPLOS_SIMPLE = [
  "Comer bien y pasear por pueblos con calma, sin madrugar.",
  "Playa por la mañana y algo de aventura por la tarde, con nuestra hija de 6 años.",
  "Museos, mercados y sitios donde podamos llevar al perro.",
];

const EJEMPLOS_CIRCUITO = [
  "Desde Colombia bajar por Ecuador, Perú y Bolivia hasta Chile, por tierra y sin prisa.",
  "Salento, Medellín y Cartagena en dos semanas, comiendo bien.",
  "Cusco, La Paz y Uyuni: montaña, altiplano y salar.",
];

interface EtapaBorrador extends Etapa {
  // Sin país reconocido hay que averiguarlo: es lo que hace que funcionen
  // emergencias, moneda, transporte local y reglas de frontera.
  necesitaPais: boolean;
  buscando?: boolean;
  fuente?: LugarResuelto["fuente"];
}

function aBorrador(nombre: string, dias?: number): EtapaBorrador {
  const lugar = resolverLugar(nombre);
  return {
    id: generarId(),
    nombre: lugar?.nombre ?? nombre,
    paisCodigo: lugar?.paisCodigo,
    destinoId: lugar?.destinoId,
    fuente: lugar?.fuente,
    dias,
    necesitaPais: !lugar?.paisCodigo,
  };
}

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

  const [tipo, setTipo] = useState<TipoViaje>("simple");
  const [paso, setPaso] = useState<"describir" | "completar">("describir");
  const [texto, setTexto] = useState("");
  const [necesidades, setNecesidades] = useState<NecesidadesViaje | null>(null);
  const [creando, setCreando] = useState(false);

  const [etapas, setEtapas] = useState<EtapaBorrador[]>([]);
  const [nuevaParada, setNuevaParada] = useState("");
  const [origenInput, setOrigenInput] = useState("");
  const [fechaSalida, setFechaSalida] = useState("");
  const [fechaRegreso, setFechaRegreso] = useState("");
  const [duracionInput, setDuracionInput] = useState("");
  const [modo, setModo] = useState<ModoPlanificacion | null>(null);

  const esCircuito = tipo === "circuito";

  // El texto libre dice qué se quiere hacer; de él se sacan además los
  // lugares mencionados, en el orden en que aparecen — que suele ser el
  // orden real del recorrido que la persona ya tiene en la cabeza.
  function describir(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const n = interpretarTexto(texto);
    setNecesidades(n);
    setOrigenInput(n.ciudadOrigen ?? "");
    setDuracionInput(n.duracionDias ? String(n.duracionDias) : "");

    const detectados = detectarLugaresEnTexto(texto);
    const paradas = esCircuito ? detectados : detectados.slice(0, 1);
    setEtapas(
      paradas.length > 0
        ? paradas.map((l) => ({
            id: generarId(),
            nombre: l.nombre,
            paisCodigo: l.paisCodigo,
            destinoId: l.destinoId,
            necesitaPais: !l.paisCodigo,
          }))
        : []
    );

    setPaso("completar");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Bajo demanda y nunca en cada tecla: la política de uso de Nominatim
  // pide no bombardearlo, y además así solo se busca lo que de verdad no
  // conocemos.
  async function buscarPaisRemoto(id: string, nombre: string) {
    const limpio = nombre.trim();
    if (!limpio) return;
    setEtapas((prev) => prev.map((e) => (e.id === id ? { ...e, buscando: true } : e)));
    const lugar = await resolverLugarRemoto(limpio);
    setEtapas((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        // Si mientras buscábamos cambió el nombre o ya se eligió país a
        // mano, la respuesta llega tarde y se descarta.
        if (e.nombre.trim() !== limpio || e.paisCodigo) return { ...e, buscando: false };
        return lugar?.paisCodigo
          ? { ...e, paisCodigo: lugar.paisCodigo, fuente: lugar.fuente, necesitaPais: false, buscando: false }
          : { ...e, buscando: false };
      })
    );
  }

  function anadirParada() {
    if (!nuevaParada.trim()) return;
    const nueva = aBorrador(nuevaParada.trim());
    setEtapas((prev) => [...prev, nueva]);
    setNuevaParada("");
    if (!nueva.paisCodigo) void buscarPaisRemoto(nueva.id, nueva.nombre);
  }

  function quitarParada(id: string) {
    setEtapas((prev) => prev.filter((e) => e.id !== id));
  }

  function moverParada(indice: number, direccion: -1 | 1) {
    setEtapas((prev) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= prev.length) return prev;
      const copia = [...prev];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  function actualizarParada(id: string, cambios: Partial<EtapaBorrador>) {
    setEtapas((prev) => prev.map((e) => (e.id === id ? { ...e, ...cambios } : e)));
  }

  function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!necesidades || etapas.length === 0) return;
    setCreando(true);

    const limpias: Etapa[] = etapas.map((e) => ({
      id: e.id,
      nombre: e.nombre.trim(),
      paisCodigo: e.paisCodigo,
      destinoId: e.destinoId,
      dias: e.dias,
    }));
    const dias = Number.parseInt(duracionInput, 10);
    const principal = limpias[0];

    const nuevo = crearViaje({
      // El nombre del viaje: la parada única, o los extremos del recorrido.
      destino: esCircuito && limpias.length > 1 ? `${limpias[0].nombre} → ${limpias[limpias.length - 1].nombre}` : principal.nombre,
      destinoId: principal.destinoId,
      paisCodigo: principal.paisCodigo,
      tipo,
      etapas: limpias,
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
    const ejemplos = esCircuito ? EJEMPLOS_CIRCUITO : EJEMPLOS_SIMPLE;
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Planificar un viaje" subtitulo="Empecemos por lo que te apetece hacer." />

          {/* Un viaje a un sitio y un recorrido por varios no se planifican
              igual: en el recorrido hacen falta el orden de las paradas,
              las fronteras y los cambios de moneda. */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(
              [
                { valor: "simple", icono: "📍", titulo: "Un solo destino", desc: "Voy a un sitio y me muevo por ahí." },
                { valor: "circuito", icono: "🧭", titulo: "Varios destinos", desc: "Una ruta con varias paradas." },
              ] as const
            ).map((op) => (
              <button
                key={op.valor}
                type="button"
                onClick={() => setTipo(op.valor)}
                className={`rounded-2xl border p-3 text-left transition ${
                  tipo === op.valor ? "border-coral-400 bg-coral-50 ring-1 ring-coral-200" : "border-neutral-200 bg-white hover:border-neutral-400"
                }`}
              >
                <span className="block text-xl">{op.icono}</span>
                <span className="mt-1 block text-sm font-medium text-neutral-900">{op.titulo}</span>
                <span className="block text-xs text-neutral-500">{op.desc}</span>
              </button>
            ))}
          </div>

          <form onSubmit={describir} className="card mb-3">
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              {esCircuito ? "¿Qué ruta tienes en mente y qué quieres hacer?" : "¿Qué esperas hacer en este viaje?"}
            </label>
            <textarea
              className="input min-h-32 resize-y"
              placeholder={
                esCircuito
                  ? "Nombra las paradas en el orden que las tengas pensadas y cuenta qué quieres hacer. Puedes decir países, ciudades o pueblos; luego lo ordenas y ajustas."
                  : "Escríbelo como se lo contarías a un amigo: qué te apetece, con quién vas, qué no quieres. Puedes nombrar un país, una ciudad o un pueblo."
              }
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button type="submit" className="btn-primary mt-3 w-full">
              Continuar →
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {ejemplos.map((ej) => (
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
  const faltaPais = etapas.some((e) => e.necesitaPais && !e.paisCodigo);
  const puedeCrear = etapas.length > 0 && etapas.every((e) => e.nombre.trim());

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
          <div>
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              {esCircuito ? "Tu ruta, en orden" : "¿A dónde vas?"} <span className="text-coral-600">*</span>
            </span>
            {esCircuito && (
              <p className="mb-2 text-xs text-neutral-400">
                Puedes reordenar las paradas: el orden decide las fronteras y los cambios de moneda de la guía.
              </p>
            )}

            {etapas.length === 0 && (
              <p className="mb-2 rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                No hemos reconocido ningún lugar en lo que escribiste. Añádelo abajo — vale un país, una ciudad o un pueblo.
              </p>
            )}

            <ul className="space-y-2">
              {etapas.map((etapa, i) => {
                const pais = buscarPaisPorCodigo(etapa.paisCodigo);
                return (
                  <li key={etapa.id} className="rounded-xl border border-neutral-200 p-3">
                    <div className="flex items-center gap-2">
                      {esCircuito && (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marino-100 text-xs font-semibold text-marino-800">
                          {i + 1}
                        </span>
                      )}
                      <input
                        className="input flex-1"
                        value={etapa.nombre}
                        placeholder="ej. Salento, Perú, Kioto…"
                        onChange={(e) => actualizarParada(etapa.id, { ...aBorrador(e.target.value, etapa.dias), id: etapa.id })}
                        onBlur={() => {
                          if (!etapa.paisCodigo) void buscarPaisRemoto(etapa.id, etapa.nombre);
                        }}
                      />
                      {esCircuito && (
                        <>
                          <button type="button" onClick={() => moverParada(i, -1)} disabled={i === 0} className="px-1 text-neutral-400 disabled:opacity-30" aria-label="Subir">
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moverParada(i, 1)}
                            disabled={i === etapas.length - 1}
                            className="px-1 text-neutral-400 disabled:opacity-30"
                            aria-label="Bajar"
                          >
                            ↓
                          </button>
                          <button type="button" onClick={() => quitarParada(etapa.id)} className="px-1 text-neutral-400 hover:text-red-600" aria-label="Quitar">
                            ×
                          </button>
                        </>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {pais ? (
                        <span className="text-emerald-700">
                          ✓ {pais.nombre}
                          {etapa.fuente === "openstreetmap" && <span className="text-neutral-400"> · según OpenStreetMap</span>}
                        </span>
                      ) : etapa.buscando ? (
                        <span className="text-neutral-500">Buscando el país…</span>
                      ) : (
                        <label className="flex items-center gap-2 text-neutral-500">
                          ¿En qué país está?
                          <select
                            className="rounded-lg border border-coral-300 bg-white px-2 py-1 text-xs"
                            value=""
                            onChange={(e) => actualizarParada(etapa.id, { paisCodigo: e.target.value, necesitaPais: false })}
                          >
                            <option value="">Elegir…</option>
                            {[...PAISES].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((p) => (
                              <option key={p.codigo} value={p.codigo}>
                                {p.nombre}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {esCircuito && (
                        <label className="ml-auto flex items-center gap-1 text-neutral-500">
                          días
                          <input
                            type="number"
                            min="1"
                            className="w-16 rounded-lg border border-neutral-200 px-2 py-1"
                            value={etapa.dias ?? ""}
                            onChange={(e) => actualizarParada(etapa.id, { dias: e.target.value ? Number.parseInt(e.target.value, 10) : undefined })}
                          />
                        </label>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {(esCircuito || etapas.length === 0) && (
              <div className="mt-2 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder={esCircuito ? "Añadir otra parada" : "ej. Pereira"}
                  value={nuevaParada}
                  onChange={(e) => setNuevaParada(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      anadirParada();
                    }
                  }}
                />
                <button type="button" onClick={anadirParada} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                  + Añadir
                </button>
              </div>
            )}

            {faltaPais && (
              <p className="mt-2 text-xs text-coral-700">
                Dinos el país de cada parada y podremos darte emergencias, moneda, transporte local y reglas de frontera.
              </p>
            )}
            <p className="mt-2 text-[0.7rem] text-neutral-400">{ATRIBUCION_OSM}</p>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">¿Desde dónde sales?</span>
            <input className="input" placeholder="ej. Bogotá" value={origenInput} onChange={(e) => setOrigenInput(e.target.value)} />
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
            <label className="mt-2 block">
              <span className="mb-1 block text-xs text-neutral-500">Si aún no tienes fechas, ¿cuántos días en total?</span>
              <input type="number" min="1" className="input" placeholder="ej. 10" value={duracionInput} onChange={(e) => setDuracionInput(e.target.value)} />
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
            <button type="submit" disabled={creando || !puedeCrear} className="btn-primary flex-1">
              {creando ? "Creando…" : esCircuito ? "Crear la ruta →" : "Crear el viaje →"}
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
