"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { EstadoBadge } from "@/components/EstadoBadge";
import { useData } from "@/lib/store";
import { calcularRequisitos, ORDEN_ESTADO } from "@/lib/requisitos";
import { destinoPrincipal, esCircuito, etapasDe, paisesDelViaje } from "@/lib/viaje";
import { alojamientosDe, actividadesDe } from "@/lib/catalogo";
import { calcularPresupuesto, sugerirAjustePresupuesto } from "@/lib/compatibilidad";
import { resumenViaje } from "@/lib/travelBrain";
import { MODOS } from "@/lib/modos";
import { NOMBRE_DOMINIO } from "@/lib/investigacion";
import type { ContextoViaje, EstadoRequisito, Viaje } from "@/lib/types";

const SECCIONES = [
  { href: "transporte", icono: "🚆", titulo: "Transporte" },
  { href: "alojamiento", icono: "🏨", titulo: "Alojamiento" },
  { href: "actividades", icono: "🎒", titulo: "Actividades" },
  { href: "vault", icono: "📁", titulo: "Travel Vault" },
  { href: "souvenirs", icono: "🎁", titulo: "Qué comprar" },
  { href: "compartido", icono: "👥", titulo: "Compartido" },
  { href: "recuerdos", icono: "📸", titulo: "Recuerdos" },
] as const;

