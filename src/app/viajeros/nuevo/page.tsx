"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { useData } from "@/lib/store";

type Tipo = "persona" | "mascota";

export default function NuevoViajeroPage() {
  const router = useRouter();
  const { crearPersona, crearMascota } = useData();
  const [tipo, setTipo] = useState<Tipo>("persona");

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [nacionalidad, setNacionalidad] = useState("");
  const [residencia, setResidencia] = useState("");

  const [especie, setEspecie] = useState("");
  const [raza, setRaza] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [microchip, setMicrochip] = useState("");

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;

    if (tipo === "persona") {
      const nuevo = crearPersona({
        nombre: nombre.trim(),
        apellido: apellido.trim() || undefined,
        fechaNacimiento: fechaNacimiento || undefined,
        nacionalidad: nacionalidad.trim() || undefined,
        residencia: residencia.trim() || undefined,
      });
      router.push(`/viajeros/${nuevo.id}`);
    } else {
      const nuevo = crearMascota({
        nombre: nombre.trim(),
        especie: especie.trim() || undefined,
        raza: raza.trim() || undefined,
        fechaNacimiento: fechaNacimiento || undefined,
        pesoKg: pesoKg ? Number.parseFloat(pesoKg) : undefined,
        microchip: microchip.trim() || undefined,
      });
      router.push(`/viajeros/${nuevo.id}`);
    }
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Añadir viajero" volverA="/viajeros" />

        <div className="mb-6 inline-flex rounded-xl border border-neutral-200 bg-white p-1">
          {(["persona", "mascota"] as Tipo[]).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setTipo(op)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tipo === op ? "bg-marino-700 text-white" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {op === "persona" ? "🧑 Persona" : "🐾 Mascota"}
            </button>
          ))}
        </div>

        <form onSubmit={guardar} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
          <Campo etiqueta="Nombre" requerido>
            <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </Campo>

          {tipo === "persona" ? (
            <>
              <Campo etiqueta="Apellido">
                <input className="input" value={apellido} onChange={(e) => setApellido(e.target.value)} />
              </Campo>
              <Campo etiqueta="Fecha de nacimiento">
                <input type="date" className="input" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
              </Campo>
              <Campo etiqueta="Nacionalidad">
                <input className="input" placeholder="ej. España" value={nacionalidad} onChange={(e) => setNacionalidad(e.target.value)} />
              </Campo>
              <Campo etiqueta="Residencia">
                <input className="input" placeholder="ej. España" value={residencia} onChange={(e) => setResidencia(e.target.value)} />
              </Campo>
            </>
          ) : (
            <>
              <Campo etiqueta="Especie">
                <input className="input" placeholder="perro, gato…" value={especie} onChange={(e) => setEspecie(e.target.value)} />
              </Campo>
              <Campo etiqueta="Raza">
                <input className="input" value={raza} onChange={(e) => setRaza(e.target.value)} />
              </Campo>
              <Campo etiqueta="Fecha de nacimiento">
                <input type="date" className="input" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
              </Campo>
              <Campo etiqueta="Peso (kg)">
                <input type="number" step="0.1" className="input" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} />
              </Campo>
              <Campo etiqueta="Microchip">
                <input className="input" value={microchip} onChange={(e) => setMicrochip(e.target.value)} />
              </Campo>
            </>
          )}

          <button type="submit" className="btn-primary w-full">
            Guardar viajero
          </button>
        </form>
      </div>
    </main>
  );
}

function Campo({ etiqueta, requerido, children }: { etiqueta: string; requerido?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {etiqueta} {requerido && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
