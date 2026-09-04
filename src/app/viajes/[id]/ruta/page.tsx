"use client";

import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { crucesDe, esCircuito, etapasDe, paisDeEtapa } from "@/lib/viaje";
import { ETIQUETA_BLOQUE, REGLA_BLOQUE } from "@/lib/paises";

export default function RutaPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje } = useData();
  const viaje = obtenerViaje(params.id);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  const etapas = etapasDe(viaje);
  const cruces = crucesDe(viaje);
  const circuito = esCircuito(viaje);

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <Cabecera
          titulo={circuito ? "Tu ruta" : "Tu destino"}
          subtitulo={circuito ? "Paradas en orden, con lo que cambia en cada frontera." : "Lo básico del sitio, en una sola hoja."}
          volverA={`/viajes/${viaje.id}`}
        />
        <ViajeToolsNav viajeId={viaje.id} />

        {/* Esto es la hoja de papel que antes había que armar a mano en
            foros y llevar encima: se imprime tal cual y funciona sin
            batería ni cobertura. */}
        <div className="no-imprimir mb-5 flex flex-wrap gap-2">
          <button onClick={() => window.print()} className="btn-primary text-xs">
            🖨️ Imprimir o guardar en PDF
          </button>
          <span className="self-center text-xs text-neutral-400">Funciona sin batería ni cobertura.</span>
        </div>

        <ol className="space-y-3">
          {etapas.map((etapa, i) => {
            const pais = paisDeEtapa(etapa);
            const cruce = cruces[i];
            return (
              <li key={etapa.id}>
                <section className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-900">
                        {circuito && <span className="mr-1.5 text-marino-600">{i + 1}.</span>}
                        {etapa.nombre}
                      </p>
                      {/* Si la parada ES el país, repetirlo debajo sobra. */}
                      {pais?.nombre !== etapa.nombre && (
                        <p className="text-sm text-neutral-500">{pais ? pais.nombre : "País sin definir"}</p>
                      )}
                    </div>
                    {etapa.dias !== undefined && <span className="chip shrink-0">{etapa.dias} días</span>}
                  </div>

                  {pais ? (
                    <dl className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-sm">
                      {pais.moneda && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-neutral-400">Moneda</dt>
                          <dd className="text-neutral-700">{pais.moneda}</dd>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-neutral-400">Emergencias</dt>
                        <dd className={pais.emergencias ? "font-medium text-red-700" : "text-neutral-500"}>
                          {pais.emergencias ?? "sin dato verificado — confírmalo al llegar"}
                        </dd>
                      </div>
                      {pais.telefonoTurista && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-neutral-400">Turista</dt>
                          <dd className="text-neutral-700">{pais.telefonoTurista}</dd>
                        </div>
                      )}
                      {pais.transporteLocal && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-neutral-400">Moverse</dt>
                          <dd className="text-neutral-700">{pais.transporteLocal.medios.join(" · ")}</dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="mt-3 border-t border-neutral-100 pt-3 text-sm text-neutral-500">
                      Sin país asignado no podemos darte moneda, emergencias ni transporte local de esta parada.
                    </p>
                  )}
                </section>

                {cruce && (
                  <div className="my-2 ml-4 border-l-2 border-dashed border-neutral-300 pl-4">
                    {cruce.mismoPais ? (
                      <p className="py-2 text-xs text-neutral-500">
                        ↓ Mismo país: no hay frontera entre {cruce.desde.nombre} y {cruce.hacia.nombre}.
                      </p>
                    ) : (
                      <div className="my-1 rounded-xl border border-coral-200 bg-coral-50 p-3 text-xs">
                        <p className="font-medium text-coral-800">
                          🛂 Frontera: {cruce.paisDesde?.nombre ?? cruce.desde.nombre} → {cruce.paisHacia?.nombre ?? cruce.hacia.nombre}
                        </p>

                        {cruce.bloques.length > 0 ? (
                          cruce.bloques.map((b) => (
                            <p key={b} className="mt-1.5 text-neutral-700">
                              <span className="font-medium">{ETIQUETA_BLOQUE[b]}:</span> {REGLA_BLOQUE[b]}
                            </p>
                          ))
                        ) : (
                          <p className="mt-1.5 text-neutral-700">
                            No comparten acuerdo regional en nuestros datos: cuenta con pasaporte y comprueba si tu
                            nacionalidad necesita visado, billete de salida o vacunas obligatorias.
                          </p>
                        )}

                        {cruce.cambiaMoneda && (
                          <p className="mt-1.5 text-neutral-700">
                            <span className="font-medium">💱 Cambia la moneda:</span> {cruce.paisDesde?.moneda} → {cruce.paisHacia?.moneda}.
                            Gasta o cambia lo que te sobre antes de cruzar; en la frontera el cambio suele ser peor.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <p className="mt-6 text-xs text-neutral-400">
          Las reglas de frontera son orientativas y dependen de tu nacionalidad, no del viaje: los acuerdos regionales
          citados aplican a ciudadanos de los países miembros. Confirma siempre en la fuente oficial (consulado o
          migración del país de destino) antes de viajar, sobre todo si cambias de nacionalidad de pasaporte o llevas
          mascota.
        </p>
      </div>
    </main>
  );
}
