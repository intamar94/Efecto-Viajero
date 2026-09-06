import { supabase } from "@/lib/supabase/client";

export interface ViajeCompartido { id: string; viaje_id: string; propietario_id: string; invitado_email: string; invitado_id: string | null; creado_en: string; }

export async function invitar(viajeId: string, email: string) {
  if (!supabase) throw new Error("Supabase no configurado.");
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Debes iniciar sesión para compartir un viaje.");
  // This table is not yet represented in the generated Database type.
  // Keep the adapter cast local rather than weakening the whole Supabase client.
  const sharedTable = supabase.from("viales_compartidos" as never);
  const { data, error: insertError } = await (sharedTable as unknown as {
    insert: (values: Record<string, string>) => { select: () => { single: () => Promise<{ data: ViajeCompartido | null; error: { message: string } | null }> } }
  }).insert({ viaje_id: viajeId, propietario_id: user.id, invitado_email: email.trim().toLowerCase() }).select().single();
  if (insertError) throw new Error(insertError.message);
  return data as ViajeCompartido;
}

export async function revocar(viajeId: string, email: string) {
  if (!supabase) throw new Error("Supabase no configurado.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión.");
  const { error } = await supabase.from("viales_compartidos" as never).delete().eq("viaje_id", viajeId).eq("propietario_id", user.id).eq("invitado_email", email.trim().toLowerCase());
  if (error) throw new Error(error.message);
}

export async function obtenerCompartidos(viajeId: string) {
  if (!supabase) return [] as ViajeCompartido[];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [] as ViajeCompartido[];
  const { data, error } = await supabase.from("viales_compartidos" as never).select("*").eq("viaje_id", viajeId).order("creado_en", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ViajeCompartido[];
}
