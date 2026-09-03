import Link from "next/link";

const OPCIONES = [
  {
    href: "/planificar",
    icono: "➕",
    titulo: "Planificar un viaje",
    descripcion: "Con o sin destino en mente: cuéntanos qué viaje quieres hacer.",
  },
  {
    href: "/viajes",
    icono: "📋",
    titulo: "Mis viajes",
    descripcion: "Viajes ya creados: requisitos, plan y estado.",
  },
  {
    href: "/viajeros",
    icono: "👥",
    titulo: "Viajeros",
    descripcion: "Personas y mascotas: documentos y datos permanentes.",
  },
];

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <p className="text-sm tracking-[0.3em] text-neutral-400 mb-3">EFECTO VIAJERO</p>
        <h1 className="text-4xl font-semibold mb-2">🌍 Viajar</h1>
        <p className="text-neutral-500 mb-10">¿Qué quieres hacer?</p>

        <div className="grid gap-4 sm:grid-cols-1">
          {OPCIONES.map((op) => (
            <Link
              key={op.href}
              href={op.href}
              className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-6 py-5 text-left shadow-sm transition hover:border-neutral-900 hover:shadow-md"
            >
              <span className="text-3xl">{op.icono}</span>
              <span className="flex-1">
                <span className="block text-lg font-medium">{op.titulo}</span>
                <span className="block text-sm text-neutral-500">{op.descripcion}</span>
              </span>
              <span className="text-neutral-300 transition group-hover:translate-x-1 group-hover:text-neutral-900">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
