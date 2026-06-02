import { AlertCircle, CheckCircle, MinusCircle, TrendingDown } from 'lucide-react';

const GAP_LEVELS = [
  { key: 'understoodCount', label: 'Mastered', bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', Icon: CheckCircle },
  { key: 'partialCount', label: 'Partial gap', bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-100', Icon: MinusCircle },
  { key: 'strugglingCount', label: 'Has gap', bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50 border-rose-100', Icon: TrendingDown }
];

const SessionGapAnalysis = ({ insight = {}, groups = {}, responseCount = 0, totalStudents = 0 }) => {
  const total = Math.max(
    responseCount,
    GAP_LEVELS.reduce((sum, l) => sum + Number(insight[l.key] || 0), 0),
    1
  );
  const gapCount = Number(insight.partialCount || 0) + Number(insight.strugglingCount || 0);
  const gapPct = total > 1 ? Math.round((gapCount / total) * 100) : 0;
  const masteryPct = total > 1 ? Math.round((Number(insight.understoodCount || 0) / total) * 100) : 0;
  const participationPct = totalStudents > 0 ? Math.round((responseCount / totalStudents) * 100) : null;

  return (
    <section className="panel rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Learning gap analysis</p>
          <h2 className="mt-1 text-lg font-black text-[#11233f]">
            {!responseCount
              ? 'Waiting for student responses'
              : !insight.understoodCount && !insight.partialCount && !insight.strugglingCount
              ? `${responseCount} responses received — analyse to detect gaps`
              : `${gapCount} of ${total} student${total !== 1 ? 's' : ''} ${gapCount === 1 ? 'has' : 'have'} learning gaps`}
          </h2>
        </div>

        {responseCount > 0 && (
          <div className="flex gap-3">
            <div className="text-center">
              <p className={`text-3xl font-black ${gapPct > 50 ? 'text-rose-600' : gapPct > 25 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {gapPct}%
              </p>
              <p className="text-[10px] font-bold uppercase text-slate-400">gap rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-emerald-600">{masteryPct}%</p>
              <p className="text-[10px] font-bold uppercase text-slate-400">mastered</p>
            </div>
          </div>
        )}
      </div>

      {responseCount > 0 && (
        <>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 gap-0.5 mb-4">
            {GAP_LEVELS.map((l) => {
              const val = Number(insight[l.key] || 0);
              const pct = (val / total) * 100;
              return pct > 0 ? (
                <span
                  key={l.key}
                  className={`${l.bar} transition-all duration-700 first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${pct}%` }}
                  title={`${l.label}: ${val}`}
                />
              ) : null;
            })}
            {GAP_LEVELS.every((l) => !Number(insight[l.key])) && (
              <span className="w-full rounded-full bg-slate-200" />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            {GAP_LEVELS.map((l) => {
              const val = Number(insight[l.key] || 0);
              const pct = total > 1 ? Math.round((val / total) * 100) : 0;
              const { Icon } = l;
              return (
                <div key={l.key} className={`rounded-xl border p-3 ${l.bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className={l.text} />
                    <p className={`text-xs font-black uppercase tracking-wide ${l.text}`}>{l.label}</p>
                  </div>
                  <div className="flex items-end gap-2">
                    <p className={`text-2xl font-black ${l.text}`}>{val}</p>
                    {pct > 0 && <p className={`mb-0.5 text-xs font-bold ${l.text} opacity-70`}>{pct}%</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {insight.commonMistake && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-3.5">
            <div className="flex items-start gap-2">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-rose-600" />
              <div>
                <p className="text-[10px] font-black uppercase text-rose-600 mb-1">Common misconception</p>
                <p className="text-xs leading-5 text-rose-900">{insight.commonMistake}</p>
              </div>
            </div>
          </div>
        )}
        {insight.mostAffectedTopic && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3.5">
            <div className="flex items-start gap-2">
              <TrendingDown size={13} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="text-[10px] font-black uppercase text-amber-600 mb-1">Most affected concept</p>
                <p className="text-xs font-bold text-amber-900">{insight.mostAffectedTopic}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {totalStudents > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-400">Participation</p>
            <p className="text-xs font-black text-slate-500">{responseCount} / {totalStudents}</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${participationPct}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default SessionGapAnalysis;
