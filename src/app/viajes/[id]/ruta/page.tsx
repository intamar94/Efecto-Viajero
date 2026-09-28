"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { PreferenciaItinerarioForm } from "@/components/itinerario/PreferenciaItinerarioForm";
import { EditorItinerarioDia } from "@/components/itinerario/EditorItinerarioDia";
import { MapaDia } from "@/components/MapaDia";
import { useData } from "@/lib/store";
import { crucesDe, esCircuito, etapasDe, paisDeEtapa, destinoParaCatalogo } from "@/lib/viaje";
import { ETIQUETA_BLOQUE, REGLA_BLOQUE } from "@/lib/paises";
import { festivosEnRango, luzDelDia, faseLunar, pronosticoAuroras, type FestivoPais, type LuzDelDia, type PronosticoAuroras } from "@/lib/calendarioViaje";
import { actividadesDe } from "@/lib/catalogo";
import { GeneradorItinerario } from "@/lib/generador-itinerario";
import { formatearFecha } from "@/lib/formatoFecha";
import { puntosConCoordenadas, type PuntoGeo } from "@/lib/puntosGeo";
import { descargarICS, generarICS, type EventoICS } from "@/lib/calendarioExport";
import { Capacitor } from "@capacitor/core";
import { CapacitorCalendar } from "@ebarooni/capacitor-calendar";
import type { ActividadDestino, DiaItinerario, Etapa, Itinerario, PreferenciaItinerario } from "@/lib/types";

const NATIVO = Capacitor.isNativePlatform();

// "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm" → milisegundos Unix, lo que pide el
// plugin de calendario nativo (mismo criterio que ya usa el resto de la
// app para fechas sin hora: mediodía local, nunca UTC a secas).
function aTimestamp(valor: string): number {
  return new Date(valor.includes("T") ? valor : `${valor}T00:00:00`).getTime();
}

