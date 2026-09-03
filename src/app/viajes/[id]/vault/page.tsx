"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
import { extraerTextoDePdf, interpretarReserva } from "@/lib/extraerDocumento";
import type { DocumentoViaje } from "@/lib/types";

const TIPOS = ["vuelo", "tren", "autobus", "hotel", "seguro", "actividad", "otro"];

export default function VaultPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje, actualizarViaje } = useData();
  const viaje = obtenerViaje(params.id);

  const [tipo, setTipo] = useState("vuelo");
  const [proveedor, setProveedor] = useState("");
  const [referencia, setReferencia] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [direccion, setDireccion] = useState("");

  const [textoPegado, setTextoPegado] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [errorImportar, setErrorImportar] = useState<string | null>(null);
  const [campoExtraido, setCampoExtraido] = useState<Set<string>>(new Set());

  if (!viaje) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  function aplicarExtraccion(texto: string) {
    const r = interpretarReserva(texto);
    const encontrados = new Set<string>();
    setTipo(r.tipo);
    if (r.proveedor) {
      setProveedor(r.proveedor);
      encontrados.add("proveedor");
    }
    if (r.referencia) {
      setReferencia(r.referencia);
      encontrados.add("referencia");
    }
    if (r.fecha) {
      setFecha(r.fecha);
      encontrados.add("fecha");
    }
    if (r.hora) {
      setHora(r.hora);
      encontrados.add("hora");
    }
    if (r.direccion) {
      setDireccion(r.direccion);
      encontrados.add("direccion");
    }
    setCampoExtraido(encontrados);
    if (encontrados.size === 0) {
      setErrorImportar("No hemos reconocido datos claros en el texto. Revisa y rellena a mano.");
    } else {
      setErrorImportar(null);
    }
  }

  function extraerDeTexto() {
    if (!textoPegado.trim()) return;
    aplicarExtraccion(textoPegado);
  }

  async function extraerDePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setProcesando(true);
    setErrorImportar(null);
    try {
      const texto = await extraerTextoDePdf(archivo);
      aplicarExtraccion(texto);
    } catch {
      setErrorImportar("No hemos podido leer ese PDF. Prueba a copiar el texto y pegarlo, o rellena a mano.");
    } finally {
      setProcesando(false);
    }
  }

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!viaje || !proveedor.trim()) return;
    const doc: DocumentoViaje = {
      id: generarId(),
      tipo,
      proveedor: proveedor.trim(),
      referencia: referencia.trim() || undefined,
      fecha: fecha || undefined,
      hora: hora || undefined,
      direccion: direccion.trim() || undefined,
    };
    actualizarViaje(viaje.id, { documentos: [...viaje.documentos, doc] });
    setProveedor("");
    setReferencia("");
    setFecha("");
    setHora("");
    setDireccion("");
    setTextoPegado("");
    setCampoExtraido(new Set());
  }

  function eliminar(id: string) {
    if (!viaje) return;
    actualizarViaje(viaje.id, { documentos: viaje.documentos.filter((d) => d.id !== id) });
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera
          titulo="Travel Vault"
          subtitulo="Guarda aquí los datos de tus reservas."
          volverA={`/viajes/${viaje.id}`}
        />

        {viaje.documentos.length === 0 ? (
          <p className="mb-6 text-sm text-neutral-500">Todavía no hay reservas guardadas.</p>
        ) : (
          <ul className="mb-6 space-y-2">
            {viaje.documentos.map((d) => (
              <li key={d.id} className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">
                    {d.tipo} — {d.proveedor}
                  </span>
                  <button onClick={() => eliminar(d.id)} className="text-neutral-400 hover:text-red-600">
                    Eliminar
                  </button>
                </div>
                <p className="text-neutral-500">
                  {[d.referencia, d.fecha, d.hora, d.direccion].filter(Boolean).join(" · ") || "Sin más datos"}
                </p>
              </li>
            ))}
          </ul>
        )}

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-1 font-medium">Importar desde un documento</h2>
          <p className="mb-3 text-xs text-neutral-400">
            Sube el PDF que te descargaste, o pega el texto de tu email de confirmación. Se lee en tu navegador — no se
            envía a ningún servidor. Extracción heurística orientativa: revisa los datos abajo antes de guardar.
          </p>

          <label className="mb-3 block">
            <span className="mb-1 block text-sm text-neutral-600">Subir PDF</span>
            <input type="file" accept="application/pdf" onChange={extraerDePdf} disabled={procesando} className="input" />
          </label>

          <label className="mb-2 block">
            <span className="mb-1 block text-sm text-neutral-600">O pegar texto (email, confirmación...)</span>
            <textarea
              className="input min-h-20"
              placeholder="Pega aquí el texto de tu email de confirmación..."
              value={textoPegado}
              onChange={(e) => setTextoPegado(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={extraerDeTexto}
            disabled={procesando || !textoPegado.trim()}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {procesando ? "Leyendo…" : "Extraer datos"}
          </button>

          {errorImportar && <p className="mt-3 text-sm text-amber-600">{errorImportar}</p>}
          {campoExtraido.size > 0 && (
            <p className="mt-3 text-sm text-emerald-700">
              Hemos rellenado el formulario de abajo con lo que hemos reconocido — revísalo antes de guardar.
            </p>
          )}
        </section>

        <form onSubmit={agregar} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
          <input className="input" placeholder="Proveedor (ej. Iberia, Booking...)" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
          <input className="input" placeholder="Referencia / localizador (opcional)" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <input type="time" className="input" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <input className="input" placeholder="Dirección (opcional)" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          <button type="submit" className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
            + Guardar reserva
          </button>
        </form>
      </div>
    </main>
  );
}
