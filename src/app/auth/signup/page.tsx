"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signupWithEmail } from "@/lib/supabase/auth-client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true);
    try {
      await signupWithEmail(email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Efecto Viajero</h1>
          <p className="mt-1 text-sm text-neutral-500">Crea una cuenta</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>}
          <div><label className="block text-sm font-medium text-neutral-700">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" placeholder="tu@email.com" required /></div>
          <div><label className="block text-sm font-medium text-neutral-700">Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mt-1" placeholder="••••••••" required /></div>
          <div><label className="block text-sm font-medium text-neutral-700">Confirma contraseña</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input mt-1" placeholder="••••••••" required /></div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Registrando..." : "Crear cuenta"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-neutral-500">¿Ya tienes cuenta?{" "}<Link href="/auth/login" className="font-medium text-marino-600 hover:text-marino-700">Accede</Link></p>
        <p className="mt-6 text-center text-xs text-neutral-400">O continúa sin cuenta: tus viajes se guardan solo en este navegador.</p>
        <Link href="/" className="mt-3 block text-center text-sm text-marino-600 hover:text-marino-700">← Volver a Efecto Viajero</Link>
      </div>
    </main>
  );
}
