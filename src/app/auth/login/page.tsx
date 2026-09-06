"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginWithEmail } from "@/lib/supabase/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Efecto Viajero</h1>
          <p className="mt-1 text-sm text-neutral-500">Accede a tus viajes</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-neutral-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" placeholder="tu@email.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mt-1" placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Ingresando..." : "Acceder"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-neutral-500">¿No tienes cuenta?{" "}<Link href="/auth/signup" className="font-medium text-marino-600 hover:text-marino-700">Regístrate</Link></p>
        <p className="mt-6 text-center text-xs text-neutral-400">O continúa sin cuenta: tus viajes se guardan solo en este navegador.</p>
        <Link href="/" className="mt-3 block text-center text-sm text-marino-600 hover:text-marino-700">← Volver a Efecto Viajero</Link>
      </div>
    </main>
  );
}
