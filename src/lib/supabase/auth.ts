import { supabase } from "./client";
import type { AuthResponse, User } from "@supabase/supabase-js";

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (!supabase) throw new Error("Supabase no configurado");
  return supabase.auth.signInWithPassword({ email: email.trim(), password });
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  if (!supabase) throw new Error("Supabase no configurado");
  return supabase.auth.signUp({ email: email.trim(), password });
}

export async function logout() {
  if (!supabase) throw new Error("Supabase no configurado");
  return supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!supabase) return { data: { subscription: null } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null));
}
