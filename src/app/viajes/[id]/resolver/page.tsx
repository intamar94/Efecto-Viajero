"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { buscarDestinoPorId, buscarDestinoPorNombre } from "@/lib/destinos";

// Número de emergencias único a nivel nacional. Es información pública y
// estable, pero conviene confirmarla al llegar: algunos países reparten
// policía/ambulancia/bomberos en números distintos.
const EMERGENCIAS_POR_PAIS: Record<string, string> = {
  SI: "112", AT: "112", DE: "112", PT: "112", IT: "112", ES: "112", GR: "112", FR: "112", NL: "112",
  CR: "911",
  MA: "19 (policía) / 15 (ambulancia)",
  TH: "191 (policía) / 1669 (ambulancia) / 1155 (policía turística)",
  CO: "123",
  JP: "110 (policía) / 119 (ambulancia y bomberos)",
};

const PROBLEMAS = [
  {
    id: "pasaporte",
    icono: "🛂",
    titulo: "Perdí el pasaporte o el DNI",
    pasos: [
      "Denuncia la pérdida o robo en la policía local y guarda la copia de la denuncia.",
      "Contacta con la embajada o consulado de tu país para un documento de viaje de emergencia.",
      "Revisa si tu seguro de viaje cubre gestiones o gastos asociados.",
    ],
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
  },
  {
    id: "medico",
    icono: "⚕️",
    titulo: "Necesito un médico",
    pasos: [
      "Dentro de la UE, la Tarjeta Sanitaria Europea da acceso a asistencia pública si la tienes.",
      "Fuera de la UE, revisa tu seguro de viaje y su teléfono de asistencia.",
      "Para una urgencia grave, el número de emergencias local es el paso más rápido (112 en la UE).",
    ],
  },
];

export default function ResolverPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje } = useData();
  const viaje = obtenerViaje(params.id);
  const [abierto, setAbierto] = useState<string | null>(null);

  if (!viaje) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  const destino = buscarDestinoPorId(viaje.destinoId) ?? buscarDestinoPorNombre(viaje.destino);
  const emergencias = destino ? EMERGENCIAS_POR_PAIS[destino.paisCodigo] : undefined;

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="🆘 Necesito ayuda" subtitulo="Pasos orientativos. En una urgencia real, prioriza siempre el número de emergencias local." volverA={`/viajes/${viaje.id}`} />

        {emergencias && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span className="font-medium">Emergencias en {destino?.pais}: {emergencias}</span>
          </div>
        )}

        <ul className="space-y-3">
          {PROBLEMAS.map((p) => (
            <li key={p.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <button onClick={() => setAbierto(abierto === p.id ? null : p.id)} className="flex w-full items-center justify-between text-left">
                <span className="font-medium">
                  {p.icono} {p.titulo}
                </span>
                <span className="text-neutral-400">{abierto === p.id ? "−" : "+"}</span>
              </button>
              {abierto === p.id && (
                <ol className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
                  {p.pasos.map((paso, i) => (
                    <li key={i}>
                      {i + 1}. {paso}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
