import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 px-5 pb-16">
      <section className="-mx-5 mb-8 bg-gradient-to-b from-marino-800 via-marino-700 to-neutral-50 px-5 pb-10 pt-12 text-center">
        <p className="mb-2 text-[0.7rem] font-medium tracking-[0.3em] text-marino-200">EFECTO VIAJERO</p>
        <h1 className="mb-3 text-3xl font-semibold text-white sm:text-4xl">Un viaje. Todo el contexto.</h1>
        <p className="mx-auto max-w-xl text-sm leading-6 text-marino-100">
          Un único ejemplo para ver cómo el cerebro de Efecto Viajero recibe una petición compleja, la deconstruye, crea requisitos, delega agentes y marca qué puede verificar y qué falta.
        </p>
      </section>

      <div className="mx-auto max-w-xl">
        <Link href="/ejemplo" className="group block rounded-3xl border border-coral-300 bg-white p-6 text-left shadow-sm ring-1 ring-coral-100 transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-600">Ejemplo único</p>
              <h2 className="mt-2 text-xl font-semibold text-neutral-900">Familia multigeneracional + mascota</h2>
            </div>
            <span className="text-2xl" aria-hidden="true">→</span>
          </div>
          <p className="text-sm leading-6 text-neutral-600">
            Colombia · 14 días · 2 adultos · 2 niños · 1 bebé · 1 abuela · 1 perro · 6.000 € · actividades para todos · documentos de todos · transporte · alojamiento · comida · clima · requisitos · emergencias · presupuesto · mapa · offline.
          </p>
          <p className="mt-5 text-sm font-medium text-marino-700">Ejecutar el ejemplo completo</p>
        </Link>
      </div>
    </main>
  );
}
