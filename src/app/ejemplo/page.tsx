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
    setMensaje("✓ Ejemplo cargado en localStorage. Recarga la página para verlo.");
    setTimeout(() => setMensaje(""), 3000);
  }

  function handleLimpiar() {
    limpiarEjemploBase();
    setCargado(false);
    setMensaje("✓ Datos de ejemplo eliminados. Recarga la página.");
    setTimeout(() => setMensaje(""), 3000);
  }

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <Cabecera titulo="Cargar ejemplo base" volverA="/" />

        <div className="card mb-6">
          <h2 className="mb-3 font-medium">Datos de ejemplo</h2>
          <p className="mb-4 text-sm text-neutral-600">
            Carga un viaje completo con datos realistas para revisar toda la interfaz sin tener que rellenar datos cada vez.
          </p>
          <p className="mb-4 text-xs text-neutral-500">
            <strong>Viaje:</strong> Colombia (circuito 3 ciudades, 15 días)<br/>
            <strong>Viajeros:</strong> Ana García y Carlos López<br/>
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
          <h3 className="mb-3 font-medium">Qué puedes revisar:</h3>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li>✓ <Link href="/viajes" className="underline text-marino-600">Mis viajes</Link> - Lista con el viaje de ejemplo</li>
            <li>✓ <Link href={`/viajes/${VIAJE_EJEMPLO.id}`} className="underline text-marino-600">Hub del viaje</Link> - Todas las secciones</li>
            <li>✓ Transporte, Alojamiento, Actividades, Vault, Recuerdos</li>
            <li>✓ Presupuesto en vivo (con documentos del Vault)</li>
            <li>✓ Requisitos (documentación, visado, salud)</li>
            <li>✓ Qué sabemos del viaje (auditoría de capacidades)</li>
            <li>✓ Botón de compartir viaje</li>
            <li>✓ Ruta con clima y monedas</li>
          </ul>
        </div>

        <div className="mt-6 text-xs text-neutral-500 border-t border-neutral-100 pt-4">
          <p>💡 El ejemplo se guarda en localStorage de tu navegador. No requiere Supabase configurado.</p>
          <p>🔄 Puedes limpiar y recargar cuando quieras para volver a empezar.</p>
        </div>
      </div>
    </main>
  );
}
