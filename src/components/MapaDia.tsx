"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { PuntoGeo } from "@/lib/puntosGeo";
import { crearCapaTilesConCache, descargarMapaDelDia, haySoporteMapaOffline, type ProgresoDescarga } from "@/lib/mapaOffline";

interface Props {
  puntos: PuntoGeo[]; // en el orden en que se visitan ese día
}

interface TramoRuta {
  distanciaM: number;
  duracionS: number;
}

// Mapa real del día: OpenStreetMap (Leaflet, sin clave) para los
// marcadores y OSRM (router público, sin clave) para la ruta a pie entre
// paradas. El router demo de OSRM no está pensado para tráfico alto: si
// falla, el mapa se queda igualmente útil con los marcadores y sin ruta.
export function MapaDia({ puntos }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapaInstancia = useRef<any>(null);
  const [tramos, setTramos] = useState<TramoRuta[] | null>(null);
  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);
  const [descargandoMapa, setDescargandoMapa] = useState(false);
  const [progresoMapa, setProgresoMapa] = useState<ProgresoDescarga | null>(null);
  const [mapaDescargado, setMapaDescargado] = useState(false);
  // false en el primer render (servidor y cliente coinciden) y solo se
  // activa después, en el navegador: si se llamara a
  // haySoporteMapaOffline() directo en el render, el servidor (sin
  // `window`) y el cliente pintarían HTML distinto y React lo marcaría
  // como error de hidratación.
  const [soporteOffline, setSoporteOffline] = useState(false);
  useEffect(() => {
    setSoporteOffline(haySoporteMapaOffline());
  }, []);

  useEffect(() => {
    if (!mapRef.current || puntos.length === 0) return;
    let cancelado = false;
    setTramos(null);
    setErrorRuta(null);

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !mapRef.current) return;

      if (!mapaInstancia.current) {
        mapaInstancia.current = L.map(mapRef.current);
        const capaTiles = await crearCapaTilesConCache(L);
        capaTiles.addTo(mapaInstancia.current);
      }
      const mapa = mapaInstancia.current;

      mapa.eachLayer((layer: L.Layer) => {
        if (!(layer instanceof L.TileLayer)) mapa.removeLayer(layer);
      });

      const bounds = L.latLngBounds(puntos.map((p) => [p.lat, p.lon]));
      puntos.forEach((p, i) => {
        L.marker([p.lat, p.lon], {
          icon: L.divIcon({
            className: "",
            html: `<div style="background:#1e3a5f;color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.35)">${i + 1}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
        })
          .addTo(mapa)
          .bindPopup(`${i + 1}. ${p.nombre}`);
      });
      mapa.fitBounds(bounds, { padding: [30, 30] });

      if (puntos.length < 2) return;

      setCargandoRuta(true);
      try {
        const coords = puntos.map((p) => `${p.lon},${p.lat}`).join(";");
        const res = await fetch(`https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (cancelado) return;
        const ruta = data?.routes?.[0];
        if (ruta?.geometry?.coordinates) {
          const latlngs = ruta.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]);
          L.polyline(latlngs, { color: "#e0632b", weight: 4, opacity: 0.85 }).addTo(mapa);
          const legs = (ruta.legs ?? []) as { distance: number; duration: number }[];
          setTramos(legs.map((l) => ({ distanciaM: l.distance, duracionS: l.duration })));
        } else {
          setErrorRuta("We couldn't work out a walking route between these stops.");
        }
      } catch {
        if (!cancelado) setErrorRuta("We couldn't work out the walking route right now.");
      } finally {
        if (!cancelado) setCargandoRuta(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [puntos]);

  useEffect(() => {
    return () => {
      mapaInstancia.current?.remove();
      mapaInstancia.current = null;
    };
  }, []);

  if (puntos.length === 0) {
    return <p className="text-sm text-neutral-400">No activity on this day has an exact location yet.</p>;
  }

  const distanciaTotal = tramos?.reduce((a, t) => a + t.distanciaM, 0) ?? null;
  const duracionTotal = tramos?.reduce((a, t) => a + t.duracionS, 0) ?? null;

  async function descargarParaOffline() {
    setDescargandoMapa(true);
    setProgresoMapa(null);
    try {
      await descargarMapaDelDia(puntos, setProgresoMapa);
      setMapaDescargado(true);
    } finally {
      setDescargandoMapa(false);
    }
  }

  return (
    <div>
      <div ref={mapRef} className="h-64 w-full overflow-hidden rounded-xl border border-neutral-200" />

      {soporteOffline && (
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={descargarParaOffline}
            disabled={descargandoMapa}
            className="rounded-lg border border-marino-200 bg-marino-50 px-2.5 py-1.5 text-xs font-medium text-marino-700 hover:bg-marino-100 disabled:opacity-60"
          >
            {descargandoMapa
              ? `📥 Downloading… ${progresoMapa ? `${progresoMapa.hechos}/${progresoMapa.total}` : ""}`
              : mapaDescargado
                ? "✅ Saved for offline use"
                : "📥 Save this map for offline use"}
          </button>
          <span className="text-[11px] text-neutral-400">Do this before you lose signal — works without internet after.</span>
        </div>
      )}

      {cargandoRuta && <p className="mt-2 text-xs text-neutral-400">Calculando ruta a pie…</p>}
      {errorRuta && <p className="mt-2 text-xs text-neutral-400">{errorRuta}</p>}
      {distanciaTotal !== null && duracionTotal !== null && (
        <p className="mt-2 text-sm text-neutral-700">
          🚶 {(distanciaTotal / 1000).toFixed(1)} km en total · ~{Math.round(duracionTotal / 60)} min caminando
        </p>
      )}
      <p className="mt-1 text-xs text-neutral-400">Indicative route (OpenStreetMap + OSRM): check it against your own GPS as you walk.</p>
    </div>
  );
}
