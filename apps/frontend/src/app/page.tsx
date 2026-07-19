export default function Home() {
  return (
    <section className="grid gap-6">
      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Fase 2</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Base fullstack activa</h2>
        <p className="mt-3 max-w-3xl text-slate-600">
          Prodexa ahora cuenta con backend NestJS, frontend Next.js, PostgreSQL, Prisma y Docker Compose.
          El siguiente paso es implementar persistencia real de formulaciones y simulaciones.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          "Crear formulaciones con ingredientes y registro sanitario",
          "Simular cantidades de produccion con recalculo inmediato",
          "Proyectar costos de produccion y precio de venta",
        ].map((item) => (
          <article key={item} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-700">{item}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
