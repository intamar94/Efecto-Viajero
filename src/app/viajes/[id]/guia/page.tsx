"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { etapasDe } from "@/lib/viaje";
import { distanciaMetros, hablar, haySintesisDeVoz } from "@/lib/geoAudio";
import { puntosConCoordenadas } from "@/lib/puntosGeo";
import { obtenerResumenLugar, type ResumenWikipedia } from "@/lib/wikipedia";

const UMBRAL_METROS = 120;

interface PuntoGuia {
  id: string;
  nombre: string;
  texto: string;
  lat: number;
  lon: number;
  etapaNombre: string;
  fuente: string;
  wikipediaUrl?: string;
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
  const watchId = useRef<number | null>(null);
  // Evita preguntar dos veces por el mismo sitio con datos ya obsoletos de
  // un render anterior al cambiar de posición muy rápido (varias
  // actualizaciones de GPS seguidas). Incluye tanto lo ya narrado como lo
  // que se preguntó y se respondió "ahora no": no se vuelve a interrumpir
  // por el mismo sitio en la misma sesión.
  const preguntadosRef = useRef<Set<string>>(new Set());
  const silenciadoRef = useRef(false);
  const pendienteRef = useRef<PuntoGuia | null>(null);
  const [resumenesSitio, setResumenesSitio] = useState<Record<string, ResumenWikipedia | "sin_datos">>({});

  useEffect(() => {
    silenciadoRef.current = silenciado;
  }, [silenciado]);
  useEffect(() => {
    pendienteRef.current = pendiente;
  }, [pendiente]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Enriquecer la narración con datos reales (Wikipedia, sin clave): un
  // sitio famoso como "Monserrate" o "La Candelaria" suele tener artículo
  // propio con historia real, mucho más que el "detalle" corto que trae
  // OpenStreetMap. No inventamos leyendas: si no hay artículo, se narra
  // igual con lo que ya sabemos del sitio.
  useEffect(() => {
    if (!viaje) return;
    let cancelado = false;
    (async () => {
      const nombresYaVistos = new Set<string>();
      for (const etapa of etapasDe(viaje)) {
        for (const p of puntosConCoordenadas(viaje, etapa)) {
          if (nombresYaVistos.has(p.id)) continue;
          nombresYaVistos.add(p.id);
          const resumen = await obtenerResumenLugar(p.nombre);
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
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
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
  const puntos: PuntoGuia[] = etapasDe(viaje).flatMap((etapa) =>
    puntosConCoordenadas(viaje, etapa).map((p) => {
      const resumen = resumenesSitio[p.id];
      const rico = resumen && resumen !== "sin_datos" ? resumen : null;
      return {
        id: p.id,
        nombre: p.nombre,
        texto: `Estás cerca de ${p.nombre}. ${rico?.extracto ?? p.detalle ?? `Un sitio recomendado en ${etapa.nombre}.`}`,
        lat: p.lat,
        lon: p.lon,
        etapaNombre: etapa.nombre,
        fuente: p.fuente,
        wikipediaUrl: rico?.url,
      };
    })
  );

  function manejarPosicion(pos: GeolocationPosition) {
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

  function activar() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Este navegador no puede acceder a tu ubicación.");
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      manejarPosicion,
      (err) => setError(err.code === err.PERMISSION_DENIED ? "Necesitamos permiso de ubicación para activar el modo guía." : "No se pudo obtener tu ubicación."),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setActivo(true);
  }

  function desactivar() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
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
          titulo="Modo Guía"
          subtitulo="Detecta dónde estás y te cuenta sobre el sitio, como una guía de tour."
          volverA={`/viajes/${viaje.id}`}
        />

        <div className="mb-5 rounded-2xl border border-coral-200 bg-coral-50 p-4 text-sm text-coral-800">
          ⚠️ Funciona mientras tengas esta página abierta y el GPS activado. En iPhone deja de narrar si bloqueas la
          pantalla o cambias de app: no es una limitación nuestra, es como funciona un sitio web en el móvil.
          {!haySintesisDeVoz() && <p className="mt-2 font-medium">Este navegador no admite voz por síntesis: no podrá narrar en voz alta.</p>}
        </div>

        {puntos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center text-neutral-500">
            Todavía no tenemos sitios con ubicación exacta para este viaje. Visita{" "}
            <span className="font-medium">Actividades</span> para que investiguemos la ciudad primero.
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {!activo ? (
                <button onClick={activar} className="btn-primary flex-1">
                  🎧 Activar modo guía
                </button>
              ) : (
                <button onClick={desactivar} className="btn-secondary flex-1">
                  ⏹️ Detener
                </button>
              )}
              <button
                onClick={() => setSilenciado((v) => !v)}
                className={`rounded-lg border px-3 py-2 text-sm ${silenciado ? "border-neutral-300 bg-neutral-100 text-neutral-500" : "border-marino-200 bg-marino-50 text-marino-700"}`}
              >
                {silenciado ? "🔇 Silenciado" : "🔊 Con voz"}
              </button>
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {/* La notificación: nunca habla sola, siempre pregunta primero. */}
            {pendiente && (
              <div className="mb-5 rounded-2xl border-2 border-marino-400 bg-marino-50 p-4">
                <p className="text-sm font-medium text-marino-900">📍 Estás cerca de {pendiente.nombre}</p>
                <p className="mt-1 text-xs text-marino-700">¿Quieres escuchar sobre este lugar?</p>
                {pendiente.wikipediaUrl && (
                  <p className="mt-2 line-clamp-2 text-xs text-marino-600">{pendiente.texto}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => responderPendiente(true)} className="btn-primary flex-1 text-sm">
                    🔊 Sí, cuéntame
                  </button>
                  <button onClick={() => responderPendiente(false)} className="btn-secondary flex-1 text-sm">
                    Ahora no
                  </button>
                </div>
              </div>
            )}

            {activo && (
              <p className="mb-4 text-xs text-neutral-500">
                {posicion ? `📍 Ubicación activa · ${narrados.size} sitio(s) narrados` : "Buscando tu ubicación…"}
              </p>
            )}

            <h2 className="mb-2 font-medium">Sitios de tu viaje ({puntos.length})</h2>
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
                            📖 Historia real en Wikipedia
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
                        🔊 Escuchar
                      </button>
                    </div>
                    {narrados.has(p.id) && <span className="mt-1 inline-block text-[11px] text-emerald-600">✓ Ya narrado</span>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
