"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { explorarElMundo, type Criterio, type DestinoSugerido } from "@/lib/exploracionMundial";

// Starters: not results, not suggested destinations — ways of ASKING.
// Someone arriving without a destination often doesn't know how to phrase
// it either, and an empty box is no help. Deliberately multi-part, because
// that is what this page is for: several wishes at once, not one.
const EJEMPLOS = [
  "Typical food, quiet, near old villages, with nature around",
  "Diving and coral reefs, somewhere warm",
  "Mountains to walk for days, and hot springs after",
  "Northern lights, dark skies, not crowded",
  "Wine, markets and small historic towns",
];

function Cobertura({ cumple, total }: { cumple: Criterio[]; total: number }) {
  const completo = cumple.length === total && total > 1;
  return (
    <div className="mt-2">
      {total > 1 && (
        <p className={`text-xs font-medium ${completo ? "text-emerald-700" : "text-neutral-500"}`}>
          {completo ? "✓ Covers everything you asked for" : `Covers ${cumple.length} of your ${total} wishes`}
        </p>
      )}
      {/* The reasons, not just the number: a score without them is a
          black box, and the traveller can't tell if it got them right. */}
      <div className="mt-1 flex flex-wrap gap-1">
        {cumple.map((c) => (
          <span key={c.id} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
            {c.etiqueta}
          </span>
        ))}
      </div>
    </div>
  );
}

function TarjetaDestino({ d, total }: { d: DestinoSugerido; total: number }) {
  return (
    <li className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* The article's own photo: it exists or it doesn't. Never a
          generic stock filler. */}
      {d.imagen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.imagen} alt={d.nombre} loading="lazy" className="h-36 w-full object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-medium text-neutral-900">{d.nombre}</h3>
          {/* Only when we actually know it. No country is better than a
              guessed one. */}
          {d.paisNombre && <span className="shrink-0 text-xs text-neutral-500">{d.paisNombre}</span>}
        </div>

        <Cobertura cumple={d.cumple} total={total} />

        <p className="mt-2 text-sm text-neutral-600">{d.resumen}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={`/planificar?destino=${encodeURIComponent(d.nombre)}`}
            className="rounded-lg bg-coral-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-coral-600"
          >
            Plan a trip here
          </Link>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-50"
          >
            📍 Map
          </a>
          {/* Where this came from, one click away. */}
          <a
            href={d.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-400 underline transition hover:text-neutral-600"
          >
            Full guide
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
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [mejorCobertura, setMejorCobertura] = useState(0);
  const abortar = useRef<AbortController | null>(null);

  async function explorar(consulta: string) {
    const limpio = consulta.trim();
    if (!limpio) return;
    setTexto(limpio);
    // An earlier search arriving late must not overwrite the new one.
    abortar.current?.abort();
    const control = new AbortController();
    abortar.current = control;

    setBuscando(true);
    try {
      const r = await explorarElMundo(limpio, control.signal);
      if (control.signal.aborted) return;
      setSugerencias(r.sugerencias);
      setCriterios(r.criterios);
      setMejorCobertura(r.mejorCobertura);
    } finally {
      if (!control.signal.aborted) setBuscando(false);
    }
  }

  const total = criterios.length;
  const nadieLoTieneTodo = total > 1 && mejorCobertura < total;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-6">
      <Link href="/" className="text-sm text-neutral-500 transition hover:text-neutral-800">
        ← Home
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-neutral-900">Explore the world</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Time off but no destination? Describe everything you want from the trip — the more you ask for, the better.
        We look for the places that tick the most boxes, not one place per wish.
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
          placeholder="e.g. somewhere quiet with great local food, small villages and nature nearby"
          className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-coral-400 focus:ring-2 focus:ring-coral-100"
        />
        <button
          type="submit"
          disabled={buscando || !texto.trim()}
          className="mt-2 w-full rounded-xl bg-coral-500 px-4 py-2.5 font-medium text-white transition hover:bg-coral-600 disabled:opacity-50"
        >
          {buscando ? "Searching the world…" : "Find places"}
        </button>
      </form>

      {sugerencias === null && !buscando && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">Or start from one of these</p>
          <div className="flex flex-col gap-2">
            {EJEMPLOS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => void explorar(e)}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left text-sm text-neutral-600 transition hover:border-coral-300 hover:text-neutral-900"
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
            // Zero results is an honest answer, not a broken screen: say
            // what was searched and how to narrow it down.
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-medium text-neutral-800">No places found for that.</p>
              <p className="mt-1 text-sm text-neutral-500">
                {criterios.length > 0
                  ? `We searched Wikivoyage for ${criterios.map((c) => `“${c.etiqueta}”`).join(", ")} and no destination came back.`
                  : "We couldn’t work out what kind of trip you’re after from that text."}{" "}
                Try naming the activity directly: “diving”, “hiking”, “hot springs”, “northern lights”.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-medium text-neutral-900">
                  {sugerencias.length} {sugerencias.length === 1 ? "place" : "places"}, best match first
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSugerencias(null);
                    setTexto("");
                  }}
                  className="text-xs text-neutral-400 underline transition hover:text-neutral-600"
                >
                  Start over
                </button>
              </div>

              {/* Said up front, not hidden: if nowhere covers everything,
                  presenting a partial match as the answer would be a lie
                  by omission. */}
              {nadieLoTieneTodo && (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Nowhere covers all {total} things you asked for. The best match covers {mejorCobertura} —
                  these are ranked by how much of your list they tick.
                </p>
              )}

              <ul className="grid gap-3 sm:grid-cols-2">
                {sugerencias.map((d) => (
                  <TarjetaDestino key={d.nombre} d={d} total={total} />
                ))}
              </ul>

              {/* Without this the list would read as our opinion. It is
                  Wikivoyage's, and saying so is part of the answer. */}
              <p className="mt-4 text-xs text-neutral-400">
                Places and text from Wikivoyage, the free travel guide (CC BY-SA). Searched for:{" "}
                {criterios.map((c) => c.etiqueta).join(", ")}.
              </p>
            </>
          )}
        </section>
      )}
    </main>
  );
}
