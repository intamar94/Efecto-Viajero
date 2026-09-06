import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 px-5 pb-16">
      <section className="-mx-5 mb-8 bg-gradient-to-b from-marino-800 via-marino-700 to-neutral-50 px-5 pb-12 pt-14 text-center">
        <p className="mb-3 text-[0.7rem] font-semibold tracking-[0.3em] text-marino-200">EFECTO VIAJERO</p>
        <h1 className="mx-auto mb-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">Tu viaje no debería vivir en diez aplicaciones.</h1>
        <p className="mx-auto max-w-2xl text-sm leading-6 text-marino-100 sm:text-base">Cuéntanos cómo quieres viajar. Efecto Viajero organiza el contexto, comprueba lo que puede comprobar y te muestra con claridad qué está listo y qué falta.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/planificar" className="btn-primary">Empezar mi viaje <span aria-hidden="true">→</span></Link>
          <Link href="/cerebro" className="btn-secondary border-marino-300 bg-white/95">Ver cómo funciona</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        <article className="card"><p className="text-xs font-semibold uppercase tracking-wider text-coral-600">01 · Entender</p><h2 className="mt-2 text-lg font-semibold">Dinos el viaje como lo contarías.</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Personas, fechas, ritmo, presupuesto, mascotas, intereses, restricciones y lo que todavía no tienes decidido.</p></article>
        <article className="card"><p className="text-xs font-semibold uppercase tracking-wider text-coral-600">02 · Comprobar</p><h2 className="mt-2 text-lg font-semibold">Separa lo confirmado de lo pendiente.</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Las recomendaciones no se presentan como hechos cuando todavía necesitan una fuente o comprobación.</p></article>
        <article className="card"><p className="text-xs font-semibold uppercase tracking-wider text-coral-600">03 · Decidir</p><h2 className="mt-2 text-lg font-semibold">Recibe el siguiente paso útil.</h2><p className="mt-2 text-sm leading-6 text-neutral-600">El sistema prioriza qué investigar, qué falta y qué decisiones pueden tomarse ya.</p></article>
      </section>

      <section className="mx-auto mt-8 max-w-5xl rounded-3xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Caso de prueba del sistema</p><h2 className="mt-1 text-xl font-semibold">Viaje cultural a Japón</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">Berlín → Tokio → Kioto · 12 días · 2 adultos + adolescente · 4.500 € · accesibilidad · vegetariano.</p></div>
          <Link href="/ejemplo-completo" className="btn-secondary shrink-0">Recorrer el caso</Link>
        </div>
      </section>
    </main>
  );
}
