"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { logout } from "@/lib/supabase/auth-client";
import { Cabecera } from "@/components/Cabecera";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  async function handleLogout() {
    try {
      await logout();
      router.push("/auth/login");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <p className="text-neutral-500">Cargando...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Necesitas iniciar sesión" volverA="/viajes" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <Cabecera
          titulo="Configuración"
          subtitulo="Tu cuenta y preferencias"
          volverA="/viajes"
        />

        <div className="space-y-6">
          <section className="card">
            <h2 className="font-medium text-neutral-900">Cuenta</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-neutral-500">Email</dt>
                <dd className="mt-1 font-medium text-neutral-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Estado</dt>
                <dd className="mt-1 text-sm">
                  {user.email_confirmed_at ? (
                    <span className="text-green-600">✓ Confirmado</span>
                  ) : (
                    <span className="text-amber-600">⏳ Pendiente confirmación</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <h2 className="font-medium text-neutral-900">Privacidad</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Tus viajes son privados. Solo tú (o quién invites) puede verlos.
            </p>
            <p className="mt-3 text-xs text-neutral-500">
              Los datos se sincronizan en Supabase bajo Row Level Security.
            </p>
          </section>

          <section className="card border-red-200 bg-red-50">
            <h2 className="font-medium text-red-900">Peligro</h2>
            <button
              onClick={handleLogout}
              className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
            >
              🚪 Cerrar sesión
            </button>
            <p className="mt-3 text-xs text-red-700">
              Tu histórico de viajes permanecerá en tu cuenta. Puedes volver a acceder cuando quieras.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
