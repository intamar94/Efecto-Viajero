"use client";

import { useParams } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { ViajeToolsNav } from "@/components/ViajeToolsNav";
import { useData } from "@/lib/store";
import { souvenirsDe } from "@/lib/catalogo";
import { paisesDelViaje } from "@/lib/viaje";

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

  return (
    <main className="flex-1 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <Cabecera titulo="Qué comprar" subtitulo="Qué merece la pena, cómo saber si es auténtico y qué problemas da en la maleta." volverA={`/viajes/${viaje.id}`} />
        <ViajeToolsNav viajeId={viaje.id} />

        {paises.map((pais) => (
          <section key={pais.codigo} className="mb-6">
            {paises.length > 1 && <h2 className="mb-2 font-medium text-neutral-900">{pais.nombre}</h2>}
            <ul className="space-y-3">
              {souvenirsDe(pais.nombre).map((s) => (
                <li key={s.id} className="tip">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-neutral-900">{s.nombre}</p>
                    <p className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-600">{s.precioAprox}</p>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{s.descripcion}</p>
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
