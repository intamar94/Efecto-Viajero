"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import {
  INTERESES_SUGERIDOS,
  detectarDestinoExplicito,
  evaluarCompatibilidad,
  interpretarTexto,
  type NecesidadesViaje,
} from "@/lib/explorador";
import { DESTINOS } from "@/lib/destinos";
import type { RitmoViaje } from "@/lib/types";

const EJEMPLOS = [
  "Quiero viajar 7 días con mi gato, naturaleza, pueblos tranquilos, máximo 1500 euros y sin conducir demasiado.",
  "Quiero ir a Italia 7 días, buena comida y pueblos bonitos.",
  "Somos dos adultos y una niña de 6 años. Queremos aventura, playa y actividades para ella.",
];

const RITMOS: { valor: RitmoViaje | ""; etiqueta: string }[] = [
  { valor: "", etiqueta: "Sin preferencia" },
  { valor: "tranquilo", etiqueta: "Tranquilo" },
  { valor: "medio", etiqueta: "Equilibrado" },
  { valor: "intenso", etiqueta: "Intenso" },
];

export default function PlanificarPage() {
  const [texto, setTexto] = useState("");
  const [necesidades, setNecesidades] = useState<NecesidadesViaje | null>(null);
  const [destinoDetectadoId, setDestinoDetectadoId] = useState<string | null>(null);
  const [nuevoInteres, setNuevoInteres] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);

  const destinoDetectado = destinoDetectadoId ? DESTINOS.find((d) => d.id === destinoDetectadoId) : undefined;

  const resultados = useMemo(() => {
    if (!necesidades) return [];
    return evaluarCompatibilidad(necesidades, destinoDetectado ? [destinoDetectado] : DESTINOS);
  }, [necesidades, destinoDetectado]);

  function descubrir(e?: React.FormEvent) {
    e?.preventDefault();
    if (!texto.trim()) return;
    setNecesidades(interpretarTexto(texto));
    setDestinoDetectadoId(detectarDestinoExplicito(texto)?.id ?? null);
    setAbierto(null);
  }

  function actualizar(cambios: Partial<NecesidadesViaje>) {
    setNecesidades((prev) => (prev ? { ...prev, ...cambios } : prev));
  }

  function quitarInteres(interes: string) {
    if (!necesidades) return;
    actualizar({ intereses: necesidades.intereses.filter((i) => i !== interes) });
  }

  function anadirInteres(interes: string) {
    if (!necesidades || !interes.trim()) return;
    const limpio = interes.trim().toLowerCase();
    if (necesidades.intereses.includes(limpio)) return;
    actualizar({ intereses: [...necesidades.intereses, limpio] });
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo="Planificar un viaje" subtitulo="Cuéntanos qué viaje tienes en mente." />

        <form onSubmit={descubrir} className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <textarea
            className="input min-h-28 resize-y"
            placeholder="Puedes escribirlo como quieras. No necesitas conocer el destino ni rellenar un formulario."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit" className="mt-3 w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
            Descubrir mi viaje
          </button>
        </form>

        <div className="mb-8 flex flex-wrap gap-2">
          {EJEMPLOS.map((ej) => (
            <button
              key={ej}
              onClick={() => setTexto(ej)}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500 hover:border-neutral-900 hover:text-neutral-900"
            >
              {ej.length > 46 ? `${ej.slice(0, 46)}…` : ej}
            </button>
          ))}
        </div>

        {necesidades && (
          <div className="mb-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
            <p className="mb-3 font-medium text-neutral-700">Esto entendimos — revisa y corrige si hace falta:</p>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 rounded-full bg-white border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700">
                Días
                <input
                  type="number"
                  min={1}
                  className="w-12 bg-transparent text-center outline-none"
                  value={necesidades.duracionDias ?? ""}
                  onChange={(e) => actualizar({ duracionDias: e.target.value ? Number.parseInt(e.target.value, 10) : undefined })}
                />
              </label>
              <label className="flex items-center gap-1.5 rounded-full bg-white border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700">
                Presupuesto máx.
                <input
                  type="number"
                  min={0}
                  className="w-16 bg-transparent text-center outline-none"
                  value={necesidades.presupuestoMax ?? ""}
                  onChange={(e) => actualizar({ presupuestoMax: e.target.value ? Number.parseFloat(e.target.value) : undefined })}
                />
                €
              </label>
              <select
                className="rounded-full bg-white border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700"
                value={necesidades.ritmo ?? ""}
                onChange={(e) => actualizar({ ritmo: (e.target.value || undefined) as RitmoViaje | undefined })}
              >
                {RITMOS.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.etiqueta}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 rounded-full bg-white border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700">
                <input type="checkbox" checked={necesidades.mascota} onChange={(e) => actualizar({ mascota: e.target.checked })} />
                🐾 mascota
              </label>
              <label className="flex items-center gap-1.5 rounded-full bg-white border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700">
                <input
                  type="checkbox"
                  checked={necesidades.sinConducirMucho}
                  onChange={(e) => actualizar({ sinConducirMucho: e.target.checked })}
                />
                sin conducir mucho
              </label>
            </div>

            <div className="mb-2 flex flex-wrap gap-2">
              {necesidades.intereses.map((interes) => (
                <span key={interes} className="flex items-center gap-1 rounded-full bg-white border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700">
                  {interes}
                  <button onClick={() => quitarInteres(interes)} className="text-neutral-400 hover:text-red-600" aria-label={`Quitar ${interes}`}>
                    ×
                  </button>
                </span>
              ))}
              <input
                className="w-28 rounded-full border border-dashed border-neutral-300 bg-white px-2.5 py-1 text-xs outline-none"
                placeholder="+ interés"
                value={nuevoInteres}
                onChange={(e) => setNuevoInteres(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    anadirInteres(nuevoInteres);
                    setNuevoInteres("");
                  }
                }}
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {INTERESES_SUGERIDOS.filter((i) => !necesidades.intereses.includes(i)).map((i) => (
                <button
                  key={i}
                  onClick={() => anadirInteres(i)}
                  className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-400 hover:border-neutral-900 hover:text-neutral-900"
                >
                  + {i}
                </button>
              ))}
            </div>
          </div>
        )}

        {destinoDetectado && (
          <p className="mb-3 text-sm text-neutral-500">
            Hemos detectado un destino en tu descripción: <span className="font-medium text-neutral-900">{destinoDetectado.nombre}</span>.{" "}
            <button onClick={() => setDestinoDetectadoId(null)} className="underline hover:text-neutral-900">
              Buscar otros destinos en su lugar
            </button>
          </p>
        )}

        {resultados.length > 0 && (
          <ul className="space-y-3">
            {resultados.slice(0, 6).map(({ destino, porcentaje, criterios }) => (
              <li key={destino.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{destino.nombre}</p>
                    <p className="text-sm text-neutral-500">{destino.descripcion}</p>
                  </div>
                  {!destinoDetectado && <span className="text-xl font-semibold tabular-nums">{porcentaje}%</span>}
                </div>

                {!destinoDetectado && (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-neutral-900" style={{ width: `${porcentaje}%` }} />
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => setAbierto(abierto === destino.id ? null : destino.id)}
                    className="text-sm text-neutral-500 hover:text-neutral-900"
                  >
                    {abierto === destino.id ? "Ocultar detalle" : destinoDetectado ? "Ver por qué encaja" : "¿Por qué este porcentaje?"}
                  </button>
                  <Link
                    href={`/viajes/nuevo?destinoId=${destino.id}${necesidades?.duracionDias ? `&duracion=${necesidades.duracionDias}` : ""}${
                      necesidades?.presupuestoMax ? `&presupuesto=${necesidades.presupuestoMax}` : ""
                    }`}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
                  >
                    {destinoDetectado ? "Continuar con este destino →" : "Crear viaje →"}
                  </Link>
                </div>

                {abierto === destino.id && (
                  <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-sm">
                    {criterios.map((c, i) => (
                      <li key={i} className={c.cumplido ? "text-emerald-700" : "text-neutral-400"}>
                        {c.cumplido ? "✓" : "✗"} {c.etiqueta}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
