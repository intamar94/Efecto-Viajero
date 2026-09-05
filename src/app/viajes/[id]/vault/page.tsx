"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { ETIQUETA_CATEGORIA, ORDEN_CATEGORIAS, extraerTextoDePdf, interpretarReserva } from "@/lib/extraerDocumento";
import type { CategoriaDocumento, DocumentoViaje } from "@/lib/types";

export default function VaultPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);

  const [textoPegado, setTextoPegado] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ultimoGuardado, setUltimoGuardado] = useState<string | null>(null);
  const [mostrarManual, setMostrarManual] = useState(false);

  const [manualCategoria, setManualCategoria] = useState<CategoriaDocumento>("otro");
  const [manualProveedor, setManualProveedor] = useState("");
  const [manualReferencia, setManualReferencia] = useState("");
  const [manualFecha, setManualFecha] = useState("");
  const [manualDireccion, setManualDireccion] = useState("");

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  // Subir y olvidarse: se lee, se clasifica y se archiva en un solo paso.
  // No hay formulario que rellenar antes de guardar; si la categoría sale
  // mal, se corrige después con el selector de la propia ficha.
  function archivar(texto: string, nombreArchivo?: string) {
    if (!viaje) return;
    const r = interpretarReserva(texto, nombreArchivo);
    const doc: DocumentoViaje = {
      id: generarId(),
      tipo: r.categoria,
      proveedor: r.proveedor,
      referencia: r.referencia,
      fecha: r.fecha,
      hora: r.hora,
      direccion: r.direccion,
      autoClasificado: true,
      nombreArchivo,
    };
    actualizarViaje(viaje.id, { documentos: [...viaje.documentos, doc] });
    setUltimoGuardado(doc.id);
    setAviso(
      r.confianza === 0
        ? `Guardado en "${ETIQUETA_CATEGORIA.otro.etiqueta}": no hemos reconocido de qué es. Cámbialo abajo si sabes qué tema le corresponde.`
        : `Guardado en "${ETIQUETA_CATEGORIA[r.categoria].etiqueta}".`
    );
  }

  async function subirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo || !viaje) return;
    setProcesando(true);
    setAviso(null);
    try {
      const texto = await extraerTextoDePdf(archivo);
      archivar(texto, archivo.name);
    } catch {
      // Un PDF escaneado (imagen sin capa de texto) no se puede leer así.
      // En vez de fallar sin más, se archiva con lo que sí sabemos.
      archivar("", archivo.name);
      setAviso(
        "Ese PDF no tiene texto legible (suele pasar con documentos escaneados). Lo hemos guardado por su nombre de archivo: revisa el tema y complétalo a mano si hace falta."
      );
    } finally {
      setProcesando(false);
    }
  }

  function pegarTexto() {
    if (!textoPegado.trim()) return;
    archivar(textoPegado);
    setTextoPegado("");
  }

  function cambiarCategoria(id: string, categoria: CategoriaDocumento) {
    if (!viaje) return;
    actualizarViaje(viaje.id, {
      documentos: viaje.documentos.map((d) => (d.id === id ? { ...d, tipo: categoria, autoClasificado: false } : d)),
    });
  }

  function eliminar(id: string) {
    if (!viaje) return;
    actualizarViaje(viaje.id, { documentos: viaje.documentos.filter((d) => d.id !== id) });
  }

  function guardarManual(e: React.FormEvent) {
    e.preventDefault();
    if (!viaje || !manualProveedor.trim()) return;
    actualizarViaje(viaje.id, {
      documentos: [
        ...viaje.documentos,
        {
          id: generarId(),
          tipo: manualCategoria,
          proveedor: manualProveedor.trim(),
          referencia: manualReferencia.trim() || undefined,
          fecha: manualFecha || undefined,
          direccion: manualDireccion.trim() || undefined,
        },
      ],
    });
    setManualProveedor("");
    setManualReferencia("");
    setManualFecha("");
    setManualDireccion("");
    setMostrarManual(false);
  }

  const grupos = ORDEN_CATEGORIAS.map((categoria) => ({
    categoria,
    documentos: viaje.documentos.filter((d) => d.tipo === categoria),
  })).filter((g) => g.documentos.length > 0);

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera
          titulo="Travel Vault"
          subtitulo="Sube el documento y se archiva solo en su tema."
          volverA={`/viajes/${viaje.id}`}
        />

        <section className="tip mb-6">
          <h2 className="mb-1 font-medium text-neutral-900">Subir un documento</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Se lee en tu navegador (no se envía a ningún servidor), se detecta de qué es y se guarda en su tema. Sin
            formularios.
          </p>

          <label className="mb-3 block">
            <input type="file" accept="application/pdf" onChange={subirArchivo} disabled={procesando} className="input" />
          </label>

          <details>
            <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-900">
              No tengo el PDF, quiero pegar el texto del email
            </summary>
            <textarea
              className="input mt-2 min-h-20"
              placeholder="Pega aquí el texto de tu email de confirmación..."
              value={textoPegado}
              onChange={(e) => setTextoPegado(e.target.value)}
            />
            <button type="button" onClick={pegarTexto} disabled={procesando || !textoPegado.trim()} className="btn-secondary mt-2 text-xs">
              Archivar este texto
            </button>
          </details>

          {procesando && <p className="mt-3 text-sm text-neutral-500">Leyendo el documento…</p>}
          {aviso && <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-marino-700">{aviso}</p>}
        </section>

        {grupos.length === 0 ? (
          <p className="mb-6 text-sm text-neutral-500">
            Todavía no hay documentos guardados. Sube el primero y aparecerá aquí clasificado.
          </p>
        ) : (
          <div className="mb-6 space-y-5">
            {grupos.map(({ categoria, documentos }) => (
              <section key={categoria}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700">
                  <span>{ETIQUETA_CATEGORIA[categoria].icono}</span>
                  {ETIQUETA_CATEGORIA[categoria].etiqueta}
                  <span className="text-xs font-normal text-neutral-400">({documentos.length})</span>
                </h2>
                <ul className="space-y-2">
                  {documentos.map((d) => (
                    <li
                      key={d.id}
                      className={`rounded-xl border bg-white px-4 py-3 text-sm ${
                        d.id === ultimoGuardado ? "border-coral-300 ring-1 ring-coral-100" : "border-neutral-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium">{d.proveedor}</span>
                        <button onClick={() => eliminar(d.id)} className="shrink-0 text-xs text-neutral-400 hover:text-red-600">
                          Eliminar
                        </button>
                      </div>

                      {(d.referencia || d.fecha || d.hora) && (
                        <p className="mt-0.5 text-neutral-500">{[d.referencia, d.fecha, d.hora].filter(Boolean).join(" · ")}</p>
                      )}

                      {d.direccion && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.direccion)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-block text-marino-600 underline hover:text-marino-800"
                        >
                          📍 {d.direccion} — cómo llegar
                        </a>
                      )}

                      {d.autoClasificado && (
                        <label className="mt-2 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-2 text-xs text-neutral-400">
                          Clasificado automáticamente — ¿va en otro tema?
                          <select
                            value={d.tipo}
                            onChange={(e) => cambiarCategoria(d.id, e.target.value as CategoriaDocumento)}
                            className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700"
                          >
                            {ORDEN_CATEGORIAS.map((c) => (
                              <option key={c} value={c}>
                                {ETIQUETA_CATEGORIA[c].etiqueta}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {mostrarManual ? (
          <form onSubmit={guardarManual} className="card space-y-3">
            <p className="text-sm font-medium text-neutral-700">Añadir a mano</p>
            <select className="input" value={manualCategoria} onChange={(e) => setManualCategoria(e.target.value as CategoriaDocumento)}>
              {ORDEN_CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {ETIQUETA_CATEGORIA[c].etiqueta}
                </option>
              ))}
            </select>
            <input className="input" placeholder="Proveedor o nombre (ej. Iberia)" value={manualProveedor} onChange={(e) => setManualProveedor(e.target.value)} />
            <input className="input" placeholder="Referencia / localizador (opcional)" value={manualReferencia} onChange={(e) => setManualReferencia(e.target.value)} />
            <input type="date" className="input" value={manualFecha} onChange={(e) => setManualFecha(e.target.value)} />
            <input className="input" placeholder="Dirección (opcional)" value={manualDireccion} onChange={(e) => setManualDireccion(e.target.value)} />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">
                Guardar
              </button>
              <button type="button" onClick={() => setMostrarManual(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setMostrarManual(true)} className="text-sm text-neutral-500 underline hover:text-neutral-900">
            + Añadir un documento a mano
          </button>
        )}
      </div>
    </main>
  );
}
