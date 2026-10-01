"use client";

import { useEffect, useState } from "react";
import { articuloWiki, tituloParaSitio, type Articulo } from "@/lib/cercaDeMi";
import { hablar } from "@/lib/geoAudio";
import { IDIOMAS, narrar, TEMAS, type IdiomaId, type TemaId } from "@/lib/temasGuia";

export interface SitioTarjeta {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

// Tarjeta del sitio elegido en el radar: lo cuenta por el tema pedido
// (historia, leyendas, arquitectura…) y en el idioma elegido, con el texto
// real de su artículo de Wikipedia. Nunca habla sola.
export function TarjetaSitio({
  sitio,
  distanciaM,
  elegidoAMano,
  idioma,
  tema,
  textoRespaldo,
  onNarrado,
}: {
  sitio: SitioTarjeta;
  distanciaM: number;
  elegidoAMano: boolean;
  idioma: IdiomaId;
  tema: TemaId;
  textoRespaldo?: string;
  onNarrado: (id: string) => void;
}) {
  const [articulo, setArticulo] = useState<Articulo | null | "cargando">("cargando");

  useEffect(() => {
    let cancelado = false;
    setArticulo("cargando");
    (async () => {
      const titulo = sitio.id.startsWith("wiki:") ? sitio.nombre : await tituloParaSitio(sitio.nombre, sitio.lat, sitio.lon, idioma);
      const a = titulo ? await articuloWiki(titulo, idioma) : null;
      if (!cancelado) setArticulo(a);
    })();
    return () => {
      cancelado = true;
    };
  }, [sitio.id, sitio.nombre, sitio.lat, sitio.lon, idioma]);

  const voz = IDIOMAS.find((i) => i.id === idioma)?.voz ?? "en-US";
  const a = articulo === "cargando" ? null : articulo;
  const narracion = a ? narrar(a, tema, idioma) : null;
  const temaUsado = TEMAS.find((t) => t.id === (narracion?.usado ?? tema));
  const texto = narracion?.texto ?? textoRespaldo ?? sitio.nombre;

  return (
    <div className="mt-3 rounded-xl border-2 border-marino-500 bg-marino-50 p-3">
      <p className="text-sm font-medium text-marino-900">
        {elegidoAMano ? "📍" : "🎯"} {sitio.nombre}
        <span className="ml-1 text-xs font-normal text-marino-700">· {Math.round(distanciaM)} m</span>
      </p>
      {articulo === "cargando" ? (
        <p className="mt-1 text-xs text-marino-700">Reading about this place…</p>
      ) : narracion ? (
        <>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-marino-600">
            {temaUsado?.icono} {temaUsado?.etiqueta}
          </p>
          {narracion.aviso && <p className="mt-0.5 text-[11px] italic text-marino-600">{narracion.aviso}</p>}
          <p className="mt-1 line-clamp-6 text-xs text-marino-800">{narracion.texto}</p>
        </>
      ) : (
        <p className="mt-1 text-xs text-marino-700">No Wikipedia article for this place in {IDIOMAS.find((i) => i.id === idioma)?.nombre}.{textoRespaldo ? " Here is what we know:" : ""}</p>
      )}
      {!narracion && textoRespaldo && articulo !== "cargando" && <p className="mt-1 line-clamp-4 text-xs text-marino-800">{textoRespaldo}</p>}
      {articulo !== "cargando" && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              hablar(texto, voz);
              onNarrado(sitio.id);
            }}
            className="btn-primary flex-1 text-sm"
          >
            🔊 Listen
          </button>
          {a && (
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 text-center text-sm">
              📖 Wikipedia
            </a>
          )}
        </div>
      )}
    </div>
  );
}
