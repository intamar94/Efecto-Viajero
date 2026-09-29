"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { destinoPrincipal } from "@/lib/viaje";
import { alojamientosDe, actividadesDe } from "@/lib/catalogo";
import { formatearRangoFechas } from "@/lib/formatoFecha";
import type { Viaje } from "@/lib/types";

const SECCIONES = [
  { href: "actividades", icono: "🎒", titulo: "Actividades" },
  { href: "guia", icono: "🎧", titulo: "Modo Guía" },
  { href: "transporte", icono: "🚆", titulo: "Transporte" },
  { href: "alojamiento", icono: "🏨", titulo: "Alojamiento" },
  { href: "vault", icono: "📁", titulo: "Documentos" },
  { href: "recuerdos", icono: "📸", titulo: "Recuerdos" },
  { href: "souvenirs", icono: "🎁", titulo: "Qué comprar" },
  { href: "compartido", icono: "👥", titulo: "Incluir viajero" },
] as const;

function subtituloFechas(viaje: Viaje): string {
  if (viaje.fechaSalida && viaje.fechaRegreso) return formatearRangoFechas(viaje.fechaSalida, viaje.fechaRegreso);
  if (viaje.fechaSalida) return `From ${viaje.fechaSalida}`;
  if (viaje.contexto.duracionDias) return `~${viaje.contexto.duracionDias} days · dates to be confirmed`;
  return "Dates to be confirmed";
}

export default function ViajeDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { obtenerViaje, eliminarViaje } = useData();
  // Al crear el viaje ya no hay pantalla de confirmación previa: si algún
  // destino escrito no se pudo ubicar, se avisa aquí una sola vez en vez de
  // bloquear la creación por eso. El aviso viaja en la URL desde
  // /planificar y se limpia enseguida para que no reaparezca al recargar.
  const [avisoSinUbicar, setAvisoSinUbicar] = useState<string | null>(null);
  useEffect(() => {
    const valor = searchParams.get("sinUbicar");
    if (!valor) return;
    setAvisoSinUbicar(valor);
    router.replace(`/viajes/${params.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const viaje = obtenerViaje(params.id);

  const destino = viaje ? destinoPrincipal(viaje) : undefined;

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Trip not found" volverA="/viajes" />
        </div>
      </main>
    );
  }

  const alojamientoElegido = destino ? alojamientosDe(destino).find((a) => a.id === viaje.alojamientoId) : undefined;
  const numActividadesDisponibles = destino ? actividadesDe(destino).length : 0;
  const numActividadesEnMarcha = viaje.actividades.filter((a) => a.estado !== "descartada").length;
  const estadoTexto: Record<(typeof SECCIONES)[number]["href"], string> = {
    actividades:
      numActividadesDisponibles > 0
        ? `${numActividadesEnMarcha} en marcha · ${numActividadesDisponibles} disponibles`
        : `${numActividadesEnMarcha} en marcha`,
    guia: "Historias y datos por GPS",
    transporte: viaje.transporte.length > 0 ? `${viaje.transporte.length} tramo(s)` : "Añade tus trayectos",
    alojamiento: alojamientoElegido ? alojamientoElegido.nombre : "Sin elegir",
    vault: viaje.documentos.length > 0 ? `${viaje.documentos.length} documento(s)` : "Guarda reservas y archivos",
    recuerdos: viaje.recuerdos.length > 0 ? `${viaje.recuerdos.length} recuerdo(s)` : "Aún no hay recuerdos",
    souvenirs: "Ideas locales para llevar",
    compartido: viaje.participantes.length > 0 ? `${viaje.participantes.length} viajero(s) añadido(s)` : "Participantes del viaje",
  };

  function borrarViaje() {
    if (!viaje) return;
    if (!confirm(`Delete the trip to ${viaje.destino}?`)) return;
    eliminarViaje(viaje.id);
    router.push("/viajes");
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo={viaje.destino} subtitulo={subtituloFechas(viaje)} volverA="/viajes" />

        {avisoSinUbicar && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <p>We couldn&apos;t locate &quot;{avisoSinUbicar}&quot; as a real destination — check the spelling and recreate it if needed.</p>
            <button onClick={() => setAvisoSinUbicar(null)} className="shrink-0 text-amber-600 hover:text-amber-900" aria-label="Close notice">
              ×
            </button>
          </div>
        )}

        <section className="mb-6">
          <h2 className="mb-4 font-medium">Secciones del viaje</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SECCIONES.map((s) => (
              <Link
                key={s.href}
                href={`/viajes/${viaje.id}/${s.href}`}
                className="group rounded-2xl border border-neutral-200 bg-white px-4 py-5 transition hover:border-marino-500 hover:bg-marino-50"
              >
                <p className="text-3xl mb-2">{s.icono}</p>
                <p className="text-sm font-medium text-neutral-900 group-hover:text-marino-900">{s.titulo}</p>
                <p className="mt-1.5 text-xs text-neutral-500 group-hover:text-marino-700">{estadoTexto[s.href]}</p>
              </Link>
            ))}
          </div>
        </section>

        <button onClick={borrarViaje} className="text-sm text-red-600 hover:text-red-800">
          Delete trip
        </button>
      </div>
    </main>
  );
}
