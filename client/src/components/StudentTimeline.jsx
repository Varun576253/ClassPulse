import { AlertCircle, CheckCircle, MinusCircle } from 'lucide-react';

const UNDERSTOOD_CONFIG = {
  true: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', label: 'Mastered', barColor: 'bg-emerald-500' },
  false: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100', label: 'Gap detected', barColor: 'bg-rose-500' }
};

const confidenceColor = {
  high: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  good: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  medium: 'text-amber-600 bg-amber-50 border-amber-100',
  low: 'text-amber-600 bg-amber-50 border-amber-100',
  veryLow: 'text-rose-600 bg-rose-50 border-rose-100',
  'very low': 'text-rose-600 bg-rose-50 border-rose-100'
};

const StudentTimeline = ({ history = [] }) => {
  const reversed = history.slice().reverse();
  const trendUp = history.length >= 2 &&
    Number(history[history.length - 1]?.score || 0) > Number(history[0]?.score || 0);

  return (
    <section className="panel rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Learning journey</p>
          <h2 className="mt-1 text-lg font-black text-[#11233f]">Progress timeline</h2>
        </div>
        {history.length >= 2 && (
          <span className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${trendUp ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {trendUp ? '▲ Improving' : '▼ Review needed'}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {!reversed.length && (
          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
            <MinusCircle size={22} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">No session history yet.</p>
            <p className="text-xs text-slate-300 mt-1">Appears after student participates in a diagnostic session.</p>
          </div>
        )}
        {reversed.map((item, idx) => {
          const cfg = UNDERSTOOD_CONFIG[String(item.understood)];
          const Icon = cfg?.icon || MinusCircle;
          return (
            <article
              key={`${item.sessionId}-${idx}`}
              className={`flex gap-3 rounded-xl border p-3.5 ${cfg?.bg || 'bg-slate-50 border-slate-100'}`}
            >
              <div className="flex flex-col items-center pt-0.5">
                <Icon size={16} className={cfg?.color || 'text-slate-400'} />
                {idx < reversed.length - 1 && (
                  <div className={`mt-2 w-0.5 flex-1 min-h-4 rounded-full ${cfg?.barColor || 'bg-slate-200'} opacity-30`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black text-[#11233f] text-sm truncate">{item.topic}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{new Date(item.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.confidenceLevel && (
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-black ${confidenceColor[item.confidenceLevel] || confidenceColor.medium}`}>
                        {item.confidenceLevel} confidence
                      </span>
                    )}
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-black ${cfg?.bg || ''} ${cfg?.color || ''}`}>
                      {cfg?.label || 'Session'}
                    </span>
                  </div>
                </div>
                {item.misconception && !item.understood && (
                  <p className="mt-2 text-xs leading-5 text-slate-600 rounded-lg bg-white/70 px-2.5 py-1.5">
                    <span className="font-bold text-rose-600">Gap: </span>{item.misconception}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default StudentTimeline;
