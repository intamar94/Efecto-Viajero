"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { detectarDestinoExplicito, evaluarCompatibilidad, interpretarTexto, type NecesidadesViaje } from "@/lib/explorador";
import { DESTINOS } from "@/lib/destinos";
import type { Destino } from "@/lib/types";

const EJEMPLOS = [
  "Una semana con mi pareja, nuestra hija de 6 años y el gato. Naturaleza, pueblos tranquilos, máximo 1500 euros y sin conducir demasiado.",
  "Quiero ir a Italia una semana, buena comida y pueblos bonitos.",
  "Somos dos adultos y una niña de 6 años. Queremos aventura, playa y actividades para ella.",
];

function resumenLegible(n: NecesidadesViaje): string[] {
  const partes: string[] = [];
  if (n.duracionDias) partes.push(`${n.duracionDias} días`);
  if (n.presupuestoMax) partes.push(`hasta ${n.presupuestoMax}€`);
  if (n.numAdultos) partes.push(`${n.numAdultos} adultos`);
  for (const edad of n.edadesMenores) partes.push(`menor de ${edad} años`);
  if (n.mascota) partes.push("🐾 con mascota");
  if (n.ritmo) partes.push(`ritmo ${n.ritmo}`);
  if (n.sinConducirMucho) partes.push("sin conducir mucho");
  partes.push(...n.intereses);
  return partes;
}

export default function PlanificarPage() {
  const router = useRouter();
  const { crearViaje } = useData();
  const [texto, setTexto] = useState("");
  const [necesidades, setNecesidades] = useState<NecesidadesViaje | null>(null);
  const [destinoDetectadoId, setDestinoDetectadoId] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [creando, setCreando] = useState<string | null>(null);

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

  // El viaje se crea aquí mismo, sin pasar por un formulario aparte: sin
  // fechas exactas obligatorias (basta con la duración, si se conoce) y
  // sin exigir viajeros guardados de antemano. Lo que el texto ya reveló
  // sobre quién viaja (adultos, menores, mascota) se guarda en el
  // contexto para no volver a preguntarlo cuando se nombren de verdad.
  function crearViajeCon(destino: Destino) {
    if (!necesidades) return;
    setCreando(destino.id);
    const nuevo = crearViaje({
      destino: destino.nombre,
      destinoId: destino.id,
      viajerosIds: [],
      contexto: {
        presupuestoTotal: necesidades.presupuestoMax,
        duracionDias: necesidades.duracionDias,
        numAdultos: necesidades.numAdultos,
        edadesMenores: necesidades.edadesMenores.length > 0 ? necesidades.edadesMenores : undefined,
        mascota: necesidades.mascota || undefined,
      },
    });
    router.push(`/viajes/${nuevo.id}`);
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo="Planificar un viaje" subtitulo="Cuéntanos qué viaje tienes en mente." />

        <form onSubmit={descubrir} className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <textarea
            className="input min-h-28 resize-y"
            placeholder="Puedes escribirlo como quieras: quién viaja, cuándo, con qué presupuesto, si quieres algo tranquilo o de aventura. No necesitas conocer el destino ni rellenar un formulario."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit" className="mt-3 w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
            Descubrir mi viaje
          </button>
        </form>

        {!necesidades && (
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
        )}

        {necesidades && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-neutral-500">
            <span>Entendido:</span>
            {resumenLegible(necesidades).map((parte, i) => (
              <span key={i} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                {parte}
              </span>
            ))}
            {resumenLegible(necesidades).length === 0 && <span className="text-neutral-400">sin criterios específicos</span>}
          </div>
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
                  <button
                    onClick={() => crearViajeCon(destino)}
                    disabled={creando !== null}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {creando === destino.id ? "Creando…" : destinoDetectado ? "Continuar con este destino →" : "Crear viaje →"}
                  </button>
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
