"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { logout } from "@/lib/supabase/auth-client";
import { limpiarEjemploBase } from "@/lib/ejemploBase";

const ENLACES = [{ href: "/viajes", icono: "🗺️", titulo: "Mis viajes", corto: "Viajes" }] as const;

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { errorGuardado } = useData();
  const { user, loading: authLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();
      router.push("/auth/login");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  }

  function handleRestablecerEjemplo() {
    setMenuOpen(false);
    if (!confirm("Esto borra los viajes y viajeros guardados en este navegador y deja solo el viaje de ejemplo. ¿Continuar?")) return;
    limpiarEjemploBase();
    window.location.href = "/viajes";
  }

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
                  <span aria-hidden className="text-xs">{e.icono}</span>{" "}
                  <span className="hidden sm:inline">{e.titulo}</span>
                  <span className="sm:hidden">{e.corto}</span>
                </Link>
              );
            })}
          </nav>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition"
            >
              {authLoading ? "👤" : user ? `👤 ${user.email?.split("@")[0]}` : "👤 Acceder"}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white py-1 shadow-lg">
                <Link
                  href="/planificar"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  ✈️ Planificar un viaje
                </Link>
                <Link
                  href="/viajeros"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  🧑‍🤝‍🧑 Viajeros
                </Link>
                <button
                  onClick={handleRestablecerEjemplo}
                  className="block w-full border-t border-neutral-100 px-4 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50"
                >
                  🔄 Restablecer al ejemplo
                </button>
                {!authLoading && user ? (
                  <>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block border-t border-neutral-100 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      ⚙️ Configuración
                    </Link>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full border-t border-neutral-100 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      🚪 Cerrar sesión
                    </button>
                  </>
                ) : (
                  !authLoading && (
                    <Link
                      href="/auth/login"
                      onClick={() => setMenuOpen(false)}
                      className="block border-t border-neutral-100 px-4 py-2 text-sm text-marino-700 hover:bg-neutral-50"
                    >
                      🔓 Acceder
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {errorGuardado && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-2 text-sm text-red-700">
          ⚠️ {errorGuardado}
        </div>
      )}
    </>
  );
}
