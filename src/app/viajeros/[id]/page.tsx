"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";
import { calcularEdad } from "@/lib/edad";
import { generarId } from "@/lib/id";
import type { Documento, TipoDocumento } from "@/lib/types";

const TIPOS_DOCUMENTO: { valor: TipoDocumento; etiqueta: string }[] = [
  { valor: "pasaporte", etiqueta: "Pasaporte" },
  { valor: "dni", etiqueta: "DNI" },
  { valor: "visado", etiqueta: "Visado" },
  { valor: "permiso_conduccion", etiqueta: "Permiso de conducción" },
  { valor: "certificado", etiqueta: "Certificado" },
  { valor: "vacuna", etiqueta: "Vacuna" },
  { valor: "microchip", etiqueta: "Microchip" },
  { valor: "otro", etiqueta: "Otro" },
];

export default function ViajeroDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { obtenerViajero, actualizarViajero, eliminarViajero } = useData();
  const viajero = obtenerViajero(params.id);

  const [nuevoDocTipo, setNuevoDocTipo] = useState<TipoDocumento>("pasaporte");
  const [nuevoDocNombre, setNuevoDocNombre] = useState("");
  const [nuevoDocNumero, setNuevoDocNumero] = useState("");
  const [nuevoDocVencimiento, setNuevoDocVencimiento] = useState("");

  if (!viajero) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viajero no encontrado" volverA="/viajeros" />
        </div>
      </main>
    );
  }

  const edad = calcularEdad(viajero.fechaNacimiento);

  function agregarDocumento(e: React.FormEvent) {
    e.preventDefault();
    if (!viajero || !nuevoDocNombre.trim()) return;
    const doc: Documento = {
      id: generarId(),
      tipo: nuevoDocTipo,
      nombre: nuevoDocNombre.trim(),
      numero: nuevoDocNumero.trim() || undefined,
      fechaVencimiento: nuevoDocVencimiento || undefined,
    };
    actualizarViajero(viajero.id, { documentos: [...viajero.documentos, doc] });
    setNuevoDocNombre("");
    setNuevoDocNumero("");
    setNuevoDocVencimiento("");
  }

  function eliminarDocumento(docId: string) {
    if (!viajero) return;
    actualizarViajero(viajero.id, { documentos: viajero.documentos.filter((d) => d.id !== docId) });
  }

  function borrarViajero() {
    if (!viajero) return;
    if (!confirm(`¿Eliminar a ${viajero.nombre}? Se quitará también de los viajes existentes.`)) return;
    eliminarViajero(viajero.id);
    router.push("/viajeros");
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Cabecera
          titulo={`${viajero.tipo === "persona" ? "🧑" : "🐾"} ${viajero.nombre}`}
          subtitulo={
            viajero.tipo === "persona"
              ? [edad !== null ? `${edad} años` : null, viajero.nacionalidad].filter(Boolean).join(" · ")
              : [viajero.especie, viajero.raza].filter(Boolean).join(" · ")
          }
          volverA="/viajeros"
        />

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 font-medium">Datos</h2>
          {viajero.tipo === "persona" ? (
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <Dato etiqueta="Apellido" valor={viajero.apellido} />
              <Dato etiqueta="Fecha de nacimiento" valor={viajero.fechaNacimiento} />
              <Dato etiqueta="Nacionalidad" valor={viajero.nacionalidad} />
              <Dato etiqueta="Residencia" valor={viajero.residencia} />
            </dl>
          ) : (
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <Dato etiqueta="Especie" valor={viajero.especie} />
              <Dato etiqueta="Raza" valor={viajero.raza} />
              <Dato etiqueta="Fecha de nacimiento" valor={viajero.fechaNacimiento} />
              <Dato etiqueta="Peso" valor={viajero.pesoKg ? `${viajero.pesoKg} kg` : undefined} />
              <Dato etiqueta="Microchip" valor={viajero.microchip} />
            </dl>
          )}
        </section>

        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 font-medium">Documentos</h2>

          {viajero.documentos.length === 0 ? (
            <p className="mb-4 text-sm text-neutral-500">Sin documentos registrados.</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {viajero.documentos.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-2 text-sm">
                  <span>
                    <span className="font-medium">{TIPOS_DOCUMENTO.find((t) => t.valor === doc.tipo)?.etiqueta ?? doc.tipo}</span>
                    {" — "}
                    {doc.nombre}
                    {doc.fechaVencimiento && <span className="text-neutral-500"> · vence {doc.fechaVencimiento}</span>}
                  </span>
                  <button onClick={() => eliminarDocumento(doc.id)} className="text-neutral-400 hover:text-red-600">
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={agregarDocumento} className="grid grid-cols-2 gap-3">
            <select className="input col-span-2" value={nuevoDocTipo} onChange={(e) => setNuevoDocTipo(e.target.value as TipoDocumento)}>
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
            <input
              className="input col-span-2"
              placeholder="Nombre / descripción (ej. Vacuna antirrábica)"
              value={nuevoDocNombre}
              onChange={(e) => setNuevoDocNombre(e.target.value)}
            />
            <input className="input" placeholder="Número (opcional)" value={nuevoDocNumero} onChange={(e) => setNuevoDocNumero(e.target.value)} />
            <input type="date" className="input" value={nuevoDocVencimiento} onChange={(e) => setNuevoDocVencimiento(e.target.value)} />
            <button type="submit" className="col-span-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
              + Añadir documento
            </button>
          </form>
        </section>

        <div className="flex items-center justify-between">
          <Link href="/viajes/nuevo" className="text-sm text-neutral-500 hover:text-neutral-900">
            Crear un viaje con este viajero →
          </Link>
          <button onClick={borrarViajero} className="text-sm text-red-600 hover:text-red-800">
            Eliminar viajero
          </button>
        </div>
      </div>
    </main>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string }) {
  return (
    <div>
      <dt className="text-neutral-400">{etiqueta}</dt>
      <dd>{valor || "—"}</dd>
    </div>
  );
}
