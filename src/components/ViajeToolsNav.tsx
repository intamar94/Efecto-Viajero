"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HERRAMIENTAS = [
  { href: "", icono: "🧭", titulo: "Resumen" },
  { href: "transporte", icono: "🚆", titulo: "Transporte" },
  { href: "alojamiento", icono: "🏨", titulo: "Alojamiento" },
  { href: "actividades", icono: "🎒", titulo: "Actividades" },
  { href: "vault", icono: "📁", titulo: "Vault" },
  { href: "souvenirs", icono: "🎁", titulo: "Souvenirs" },
  { href: "compartido", icono: "👥", titulo: "Compartido" },
  { href: "recuerdos", icono: "📸", titulo: "Recuerdos" },
  { href: "resolver", icono: "🆘", titulo: "Ayuda" },
] as const;

// Todas las herramientas del viaje, alcanzables desde cualquiera de ellas:
// antes solo se llegaba a otra sección volviendo primero al hub.
export function ViajeToolsNav({ viajeId }: { viajeId: string }) {
  const pathname = usePathname();

  return (
    <nav className="mb-6 -mx-6 flex gap-1.5 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {HERRAMIENTAS.map((h) => {
        const href = `/viajes/${viajeId}${h.href ? `/${h.href}` : ""}`;
        const activo = pathname === href;
        return (
          <Link
            key={h.href}
            href={href}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              activo ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-900"
            }`}
          >
            {h.icono} {h.titulo}
          </Link>
        );
      })}
    </nav>
  );
}
