"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { urlBuscarConsulado, urlMapsCercaDeMi, urlMapsConsulado } from "@/lib/emergencias";
import { paisesDelViaje } from "@/lib/viaje";

const PROBLEMAS = [
  {
    id: "pasaporte",
    icono: "🛂",
    titulo: "Perdí el pasaporte o el DNI",
    pasos: [
      "Denuncia la pérdida o robo en la policía local y guarda la copia de la denuncia.",
      "Contacta con tu embajada o consulado para un documento de viaje de emergencia (enlace arriba).",
      "Revisa si tu seguro de viaje cubre gestiones o gastos asociados.",
    ],
    buscarCerca: { etiqueta: "🚓 Comisaría cerca de mí", consulta: "comisaría de policía" },
  },
  {
    id: "vuelo",
    icono: "✈️",
    titulo: "Cancelaron mi vuelo",
    pasos: [
      "Pide a la aerolínea el motivo por escrito y las opciones de reubicación o reembolso.",
      "Dentro de la UE, comprueba si aplica compensación según el motivo y el aviso previo.",
      "Busca alternativas (otro vuelo, tren, autobús) mientras esperas respuesta.",
      "Guarda todos los justificantes por si necesitas reclamar después.",
    ],
  },
  {
    id: "transporte",
    icono: "🚆",
    titulo: "Perdí el tren o el autobús",
    pasos: [
      "Acude al mostrador o a la app del operador: puede haber el siguiente servicio sin coste extra.",
      "Si el trayecto conecta con otra reserva, valora un transporte alternativo.",
      "Avisa a tu alojamiento si el check-in se va a retrasar.",
    ],
  },
  {
    id: "robo",
    icono: "🚨",
    titulo: "Me robaron algo",
    pasos: [
      "Denuncia en la comisaría más cercana y pide una copia.",
      "Bloquea tus tarjetas si te robaron la cartera.",
      "Contacta con tu seguro de viaje si tienes cobertura de robo.",
      "Si te robaron el pasaporte, sigue también los pasos de esa sección.",
    ],
    buscarCerca: { etiqueta: "🚓 Comisaría cerca de mí", consulta: "comisaría de policía" },
  },
  {
    id: "alojamiento",
    icono: "🏨",
    titulo: "Problema con el alojamiento",
    pasos: [
      "Habla primero con el propietario o la recepción para resolverlo in situ.",
      "Si reservaste por una plataforma, contacta con su atención al cliente 24h.",
      "Documenta el problema con fotos antes de reclamar.",
    ],
  },
  {
    id: "mascota",
    icono: "🐾",
    titulo: "Mi mascota necesita un veterinario",
    pasos: [
      "Busca \"veterinario de urgencias\" en la ciudad donde estás.",
      "Lleva la documentación veterinaria de tu mascota (ficha en Viajeros).",
      "Contacta con tu seguro si cubre a la mascota.",
    ],
    buscarCerca: { etiqueta: "🐾 Veterinario cerca de mí", consulta: "veterinario de urgencias" },
  },
  {
    id: "medico",
    icono: "⚕️",
    titulo: "Necesito un médico",
    pasos: [
      "Dentro de la UE, la Tarjeta Sanitaria Europea da acceso a asistencia pública si la tienes.",
      "Fuera de la UE, revisa tu seguro de viaje y su teléfono de asistencia.",
      "Para una urgencia grave, usa el número de emergencias de arriba.",
    ],
    buscarCerca: { etiqueta: "🏥 Hospital o clínica cerca de mí", consulta: "hospital o clínica de urgencias" },
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
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
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
  const nacionalidad = viajeros
    .filter((v) => viaje.viajerosIds.includes(v.id) && v.tipo === "persona")
    .map((v) => (v.tipo === "persona" ? v.nacionalidad : undefined))
    .find(Boolean);
  const paisDestino = paises[0]?.nombre ?? viaje.destino;

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera
          titulo="Necesito ayuda"
          subtitulo="Pasos orientativos. En una urgencia real, llama primero al número de emergencias."
          volverA={`/viajes/${viaje.id}`}
        />

        {paises.length === 0 ? (
          <section className="mb-6 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-red-700">Emergencias</p>
            <p className="text-sm text-red-800">
              Aún no sabemos en qué país está tu destino, así que no podemos darte el número correcto. Dínoslo en{" "}
              <strong>Ruta</strong> y aparecerá aquí. Mientras tanto: en la UE el número único es <strong>112</strong>;
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
                      <span className="font-medium">Atención al turista:</span> {pais.telefonoTurista}
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
          <h2 className="mb-3 font-medium">Autoridades y consulado</h2>
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
                      <span className="block text-xs text-neutral-500">Web oficial: denuncias, comisarías y avisos.</span>
                    </span>
                    <span className="text-neutral-300">↗</span>
                  </a>
                </li>
              ))}
            <li className="rounded-xl border border-neutral-200 px-4 py-3">
              <span className="block font-medium text-neutral-900">
                🛂 {nacionalidad ? `Consulado de ${nacionalidad} en ${paisDestino}` : `Tu consulado en ${paisDestino}`}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {nacionalidad
                  ? "Elige dónde buscarlo: el mapa suele traer teléfono y dirección directos."
                  : "Añade la nacionalidad en Viajeros y la búsqueda saldrá directa."}
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={urlMapsConsulado(paisDestino, nacionalidad)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-marino-600 px-3 py-2 text-xs font-medium text-white hover:bg-marino-700"
                >
                  📍 Ver en el mapa (teléfono y dirección) ↗
                </a>
                <a
                  href={urlBuscarConsulado(paisDestino, nacionalidad)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 hover:border-marino-500"
                >
                  🔎 Buscar la web oficial ↗
                </a>
              </div>
            </li>
          </ul>
          <p className="mt-3 text-xs text-neutral-400">
            No guardamos teléfonos ni correos de consulados: cambian a menudo y dar uno caducado en una urgencia es peor
            que no dar ninguno. Los enlaces te llevan a la información vigente.
          </p>
        </section>

        <h2 className="mb-2 font-medium">¿Qué te ha pasado?</h2>
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
