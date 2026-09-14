"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { urlBuscarConsulado, urlMapsCercaDeMi, urlMapsConsulado } from "@/lib/emergencias";
import { paisesDelViaje } from "@/lib/viaje";
import { buscarPaisPorCodigo } from "@/lib/paises";

const PROBLEMAS = [
  {
    id: "pasaporte",
    icono: "🛂",
    titulo: "I lost my passport or ID",
    pasos: [
      "Report the loss or theft to the local police and keep a copy of the report.",
      "Contact your embassy or consulate for an emergency travel document (link above).",
      "Check whether your travel insurance covers the paperwork or related costs.",
    ],
    buscarCerca: { etiqueta: "🚓 Police station near me", consulta: "police station" },
  },
  {
    id: "vuelo",
    icono: "✈️",
    titulo: "Cancelaron mi vuelo",
    pasos: [
      "Ask the airline for the reason in writing and your rebooking or refund options.",
      "Within the EU, check whether compensation applies given the reason and the notice given.",
      "Look for alternatives (another flight, train, bus) while you wait for an answer.",
      "Keep every receipt in case you need to claim later.",
    ],
  },
  {
    id: "transporte",
    icono: "🚆",
    titulo: "I missed my train or bus",
    pasos: [
      "Go to the desk or the operator's app: the next service may be free of charge.",
      "If this leg connects to another booking, consider alternative transport.",
      "Let your accommodation know if check-in will be late.",
    ],
  },
  {
    id: "robo",
    icono: "🚨",
    titulo: "Me robaron algo",
    pasos: [
      "Report it at the nearest police station and ask for a copy.",
      "Block your cards if your wallet was stolen.",
      "Contact your travel insurer if you have theft cover.",
      "If your passport was stolen, follow the steps in that section too.",
    ],
    buscarCerca: { etiqueta: "🚓 Police station near me", consulta: "police station" },
  },
  {
    id: "alojamiento",
    icono: "🏨",
    titulo: "Problem with the accommodation",
    pasos: [
      "Talk to the owner or reception first to sort it out on the spot.",
      "If you booked through a platform, contact their 24h customer support.",
      "Document the problem with photos before you complain.",
    ],
  },
  {
    id: "mascota",
    icono: "🐾",
    titulo: "My pet needs a vet",
    pasos: [
      "Busca \"veterinario de urgencias\" in the city you're in.",
      "Bring your pet's veterinary paperwork (their record is in Travellers).",
      "Contact your insurer if your pet is covered.",
    ],
    buscarCerca: { etiqueta: "🐾 Vet near me", consulta: "veterinario de urgencias" },
  },
  {
    id: "medico",
    icono: "⚕️",
    titulo: "I need a doctor",
    pasos: [
      "Within the EU, the European Health Insurance Card gives access to public care if you have one.",
      "Outside the EU, check your travel insurance and its assistance phone number.",
      "For a serious emergency, use the emergency number above.",
    ],
    buscarCerca: { etiqueta: "🏥 Hospital or clinic near me", consulta: "hospital or emergency clinic" },
  },
];

