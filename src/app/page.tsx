import Link from "next/link";

const OPCIONES = [
  {
    href: "/planificar",
    icono: "✈️",
    titulo: "Planificar un viaje",
    descripcion: "Cuéntanos qué quieres hacer y lo montamos contigo.",
    destacado: true,
  },
  {
    href: "/viajes",
    icono: "🗺️",
    titulo: "Mis viajes",
    descripcion: "Lo que ya tienes en marcha: plan, requisitos y estado.",
    destacado: false,
  },
  {
    href: "/viajeros",
    icono: "🧑‍🤝‍🧑",
    titulo: "Viajeros",
    descripcion: "Personas y mascotas, con sus documentos siempre a mano.",
    destacado: false,
  },
];

export default function Home() {
  return (
    <main className="flex-1 px-5 pb-16">
      {/* La portada tenía casi toda la pantalla vacía antes de la primera
          opción. Ahora el degradado cálido arranca pegado a la cabecera y
          la acción principal queda visible sin hacer scroll. */}
      <section className="-mx-5 mb-8 bg-gradient-to-b from-marino-800 via-marino-700 to-neutral-50 px-5 pb-10 pt-10 text-center">
        <p className="mb-2 text-[0.7rem] font-medium tracking-[0.3em] text-marino-200">EFECTO VIAJERO</p>
        <h1 className="mb-2 text-3xl font-semibold text-white sm:text-4xl">Que el viaje encaje solo</h1>
        <p className="mx-auto max-w-md text-sm text-marino-100">
          Describes lo que quieres hacer; nosotros nos ocupamos de los requisitos, el presupuesto y la logística.
        </p>
      </section>

      <div className="mx-auto grid w-full max-w-xl gap-3">
        {OPCIONES.map((op) => (
          <Link
            key={op.href}
            href={op.href}
            className={`group flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
              op.destacado ? "border-coral-300 shadow-sm ring-1 ring-coral-100" : "border-neutral-200 shadow-sm"
            }`}
          >
            <span className="text-2xl">{op.icono}</span>
            <span className="flex-1">
              <span className="block font-medium text-neutral-900">{op.titulo}</span>
              <span className="block text-sm text-neutral-500">{op.descripcion}</span>
            </span>
            <span
              className={`transition group-hover:translate-x-1 ${op.destacado ? "text-coral-500" : "text-neutral-300 group-hover:text-neutral-600"}`}
            >
              →
            </span>
          </Link>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-xl">
        <Link
          href="/ejemplo"
          className="text-xs text-neutral-400 hover:text-neutral-600 underline"
        >
          💡 Cargar ejemplo de viaje completo
        </Link>
      </div>
    </main>
  );
}
