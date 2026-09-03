"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";

export default function CompartidoPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);

  const [nombreParticipante, setNombreParticipante] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [opciones, setOpciones] = useState(["", ""]);
  const [votoParticipante, setVotoParticipante] = useState<Record<string, string>>({});
  const [votoOpcion, setVotoOpcion] = useState<Record<string, string>>({});

  if (!viaje) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  function agregarParticipante(e: React.FormEvent) {
    e.preventDefault();
    if (!viaje) return;
    const nombre = nombreParticipante.trim();
    if (!nombre || viaje.participantes.includes(nombre)) return;
    actualizarViaje(viaje.id, { participantes: [...viaje.participantes, nombre] });
    setNombreParticipante("");
  }

  function quitarParticipante(nombre: string) {
    if (!viaje) return;
    actualizarViaje(viaje.id, { participantes: viaje.participantes.filter((p) => p !== nombre) });
  }

  function crearVotacion(e: React.FormEvent) {
    e.preventDefault();
    if (!viaje) return;
    const opcionesLimpias = opciones.map((o) => o.trim()).filter(Boolean);
    if (!pregunta.trim() || opcionesLimpias.length < 2) return;
    actualizarViaje(viaje.id, {
      votaciones: [...viaje.votaciones, { id: generarId(), pregunta: pregunta.trim(), opciones: opcionesLimpias, votos: {} }],
    });
    setPregunta("");
    setOpciones(["", ""]);
  }

  function votar(votacionId: string) {
    if (!viaje) return;
    const participante = votoParticipante[votacionId];
    const opcion = votoOpcion[votacionId];
    if (!participante || !opcion) return;
    actualizarViaje(viaje.id, {
      votaciones: viaje.votaciones.map((v) => (v.id === votacionId ? { ...v, votos: { ...v.votos, [participante]: opcion } } : v)),
    });
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera
          titulo="Compartido"
          subtitulo="Participantes y decisiones en grupo, en este dispositivo. Compartir el mismo viaje entre varios móviles necesita cuenta y backend — no está construido en esta versión."
          volverA={`/viajes/${viaje.id}`}
        />

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 font-medium">Participantes</h2>
          {viaje.participantes.length === 0 ? (
            <p className="mb-3 text-sm text-neutral-500">Solo estás tú por ahora.</p>
          ) : (
            <div className="mb-3 flex flex-wrap gap-2">
              {viaje.participantes.map((p) => (
                <span key={p} className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-sm">
                  {p}
                  <button onClick={() => quitarParticipante(p)} className="text-neutral-400 hover:text-red-600">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <form onSubmit={agregarParticipante} className="flex gap-2">
            <input className="input" placeholder="Nombre" value={nombreParticipante} onChange={(e) => setNombreParticipante(e.target.value)} />
            <button type="submit" className="shrink-0 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700">
              + Añadir
            </button>
          </form>
        </section>

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 font-medium">Decisiones del grupo</h2>

          <ul className="mb-4 space-y-3">
            {viaje.votaciones.map((v) => {
              const conteo = v.opciones.map((op) => ({ op, n: Object.values(v.votos).filter((x) => x === op).length }));
              return (
                <li key={v.id} className="rounded-xl bg-neutral-50 p-4 text-sm">
                  <p className="mb-2 font-medium">{v.pregunta}</p>
                  <ul className="mb-3 space-y-1">
                    {conteo.map(({ op, n }) => (
                      <li key={op} className="flex items-center justify-between">
                        <span>{op}</span>
                        <span className="text-neutral-500">{n} voto(s)</span>
                      </li>
                    ))}
                  </ul>
                  {viaje.participantes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="input w-auto"
                        value={votoParticipante[v.id] ?? ""}
                        onChange={(e) => setVotoParticipante((prev) => ({ ...prev, [v.id]: e.target.value }))}
                      >
                        <option value="">¿Quién vota?</option>
                        {viaje.participantes.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <select
                        className="input w-auto"
                        value={votoOpcion[v.id] ?? ""}
                        onChange={(e) => setVotoOpcion((prev) => ({ ...prev, [v.id]: e.target.value }))}
                      >
                        <option value="">Opción</option>
                        {v.opciones.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => votar(v.id)} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700">
                        Votar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <form onSubmit={crearVotacion} className="space-y-2 border-t border-neutral-100 pt-4">
            <input className="input" placeholder="¿Playa o museo?" value={pregunta} onChange={(e) => setPregunta(e.target.value)} />
            {opciones.map((op, i) => (
              <input
                key={i}
                className="input"
                placeholder={`Opción ${i + 1}`}
                value={op}
                onChange={(e) => setOpciones((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
              />
            ))}
            {opciones.length < 4 && (
              <button type="button" onClick={() => setOpciones((prev) => [...prev, ""])} className="text-sm text-neutral-500 hover:text-neutral-900">
                + Otra opción
              </button>
            )}
            <button type="submit" className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
              Crear votación
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