export default function ResolverPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, viajeros } = useData();
  const viaje = obtenerViaje(params.id);
  const [abierto, setAbierto] = useState<string | null>(null);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Trip not found" volverA="/viajes" />
        </div>
      </main>
    );
  }

  // Por país y no por destino curado: en un circuito hacen falta los
  // números de cada país que se atraviesa, no los del primero.
  const paises = paisesDelViaje(viaje);

  // El consulado que sirve a cada viajero depende de SU nacionalidad, no
  // del destino: se usa la que ya está registrada en Viajeros para que la
  // búsqueda sea la correcta desde el primer clic.
  const codigoNacionalidad = viajeros
    .filter((v) => viaje.viajerosIds.includes(v.id) && v.tipo === "persona")
    .map((v) => (v.tipo === "persona" ? v.nacionalidad : undefined))
    .find(Boolean);
  // En Viajeros la nacionalidad se guarda como código ISO ("CO"), pero el
  // destino es un nombre ("Colombia"): mezclarlos daba textos como
  // "Consulado de CO en Colombia". Se muestra siempre el nombre real.
  const nacionalidad = buscarPaisPorCodigo(codigoNacionalidad)?.nombre ?? codigoNacionalidad;
  const paisDestino = paises[0]?.nombre ?? viaje.destino;
  // Viajando dentro de tu propio país no hay consulado que te atienda:
  // ofrecer "Consulado de Colombia en Colombia" no es un dato, es un error.
  const viajaASuPropioPais = Boolean(nacionalidad) && nacionalidad === paisDestino;

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera
          titulo="Necesito ayuda"
          subtitulo="These are guidance steps. In a real emergency, call the emergency number first."
          volverA={`/viajes/${viaje.id}`}
        />

        {paises.length === 0 ? (
          <section className="mb-6 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-red-700">Emergencias</p>
            <p className="text-sm text-red-800">
              Aún no sabemos en qué país está tu destino, así que no podemos darte el número correcto. Dínoslo en{" "}
              <strong>Ruta</strong> and it will show up here. Meanwhile: across the EU the single number is <strong>112</strong>;
              en casi toda América, <strong>911</strong>. Confírmalo al llegar.
            </p>
          </section>
        ) : (
          paises.map((pais) => (
            <section key={pais.codigo} className="mb-4 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-red-700">Emergencias en {pais.nombre}</p>
              {pais.emergencias ? (
                <>
                  <p className="text-xl font-semibold text-red-900">{pais.emergencias}</p>
                  {pais.telefonoTurista && (
                    <p className="mt-1 text-sm text-red-800">
                      <span className="font-medium">Tourist helpline:</span> {pais.telefonoTurista}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-red-800">
                  No tenemos número verificado de este país y preferimos no inventarlo: confírmalo nada más llegar, en el
                  aeropuerto o en tu alojamiento.
                </p>
              )}
            </section>
          ))
        )}

        <section className="card mb-6">
          <h2 className="mb-3 font-medium">Authorities and consulate</h2>
          <ul className="space-y-2 text-sm">
            {paises
              .filter((p) => p.autoridad)
              .map((pais) => (
                <li key={pais.codigo}>
                  <a
                    href={pais.autoridad!.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 transition hover:border-marino-500 hover:bg-marino-50"
                  >
                    <span>
                      <span className="block font-medium text-neutral-900">🏛️ {pais.autoridad!.nombre}</span>
                      <span className="block text-xs text-neutral-500">Official site: reports, police stations and alerts.</span>
                    </span>
                    <span className="text-neutral-300">↗</span>
                  </a>
                </li>
              ))}
            {viajaASuPropioPais ? (
              <li className="rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-600">
                🛂 Viajas dentro de {paisDestino}, tu propio país: no necesitas consulado. Si pierdes la
                documentación, acude a la autoridad local de arriba.
              </li>
            ) : (
            <li className="rounded-xl border border-neutral-200 px-4 py-3">
              <span className="block font-medium text-neutral-900">
                🛂 {nacionalidad ? `${nacionalidad} consulate in ${paisDestino}` : `Your consulate in ${paisDestino}`}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {nacionalidad
                  ? "Choose where to look: the map usually has the phone number and address directly."
                  : "Add the nationality under Travellers and the search will go straight there."}
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={urlMapsConsulado(paisDestino, nacionalidad)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-marino-600 px-3 py-2 text-xs font-medium text-white hover:bg-marino-700"
                >
                  📍 View on the map (teléfono y dirección) ↗
                </a>
                <a
                  href={urlBuscarConsulado(paisDestino, nacionalidad)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:border-marino-500"
                >
                  🔎 Find the official site ↗
                </a>
              </div>
            </li>
            )}
          </ul>
          <p className="mt-3 text-xs text-neutral-400">
            We don't store consulate phone numbers or emails: they change often, and giving an out-of-date one in
            an emergency is worse than giving none. The links take you to the current official search.
          </p>
        </section>

        <h2 className="mb-2 font-medium">What's happened?</h2>
        <ul className="space-y-2">
          {PROBLEMAS.map((p) => (
            <li key={p.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <button onClick={() => setAbierto(abierto === p.id ? null : p.id)} className="flex w-full items-center justify-between gap-3 text-left">
                <span className="font-medium">
                  {p.icono} {p.titulo}
                </span>
                <span className="text-neutral-400">{abierto === p.id ? "−" : "+"}</span>
              </button>
              {abierto === p.id && (
                <>
                  <ol className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
                    {p.pasos.map((paso, i) => (
                      <li key={i}>
                        {i + 1}. {paso}
                      </li>
                    ))}
                  </ol>
                  {"buscarCerca" in p && p.buscarCerca && (
                    <a
                      href={urlMapsCercaDeMi(p.buscarCerca.consulta)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                    >
                      {p.buscarCerca.etiqueta} ↗
                    </a>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
