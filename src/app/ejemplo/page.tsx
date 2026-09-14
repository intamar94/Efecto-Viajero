"use client";

import { useState } from "react";
import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { cargarEjemploBase, limpiarEjemploBase, VIAJE_EJEMPLO } from "@/lib/ejemploBase";

export default function EjemploPage() {
  const [cargado, setCargado] = useState(false);
  const [mensaje, setMensaje] = useState("");

  function handleCargar() {
    cargarEjemploBase();
    setCargado(true);
    setMensaje("✓ Sample loaded into localStorage. Reload the page to see it.");
    setTimeout(() => setMensaje(""), 3000);
  }

  function handleLimpiar() {
    limpiarEjemploBase();
    setCargado(false);
    setMensaje("✓ Sample data deleted. Reload the page.");
    setTimeout(() => setMensaje(""), 3000);
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo="Cargar ejemplo base" volverA="/" />

        <div className="card mb-6">
          <h2 className="mb-3 font-medium">Sample data</h2>
          <p className="mb-4 text-sm text-neutral-600">
            Carga un viaje completo con datos realistas para revisar toda la interfaz sin tener que rellenar datos cada vez.
          </p>
          <p className="mb-4 text-xs text-neutral-500">
            <strong>Trip:</strong> Colombia (3-city loop, 15 days)<br/>
            <strong>Travellers:</strong> Ana García and Carlos López<br/>
            <strong>Incluye:</strong> Transporte, actividades, hotel, seguro, clima, cambio de moneda
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCargar}
              className="flex-1 rounded-lg bg-marino-600 px-4 py-2 text-sm font-medium text-white hover:bg-marino-700"
            >
              📥 Cargar ejemplo
            </button>
            <button
              onClick={handleLimpiar}
              className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              🗑️ Limpiar datos
            </button>
          </div>
        </div>

        {mensaje && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {mensaje}
          </div>
        )}

        <div className="card">
          <h3 className="mb-3 font-medium">What you can look at:</h3>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li>✓ <Link href="/viajes" className="underline text-marino-600">My trips</Link> — list with the sample trip</li>
            <li>✓ <Link href={`/viajes/${VIAJE_EJEMPLO.id}`} className="underline text-marino-600">Trip hub</Link> — every section</li>
            <li>✓ Transporte, Alojamiento, Actividades, Vault, Recuerdos</li>
            <li>✓ Live budget (using Vault documents)</li>
            <li>✓ Requirements (documents, visa, health)</li>
            <li>✓ What we know about the trip (capability audit)</li>
            <li>✓ Share-trip button</li>
            <li>✓ Route with weather and currencies</li>
          </ul>
        </div>

        <div className="mt-6 text-xs text-neutral-500 border-t border-neutral-100 pt-4">
          <p>💡 The sample is stored in your browser's localStorage. It doesn't need Supabase configured.</p>
          <p>🔄 You can clear and reload whenever you want to start again.</p>
        </div>
      </div>
    </main>
  );
}
