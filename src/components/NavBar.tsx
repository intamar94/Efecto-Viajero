"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/hooks/useAuth";
import { logout } from "@/lib/supabase/auth-client";

const ENLACES = [
  { href: "/planificar", icono: "✈️", titulo: "Planificar", corto: "Planear" },
  { href: "/viajes", icono: "🗺️", titulo: "Mis viajes", corto: "Viajes" },
  { href: "/viajeros", icono: "🧑‍🤝‍🧑", titulo: "Viajeros", corto: "Quién" },
] as const;

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
            {authLoading ? null : user ? (
              <>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition"
                >
                  👤 {user.email?.split("@")[0]}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-lg">
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      ⚙️ Configuración
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      🚪 Cerrar sesión
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link href="/auth/login" className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition">
                🔓 Acceder
              </Link>
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
