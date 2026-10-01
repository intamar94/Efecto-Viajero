"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { etapasDe } from "@/lib/viaje";
import { distanciaMetros, hablar, haySintesisDeVoz } from "@/lib/geoAudio";
import { puntosConCoordenadas } from "@/lib/puntosGeo";
import { obtenerResumenSitio, type ResumenWikipedia } from "@/lib/wikipedia";
import { comparadorPorInteres, PERFILES_INTERES } from "@/lib/perfilInteres";
import { RadarGuia, ANGULO_MIRA } from "@/components/RadarGuia";
import { diferenciaAngular, escucharRumbo, pedirPermisoBrujula, rumboEntre } from "@/lib/orientacion";
import { sitiosCercanos, type SitioCercano } from "@/lib/cercaDeMi";
import { TarjetaSitio } from "@/components/TarjetaSitio";
import { IDIOMAS, TEMAS, type IdiomaId, type TemaId } from "@/lib/temasGuia";
import { normalizarTexto } from "@/lib/wikiGeosearch";
import type { CategoriaActividad } from "@/lib/types";

const RADIO_RADAR_M = 1000;
const MOVIMIENTO_REFRESCO_M = 150;
const CLAVE_PREFS = "efecto-viajero:guia-prefs";

// En la app instalada (Android), el GPS lo da el sistema operativo real
// (@capacitor/geolocation) en vez del navegador: un permiso nativo de
// verdad, no el del WebView, y una posición más estable. Sigue siendo
// primer plano — el plugin no cubre segundo plano con pantalla apagada,
// eso es una pieza aparte que no está lista todavía — pero es un salto
// real respecto a la web mientras la app está abierta.
const NATIVO = Capacitor.isNativePlatform();

const UMBRAL_METROS = 120;

interface PuntoGuia {
  id: string;
  nombre: string;
  texto: string;
  lat: number;
  lon: number;
  etapaNombre: string;
  fuente: string;
  categoria?: CategoriaActividad;
  wikipediaUrl?: string;
  // Independiente de wikipediaUrl: un resumen reusado desde Actividades
  // es igual de real y rico, pero no siempre trae guardada la URL del
  // artículo — no debe ocultarse el avance del texto solo por eso.
  tieneResumenRico: boolean;
}

