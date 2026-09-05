"use client";

import { useRouter, usePathname } from "next/navigation";

const HERRAMIENTAS = [
  { href: "", icono: "🏠", titulo: "Resumen" },
  { href: "ruta", icono: "🧭", titulo: "Ruta" },
  { href: "itinerario", icono: "📅", titulo: "Itinerario" },
  { href: "transporte", icono: "🚆", titulo: "Transporte" },
  { href: "alojamiento", icono: "🏨", titulo: "Alojamiento" },
  { href: "actividades", icono: "🎒", titulo: "Actividades" },
  { href: "vault", icono: "📁", titulo: "Travel Vault" },
  { href: "souvenirs", icono: "🎁", titulo: "Qué comprar" },
  { href: "compartido", icono: "👥", titulo: "Compartido" },
  { href: "recuerdos", icono: "📸", titulo: "Recuerdos" },
  { href: "resolver", icono: "🆘", titulo: "Resolver SOS" },
  { href: "imprimir", icono: "🖨️", titulo: "Imprimir / PDF" },
] as const;

// Un desplegable en vez de una fila de píldoras: en móvil la fila obligaba
// a hacer scroll horizontal para encontrar la sección, y competía visualmente
// con el resto de la página.
export function ViajeToolsNav({ viajeId }: { viajeId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/viajes/${viajeId}`;
  const actual = HERRAMIENTAS.find((h) => pathname === `${base}${h.href ? `/${h.href}` : ""}`);

  return (
    <div className="mb-6">
      <label className="mb-1 block text-xs font-medium text-neutral-500">Ir a otra sección</label>
      <select
        value={actual?.href ?? ""}
        onChange={(e) => router.push(`${base}${e.target.value ? `/${e.target.value}` : ""}`)}
        className="input text-sm font-medium"
      >
        {HERRAMIENTAS.map((h) => (
          <option key={h.href} value={h.href}>
            {h.icono} {h.titulo}
          </option>
        ))}
      </select>
    </div>
  );
}
