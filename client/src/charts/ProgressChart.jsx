import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--foreground)',
  fontSize: '12px'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  const status = score >= 75 ? 'Mastered' : score >= 50 ? 'Partial' : 'Gap detected';
  const statusColor = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={tooltipStyle} className="p-3 shadow-xl">
      <p className="font-black text-xs mb-1">{payload[0]?.payload?.topic || label}</p>
      <p className="text-sm font-black" style={{ color: statusColor }}>{score}%</p>
      <p className="text-[11px] text-slate-400">{status}</p>
      <p className="text-[11px] text-slate-300 mt-0.5">{label}</p>
    </div>
  );
};

const ProgressChart = ({ history = [] }) => {
  const data = history.map((item) => ({
    topic: item.topic?.length > 14 ? `${item.topic.slice(0, 12)}…` : item.topic,
    fullTopic: item.topic,
    score: item.score,
    date: new Date(item.date).toLocaleDateString([], { day: '2-digit', month: 'short' })
  }));

  const hasImprovement = data.length >= 2 &&
    data[data.length - 1]?.score > data[0]?.score;
  const latestScore = data.at(-1)?.score ?? null;

  return (
    <section className="panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Mastery over sessions</p>
          <h2 className="mt-1 text-lg font-black text-[#11233f]">Learning progress</h2>
        </div>
        {latestScore !== null && (
          <div className="text-right">
            <p className={`text-2xl font-black ${latestScore >= 75 ? 'text-emerald-600' : latestScore >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
              {latestScore}%
            </p>
            <p className="text-[10px] text-slate-400">latest session</p>
          </div>
        )}
      </div>

      <div className="chart-shell">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
              <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: 'Mastery', position: 'insideTopRight', fontSize: 9, fill: '#10b981' }} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.4} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke={hasImprovement ? '#10b981' : '#f43f5e'}
                strokeWidth={3}
                dot={{ r: 5, fill: hasImprovement ? '#10b981' : '#f43f5e' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="grid h-full place-items-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
            Mastery chart appears after first diagnostic session.
          </p>
        )}
      </div>

      {data.length >= 2 && (
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${hasImprovement ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {hasImprovement ? '▲ Improving' : '▼ Needs attention'}
          </span>
          <span className="text-[11px] text-slate-400">{data.length} sessions tracked</span>
        </div>
      )}
    </section>
  );
};

export default ProgressChart;
