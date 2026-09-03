"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/lib/store";

const ENLACES = [
  { href: "/planificar", icono: "➕", titulo: "Planificar" },
  { href: "/viajes", icono: "📋", titulo: "Mis viajes" },
  { href: "/viajeros", icono: "👥", titulo: "Viajeros" },
] as const;

// Menú fijo en todas las páginas: sin esto, cada pantalla solo tenía un
// "← Volver" y ninguna forma de saltar directamente a otra sección.
export function NavBar() {
  const pathname = usePathname();
  const { errorGuardado } = useData();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight text-neutral-900">
            🌍 Efecto Viajero
          </Link>
          <nav className="flex gap-1">
            {ENLACES.map((e) => {
              const activo = pathname === e.href || pathname.startsWith(`${e.href}/`);
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                    activo ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <span>{e.icono}</span> <span className="hidden sm:inline">{e.titulo}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {errorGuardado && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-center text-xs text-red-700">{errorGuardado}</div>
      )}
    </>
  );
}
