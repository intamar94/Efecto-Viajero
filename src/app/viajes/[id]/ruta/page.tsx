"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { PreferenciaItinerarioForm } from "@/components/itinerario/PreferenciaItinerarioForm";
import { EditorItinerarioDia } from "@/components/itinerario/EditorItinerarioDia";
import { useData } from "@/lib/store";
import { crucesDe, esCircuito, etapasDe, paisDeEtapa, destinoParaCatalogo } from "@/lib/viaje";
import { ETIQUETA_BLOQUE, REGLA_BLOQUE } from "@/lib/paises";
import { actividadesDe } from "@/lib/catalogo";
import { GeneradorItinerario } from "@/lib/generador-itinerario";
import { formatearFecha } from "@/lib/formatoFecha";
import type { ActividadDestino, DiaItinerario, Etapa, Itinerario, PreferenciaItinerario } from "@/lib/types";

// Cuánto dura cada etapa en días, para poder poner una fecha real (no solo
// "3 días") a cada parada del viaje.
function rangoDeEtapa(etapas: Etapa[], index: number, fechaSalida?: string): { inicio: Date; fin: Date } | null {
  if (!fechaSalida) return null;
  let offset = 0;
  for (let i = 0; i < index; i++) offset += etapas[i].dias ?? 0;
  const inicio = new Date(fechaSalida + "T00:00:00");
  inicio.setDate(inicio.getDate() + offset);
  const dias = etapas[index].dias ?? 1;
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + Math.max(dias - 1, 0));
  return { inicio, fin };
}

