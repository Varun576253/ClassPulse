const MisconceptionTracker = ({ misconceptions = [] }) => (
  <section className="panel rounded-lg p-5">
    <div>
      <p className="text-sm font-bold uppercase text-slate-500">Patterns over time</p>
      <h2 className="mt-1 text-xl font-black">Misconception tracker</h2>
    </div>
    <div className="mt-4 space-y-3">
      {!misconceptions.length && (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          Recurring patterns will build as analysed sessions accumulate.
        </p>
      )}
      {misconceptions.slice(0, 4).map((item) => (
        <article key={item.misconception} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-6 text-slate-700">{item.misconception}</p>
            <span className="shrink-0 rounded-md bg-amber-100 px-2 py-1 text-xs font-black text-amber-900">{item.count}x</span>
          </div>
          <p className="mt-2 text-xs font-bold uppercase text-slate-400">{item.topics.join(' / ')}</p>
        </article>
      ))}
    </div>
  </section>
);

export default MisconceptionTracker;
