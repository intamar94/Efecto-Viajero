"use client";

import { useState } from "react";
import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { evaluarCompatibilidad, interpretarTexto, type DestinoCompatible, type NecesidadesViaje } from "@/lib/explorador";

const EJEMPLOS = [
  "Quiero viajar 7 días con mi gato, naturaleza, pueblos tranquilos, máximo 1500 euros y sin conducir demasiado.",
  "Somos dos adultos y una niña de 6 años. Queremos aventura, playa y actividades para ella.",
  "Quiero un viaje romántico de cinco días, buena comida, pueblos bonitos y algún sitio donde podamos bañarnos.",
];

export default function ExplorarPage() {
  const [texto, setTexto] = useState("");
  const [necesidades, setNecesidades] = useState<NecesidadesViaje | null>(null);
  const [resultados, setResultados] = useState<DestinoCompatible[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);

  function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!texto.trim()) return;
    const n = interpretarTexto(texto);
    setNecesidades(n);
    setResultados(evaluarCompatibilidad(n));
    setAbierto(null);
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo="Explorar un viaje" subtitulo="No hace falta saber el destino. Cuéntanos cómo quieres viajar." />

        <form onSubmit={buscar} className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <textarea
            className="input min-h-28 resize-y"
            placeholder="Ej: quiero viajar 7 días con mi gato, naturaleza, pueblos tranquilos, máximo 1500€ y sin conducir demasiado."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit" className="mt-3 w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
            Buscar destinos compatibles
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
            <p className="mb-2 font-medium text-neutral-700">Hemos entendido esto:</p>
            <div className="flex flex-wrap gap-2">
              {necesidades.duracionDias && <Chip>{necesidades.duracionDias} días</Chip>}
              {necesidades.presupuestoMax && <Chip>hasta {necesidades.presupuestoMax}€</Chip>}
              {necesidades.numAdultos && <Chip>{necesidades.numAdultos} adultos</Chip>}
              {necesidades.edadesMenores.map((edad, i) => (
                <Chip key={i}>menor de {edad} años</Chip>
              ))}
              {necesidades.mascota && <Chip>🐾 viaja con mascota</Chip>}
              {necesidades.ritmo && <Chip>ritmo {necesidades.ritmo}</Chip>}
              {necesidades.sinConducirMucho && <Chip>sin conducir mucho</Chip>}
              {necesidades.intereses.map((i) => (
                <Chip key={i}>{i}</Chip>
              ))}
              {necesidades.intereses.length === 0 &&
                !necesidades.duracionDias &&
                !necesidades.presupuestoMax &&
                !necesidades.mascota && <span className="text-neutral-400">No se detectaron criterios específicos; prueba a ser más concreto.</span>}
            </div>
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
                  <span className="text-xl font-semibold tabular-nums">{porcentaje}%</span>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-neutral-900" style={{ width: `${porcentaje}%` }} />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => setAbierto(abierto === destino.id ? null : destino.id)}
                    className="text-sm text-neutral-500 hover:text-neutral-900"
                  >
                    {abierto === destino.id ? "Ocultar por qué" : "¿Por qué este porcentaje?"}
                  </button>
                  <Link
                    href={`/viajes/nuevo?destinoId=${destino.id}${necesidades?.duracionDias ? `&duracion=${necesidades.duracionDias}` : ""}`}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
                  >
                    Crear viaje →
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

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white px-2.5 py-1 text-xs text-neutral-700 border border-neutral-200">{children}</span>;
}