export default function RutaPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje, hidratado } = useData();
  const viaje = obtenerViaje(params.id);

  const [itinerario, setItinerario] = useState<Itinerario | null>(null);
  const [mostrarPreferencias, setMostrarPreferencias] = useState(false);
  const [inicializado, setInicializado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [etapasAbiertas, setEtapasAbiertas] = useState<Set<string>>(new Set());

  // El viaje se hidrata desde localStorage de forma asíncrona: si se lee
  // viaje.itinerario en el useState inicial, esa lectura llega demasiado
  // pronto (viaje aún es undefined) y se queda pegada a "sin itinerario"
  // para siempre, aunque el ejemplo ya traiga uno generado.
  useEffect(() => {
    if (!hidratado || inicializado) return;
    setItinerario(viaje?.itinerario ?? null);
    setMostrarPreferencias(!viaje?.itinerario);
    setInicializado(true);
  }, [hidratado, inicializado, viaje]);

  if (!hidratado || !inicializado) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <p className="text-neutral-400">Cargando…</p>
        </div>
      </main>
    );
  }

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  const etapas = etapasDe(viaje);
  const cruces = crucesDe(viaje);
  const circuito = esCircuito(viaje);

  const clima = new Map((viaje.investigacion?.clima ?? []).map((c) => [c.lugar, c]));
  const moneda = viaje.investigacion?.moneda;
  const monedasDelViaje = moneda
    ? [...new Set(etapas.map((e) => paisDeEtapa(e)?.moneda?.match(/\(([A-Z]{3})\)/)?.[1]).filter(Boolean) as string[])]
        .flatMap((codigo) => (moneda.tasas[codigo] !== undefined ? [{ codigo, tasa: moneda.tasas[codigo] }] : []))
    : [];

  async function handleGenerarItinerario(prefs: PreferenciaItinerario) {
    setCargando(true);
    try {
      const catalogoPorId = new Map<string, ActividadDestino>();
      for (const etapa of etapas) {
        for (const item of actividadesDe(destinoParaCatalogo(etapa))) {
          catalogoPorId.set(item.id, item);
        }
      }
      const actividadesMap = new Map<string, { duracionHoras?: number }>();
      for (const act of viaje!.actividades) {
        const delCatalogo = catalogoPorId.get(act.actividadId);
        actividadesMap.set(act.actividadId, { duracionHoras: act.propia?.duracionHoras ?? delCatalogo?.duracionHoras ?? 1.5 });
      }
      const generador = new GeneradorItinerario(viaje!, actividadesMap);
      const nuevo = generador.generarItinerario(prefs);
      setItinerario(nuevo);
      actualizarViaje(viaje!.id, { itinerario: nuevo });
      setMostrarPreferencias(false);
    } finally {
      setCargando(false);
    }
  }

  function handleActualizarDia(fecha: string, diaActualizado: DiaItinerario) {
    if (!itinerario) return;
    const dias = itinerario.dias.map((d) => (d.fecha === fecha ? diaActualizado : d));
    const actualizado = { ...itinerario, dias };
    setItinerario(actualizado);
    actualizarViaje(viaje!.id, { itinerario: actualizado });
  }

  function toggleEtapa(id: string) {
    setEtapasAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera
          titulo={circuito ? "Tu ruta" : "Tu destino"}
          subtitulo="Desde que sales de casa hasta que vuelves: paradas, fechas y el itinerario de cada una."
          volverA={`/viajes/${viaje.id}`}
        />

        {/* Vista general: casa → cada etapa con sus fechas → casa. Tocar una
            etapa lleva directo a su itinerario, más abajo. */}
        <div className="no-imprimir mb-5 -mx-5 flex items-center gap-1.5 overflow-x-auto px-5 pb-2 text-xs">
          <span className="chip shrink-0 bg-neutral-100">
            🏠 {viaje.contexto.ciudadOrigen || "Casa"}
            {viaje.fechaSalida && ` · ${formatearFecha(viaje.fechaSalida)}`}
          </span>
          {etapas.map((etapa, i) => {
            const rango = rangoDeEtapa(etapas, i, viaje.fechaSalida);
            return (
              <span key={etapa.id} className="flex items-center gap-1.5">
                <span className="text-neutral-300">→</span>
                <button
                  onClick={() => {
                    setEtapasAbiertas((prev) => new Set(prev).add(etapa.id));
                    document.getElementById(`etapa-${etapa.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="chip shrink-0 border-marino-200 bg-marino-50 text-marino-800 hover:bg-marino-100"
                >
                  📍 {etapa.nombre}
                  {rango && ` · ${formatearFecha(rango.inicio.toISOString().split("T")[0])}`}
                </button>
              </span>
            );
          })}
          <span className="text-neutral-300">→</span>
          <span className="chip shrink-0 bg-neutral-100">
            🏠 Vuelta{viaje.fechaRegreso && ` · ${formatearFecha(viaje.fechaRegreso)}`}
          </span>
        </div>

        <div className="no-imprimir mb-5 flex flex-wrap gap-2">
          <button onClick={() => window.print()} className="btn-primary text-xs">
            🖨️ Imprimir o guardar en PDF
          </button>
          <span className="self-center text-xs text-neutral-400">Funciona sin batería ni cobertura.</span>
        </div>

        {/* Generar / regenerar el itinerario completo del viaje: el ritmo y
            las horas se deciden aquí, antes de ver el día a día de cada
            etapa. */}
        {mostrarPreferencias ? (
          <section className="mb-6">
            <h2 className="mb-3 font-medium">{itinerario ? "Regenerar itinerario" : "Genera tu itinerario"}</h2>
            <PreferenciaItinerarioForm inicial={itinerario?.preferencias} onGenerar={handleGenerarItinerario} cargando={cargando} />
            {itinerario && (
              <button onClick={() => setMostrarPreferencias(false)} className="mt-2 text-xs text-neutral-500 underline">
                Cancelar
              </button>
            )}
          </section>
        ) : (
          itinerario && (
            <button onClick={() => setMostrarPreferencias(true)} className="mb-4 text-xs text-neutral-500 underline hover:text-neutral-900">
              ↻ Regenerar itinerario con otras preferencias
            </button>
          )
        )}

        <ol className="space-y-3">
          {etapas.map((etapa, i) => {
            const pais = paisDeEtapa(etapa);
            const cruce = cruces[i];
            const rango = rangoDeEtapa(etapas, i, viaje.fechaSalida);
            const diasDeEtapa = itinerario?.dias.filter((d) => d.etapa === etapa.nombre) ?? [];
            const abierta = etapasAbiertas.has(etapa.id);

            return (
              <li key={etapa.id} id={`etapa-${etapa.id}`}>
                <section className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-900">
                        {circuito && <span className="mr-1.5 text-marino-600">{i + 1}.</span>}
                        {etapa.nombre}
                      </p>
                      {pais?.nombre !== etapa.nombre && (
                        <p className="text-sm text-neutral-500">{pais ? pais.nombre : "País sin definir"}</p>
                      )}
                      {rango && (
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {formatearFecha(rango.inicio.toISOString().split("T")[0])} – {formatearFecha(rango.fin.toISOString().split("T")[0])}
                        </p>
                      )}
                    </div>
                    {etapa.dias !== undefined && <span className="chip shrink-0">{etapa.dias} días</span>}
                  </div>

                  {clima.get(etapa.nombre) && (
                    <div className="mt-3 border-t border-neutral-100 pt-3">
                      <div className="flex items-baseline justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-marino-700/60">Clima</p>
                        <span className="text-[0.7rem] text-neutral-400">Open-Meteo</span>
                      </div>
                      {clima.get(etapa.nombre)!.actualC !== undefined && (
                        <p className="mt-1 text-sm text-neutral-700">Ahora mismo: {Math.round(clima.get(etapa.nombre)!.actualC!)} °C</p>
                      )}
                      {clima.get(etapa.nombre)!.dias.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {clima.get(etapa.nombre)!.dias.map((d) => (
                            <li key={d.fecha} className="chip">
                              {d.fecha.slice(5)} · {d.minC !== undefined ? Math.round(d.minC) : "?"}–{d.maxC !== undefined ? Math.round(d.maxC) : "?"}°
                              {d.probabilidadLluvia !== undefined && d.probabilidadLluvia >= 30 && ` · 🌧️ ${d.probabilidadLluvia}%`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {pais ? (
                    <dl className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-sm">
                      {pais.moneda && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-neutral-400">Moneda</dt>
                          <dd className="text-neutral-700">{pais.moneda}</dd>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-neutral-400">Emergencias</dt>
                        <dd className={pais.emergencias ? "font-medium text-red-700" : "text-neutral-500"}>
                          {pais.emergencias ?? "sin dato verificado — confírmalo al llegar"}
                        </dd>
                      </div>
                      {pais.telefonoTurista && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-neutral-400">Turista</dt>
                          <dd className="text-neutral-700">{pais.telefonoTurista}</dd>
                        </div>
                      )}
                      {pais.transporteLocal && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-neutral-400">Moverse</dt>
                          <dd className="text-neutral-700">{pais.transporteLocal.medios.join(" · ")}</dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="mt-3 border-t border-neutral-100 pt-3 text-sm text-neutral-500">
                      Sin país asignado no podemos darte moneda, emergencias ni transporte local de esta parada.
                    </p>
                  )}

                  {/* El itinerario específico de esta parada: es lo que
                      antes vivía en una sección aparte, sin relación visible
                      con la ruta. */}
                  {itinerario && (
                    <div className="mt-3 border-t border-neutral-100 pt-3">
                      <button onClick={() => toggleEtapa(etapa.id)} className="flex w-full items-center justify-between text-left">
                        <span className="text-sm font-medium text-marino-800">
                          📅 Itinerario de {etapa.nombre} ({diasDeEtapa.length} día{diasDeEtapa.length !== 1 ? "s" : ""})
                        </span>
                        <span className="text-neutral-400">{abierta ? "−" : "+"}</span>
                      </button>
                      {abierta && (
                        <div className="mt-3 space-y-3">
                          {diasDeEtapa.length === 0 ? (
                            <p className="text-sm text-neutral-400">Sin días asignados a esta etapa.</p>
                          ) : (
                            diasDeEtapa.map((dia) => (
                              <EditorItinerarioDia key={dia.fecha} dia={dia} onChange={(d) => handleActualizarDia(dia.fecha, d)} />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {cruce && (
                  <div className="my-2 ml-4 border-l-2 border-dashed border-neutral-300 pl-4">
                    {cruce.mismoPais ? (
                      <p className="py-2 text-xs text-neutral-500">
                        ↓ Mismo país: no hay frontera entre {cruce.desde.nombre} y {cruce.hacia.nombre}.
                      </p>
                    ) : (
                      <div className="my-1 rounded-xl border border-coral-200 bg-coral-50 p-3 text-xs">
                        <p className="font-medium text-coral-800">
                          🛂 Frontera: {cruce.paisDesde?.nombre ?? cruce.desde.nombre} → {cruce.paisHacia?.nombre ?? cruce.hacia.nombre}
                        </p>

                        {cruce.bloques.length > 0 ? (
                          cruce.bloques.map((b) => (
                            <p key={b} className="mt-1.5 text-neutral-700">
                              <span className="font-medium">{ETIQUETA_BLOQUE[b]}:</span> {REGLA_BLOQUE[b]}
                            </p>
                          ))
                        ) : (
                          <p className="mt-1.5 text-neutral-700">
                            No comparten acuerdo regional en nuestros datos: cuenta con pasaporte y comprueba si tu
                            nacionalidad necesita visado, billete de salida o vacunas obligatorias.
                          </p>
                        )}

                        {cruce.cambiaMoneda && (
                          <p className="mt-1.5 text-neutral-700">
                            <span className="font-medium">💱 Cambia la moneda:</span> {cruce.paisDesde?.moneda} → {cruce.paisHacia?.moneda}.
                            Gasta o cambia lo que te sobre antes de cruzar; en la frontera el cambio suele ser peor.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {moneda && monedasDelViaje.length > 0 && (
          <section className="card mt-6">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="font-medium">Cambio de moneda</h2>
              <span className="text-xs text-neutral-400">Frankfurter · {moneda.fecha}</span>
            </div>
            <p className="mb-3 text-xs text-neutral-500">Cuánto vale 1 {moneda.base} en las monedas de tu ruta.</p>
            <ul className="flex flex-wrap gap-1.5">
              {monedasDelViaje.map(({ codigo, tasa }) => (
                <li key={codigo} className="chip">
                  1 {moneda.base} = {tasa >= 100 ? Math.round(tasa) : tasa.toFixed(2)} {codigo}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-neutral-400">
              Es el cambio de referencia del día, no el que te dará una casa de cambio ni tu banco: cuenta con una
              comisión sobre esta cifra.
            </p>
          </section>
        )}

        <p className="mt-6 text-xs text-neutral-400">
          Las reglas de frontera son orientativas y dependen de tu nacionalidad, no del viaje: los acuerdos regionales
          citados aplican a ciudadanos de los países miembros. Confirma siempre en la fuente oficial (consulado o
          migración del país de destino) antes de viajar, sobre todo si cambias de nacionalidad de pasaporte o llevas
          mascota.
        </p>
      </div>
    </main>
  );
}
