import { createClient } from "@supabase/supabase-js";
import type { BrainState } from "./brainState";
import type { BrainMemoryStore, PersistedBrainSnapshot } from "./persistentMemory";

/** Server-only adapter. It activates only when the dedicated Efecto Viajero Supabase credentials exist. */
export function createSupabaseBrainMemoryStore(): BrainMemoryStore | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return {
    async save(snapshot) {
      const { error } = await supabase.from("brain_snapshots").upsert({ run_id: snapshot.runId, user_id: null, state: snapshot as unknown as Record<string, unknown>, actualizado_en: snapshot.updatedAt }, { onConflict: "run_id" });
      if (error) throw new Error(`No se pudo guardar memoria del Brain: ${error.message}`);
    },
    async load(runId) {
      const { data, error } = await supabase.from("brain_snapshots").select("state").eq("run_id", runId).maybeSingle();
      if (error) throw new Error(`No se pudo leer memoria del Brain: ${error.message}`);
      return (data?.state as PersistedBrainSnapshot | undefined) ?? null;
    },
    async findRelevant(context: BrainState["context"]) {
      const { data, error } = await supabase.from("brain_snapshots").select("state").limit(50);
      if (error) throw new Error(`No se pudo buscar memoria del Brain: ${error.message}`);
      const destinations = new Set(context.destinations.map((item) => item.toLowerCase()));
      return (data ?? []).map((row) => row.state as unknown as PersistedBrainSnapshot).filter((snapshot) => snapshot.context.destinations.some((item) => destinations.has(item.toLowerCase())));
    },
  };
}
