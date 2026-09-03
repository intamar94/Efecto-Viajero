"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/lib/store";

// `corto` no se deriva partiendo el título por espacios: eso convertía
// "Mis viajes" en "Mis", que no dice nada.
const ENLACES = [
  { href: "/planificar", icono: "✈️", titulo: "Planificar", corto: "Planear" },
  { href: "/viajes", icono: "🗺️", titulo: "Mis viajes", corto: "Viajes" },
  { href: "/viajeros", icono: "🧑‍🤝‍🧑", titulo: "Viajeros", corto: "Quién" },
] as const;

// Menú fijo en todas las páginas: sin esto, cada pantalla solo tenía un
// "← Volver" y ninguna forma de saltar directamente a otra sección.
export function NavBar() {
  const pathname = usePathname();
  const { errorGuardado } = useData();

  return (
    <>
      <header className="sticky top-0 z-20 bg-marino-800 text-white shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="text-base">🌍</span>
            <span>Efecto Viajero</span>
          </Link>
          <nav className="flex gap-1">
            {ENLACES.map((e) => {
              const activo = pathname === e.href || pathname.startsWith(`${e.href}/`);
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                    activo ? "bg-white/20 text-white" : "text-marino-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span aria-hidden className="text-xs">
                    {e.icono}
                  </span>{" "}
                  <span className="hidden sm:inline">{e.titulo}</span>
                  <span className="sm:hidden">{e.corto}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {errorGuardado && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-center text-xs text-red-800">{errorGuardado}</div>
      )}
    </>
  );
}