// Solo las paradas del día que sí tienen ubicación exacta, en el orden en
// que se visitan: las actividades a mano (sin sitio real detrás) no
// tienen coordenadas y simplemente no aparecen en el mapa.
function puntosDelDia(dia: DiaItinerario, viaje: Parameters<typeof puntosConCoordenadas>[0], etapa: Etapa): PuntoGeo[] {
  const disponibles = new Map(puntosConCoordenadas(viaje, etapa).map((p) => [p.id, p]));
  return [...dia.actividades]
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    .flatMap((a) => {
      const p = disponibles.get(a.actividadId);
      return p ? [p] : [];
    });
}

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
  const [mapasAbiertos, setMapasAbiertos] = useState<Set<string>>(new Set());
  const [festivos, setFestivos] = useState<FestivoPais[]>([]);
  // Por nombre de ciudad: la hora de luz depende de dónde estés, no solo
  // del día (amanece bastante distinto en Cartagena que en Bogotá).
  const [luz, setLuz] = useState<Record<string, LuzDelDia>>({});
  const [auroras, setAuroras] = useState<Record<string, PronosticoAuroras>>({});
  const [exportandoCalendario, setExportandoCalendario] = useState(false);
  const [errorCalendario, setErrorCalendario] = useState<string | null>(null);

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

  // Festivos del país durante el viaje y horas de luz por ciudad: dos
  // datos que cambian el plan real de un día (un museo cerrado, o salir
  // al mirador cuando ya es de noche) y que ninguna de las fuentes que ya
  // usábamos traía. Sin clave: si fallan, simplemente no se muestran.
  useEffect(() => {
    if (!viaje?.fechaSalida || !viaje?.fechaRegreso) return;
    let cancelado = false;
    (async () => {
      const codigos = [...new Set(etapasDe(viaje).map((e) => paisDeEtapa(e)?.codigo).filter(Boolean))] as string[];
      const listas = await Promise.all(codigos.map((c) => festivosEnRango(c, viaje.fechaSalida!, viaje.fechaRegreso!)));
      if (cancelado) return;
      setFestivos(listas.flat());

      for (const etapa of etapasDe(viaje)) {
        if (etapa.lat === undefined || etapa.lon === undefined) continue;
        const datos = await luzDelDia(etapa.lat, etapa.lon, viaje.fechaSalida!);
        if (cancelado) return;
        if (datos) setLuz((prev) => ({ ...prev, [etapa.nombre]: datos }));
        // Solo donde de verdad puede haber auroras: pronosticoAuroras
        // devuelve undefined por debajo de los 45° de latitud.
        const aurora = await pronosticoAuroras(etapa.lat);
        if (cancelado) return;
        if (aurora) setAuroras((prev) => ({ ...prev, [etapa.nombre]: aurora }));
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id, viaje?.fechaSalida, viaje?.fechaRegreso]);

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
          <Cabecera titulo="Trip not found" volverA="/viajes" />
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

  // Nombre real de cada actividad para el calendario exportado — misma
  // lógica que la página imprimible: catálogo orientativo salvo que el
  // viajero haya escrito la suya propia o una nota sobre el hueco.
  async function exportarCalendario() {
    if (!viaje) return;
    const catalogoPorId = new Map<string, ActividadDestino>();
    for (const etapa of etapas) {
      for (const item of actividadesDe(destinoParaCatalogo(etapa))) catalogoPorId.set(item.id, item);
    }
    function nombreActividad(actividadId: string, notas?: string): string {
      if (notas) return notas;
      const enViaje = viaje!.actividades.find((a) => a.actividadId === actividadId);
      if (enViaje?.propia) return enViaje.propia.nombre;
      return catalogoPorId.get(actividadId)?.nombre ?? actividadId;
    }

    const eventos: EventoICS[] = [];

    for (const dia of itinerario?.dias ?? []) {
      for (const a of dia.actividades) {
        eventos.push({
          uid: `${viaje.id}-act-${dia.fecha}-${a.horaInicio}@efecto-viajero`,
          titulo: nombreActividad(a.actividadId, a.notas),
          inicio: `${dia.fecha}T${a.horaInicio}`,
          fin: `${dia.fecha}T${a.horaFin}`,
          ubicacion: dia.etapa,
        });
      }
    }

    for (const t of viaje.transporte) {
      if (!t.horaSalida) continue;
      eventos.push({
        uid: `${viaje.id}-transporte-${t.id}@efecto-viajero`,
        titulo: `${t.origen} → ${t.destino}`,
        inicio: t.horaSalida,
        descripcion: t.notas,
      });
    }

    for (const d of viaje.documentos) {
      if (!d.fecha) continue;
      eventos.push({
        uid: `${viaje.id}-doc-${d.id}@efecto-viajero`,
        titulo: `${d.proveedor}${d.referencia ? ` (${d.referencia})` : ""}`,
        inicio: d.hora ? `${d.fecha}T${d.hora}` : d.fecha,
        ubicacion: d.direccion,
      });
    }

    if (eventos.length === 0) return;

    // En la app instalada se escribe directo en el calendario real del
    // teléfono (con permiso nativo pedido en el momento); en la web se
    // sigue ofreciendo el archivo .ics para importar a mano — cada
    // plataforma con la vía que de verdad tiene disponible.
    if (NATIVO) {
      setExportandoCalendario(true);
      try {
        const permiso = await CapacitorCalendar.requestFullCalendarAccess();
        if (permiso.result !== "granted") {
          setErrorCalendario("We need calendar permission to add these dates.");
          return;
        }
        for (const ev of eventos) {
          await CapacitorCalendar.createEvent({
            title: ev.titulo,
            location: ev.ubicacion,
            description: ev.descripcion,
            startDate: aTimestamp(ev.inicio),
            endDate: aTimestamp(ev.fin ?? ev.inicio),
          });
        }
        setErrorCalendario(null);
      } catch {
        setErrorCalendario("We couldn't write to the calendar.");
      } finally {
        setExportandoCalendario(false);
      }
      return;
    }

    const ics = generarICS(viaje.destino, eventos);
    descargarICS(ics, `${viaje.destino.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`);
  }

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

  function toggleMapa(fecha: string) {
    setMapasAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(fecha)) next.delete(fecha);
      else next.add(fecha);
      return next;
    });
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera
          titulo={circuito ? "Your route" : "Your destination"}
          subtitulo="From leaving home to getting back: stops, dates and the itinerary for each one."
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

        {/* Un festivo dentro del viaje cambia el día real: museos y
            oficinas cerrados, transporte con otro horario, y a veces una
            fiesta que es justo lo que querrías ver. Antes no se sabía. */}
        {festivos.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1.5 text-sm font-medium text-amber-900">📅 Public holidays during your trip</p>
            <ul className="space-y-1 text-sm text-amber-800">
              {festivos.map((f) => (
                <li key={`${f.fecha}-${f.nombre}`}>
                  <span className="font-medium">{formatearFecha(f.fecha)}</span> — {f.nombreLocal}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-amber-700">
              Muchos museos, oficinas y comercios cierran o cambian de horario. El transporte también suele ir distinto.
            </p>
          </div>
        )}

        <div className="no-imprimir mb-5 flex flex-wrap items-center gap-2">
          <button onClick={() => window.print()} className="btn-primary text-xs">
            🖨️ Print or save as PDF
          </button>
          <button onClick={exportarCalendario} disabled={exportandoCalendario} className="btn-secondary text-xs">
            {NATIVO ? "📅 Add to phone calendar" : "📅 Export to calendar (.ics)"}
          </button>
          <span className="self-center text-xs text-neutral-400">Works with no battery and no signal.</span>
        </div>
        {errorCalendario && <p className="no-imprimir -mt-3 mb-5 text-xs text-red-600">{errorCalendario}</p>}

        {/* Generar / regenerar el itinerario completo del viaje: el ritmo y
            las horas se deciden aquí, antes de ver el día a día de cada
            etapa. */}
        {mostrarPreferencias ? (
          <section className="mb-6">
            <h2 className="mb-3 font-medium">{itinerario ? "Rebuild itinerary" : "Build your itinerary"}</h2>
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
              ↻ Rebuild the itinerary with different preferences
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
                        <p className="text-sm text-neutral-500">{pais ? pais.nombre : "Country not set"}</p>
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
                      {luz[etapa.nombre] && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-neutral-400">Luz</dt>
                          <dd className="text-neutral-700">
                            ☀️ {luz[etapa.nombre].amanecer} · 🌅 {luz[etapa.nombre].atardecer}
                          </dd>
                        </div>
                      )}
                      {(() => {
                        // La luna decide una noche de estrellas más que
                        // cualquier otra cosa: con luna llena no se ve la
                        // Vía Láctea ni una lluvia de meteoros.
                        const luna = viaje.fechaSalida ? faseLunar(viaje.fechaSalida) : undefined;
                        if (!luna) return null;
                        return (
                          <div className="flex gap-2">
                            <dt className="w-28 shrink-0 text-neutral-400">Luna</dt>
                            <dd className="text-neutral-700">
                              🌙 {luna.nombre} ({Math.round(luna.iluminacion * 100)}%)
                              {luna.buenaParaEstrellas && " · a good night for stargazing"}
                            </dd>
                          </div>
                        );
                      })()}
                      {auroras[etapa.nombre] && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-neutral-400">Auroras</dt>
                          <dd className={auroras[etapa.nombre].hayOportunidad ? "font-medium text-marino-800" : "text-neutral-700"}>
                            {auroras[etapa.nombre].hayOportunidad
                              ? `🌌 Worth a look these nights: Kp ${auroras[etapa.nombre].kpMaximo} is forecast and Kp ${auroras[etapa.nombre].kpNecesario} is enough here`
                              : `🌌 Unlikely: you'd need Kp ${auroras[etapa.nombre].kpNecesario} here and at most Kp ${auroras[etapa.nombre].kpMaximo} is forecast`}
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="mt-3 border-t border-neutral-100 pt-3 text-sm text-neutral-500">
                      No country set for this stop yet, so we can't show its currency.
                    </p>
                  )}

                  {/* Emergencias y transporte local ya tienen su propia caja
                      dedicada (Resolver SOS, Transporte) con mucho más
                      detalle — aquí solo se enlaza, no se repite el dato. */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-xs">
                    <a href={`/viajes/${viaje.id}/resolver`} className="text-marino-600 underline hover:text-marino-800">
                      🆘 Emergency numbers
                    </a>
                    <a href={`/viajes/${viaje.id}/transporte`} className="text-marino-600 underline hover:text-marino-800">
                      🚆 Getting around {etapa.nombre}
                    </a>
                  </div>

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
                            <p className="text-sm text-neutral-400">No days assigned to this stage.</p>
                          ) : (
                            diasDeEtapa.map((dia) => {
                              const puntosDia = puntosDelDia(dia, viaje, etapa);
                              const mapaAbierto = mapasAbiertos.has(dia.fecha);
                              return (
                                <div key={dia.fecha} className="space-y-2">
                                  <EditorItinerarioDia dia={dia} onChange={(d) => handleActualizarDia(dia.fecha, d)} />
                                  {puntosDia.length >= 2 && (
                                    <div className="rounded-xl border border-neutral-100 p-2">
                                      <button
                                        onClick={() => toggleMapa(dia.fecha)}
                                        className="flex w-full items-center justify-between px-1 py-1 text-left text-xs font-medium text-marino-700"
                                      >
                                        🗺️ {mapaAbierto ? "Hide the day's map" : "See the day's map"}
                                        <span className="text-neutral-400">{mapaAbierto ? "−" : "+"}</span>
                                      </button>
                                      {mapaAbierto && (
                                        <div className="mt-2">
                                          <MapaDia puntos={puntosDia} />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
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
                            <span className="font-medium">💱 The currency changes:</span> {cruce.paisDesde?.moneda} → {cruce.paisHacia?.moneda}.
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
              <h2 className="font-medium">Currency change</h2>
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
