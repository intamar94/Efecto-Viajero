import { supabase } from "./client";

export async function loginWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signupWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function logout() {
  if (!supabase) throw new Error("Supabase no configurado");
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export function onAuthStateChange(callback: (user: any) => void) {
  if (!supabase) {
    callback(null);
    return { data: { subscription: null } };
  }
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null);
  });
}
