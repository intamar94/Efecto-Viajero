"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { generarId } from "@/lib/id";
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

  if (!viaje) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
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
          subtitulo="Guarda aquí los datos de tus reservas. Introdúcelos a mano (esta versión no extrae datos automáticamente de PDFs o emails)."
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
