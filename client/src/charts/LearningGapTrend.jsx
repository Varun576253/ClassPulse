import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--foreground)',
  fontSize: '12px'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={tooltipStyle} className="p-3 shadow-xl">
      <p className="font-black text-xs mb-1">{d?.topic || label}</p>
      <p className="text-[11px] text-emerald-700 font-bold">Mastered: {d?.masteryPct ?? 0}%</p>
      <p className="text-[11px] text-rose-700 font-bold">Gap rate: {d?.gapPct ?? 0}%</p>
      <p className="text-[11px] text-slate-400">{d?.date}</p>
    </div>
  );
};

const LearningGapTrend = ({ sessions = [] }) => {
  const data = sessions
    .filter((s) => s.classInsight?.understoodCount != null || s.classInsight?.partialCount != null)
    .slice(-10)
    .map((s) => {
      const understood = Number(s.classInsight?.understoodCount || 0);
      const partial = Number(s.classInsight?.partialCount || 0);
      const struggling = Number(s.classInsight?.strugglingCount || 0);
      const total = Math.max(understood + partial + struggling, s.responses?.length || 1, 1);
      return {
        topic: s.topic?.length > 16 ? `${s.topic.slice(0, 14)}…` : s.topic,
        fullTopic: s.topic,
        date: new Date(s.date).toLocaleDateString([], { day: '2-digit', month: 'short' }),
        masteryPct: Math.round((understood / total) * 100),
        gapPct: Math.round(((partial + struggling) / total) * 100)
      };
    });

  return (
    <section className="panel rounded-xl p-5">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Over time</p>
        <h2 className="mt-1 text-lg font-black text-[#11233f]">Learning gap trend</h2>
        <p className="mt-0.5 text-xs text-slate-400">Mastery vs gap rate across sessions</p>
      </div>

      <div className="h-48">
        {data.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="masteryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gapGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="topic" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="masteryPct" stroke="#10b981" strokeWidth={2} fill="url(#masteryGrad)" name="Mastered" />
              <Area type="monotone" dataKey="gapPct" stroke="#f43f5e" strokeWidth={2} fill="url(#gapGrad)" name="Gap rate" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-400 text-center px-4">
              {data.length === 1 ? 'Run one more analysed session to see the trend.' : 'Analyse sessions to surface gap trends over time.'}
            </p>
          </div>
        )}
      </div>

      {data.length >= 2 && (() => {
        const first = data[0];
        const last = data[data.length - 1];
        const masteryDiff = last.masteryPct - first.masteryPct;
        return (
          <div className="mt-3 flex flex-wrap gap-3">
            <span className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${masteryDiff >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              Mastery {masteryDiff >= 0 ? '▲' : '▼'} {Math.abs(masteryDiff)}pp since first session
            </span>
          </div>
        );
      })()}
    </section>
  );
};

export default LearningGapTrend;
