"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { PuntoGeo } from "@/lib/puntosGeo";

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
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapaInstancia.current);
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
          setErrorRuta("No se pudo calcular la ruta a pie entre estas paradas.");
        }
      } catch {
        if (!cancelado) setErrorRuta("No se pudo calcular la ruta a pie ahora mismo.");
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
    return <p className="text-sm text-neutral-400">Ninguna actividad de este día tiene ubicación exacta todavía.</p>;
  }

  const distanciaTotal = tramos?.reduce((a, t) => a + t.distanciaM, 0) ?? null;
  const duracionTotal = tramos?.reduce((a, t) => a + t.duracionS, 0) ?? null;

  return (
    <div>
      <div ref={mapRef} className="h-64 w-full overflow-hidden rounded-xl border border-neutral-200" />
      {cargandoRuta && <p className="mt-2 text-xs text-neutral-400">Calculando ruta a pie…</p>}
      {errorRuta && <p className="mt-2 text-xs text-neutral-400">{errorRuta}</p>}
      {distanciaTotal !== null && duracionTotal !== null && (
        <p className="mt-2 text-sm text-neutral-700">
          🚶 {(distanciaTotal / 1000).toFixed(1)} km en total · ~{Math.round(duracionTotal / 60)} min caminando
        </p>
      )}
      <p className="mt-1 text-xs text-neutral-400">Ruta orientativa (OpenStreetMap + OSRM): confírmala con tu propio GPS al caminar.</p>
    </div>
  );
}
