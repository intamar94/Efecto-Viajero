import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type MigrationDocument = { tipo?: string; nombre?: string };
type MigrationTraveler = {
  id: string; nombre: string; tipo?: string; nacionalidad?: string;
  documentos?: MigrationDocument[]; createdAt?: string;
};
type MigrationTrip = {
  id: string; destino: string; destinoId?: string; paisCodigo?: string; tipo?: string;
  etapas?: unknown[]; viajerosIds?: string[]; fechaSalida?: string; fechaRegreso?: string;
  modoPlanificacion?: string; investigacion?: unknown; contexto?: unknown; transporte?: unknown[];
  actividades?: unknown[]; alojamientoId?: string; recuerdos?: unknown[]; createdAt?: string;
};

type MigrationBody = { viajeros?: MigrationTraveler[]; viajes?: MigrationTrip[] };

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    const body = await request.json() as MigrationBody;
    const now = new Date().toISOString();
    const viajeros = (body.viajeros ?? []).map((v) => ({
      id: v.id, user_id: user.id, nombre: v.nombre, rol: v.tipo === "mascota" ? "mascota" as const : "viajero" as const,
      edad: null, nacionalidad: v.nacionalidad ?? null,
      pasaporte: v.documentos?.find((d) => d.tipo === "pasaporte")?.nombre ?? null,
      discapacidades: null, documentos: v.documentos ?? [], creado_en: v.createdAt ?? now, actualizado_en: now,
    }));
    const viajes = (body.viajes ?? []).map((v) => ({
      id: v.id, user_id: user.id, destino: v.destino, destino_id: v.destinoId ?? null, pais_codigo: v.paisCodigo ?? null,
      tipo: v.tipo === "circuito" ? "circuito" as const : "individual" as const, etapas: v.etapas ?? [], viajeros_ids: v.viajerosIds ?? [],
      fecha_salida: v.fechaSalida ?? null, fecha_regreso: v.fechaRegreso ?? null, modo_planificacion: v.modoPlanificacion ?? null,
      investigacion: v.investigacion ?? null, contexto: v.contexto ?? {}, transporte: v.transporte ?? [], actividades: v.actividades ?? [],
      alojamiento_id: v.alojamientoId ?? null, souvenirs: [], compartido: {}, recuerdos: v.recuerdos ?? [], creado_en: v.createdAt ?? now, actualizado_en: now,
    }));
    const [vr, tr] = await Promise.all([
      viajeros.length ? client.from("viajeros").upsert(viajeros, { onConflict: "id" }) : Promise.resolve({ error: null }),
      viajes.length ? client.from("viajes").upsert(viajes, { onConflict: "id" }) : Promise.resolve({ error: null }),
    ]);
    if (vr.error || tr.error) return NextResponse.json({ error: vr.error?.message ?? tr.error?.message }, { status: 500 });
    return NextResponse.json({ ok: true, viajeros: viajeros.length, viajes: viajes.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Migración fallida" }, { status: 500 });
  }
}
