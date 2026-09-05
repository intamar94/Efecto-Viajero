"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { etapasDe } from "@/lib/viaje";
import { distanciaMetros, hablar, haySintesisDeVoz } from "@/lib/geoAudio";

const UMBRAL_METROS = 120;

interface PuntoGuia {
  id: string;
  nombre: string;
  texto: string;
  lat: number;
  lon: number;
  etapaNombre: string;
  fuente: string;
}

export default function ModoGuiaPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje } = useData();
  const viaje = obtenerViaje(params.id);

  const [activo, setActivo] = useState(false);
  const [posicion, setPosicion] = useState<{ lat: number; lon: number } | null>(null);
  const [narrados, setNarrados] = useState<Set<string>>(new Set());
  const [silenciado, setSilenciado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  // Evita narrar con datos ya obsoletos de un render anterior al cambiar
  // de posición muy rápido (varias actualizaciones de GPS seguidas).
  const narradosRef = useRef<Set<string>>(new Set());
  const silenciadoRef = useRef(false);

  useEffect(() => {
    narradosRef.current = narrados;
  }, [narrados]);
  useEffect(() => {
    silenciadoRef.current = silenciado;
  }, [silenciado]);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

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
  // OpenStreetMap (guardados al crear el viaje) y los listings de
  // Wikivoyage con lat/long, que traen un texto propio mucho mejor para
  // narrar que una simple categoría.
  const puntos: PuntoGuia[] = etapasDe(viaje).flatMap((etapa) => {
    const deOsm = (viaje.investigacion?.sitios?.[etapa.nombre] ?? [])
      .filter((s) => s.lat !== undefined && s.lon !== undefined)
      .map((s) => ({
        id: `osm-${etapa.id}-${s.nombre}`,
        nombre: s.nombre,
        texto: `Estás cerca de ${s.nombre}${s.detalle ? `, ${s.detalle} de ${etapa.nombre}` : ` en ${etapa.nombre}`}.`,
        lat: s.lat!,
        lon: s.lon!,
        etapaNombre: etapa.nombre,
        fuente: "OpenStreetMap",
      }));

    const deWikivoyage = (viaje.wikivoyage?.[etapa.nombre]?.listings ?? [])
      .filter((l) => l.lat !== undefined && l.lon !== undefined && l.nombre)
      .map((l) => ({
        id: `wv-${etapa.id}-${l.nombre}`,
        nombre: l.nombre!,
        texto: `Estás cerca de ${l.nombre}. ${l.contenido ?? `Un sitio recomendado en ${etapa.nombre}.`}`,
        lat: l.lat!,
        lon: l.lon!,
        etapaNombre: etapa.nombre,
        fuente: "Wikivoyage",
      }));

    return [...deOsm, ...deWikivoyage];
  });

  function manejarPosicion(pos: GeolocationPosition) {
    const actual = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    setPosicion(actual);
    if (silenciadoRef.current) return;
    for (const p of puntos) {
      if (narradosRef.current.has(p.id)) continue;
      const d = distanciaMetros(actual.lat, actual.lon, p.lat, p.lon);
      if (d <= UMBRAL_METROS) {
        hablar(p.texto);
        narradosRef.current = new Set(narradosRef.current).add(p.id);
        setNarrados(new Set(narradosRef.current));
        break; // uno a la vez: si hay dos muy cerca, no se solapan las voces
      }
    }
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
                      </div>
                      <button
                        onClick={() => hablar(p.texto)}
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
