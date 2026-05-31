const buckets = [
  { key: 'understoodCount', label: 'Understood', bar: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-800', num: 'text-emerald-700' },
  { key: 'partialCount', label: 'Partial', bar: 'bg-amber-400', card: 'bg-amber-50 border-amber-100', text: 'text-amber-900', num: 'text-amber-700' },
  { key: 'strugglingCount', label: 'Struggling', bar: 'bg-rose-500', card: 'bg-rose-50 border-rose-100', text: 'text-rose-800', num: 'text-rose-700' }
];

const ClassBreakdown = ({ insight = {}, responseCount = 0 }) => {
  const total = Math.max(
    responseCount,
    buckets.reduce((sum, b) => sum + Number(insight[b.key] || 0), 0),
    1
  );

  return (
    <section className="panel rounded-xl p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Class breakdown</p>
          <h2 className="mt-1 text-lg font-black text-[#11233f]">Understanding overview</h2>
        </div>
        <span className="text-sm font-semibold text-slate-400">{responseCount} responses</span>
      </div>

      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 gap-0.5">
        {buckets.map((b) => {
          const val = Number(insight[b.key] || 0);
          const pct = (val / total) * 100;
          return pct > 0 ? (
            <span
              key={b.key}
              className={`${b.bar} transition-all duration-700 first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${pct}%` }}
              title={`${b.label}: ${val}`}
            />
          ) : null;
        })}
        {buckets.every((b) => !Number(insight[b.key])) && (
          <span className="w-full rounded-full bg-slate-200" />
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {buckets.map((b) => {
          const val = Number(insight[b.key] || 0);
          const pct = total > 1 ? Math.round((val / total) * 100) : 0;
          return (
            <div key={b.key} className={`rounded-xl border p-3 ${b.card}`}>
              <p className={`text-xs font-black uppercase tracking-wide ${b.text}`}>{b.label}</p>
              <div className="mt-2 flex items-end gap-2">
                <p className={`text-2xl font-black ${b.num}`}>{val}</p>
                {pct > 0 && <p className={`mb-0.5 text-xs font-bold ${b.text} opacity-70`}>{pct}%</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ClassBreakdown;