const NIVEL_ESTILO: Record<string, string> = {
  alerta: "border-red-200 bg-red-50 text-red-700",
  aviso: "border-coral-200 bg-coral-50 text-coral-700",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function subtituloFechas(viaje: Viaje): string {
  if (viaje.fechaSalida && viaje.fechaRegreso) return `${viaje.fechaSalida} → ${viaje.fechaRegreso}`;
  if (viaje.fechaSalida) return `Desde ${viaje.fechaSalida}`;
  if (viaje.contexto.duracionDias) return `~${viaje.contexto.duracionDias} días · fechas por confirmar`;
  return "Fechas por confirmar";
}

function descripcionQuienViaja(c: ContextoViaje): string | null {
  const partes: string[] = [];
  if (c.numAdultos) partes.push(`${c.numAdultos} adulto${c.numAdultos > 1 ? "s" : ""}`);
  for (const edad of c.edadesMenores ?? []) partes.push(`1 menor de ${edad} años`);
  if (c.mascota) partes.push("mascota");
  return partes.length > 0 ? partes.join(", ") : null;
}

export default function ViajeDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { obtenerViaje, actualizarViaje, eliminarViaje, viajeros } = useData();
  const [mostrarAjuste, setMostrarAjuste] = useState(false);
  const [editandoViajeros, setEditandoViajeros] = useState(false);
  const [editandoModo, setEditandoModo] = useState(false);
  const [verAuditoria, setVerAuditoria] = useState(false);
  const [requisitosAbiertos, setRequisitosAbiertos] = useState<Set<string>>(new Set());
  const viaje = obtenerViaje(params.id);

  const destino = viaje ? destinoPrincipal(viaje) : undefined;

  const viajerosDelViaje = useMemo(
    () => (viaje ? viajeros.filter((v) => viaje.viajerosIds.includes(v.id)) : []),
    [viaje, viajeros]
  );

  const requisitos = useMemo(() => (viaje ? calcularRequisitos(viaje, viajeros) : []), [viaje, viajeros]);
  const presupuesto = useMemo(() => (viaje ? calcularPresupuesto(viaje, destino) : null), [viaje, destino]);
  const insights = useMemo(() => (viaje ? resumenViaje(viaje, requisitos, destino) : []), [viaje, requisitos, destino]);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  const alojamientoElegido = destino ? alojamientosDe(destino).find((a) => a.id === viaje.alojamientoId) : undefined;
  const numActividadesDisponibles = destino ? actividadesDe(destino).length : 0;
  const numActividadesEnMarcha = viaje.actividades.filter((a) => a.estado !== "descartada").length;
  const etapas = etapasDe(viaje);
  const circuito = esCircuito(viaje);
  const paises = paisesDelViaje(viaje);
  const auditoria = viaje.investigacion?.auditoria;

  const estadoTexto: Record<(typeof SECCIONES)[number]["href"], string> = {
    transporte: viaje.transporte.length > 0 ? `${viaje.transporte.length} tramo(s)` : "Sin definir",
    alojamiento: alojamientoElegido ? alojamientoElegido.nombre : "Sin elegir",
    actividades:
      numActividadesDisponibles > 0
        ? `${numActividadesEnMarcha} en marcha · ${numActividadesDisponibles} disponibles`
        : `${numActividadesEnMarcha} en marcha`,
    vault: viaje.documentos.length > 0 ? `${viaje.documentos.length} documento(s)` : "Vacío",
    souvenirs: "Consejos de compras",
    compartido: viaje.participantes.length > 0 ? `${viaje.participantes.length} participante(s)` : "Solo tú",
    recuerdos: viaje.recuerdos.length > 0 ? `${viaje.recuerdos.length} momento(s)` : "Sin momentos aún",
  };

  function toggleViajeroEnViaje(id: string) {
    if (!viaje) return;
    const set = new Set(viaje.viajerosIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    actualizarViaje(viaje.id, { viajerosIds: Array.from(set) });
  }

  function toggleRequisitosAbiertos(id: string) {
    setRequisitosAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function borrarViaje() {
    if (!viaje) return;
    if (!confirm(`¿Eliminar el viaje a ${viaje.destino}?`)) return;
    eliminarViaje(viaje.id);
    router.push("/viajes");
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo={viaje.destino} subtitulo={subtituloFechas(viaje)} volverA="/viajes" />

        {insights.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {insights.map((insight, i) => (
              <span key={i} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${NIVEL_ESTILO[insight.nivel]}`}>
                {insight.texto}
                {insight.accion && (
                  <Link href={insight.accion.href} className="underline">
                    {insight.accion.texto}
                  </Link>
                )}
              </span>
            ))}
          </div>
        )}

        <Link
          href={`/viajes/${viaje.id}/ruta`}
          className="mb-4 block rounded-2xl border border-marino-200 bg-marino-50 p-4 transition hover:border-marino-500"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-marino-900">
                {circuito ? `🧭 Ruta de ${etapas.length} paradas` : "🧭 Tu destino"}
              </p>
              <p className="mt-0.5 text-xs text-marino-700/80">
                {etapas.map((e) => e.nombre).join(" → ")}
                {paises.length > 1 && ` · ${paises.length} países`}
              </p>
            </div>
            <span className="shrink-0 text-marino-400">→</span>
          </div>
        </Link>

        <div className="mb-6 flex gap-2">
          <Link href={`/viajes/${viaje.id}/actividades`} className="btn-primary flex-1">
            📍 Qué hacer ahora
          </Link>
          <Link href={`/viajes/${viaje.id}/resolver`} className="btn-secondary flex-1">
            🆘 Necesito ayuda
          </Link>
        </div>

        <section className="card mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Viajeros</h2>
            <button onClick={() => setEditandoViajeros((v) => !v)} className="text-sm text-neutral-500 hover:text-neutral-900">
              {editandoViajeros ? "Listo" : viajerosDelViaje.length > 0 ? "Editar" : "Añadir"}
            </button>
          </div>

          {viajerosDelViaje.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {viajerosDelViaje.map((v) => (
                <span key={v.id} className="rounded-full border border-neutral-200 px-3 py-1 text-sm">
                  {v.tipo === "persona" ? "🧑" : "🐾"} {v.nombre}
                </span>
              ))}
            </div>
          )}

          {viajerosDelViaje.length === 0 && !editandoViajeros && (
            <p className="text-sm text-neutral-500">
              {descripcionQuienViaja(viaje.contexto)
                ? `${descripcionQuienViaja(viaje.contexto)} — todavía sin nombres. Añádelos cuando quieras.`
                : "Todavía no has dicho quién viaja."}
            </p>
          )}

          {editandoViajeros &&
            (viajeros.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Todavía no hay viajeros guardados.{" "}
                <Link href="/viajeros/nuevo" className="underline">
                  Añade uno
                </Link>
                .
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {viajeros.map((v) => (
                  <label key={v.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm">
                    <input type="checkbox" checked={viaje.viajerosIds.includes(v.id)} onChange={() => toggleViajeroEnViaje(v.id)} />
                    <span>
                      {v.tipo === "persona" ? "🧑" : "🐾"} {v.nombre}
                    </span>
                  </label>
                ))}
              </div>
            ))}
        </section>

        {/* El modo ya se elige al crear el viaje: aquí solo se muestra y se
            cambia si hace falta, en vez de volver a ocupar media pantalla
            con las tres opciones. */}
        <section className="card mb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">Cómo se organiza</h2>
              <p className="mt-0.5 text-sm text-neutral-500">
                {MODOS.find((m) => m.valor === viaje.modoPlanificacion)?.etiqueta ?? "Todavía sin decidir"}
              </p>
            </div>
            <button onClick={() => setEditandoModo((v) => !v)} className="shrink-0 text-sm text-neutral-500 hover:text-neutral-900">
              {editandoModo ? "Listo" : "Cambiar"}
            </button>
          </div>

          {editandoModo && (
            <div className="mt-3 grid gap-2">
              {MODOS.map((m) => (
                <button
                  key={m.valor}
                  onClick={() => {
                    actualizarViaje(viaje.id, { modoPlanificacion: m.valor });
                    setEditandoModo(false);
                  }}
                  className={`rounded-xl border p-3 text-left text-sm transition ${
                    viaje.modoPlanificacion === m.valor ? "border-marino-500 bg-marino-50" : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <p className="font-medium">{m.etiqueta}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{m.descripcion}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {presupuesto && presupuesto.presupuestoTotal !== undefined && (
          <section className="card mb-6">
            <h2 className="mb-3 font-medium">Presupuesto</h2>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-500">Planificado</span>
              <span className="font-medium">{presupuesto.total}€ de {presupuesto.presupuestoTotal}€</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className={`h-full rounded-full ${presupuesto.excedido ? "bg-red-500" : "bg-marino-600"}`}
                style={{ width: `${Math.min((presupuesto.total / presupuesto.presupuestoTotal) * 100, 100)}%` }}
              />
            </div>
            <p className={`mt-2 text-sm ${presupuesto.excedido ? "text-red-600" : "text-neutral-500"}`}>
              {presupuesto.excedido
                ? `Presupuesto excedido en ${Math.abs(presupuesto.disponible ?? 0)}€`
                : `Disponible: ${presupuesto.disponible}€`}
            </p>

            {presupuesto.excedido && (() => {
              const sugerencia = sugerirAjustePresupuesto(viaje, destino);
              if (!sugerencia) {
                return <p className="mt-3 text-sm text-neutral-500">No hay un ajuste automático disponible: revisa transporte o actividades a mano.</p>;
              }
              return mostrarAjuste ? (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm">
                  <p className="mb-2 text-red-700">Podemos: {sugerencia.descripcion}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        actualizarViaje(viaje.id, sugerencia.aplicar(viaje));
                        setMostrarAjuste(false);
                      }}
                      className="btn-primary px-3 py-1.5"
                    >
                      Ajustar automáticamente
                    </button>
                    <button onClick={() => setMostrarAjuste(false)} className="btn-secondary px-3 py-1.5">
                      Decidir yo
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setMostrarAjuste(true)} className="mt-3 text-sm underline text-red-600 hover:text-red-800">
                  Ver cómo resolverlo
                </button>
              );
            })()}
          </section>
        )}

        <section className="card mb-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-medium">Requisitos</h2>
          </div>

          {viajerosDelViaje.length === 0 ? (
            <p className="text-sm text-neutral-500">Añade quién viaja para ver la documentación, el visado y la salud de cada uno.</p>
          ) : (
            <>
              <p className="mb-4 text-xs text-neutral-400">
                Estimación orientativa, no oficial. Verifica siempre en la fuente oficial del país de destino antes de viajar.
              </p>

              {viajerosDelViaje.map((v) => {
                const resultadosViajero = requisitos
                  .filter((r) => r.viajeroId === v.id)
                  .sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]);
                const peorEstado: EstadoRequisito = resultadosViajero.reduce<EstadoRequisito>(
                  (peor, r) => (ORDEN_ESTADO[r.estado] < ORDEN_ESTADO[peor] ? r.estado : peor),
                  "verde"
                );
                const abierto = requisitosAbiertos.has(v.id);

                return (
                  <div key={v.id} className="mb-3 border-b border-neutral-100 pb-3 last:mb-0 last:border-none last:pb-0">
                    <button onClick={() => toggleRequisitosAbiertos(v.id)} className="flex w-full items-center justify-between text-left">
                      <span className="font-medium">
                        {v.tipo === "persona" ? "🧑" : "🐾"} {v.nombre}
                      </span>
                      <span className="flex items-center gap-2">
                        <EstadoBadge estado={peorEstado} />
                        <span className="text-neutral-400">{abierto ? "−" : "+"}</span>
                      </span>
                    </button>
                    {abierto && (
                      <ul className="mt-3 space-y-2">
                        {resultadosViajero.map((r, i) => (
                          <li key={i} className="rounded-xl bg-neutral-50 px-4 py-3 text-sm">
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <span className="font-medium">{r.titulo}</span>
                              <EstadoBadge estado={r.estado} />
                            </div>
                            <p className="text-neutral-600">{r.motivo}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </section>

        {/* La honestidad, hecha visible. El sistema ya sabía qué había
            podido comprobar de verdad y qué no; hasta ahora ese estado se
            calculaba y se tiraba, así que el viajero no tenía forma de
            distinguir un dato verificado de una estimación. */}
        {auditoria && (
          <section className="card mb-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-medium">Qué sabemos de este viaje</h2>
              <button onClick={() => setVerAuditoria((v) => !v)} className="text-sm text-neutral-500 hover:text-neutral-900">
                {verAuditoria ? "Ocultar" : "Ver detalle"}
              </button>
            </div>
            <p className="mb-3 text-xs text-neutral-500">
              Qué hemos podido comprobar con fuentes reales y qué todavía no. Preferimos decirlo a que lo parezca todo
              igual de fiable.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {auditoria.operativas.length > 0 && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
                  ✓ {auditoria.operativas.length} con datos reales
                </span>
              )}
              {auditoria.parciales.length > 0 && (
                <span className="rounded-full border border-coral-200 bg-coral-50 px-3 py-1 text-xs text-coral-800">
                  ~ {auditoria.parciales.length} parciales
                </span>
              )}
              {(auditoria.bloqueadas.length > 0 || auditoria.fallidas.length > 0) && (
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
                  · {auditoria.bloqueadas.length + auditoria.fallidas.length} sin construir
                </span>
              )}
            </div>

            {verAuditoria && (
              <dl className="mt-4 space-y-3 border-t border-neutral-100 pt-3 text-sm">
                {[
                  { titulo: "Comprobado con fuentes reales", dominios: auditoria.operativas, estilo: "text-emerald-700" },
                  { titulo: "Parcial: hay datos, pero incompletos", dominios: auditoria.parciales, estilo: "text-coral-700" },
                  { titulo: "Todavía no construido", dominios: [...auditoria.bloqueadas, ...auditoria.fallidas], estilo: "text-neutral-500" },
                ]
                  .filter((grupo) => grupo.dominios.length > 0)
                  .map((grupo) => (
                    <div key={grupo.titulo}>
                      <dt className={`text-xs font-medium ${grupo.estilo}`}>{grupo.titulo}</dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {grupo.dominios.map((d) => (
                          <span key={d} className="chip">
                            {NOMBRE_DOMINIO[d] ?? d}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
                {viaje.investigacion?.fuentes.length ? (
                  <p className="border-t border-neutral-100 pt-3 text-xs text-neutral-400">
                    Fuentes consultadas: {viaje.investigacion.fuentes.join(", ")}.
                  </p>
                ) : null}
              </dl>
            )}
          </section>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SECCIONES.map((s) => (
            <Link
              key={s.href}
              href={`/viajes/${viaje.id}/${s.href}`}
              className="rounded-2xl border border-neutral-200 bg-white p-4 hover:border-neutral-900"
            >
              <p className="text-2xl">{s.icono}</p>
              <p className="mt-1 text-sm font-medium">{s.titulo}</p>
              <p className="text-xs text-neutral-500">{estadoTexto[s.href]}</p>
            </Link>
          ))}
        </section>

        <button onClick={borrarViaje} className="text-sm text-red-600 hover:text-red-800">
          Eliminar viaje
        </button>
      </div>
    </main>
  );
}
