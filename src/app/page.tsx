import Link from "next/link";

// Pedido directo: la portada solo lleva las dos puertas que hacen
// falta. Explorar el mundo y Viajeros siguen existiendo — se llega
// desde el menú de la cuenta (NavBar) — pero ya no aparecen aquí.
const OPCIONES_PRINCIPALES = [
  {
    href: "/planificar",
    icono: "✈️",
    titulo: "Plan a trip",
    descripcion: "Tell us what you want to do and we build it with you.",
  },
  {
    href: "/viajes",
    icono: "🗺️",
    titulo: "My trips",
    descripcion: "What you already have in motion: plan, requirements and status.",
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
        <h1 className="mb-2 text-3xl font-semibold text-white sm:text-4xl">Let the trip fall into place</h1>
        <p className="mx-auto max-w-md text-sm text-marino-100">
          You describe what you want to do; we take care of the paperwork, the budget and the logistics.
        </p>
      </section>

      <div className="mx-auto grid w-full max-w-xl gap-3">
        {OPCIONES_PRINCIPALES.map((op, i) => (
          <Link
            key={op.href}
            href={op.href}
            className={`group flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
              i === 0 ? "border-coral-300 shadow-sm ring-1 ring-coral-100" : "border-neutral-200 shadow-sm"
            }`}
          >
            <span className="text-2xl">{op.icono}</span>
            <span className="flex-1">
              <span className="block font-medium text-neutral-900">{op.titulo}</span>
              <span className="block text-sm text-neutral-500">{op.descripcion}</span>
            </span>
            <span className={`transition group-hover:translate-x-1 ${i === 0 ? "text-coral-500" : "text-neutral-300 group-hover:text-neutral-600"}`}>
              →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
