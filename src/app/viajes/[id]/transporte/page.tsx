"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { URL_BUS, URL_TREN, urlBusquedaVuelos } from "@/lib/afiliados";
import { paisesDelViaje } from "@/lib/viaje";
import type { ModoTransporte, TramoTransporte } from "@/lib/types";

const MODOS: { valor: ModoTransporte; etiqueta: string }[] = [
  { valor: "avion", etiqueta: "✈️ Avión" },
  { valor: "tren", etiqueta: "🚆 Tren" },
  { valor: "autobus", etiqueta: "🚌 Autobús" },
  { valor: "metro", etiqueta: "🚇 Metro/tranvía" },
  { valor: "taxi", etiqueta: "🚕 Taxi / transfer" },
  { valor: "coche_alquiler", etiqueta: "🚗 Coche de alquiler" },
  { valor: "a_pie", etiqueta: "🚶 A pie" },
  { valor: "otro", etiqueta: "Otro" },
];

const ICONO: Record<ModoTransporte, string> = {
  avion: "✈️",
  tren: "🚆",
  autobus: "🚌",
  metro: "🚇",
  taxi: "🚕",
  coche_alquiler: "🚗",
  a_pie: "🚶",
  otro: "•",
};

export default function TransportePage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);

  const [modo, setModo] = useState<ModoTransporte>("tren");
  const [origen, setOrigen] = useState("");
  const [destinoTramo, setDestinoTramo] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [coste, setCoste] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [ciudadOrigenInput, setCiudadOrigenInput] = useState("");
  const [editandoOrigen, setEditandoOrigen] = useState(false);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!viaje || !origen.trim() || !destinoTramo.trim()) return;
    const nuevo: TramoTransporte = {
      id: generarId(),
      modo,
      origen: origen.trim(),
      destino: destinoTramo.trim(),
      horaSalida: horaSalida || undefined,
      costeEstimado: coste ? Number.parseFloat(coste) : undefined,
    };
    actualizarViaje(viaje.id, { transporte: [...viaje.transporte, nuevo] });
    setOrigen("");
    setDestinoTramo("");
    setHoraSalida("");
    setCoste("");
    setMostrarFormulario(false);
  }

  function eliminar(id: string) {
    if (!viaje) return;
    actualizarViaje(viaje.id, { transporte: viaje.transporte.filter((t) => t.id !== id) });
  }

  function guardarOrigen(e: React.FormEvent) {
    e.preventDefault();
    if (!viaje) return;
    actualizarViaje(viaje.id, { contexto: { ...viaje.contexto, ciudadOrigen: ciudadOrigenInput.trim() || undefined } });
    setEditandoOrigen(false);
  }

  const ordenados = [...viaje.transporte].sort((a, b) => (a.horaSalida ?? "").localeCompare(b.horaSalida ?? ""));
  // El transporte local es del PAÍS, no del destino curado: así "Pereira"
  // recibe el de Colombia, y un circuito el de cada país que atraviesa.
  const paises = paisesDelViaje(viaje);

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Transporte" subtitulo="Cómo llegar y cómo moverte una vez allí." volverA={`/viajes/${viaje.id}`} />
        <ViajeToolsNav viajeId={viaje.id} />

        <section className="card mb-6">
          <h2 className="mb-1 font-medium">Cómo llegar</h2>
          <p className="mb-3 text-xs text-neutral-400">
            Te lleva a la web real del proveedor para completar la reserva. Vuelve aquí y guarda el ticket en el Travel Vault.
          </p>

          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-500">Saliendo desde:</span>
            {editandoOrigen ? (
              <form onSubmit={guardarOrigen} className="flex flex-1 gap-2">
                <input
                  className="input flex-1"
                  placeholder="ej. Madrid"
                  value={ciudadOrigenInput}
                  onChange={(e) => setCiudadOrigenInput(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-primary shrink-0 px-3 py-1.5 text-xs">
                  Guardar
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCiudadOrigenInput(viaje.contexto.ciudadOrigen ?? "");
                  setEditandoOrigen(true);
                }}
                className="font-medium text-marino-700 underline hover:text-marino-900"
              >
                {viaje.contexto.ciudadOrigen ?? "sin definir — añadir"}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={urlBusquedaVuelos(viaje.destino, viaje.contexto.ciudadOrigen, viaje.fechaSalida, viaje.fechaRegreso)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              ✈️ Buscar vuelos
            </a>
            <a href={URL_TREN} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs">
              🚆 Trainline
            </a>
            <a href={URL_BUS} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-1.5 text-xs">
              🚌 FlixBus
            </a>
          </div>

          <p className="mt-3 text-sm text-neutral-500">
            Cuando reserves, guarda el ticket en el{" "}
            <Link href={`/viajes/${viaje.id}/vault`} className="text-marino-600 underline">
              Travel Vault
            </Link>
            .
          </p>
        </section>

        {/* Moverse por dentro del destino es la parte que ningún buscador
            de vuelos resuelve, y la que más dinero y tiempo hace perder
            cuando se descubre al llegar. */}
        {paises.length === 0 ? (
          <section className="card mb-6">
            <h2 className="mb-1 font-medium">Moverte por allí</h2>
            <p className="text-sm text-neutral-500">
              Dinos en qué país está tu destino (en Ruta) y te contamos qué transporte hay, cómo se paga y con qué apps.
            </p>
          </section>
        ) : (
          paises.map((pais) =>
            pais.transporteLocal ? (
              <section key={pais.codigo} className="mb-6 rounded-2xl border border-marino-200 bg-marino-50 p-5">
                <h2 className="mb-1 font-medium text-marino-900">Moverte por {pais.nombre}</h2>
                <p className="mb-3 text-xs text-marino-700/70">Transporte local: qué hay y cómo se paga.</p>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {pais.transporteLocal.medios.map((m) => (
                    <span key={m} className="rounded-full border border-marino-200 bg-white px-2.5 py-1 text-xs font-medium text-marino-700">
                      {m}
                    </span>
                  ))}
                </div>

                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-marino-700/60">Cómo se paga</dt>
                    <dd className="text-neutral-700">{pais.transporteLocal.comoSePaga}</dd>
                  </div>
                  {pais.transporteLocal.apps && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-marino-700/60">Apps útiles</dt>
                      <dd className="text-neutral-700">{pais.transporteLocal.apps}</dd>
                    </div>
                  )}
                  {pais.transporteLocal.aviso && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-coral-700">Ojo con esto</dt>
                      <dd className="text-neutral-700">{pais.transporteLocal.aviso}</dd>
                    </div>
                  )}
                </dl>

                <p className="mt-3 text-xs text-marino-700/60">
                  Información general del país, sin precios porque cambian cada temporada. Confirma tarifas en la
                  estación o en la oficina de turismo al llegar.
                </p>
              </section>
            ) : (
              <section key={pais.codigo} className="card mb-6">
                <h2 className="mb-1 font-medium">Moverte por {pais.nombre}</h2>
                <p className="text-sm text-neutral-500">
                  No tenemos ficha verificada de transporte local de este país. Al llegar, pregunta si hay tarjeta
                  recargable o abono de varios viajes: casi siempre sale más barato que el billete sencillo.
                </p>
              </section>
            )
          )
        )}

        <h2 className="mb-2 font-medium">Tus tramos</h2>
        {ordenados.length === 0 ? (
          <p className="mb-4 text-sm text-neutral-500">Todavía no hay tramos guardados.</p>
        ) : (
          <ol className="mb-4 space-y-2">
            {ordenados.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm">
                <span>
                  {ICONO[t.modo]} {t.origen} → {t.destino}
                  {t.horaSalida && <span className="text-neutral-500"> · {t.horaSalida.replace("T", " ")}</span>}
                  {t.costeEstimado !== undefined && <span className="text-neutral-500"> · {t.costeEstimado}€</span>}
                </span>
                <button onClick={() => eliminar(t.id)} className="text-xs text-neutral-400 hover:text-red-600">
                  Eliminar
                </button>
              </li>
            ))}
          </ol>
        )}

        {mostrarFormulario ? (
          <form onSubmit={agregar} className="card space-y-3">
            <select className="input" value={modo} onChange={(e) => setModo(e.target.value as ModoTransporte)}>
              {MODOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Origen" value={origen} onChange={(e) => setOrigen(e.target.value)} />
              <input className="input" placeholder="Destino" value={destinoTramo} onChange={(e) => setDestinoTramo(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="datetime-local" className="input" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} />
              <input type="number" className="input" placeholder="Coste € (opcional)" value={coste} onChange={(e) => setCoste(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full">
              + Añadir tramo
            </button>
          </form>
        ) : (
          <button onClick={() => setMostrarFormulario(true)} className="text-sm text-neutral-500 underline hover:text-neutral-900">
            + Añadir tramo a mano
          </button>
        )}
      </div>
    </main>
  );
}
