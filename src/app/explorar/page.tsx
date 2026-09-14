"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { explorarElMundo, type DestinoSugerido } from "@/lib/exploracionMundial";

// Ejemplos para arrancar: no son resultados ni destinos sugeridos, son
// FORMAS DE PEDIR. Alguien que llega sin destino tampoco sabe cómo
// contarlo, y una caja de texto vacía no ayuda a empezar.
const EJEMPLOS = [
  "Quiero bucear y ver arrecifes de coral",
  "Un sitio con montañas para caminar días enteros",
  "Ver auroras boreales",
  "Pueblos con buen vino y comida",
  "Playa tranquila, sin multitudes",
  "Una ciudad con mucha vida nocturna",
];

function TarjetaDestino({ d }: { d: DestinoSugerido }) {
  // El texto que la persona escribió viaja con ella a /planificar: es su
  // viaje, no hace falta que lo cuente dos veces.
  const destino = encodeURIComponent(d.nombre);

  return (
    <li className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* La foto es la del propio artículo de Wikivoyage: existe o no
          existe, nunca se pone una genérica de relleno. */}
      {d.imagen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.imagen} alt={d.nombre} loading="lazy" className="h-36 w-full object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-medium text-neutral-900">{d.nombre}</h3>
          {/* Solo si de verdad sabemos el país. Sin dato, no se dice. */}
          {d.paisNombre && <span className="shrink-0 text-xs text-neutral-500">{d.paisNombre}</span>}
        </div>
        <p className="mt-1.5 text-sm text-neutral-600">{d.resumen}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={`/planificar?destino=${destino}`}
            className="rounded-lg bg-coral-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-coral-600"
          >
            Planificar aquí
          </Link>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-50"
          >
            📍 Ver en el mapa
          </a>
          {/* De dónde salió esto, a un clic: lo que se lee arriba es de
              Wikivoyage, y quien quiera comprobarlo o leer más, puede. */}
          <a
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-400 underline transition hover:text-neutral-600"
          >
            Guía completa{d.idioma === "en" ? " (en inglés)" : ""}
          </a>
        </div>
      </div>
    </li>
  );
}

export default function ExplorarPage() {
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [sugerencias, setSugerencias] = useState<DestinoSugerido[] | null>(null);
  const [consultas, setConsultas] = useState<string[]>([]);
  const abortar = useRef<AbortController | null>(null);

  async function explorar(consulta: string) {
    const limpio = consulta.trim();
    if (!limpio) return;
    setTexto(limpio);
    // Una búsqueda anterior que llegue tarde no puede pisar a la nueva.
    abortar.current?.abort();
    const control = new AbortController();
    abortar.current = control;

    setBuscando(true);
    try {
      const { sugerencias: encontradas, consultas: usadas } = await explorarElMundo(limpio, control.signal);
      if (control.signal.aborted) return;
      setSugerencias(encontradas);
      setConsultas(usadas);
    } finally {
      if (!control.signal.aborted) setBuscando(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-6">
      <Link href="/" className="text-sm text-neutral-500 transition hover:text-neutral-800">
        ← Inicio
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-neutral-900">Explorar el mundo</h1>
      <p className="mt-1 text-sm text-neutral-500">
        ¿Tienes tiempo pero no destino? Cuenta qué te apetece hacer y te decimos en qué lugares del mundo se hace.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void explorar(texto);
        }}
        className="mt-5"
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder="Ej.: quiero bucear, ver fauna y que no sea caro"
          className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-coral-400 focus:ring-2 focus:ring-coral-100"
        />
        <button
          type="submit"
          disabled={buscando || !texto.trim()}
          className="mt-2 w-full rounded-xl bg-coral-500 px-4 py-2.5 font-medium text-white transition hover:bg-coral-600 disabled:opacity-50"
        >
          {buscando ? "Buscando por el mundo…" : "Buscar lugares"}
        </button>
      </form>

      {sugerencias === null && !buscando && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">O empieza por aquí</p>
          <div className="flex flex-wrap gap-2">
            {EJEMPLOS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => void explorar(e)}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 transition hover:border-coral-300 hover:text-neutral-900"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {sugerencias !== null && !buscando && (
        <section className="mt-7">
          {sugerencias.length === 0 ? (
            // Cero resultados es una respuesta honesta, no una pantalla
            // rota: se dice qué se buscó y cómo puede afinarlo.
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-medium text-neutral-800">No encontramos lugares para eso.</p>
              <p className="mt-1 text-sm text-neutral-500">
                {consultas.length > 0
                  ? `Buscamos «${consultas.join("», «")}» en la guía de viajes Wikivoyage y no salió ningún destino con eso.`
                  : "No conseguimos sacar de tu texto qué tipo de plan buscas."}{" "}
                Prueba a nombrar la actividad directamente: «buceo», «senderismo», «termales», «auroras».
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-medium text-neutral-900">
                  {sugerencias.length} {sugerencias.length === 1 ? "lugar" : "lugares"} para eso
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSugerencias(null);
                    setTexto("");
                  }}
                  className="text-xs text-neutral-400 underline transition hover:text-neutral-600"
                >
                  Empezar de nuevo
                </button>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {sugerencias.map((d) => (
                  <TarjetaDestino key={`${d.idioma}-${d.nombre}`} d={d} />
                ))}
              </ul>
              {/* Sin esto, la lista parecería nuestra opinión. Es de
                  Wikivoyage, y decirlo es parte de la respuesta. */}
              <p className="mt-4 text-xs text-neutral-400">
                Lugares y textos de Wikivoyage, la guía de viajes libre (CC BY-SA). Se buscó: «{consultas.join("», «")}».
              </p>
            </>
          )}
        </section>
      )}
    </main>
  );
}
