"use client";

import { obtenerTransporteLocal, urlApp } from "@/lib/transporteLocal";
import type { TransporteLocalDetallado } from "@/lib/transporteLocal";

interface TransporteLocalCiudadProps {
  ciudad?: string;
}

export function TransporteLocalCiudad({ ciudad }: TransporteLocalCiudadProps) {
  if (!ciudad) return null;

  const transporte = obtenerTransporteLocal(ciudad);
  if (!transporte) return null;

  return (
    <section className="mb-6 rounded-2xl border border-marino-200 bg-marino-50 p-5">
      <h2 className="mb-1 font-medium text-marino-900">Cómo moverte por {transporte.ciudad}</h2>
      <p className="mb-4 text-xs text-marino-700/70">Transporte local: qué hay, cómo funciona y precios.</p>

      {/* Medios de transporte */}
      <div className="mb-5">
        <h3 className="mb-2 text-sm font-medium text-marino-900">Medios disponibles</h3>
        <div className="space-y-2">
          {transporte.medios.map((medio, idx) => (
            <div key={idx} className="flex gap-3 rounded-lg bg-white px-3 py-2.5">
              <span className="shrink-0 text-lg">
                {medio.tipo === "metro" && "🚇"}
                {medio.tipo === "bus" && "🚌"}
                {medio.tipo === "tren" && "🚆"}
                {medio.tipo === "tranvia" && "🚊"}
                {medio.tipo === "ferry" && "⛴️"}
                {medio.tipo === "taxi" && "🚕"}
                {medio.tipo === "a_pie" && "🚶"}
                {medio.tipo === "otro" && "🛞"}
              </span>
              <div>
                <p className="font-medium text-marino-900">{medio.nombre}</p>
                <p className="text-xs text-neutral-600">{medio.comoFunciona}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tarjetas y abonos */}
      {transporte.tarjetasYAbonos.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 text-sm font-medium text-marino-900">Tarjetas y abonos</h3>
          <div className="space-y-2">
            {transporte.tarjetasYAbonos.map((tarjeta, idx) => (
              <div key={idx} className="rounded-lg bg-white px-3 py-2.5">
                <p className="font-medium text-marino-900">{tarjeta.nombre}</p>
                <dl className="mt-1 space-y-1 text-xs text-neutral-700">
                  <div>
                    <dt className="font-medium text-marino-700">Dónde:</dt>
                    <dd>{tarjeta.donde}</dd>
                  </div>
                  {tarjeta.precio && (
                    <div>
                      <dt className="font-medium text-marino-700">Precio:</dt>
                      <dd>{tarjeta.precio}</dd>
                    </div>
                  )}
                  {tarjeta.detalles && (
                    <div>
                      <dt className="font-medium text-marino-700">Detalles:</dt>
                      <dd>{tarjeta.detalles}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Precios */}
      {transporte.precios && (
        <div className="mb-5">
          <h3 className="mb-2 text-sm font-medium text-marino-900">Precios</h3>
          <dl className="space-y-2 text-sm text-neutral-700">
            {transporte.precios.viajeSencillo && (
              <div>
                <dt className="font-medium text-marino-900">Viaje sencillo</dt>
                <dd>{transporte.precios.viajeSencillo}</dd>
              </div>
            )}
            {transporte.precios.abonoDescargas && (
              <div>
                <dt className="font-medium text-marino-900">Abono / 10 viajes</dt>
                <dd>{transporte.precios.abonoDescargas}</dd>
              </div>
            )}
            {transporte.precios.nota && (
              <p className="mt-2 border-t border-marino-200 pt-2 text-xs text-neutral-600">
                <strong>Nota:</strong> {transporte.precios.nota}
              </p>
            )}
          </dl>
        </div>
      )}

      {/* Apps: enlace real a cada una, no solo el nombre en texto. */}
      {transporte.apps && transporte.apps.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 text-sm font-medium text-marino-900">Apps útiles</h3>
          <div className="flex flex-wrap gap-2">
            {transporte.apps.map((app) => (
              <a
                key={app}
                href={urlApp(app)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-marino-700 underline decoration-marino-300 underline-offset-2 hover:bg-marino-100"
              >
                {app} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Sitios oficiales de transporte público, si los hay. */}
      {transporte.sitiosOficiales && transporte.sitiosOficiales.length > 0 && (
        <div className="mb-5">
          <h3 className="mb-2 text-sm font-medium text-marino-900">Sitios oficiales</h3>
          <div className="flex flex-wrap gap-2">
            {transporte.sitiosOficiales.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-marino-700 underline decoration-marino-300 underline-offset-2 hover:bg-marino-100"
              >
                {url.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Aviso importante */}
      {transporte.aviso && (
        <div className="rounded-lg border-l-4 border-coral-400 bg-coral-50 px-3 py-2.5">
          <p className="text-xs font-medium text-coral-900">⚠️ Ojo con esto:</p>
          <p className="mt-1 text-xs text-coral-800">{transporte.aviso}</p>
        </div>
      )}
    </section>
  );
}
