"use client";

import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { souvenirsDe } from "@/lib/catalogo";
import { paisesDelViaje, etapasDe } from "@/lib/viaje";
import type { SitioReal } from "@/lib/investigacion";

// Consejos que valen en cualquier destino: se muestran siempre, también
// cuando no sabemos el país, para que la pantalla nunca sea un callejón
// sin salida.
const UNIVERSALES = [
  {
    icono: "🧴",
    titulo: "Líquidos: facturado, no cabina",
    texto: "Aceites, licores, mermeladas y cosmética por encima de 100 ml no pasan el control de cabina. Si el vuelo es solo con equipaje de mano, cómpralo en el aeropuerto después del control o no lo compres.",
  },
  {
    icono: "🛃",
    titulo: "Lo que la aduana no deja pasar",
    texto: "Alimentos frescos, carne, lácteos, semillas y plantas están prohibidos en muchos países al entrar. Lo artesanal con marfil, coral, caparazón o pieles de animales puede ser directamente ilegal.",
  },
  {
    icono: "💵",
    titulo: "El precio de la primera tienda no es el precio",
    texto: "En mercados y zonas turísticas, la primera cifra suele ser de partida. Pregunta en dos o tres puestos antes de comprar algo caro: la diferencia entre el primero y el tercero suele sorprender.",
  },
];

export default function SouvenirsPage() {
  const params = useParams<{ id: string }>();
  const { obtenerViaje } = useData();
  const viaje = obtenerViaje(params.id);

  if (!viaje) {
    return (
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-xl">
          <Cabecera titulo="Viaje no encontrado" volverA="/viajes" />
        </div>
      </main>
    );
  }

  // Por país, no por destino curado: así "Pereira" recibe los consejos de
  // Colombia, y un circuito recibe los de cada país que atraviesa.
  const paises = paisesDelViaje(viaje);
  const etapas = etapasDe(viaje);

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <ViajeToolsNav viajeId={viaje.id} />
        <Cabecera titulo="Qué comprar" subtitulo="Qué merece la pena, cómo saber si es auténtico y qué problemas da en la maleta." volverA={`/viajes/${viaje.id}`} />

        {etapas.map((etapa) => {
          const deOsm = ((viaje.investigacion?.sitios?.[etapa.nombre] ?? []) as SitioReal[])
            .filter((s) => s.categoria === "compras")
            .map((s) => ({ nombre: s.nombre, detalle: s.detalle, horario: s.horarioApertura ? `${s.horarioApertura}${s.horarioCierre ? ` - ${s.horarioCierre}` : ""}` : undefined, precio: s.precioAprox, url: s.url, lat: s.lat, lon: s.lon }));
          // Wikivoyage ya se investigó desde Actividades (si el viajero la
          // abrió): su sección "buy" trae tiendas concretas escritas por
          // otros viajeros, complementarias a lo que hay etiquetado en OSM.
          const deWikivoyage = (viaje.wikivoyage?.[etapa.nombre]?.listings ?? [])
            .filter((l) => l.tipo === "buy" && l.nombre)
            .map((l) => ({ nombre: l.nombre!, detalle: l.contenido, horario: l.horario, precio: l.precio, url: l.url, lat: l.lat, lon: l.lon }));
          const vistos = new Set<string>();
          const tiendas = [...deOsm, ...deWikivoyage].filter((t) => {
            const clave = t.nombre.toLowerCase();
            if (vistos.has(clave)) return false;
            vistos.add(clave);
            return true;
          });
          return (
            <section key={etapa.id} className="mb-6">
              <h2 className="mb-2 font-medium text-neutral-900">🛍️ Tiendas reales cerca de {etapa.nombre}</h2>
              {tiendas.length === 0 ? (
                <p className="rounded-xl bg-neutral-100 px-4 py-3 text-xs text-neutral-500">
                  No encontramos tiendas de regalos, artesanía o delicatessen etiquetadas cerca de {etapa.nombre} en
                  OpenStreetMap. No significa que no existan — solo que no están mapeadas todavía.
                </p>
              ) : (
                <ul className="space-y-2">
                  {tiendas.map((t) => (
                    <li key={`${etapa.id}-${t.nombre}`} className="tip">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-neutral-900">{t.nombre}</p>
                        {(t.precio || t.detalle) && (
                          <p className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-600">{t.precio ?? t.detalle}</p>
                        )}
                      </div>
                      {t.detalle && t.precio && <p className="mt-1 text-xs text-neutral-500">{t.detalle}</p>}
                      {t.horario && <p className="mt-1 text-xs text-neutral-500">🕐 {t.horario}</p>}
                      <div className="mt-1 flex flex-wrap gap-3">
                        {t.lat && t.lon && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lon}`} target="_blank" rel="noopener noreferrer" className="text-xs text-marino-600 underline">
                            📍 Ver en el mapa
                          </a>
                        )}
                        {t.url && (
                          <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-xs text-marino-600 underline">
                            🌐 Web
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        {paises.map((pais) => (
          <section key={pais.codigo} className="mb-6">
            {paises.length > 1 && <h2 className="mb-2 font-medium text-neutral-900">{pais.nombre}</h2>}
            <ul className="space-y-3">
              {souvenirsDe(pais.nombre).map((s) => (
                <li key={s.id} className="tip">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-medium text-neutral-900">{s.nombre}</p>
                    <p className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-600">{s.precioAprox}</p>
                  </div>

                  <p className="text-sm text-neutral-600">{s.descripcion}</p>

                  {s.historia && (
                    <div className="mt-2 text-xs text-neutral-600">
                      <p className="font-medium text-neutral-700">📖 Historia:</p>
                      <p>{s.historia}</p>
                    </div>
                  )}

                  {s.ingredientes && s.ingredientes.length > 0 && (
                    <div className="mt-2 text-xs text-neutral-600">
                      <p className="font-medium text-neutral-700">🧂 Ingredientes:</p>
                      <p>{s.ingredientes.join(", ")}</p>
                    </div>
                  )}

                  {s.dondéComprar && (
                    <div className="mt-2 text-xs text-neutral-600">
                      <p className="font-medium text-neutral-700">🛒 Dónde comprar:</p>
                      <p>{s.dondéComprar}</p>
                    </div>
                  )}

                  <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-neutral-600">💡 {s.datoCurioso}</p>

                  {s.avisoEquipaje && <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs text-coral-700">✈️ {s.avisoEquipaje}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="mb-2 font-medium text-neutral-900">Sirve en cualquier destino</h2>
          <ul className="space-y-2">
            {UNIVERSALES.map((c) => (
              <li key={c.titulo} className="card">
                <p className="font-medium text-neutral-900">
                  {c.icono} {c.titulo}
                </p>
                <p className="mt-1 text-sm text-neutral-600">{c.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {paises.length === 0 && (
          <p className="mt-4 rounded-xl bg-neutral-100 px-4 py-3 text-xs text-neutral-500">
            Dinos en qué país está tu destino (en Ruta) y añadimos también los consejos propios de ahí.
          </p>
        )}

        <p className="mt-6 text-xs text-neutral-400">
          Precios orientativos por tipo de producto, no de tiendas concretas. Los límites de equipaje los fija cada
          aerolínea y las normas de aduana cada país: confírmalos antes de comprar algo voluminoso, líquido o de origen
          animal.
        </p>
      </div>
    </main>
  );
}
