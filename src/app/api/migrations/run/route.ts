import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const body = await request.json() as { viajeros?: any[]; viajes?: any[] };
    const viajeros = (body.viajeros ?? []).map((v) => ({
      id: v.id, user_id: user.id, nombre: v.nombre, rol: v.tipo === "mascota" ? "mascota" : "viajero",
      edad: null, nacionalidad: v.nacionalidad ?? null, pasaporte: v.documentos?.find((d:any) => d.tipo === "pasaporte")?.nombre ?? null,
      discapacidades: null, documentos: v.documentos ?? [], creado_en: v.createdAt ?? new Date().toISOString(), actualizado_en: new Date().toISOString(),
    }));
    const viajes = (body.viajes ?? []).map((v) => ({
      id: v.id, user_id: user.id, destino: v.destino, destino_id: v.destinoId ?? null, pais_codigo: v.paisCodigo ?? null,
      tipo: v.tipo === "circuito" ? "circuito" : "individual", etapas: v.etapas ?? [], viajeros_ids: v.viajerosIds ?? [],
      fecha_salida: v.fechaSalida ?? null, fecha_regreso: v.fechaRegreso ?? null, modo_planificacion: v.modoPlanificacion ?? null,
      investigacion: v.investigacion ?? null, contexto: v.contexto ?? {}, transporte: v.transporte ?? [], actividades: v.actividades ?? [],
      alojamiento_id: v.alojamientoId ?? null, souvenirs: [], compartido: {}, recuerdos: v.recuerdos ?? [], creado_en: v.createdAt ?? new Date().toISOString(), actualizado_en: new Date().toISOString(),
    }));
    const [vr, tr] = await Promise.all([
      viajeros.length ? supabase.from("viajeros").upsert(viajeros, { onConflict: "id" }) : Promise.resolve({ error: null }),
      viajes.length ? supabase.from("viajes").upsert(viajes, { onConflict: "id" }) : Promise.resolve({ error: null }),
    ]);
    if (vr.error || tr.error) return NextResponse.json({ error: vr.error?.message ?? tr.error?.message }, { status: 500 });
    return NextResponse.json({ ok: true, viajeros: viajeros.length, viajes: viajes.length });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Migración fallida" }, { status: 500 }); }
}