export default function ModoGuiaPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje } = useData();
  const viaje = obtenerViaje(params.id);

  const [activo, setActivo] = useState(false);
  const [posicion, setPosicion] = useState<{ lat: number; lon: number } | null>(null);
  const [narrados, setNarrados] = useState<Set<string>>(new Set());
  const [pendiente, setPendiente] = useState<PuntoGuia | null>(null);
  const [silenciado, setSilenciado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | string | null>(null);
  // Evita preguntar dos veces por el mismo sitio con datos ya obsoletos de
  // un render anterior al cambiar de posición muy rápido (varias
  // actualizaciones de GPS seguidas). Incluye tanto lo ya narrado como lo
  // que se preguntó y se respondió "ahora no": no se vuelve a interrumpir
  // por el mismo sitio en la misma sesión.
  const preguntadosRef = useRef<Set<string>>(new Set());
  const silenciadoRef = useRef(false);
  const pendienteRef = useRef<PuntoGuia | null>(null);
  const [resumenesSitio, setResumenesSitio] = useState<Record<string, ResumenWikipedia | "sin_datos">>({});
  const [rumbo, setRumbo] = useState<number | null>(null);
  const [cercanos, setCercanos] = useState<SitioCercano[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [idioma, setIdioma] = useState<IdiomaId>("en");
  const [tema, setTema] = useState<TemaId>("resumen");
  const dejarDeEscucharRumbo = useRef<(() => void) | null>(null);
  const ultimaBusqueda = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    silenciadoRef.current = silenciado;
  }, [silenciado]);
  useEffect(() => {
    pendienteRef.current = pendiente;
  }, [pendiente]);

  // Sitios reales alrededor de donde estás ahora (Wikipedia geosearch):
  // así el radar funciona en cualquier sitio, sin tener que investigar la
  // ciudad en Actividades antes. Se refresca solo si te moviste de verdad.
  useEffect(() => {
    if (!posicion) return;
    const previa = ultimaBusqueda.current;
    if (previa && distanciaMetros(previa.lat, previa.lon, posicion.lat, posicion.lon) < MOVIMIENTO_REFRESCO_M) return;
    ultimaBusqueda.current = posicion;
    sitiosCercanos(posicion.lat, posicion.lon, RADIO_RADAR_M, idioma).then(setCercanos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicion]);

  // Preferencias de narración (tema e idioma) recordadas en este dispositivo.
  useEffect(() => {
    try {
      const g = JSON.parse(localStorage.getItem(CLAVE_PREFS) ?? "null") as { tema?: TemaId; idioma?: IdiomaId } | null;
      if (g?.tema && TEMAS.some((t) => t.id === g.tema)) setTema(g.tema);
      const idiomaNavegador = navigator.language.slice(0, 2) as IdiomaId;
      const elegido = g?.idioma ?? idiomaNavegador;
      if (IDIOMAS.some((i) => i.id === elegido)) setIdioma(elegido);
    } catch {}
  }, []);

  function cambiarPrefs(nuevo: { tema?: TemaId; idioma?: IdiomaId }) {
    const t = nuevo.tema ?? tema;
    const i = nuevo.idioma ?? idioma;
    setTema(t);
    if (i !== idioma) {
      setIdioma(i);
      // Los títulos de los sitios cambian con el idioma: se buscan de nuevo.
      ultimaBusqueda.current = null;
      setCercanos([]);
      setSeleccionadoId(null);
      if (posicion) {
        ultimaBusqueda.current = posicion;
        sitiosCercanos(posicion.lat, posicion.lon, RADIO_RADAR_M, i).then(setCercanos);
      }
    }
    try {
      localStorage.setItem(CLAVE_PREFS, JSON.stringify({ tema: t, idioma: i }));
    } catch {}
  }


  useEffect(() => {
    return () => {
      dejarDeEscucharRumbo.current?.();
      if (watchId.current !== null) {
        if (NATIVO) Geolocation.clearWatch({ id: String(watchId.current) });
        else navigator.geolocation.clearWatch(watchId.current as number);
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Enriquecer la narración con datos reales (Wikipedia, sin clave): un
  // sitio famoso como "Monserrate" o "La Candelaria" suele tener artículo
  // propio con historia real, mucho más que el "detalle" corto que trae
  // OpenStreetMap. No inventamos leyendas: si no hay artículo, se narra
  // igual con lo que ya sabemos del sitio.
  //
  // Si Actividades ya investigó este mismo sitio (misma id, mismo
  // viaje), se reusa ese resultado tal cual en vez de repetir la
  // búsqueda una segunda vez desde esta pantalla — y cuando SÍ hace
  // falta buscar de cero (p. ej. si el viajero abre primero el Modo
  // Guía), se usa la misma resolución completa que Actividades
  // (obtenerResumenSitio: enlace directo de OSM → coordenadas → nombre),
  // no una búsqueda más débil solo por estar en otra pantalla.
  useEffect(() => {
    if (!viaje) return;
    let cancelado = false;
    (async () => {
      const nombresYaVistos = new Set<string>();
      for (const etapa of etapasDe(viaje)) {
        for (const p of puntosConCoordenadas(viaje, etapa)) {
          if (nombresYaVistos.has(p.id)) continue;
          nombresYaVistos.add(p.id);
          if (p.resumenWikipedia !== undefined) {
            setResumenesSitio((prev) => ({
              ...prev,
              [p.id]: p.resumenWikipedia ? { titulo: p.nombre, extracto: p.resumenWikipedia, url: "" } : "sin_datos",
            }));
            continue;
          }
          const resumen = await obtenerResumenSitio(p.nombre, etapa.nombre, { lat: p.lat, lon: p.lon }, { wikipedia: p.enlaceWikipedia, wikidata: p.enlaceWikidata }, 140);
          if (cancelado) return;
          setResumenesSitio((prev) => ({ ...prev, [p.id]: resumen ?? "sin_datos" }));
        }
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id]);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Trip not found" volverA="/viajes" />
        </div>
      </main>
    );
  }

  // Todos los puntos con coordenadas reales que tenemos: sitios de
  // OpenStreetMap y listings de Wikivoyage, con los mismos ids que usa
  // Actividades (vía lib/puntosGeo) para que "añadido al itinerario" y
  // "detectado por el GPS" sean siempre la misma actividad.
  // Cuando hay artículo de Wikipedia para el sitio (algo frecuente en
  // lugares conocidos como Monserrate o La Candelaria), se narra ese
  // resumen real en vez del "detalle" corto de OpenStreetMap: más
  // historia y datos curiosos, corto pero claro, sin inventar nada.
  const puntosSinPriorizar: PuntoGuia[] = etapasDe(viaje).flatMap((etapa) =>
    puntosConCoordenadas(viaje, etapa).map((p) => {
      const resumen = resumenesSitio[p.id];
      const rico = resumen && resumen !== "sin_datos" ? resumen : null;
      return {
        id: p.id,
        nombre: p.nombre,
        texto: `You're near ${p.nombre}. ${rico?.extracto ?? p.detalle ?? `A recommended place in ${etapa.nombre}.`}`,
        lat: p.lat,
        lon: p.lon,
        etapaNombre: etapa.nombre,
        fuente: p.fuente,
        categoria: p.categoria,
        wikipediaUrl: rico?.url,
        tieneResumenRico: !!rico?.extracto,
      };
    })
  );

  // Con el perfil de interés del viaje, si dos sitios reales están en
  // rango de GPS al mismo tiempo, se narra primero el que de verdad
  // coincide con lo que le interesa a este viajero — el "free tour a la
  // medida" que pidió. No filtra ni esconde nada: todo sigue en la lista
  // de abajo, solo cambia el orden de prioridad.
  const puntos = [...puntosSinPriorizar].sort(comparadorPorInteres((p) => p.categoria, viaje.contexto.perfilInteres));

  // Radar: los sitios del viaje + los reales que hay alrededor tuyo ahora
  // (sin duplicar un sitio que ya está en el viaje).
  const nombresDelViaje = new Set(puntos.map((p) => normalizarTexto(p.nombre)));
  const sitiosRadar = [
    ...puntos.map((p) => ({ id: p.id, nombre: p.nombre, lat: p.lat, lon: p.lon })),
    ...cercanos.filter((c) => !nombresDelViaje.has(normalizarTexto(c.nombre))),
  ];

  // "En la mira": el sitio más cercano dentro del cono hacia donde apunta el
  // teléfono. Tocar un punto del radar lo elige a mano y manda sobre esto.
  const enMira =
    posicion && rumbo !== null
      ? sitiosRadar
          .map((s) => ({ s, d: distanciaMetros(posicion.lat, posicion.lon, s.lat, s.lon), ang: diferenciaAngular(rumboEntre(posicion.lat, posicion.lon, s.lat, s.lon), rumbo) }))
          .filter((x) => x.d <= RADIO_RADAR_M && Math.abs(x.ang) <= ANGULO_MIRA)
          .sort((a, b) => a.d - b.d)[0]?.s
      : undefined;
  const cercaCount = posicion ? sitiosRadar.filter((s) => distanciaMetros(posicion.lat, posicion.lon, s.lat, s.lon) <= RADIO_RADAR_M).length : 0;
  const sitioActivo = sitiosRadar.find((s) => s.id === seleccionadoId) ?? enMira;
  const puntoDelViaje = sitioActivo ? puntos.find((p) => p.id === sitioActivo.id) : undefined;

  function elegirSitio(id: string) {
    setSeleccionadoId(id);
  }

  function manejarPosicion(pos: { coords: { latitude: number; longitude: number } }) {
    const actual = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    setPosicion(actual);
    // Un fallo de GPS puede ser puntual (túnel, señal débil un instante): si
    // después llega una posición válida, el aviso de error ya no aplica.
    setError(null);
    // No habla solo: al detectar cercanía se pregunta primero (como una
    // notificación), nunca se reproduce audio sin que el viajero lo pida.
    if (silenciadoRef.current || pendienteRef.current) return;
    for (const p of puntos) {
      if (preguntadosRef.current.has(p.id)) continue;
      const d = distanciaMetros(actual.lat, actual.lon, p.lat, p.lon);
      if (d <= UMBRAL_METROS) {
        setPendiente(p);
        break; // una notificación a la vez, aunque haya varios sitios cerca
      }
    }
  }

  function responderPendiente(escuchar: boolean) {
    if (!pendiente) return;
    preguntadosRef.current = new Set(preguntadosRef.current).add(pendiente.id);
    if (escuchar) {
      hablar(pendiente.texto);
      setNarrados((prev) => new Set(prev).add(pendiente.id));
    }
    setPendiente(null);
  }

  async function activar() {
    setError(null);
    // Brújula (giroscopio): el permiso en iPhone exige un toque, así que se
    // pide aquí. Si no hay o se rechaza, el radar sigue con el norte arriba.
    if (await pedirPermisoBrujula()) {
      dejarDeEscucharRumbo.current?.();
      dejarDeEscucharRumbo.current = escucharRumbo(setRumbo);
    }
    if (NATIVO) {
      try {
        const permiso = await Geolocation.requestPermissions();
        if (permiso.location === "denied") {
          setError("We need location permission to turn on guide mode.");
          return;
        }
        watchId.current = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
          if (err || !pos) {
            setError("We couldn't get your location.");
            return;
          }
          manejarPosicion(pos);
        });
        setActivo(true);
      } catch {
        setError("We couldn't get your location.");
      }
      return;
    }
    if (!("geolocation" in navigator)) {
      setError("This browser can't access your location.");
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      manejarPosicion,
      (err) => setError(err.code === err.PERMISSION_DENIED ? "We need location permission to turn on guide mode." : "We couldn't get your location."),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setActivo(true);
  }

  function desactivar() {
    if (watchId.current !== null) {
      if (NATIVO) Geolocation.clearWatch({ id: String(watchId.current) });
      else navigator.geolocation.clearWatch(watchId.current as number);
    }
    watchId.current = null;
    dejarDeEscucharRumbo.current?.();
    dejarDeEscucharRumbo.current = null;
    ultimaBusqueda.current = null;
    setRumbo(null);
    setSeleccionadoId(null);
    setCercanos([]);
    setActivo(false);
    setPosicion(null);
    setPendiente(null);
    window.speechSynthesis?.cancel();
  }

  const ordenados = posicion
    ? [...puntos].sort((a, b) => distanciaMetros(posicion.lat, posicion.lon, a.lat, a.lon) - distanciaMetros(posicion.lat, posicion.lon, b.lat, b.lon))
    : puntos;

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera
          titulo="Guide mode"
          subtitulo="It spots where you are and tells you about the place, like a tour guide."
          volverA={`/viajes/${viaje.id}`}
        />

        <div className="mb-5 rounded-2xl border border-coral-200 bg-coral-50 p-4 text-sm text-coral-800">
          {NATIVO
            ? "⚠️ It works while the app is open and GPS is on. It still pauses if you switch to another app or lock the screen — real background tracking isn't built yet."
            : "⚠️ It works while you keep this page open with GPS on. On iPhone it stops narrating if you lock the screen or switch apps: that's not our limitation, it's how a website behaves on a phone."}
          {!haySintesisDeVoz() && <p className="mt-2 font-medium">This browser doesn't support speech synthesis: it won't be able to read aloud.</p>}
        </div>

        {/* La elección de qué te interesa vive en Actividades (una sola
            caja para eso, no dos): aquí solo se dice qué está aplicando
            ahora mismo, con un enlace directo para cambiarlo. */}
        <p className="mb-5 text-xs text-neutral-500">
          {(viaje.contexto.perfilInteres ?? []).length > 0
            ? `Narrating based on what you're into: ${(viaje.contexto.perfilInteres ?? [])
                .map((id) => PERFILES_INTERES.find((p) => p.id === id)?.etiqueta)
                .filter(Boolean)
                .join(", ")}.`
            : "Not narrating by interest yet."}{" "}
          <a href={`/viajes/${viaje.id}/actividades`} className="text-marino-600 underline hover:text-marino-800">
            Change in Activities
          </a>
        </p>

        <>
            {/* Cómo quieres que te cuente cada lugar: por tema y en tu idioma.
                Todo sale del artículo real de Wikipedia de ese lugar. */}
            <section className="mb-5 rounded-2xl border border-neutral-200 bg-white p-3">
              <p className="mb-2 text-xs font-medium text-neutral-500">Tour by</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {TEMAS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => cambiarPrefs({ tema: t.id })}
                    className={`rounded-full border px-3 py-1 text-xs ${tema === t.id ? "border-marino-500 bg-marino-50 font-medium text-marino-800" : "border-neutral-200 text-neutral-600"}`}
                  >
                    {t.icono} {t.etiqueta}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-500">
                Language
                <select value={idioma} onChange={(e) => cambiarPrefs({ idioma: e.target.value as IdiomaId })} className="input w-auto py-1 text-sm">
                  {IDIOMAS.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <div className="mb-5 flex flex-wrap items-center gap-2">
              {!activo ? (
                <button onClick={activar} className="btn-primary flex-1">
                  🎧 Start guide mode
                </button>
              ) : (
                <button onClick={desactivar} className="btn-secondary flex-1">
                  ⏹️ Stop
                </button>
              )}
              <button
                onClick={() => setSilenciado((v) => !v)}
                className={`rounded-lg border px-3 py-2 text-sm ${silenciado ? "border-neutral-300 bg-neutral-100 text-neutral-500" : "border-marino-200 bg-marino-50 text-marino-700"}`}
              >
                {silenciado ? "🔇 Muted" : "🔊 With voice"}
              </button>
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {/* La notificación: nunca habla sola, siempre pregunta primero. */}
            {pendiente && (
              <div className="mb-5 rounded-2xl border-2 border-marino-500 bg-marino-50 p-4">
                <p className="text-sm font-medium text-marino-900">📍 You&apos;re near {pendiente.nombre}</p>
                <p className="mt-1 text-xs text-marino-700">Want to hear about this place?</p>
                {pendiente.tieneResumenRico && (
                  <p className="mt-2 line-clamp-2 text-xs text-marino-600">{pendiente.texto}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => responderPendiente(true)} className="btn-primary flex-1 text-sm">
                    🔊 Yes, tell me
                  </button>
                  <button onClick={() => responderPendiente(false)} className="btn-secondary flex-1 text-sm">
                    Not now
                  </button>
                </div>
              </div>
            )}

            {activo && (
              <p className="mb-4 text-xs text-neutral-500">
                {posicion ? `📍 Location on · ${narrados.size} place(s) narrated` : "Finding your location…"}
              </p>
            )}

            {/* Radar: tú en el centro, "arriba" es hacia donde apunta el
                teléfono. Apunta a un punto (o tócalo) para oír su historia. */}
            {activo && posicion && (
              <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
                <RadarGuia
                  posicion={posicion}
                  rumbo={rumbo}
                  sitios={sitiosRadar}
                  radioMetros={RADIO_RADAR_M}
                  seleccionadoId={sitioActivo?.id ?? null}
                  onSeleccionar={elegirSitio}
                />
                <p className="mt-2 text-center text-[11px] text-neutral-500">
                  {rumbo === null
                    ? "Compass not available: the radar keeps north up. Tap a dot."
                    : "Turn around: the top is where your phone points. Aim at a dot or tap it."}
                  {" "}
                  {cercaCount === 0 ? "Looking for places nearby…" : `${cercaCount} place(s) within 1 km.`}
                </p>

                {sitioActivo && (
                  <TarjetaSitio
                    sitio={sitioActivo}
                    distanciaM={distanciaMetros(posicion.lat, posicion.lon, sitioActivo.lat, sitioActivo.lon)}
                    elegidoAMano={sitioActivo.id === seleccionadoId}
                    idioma={idioma}
                    tema={tema}
                    textoRespaldo={puntoDelViaje?.texto}
                    onNarrado={(id) => {
                      preguntadosRef.current = new Set(preguntadosRef.current).add(id);
                      setNarrados((prev) => new Set(prev).add(id));
                    }}
                  />
                )}
              </section>
            )}

            {puntos.length > 0 && <h2 className="mb-2 font-medium">Places on your trip ({puntos.length})</h2>}
            <ul className="space-y-2">
              {ordenados.map((p) => {
                const d = posicion ? Math.round(distanciaMetros(posicion.lat, posicion.lon, p.lat, p.lon)) : null;
                return (
                  <li key={p.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{p.nombre}</p>
                        <p className="text-xs text-neutral-500">
                          {p.etapaNombre} · {p.fuente}
                          {d !== null && ` · ${d < 1000 ? `${d} m` : `${(d / 1000).toFixed(1)} km`}`}
                        </p>
                        {p.wikipediaUrl && (
                          <a href={p.wikipediaUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-block text-[11px] text-marino-600 underline">
                            📖 Real history on Wikipedia
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          hablar(p.texto);
                          preguntadosRef.current = new Set(preguntadosRef.current).add(p.id);
                          setNarrados((prev) => new Set(prev).add(p.id));
                        }}
                        className="shrink-0 rounded-lg border border-marino-200 bg-marino-50 px-2.5 py-1.5 text-xs font-medium text-marino-700 hover:bg-marino-100"
                      >
                        🔊 Listen
                      </button>
                    </div>
                    {narrados.has(p.id) && <span className="mt-1 inline-block text-[11px] text-emerald-600">✓ Already narrated</span>}
                  </li>
                );
              })}
            </ul>
          </>
      </div>
    </main>
  );
}
