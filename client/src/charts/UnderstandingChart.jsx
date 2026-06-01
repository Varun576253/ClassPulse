import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const palette = ['var(--chart-1)', 'var(--chart-3)', 'var(--destructive)'];
const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--foreground)'
};

const UnderstandingChart = ({ sessions = [] }) => {
  const totals = sessions.reduce((counts, session) => {
    counts[0].value += Number(session.classInsight?.understoodCount || 0);
    counts[1].value += Number(session.classInsight?.partialCount || 0);
    counts[2].value += Number(session.classInsight?.strugglingCount || 0);
    return counts;
  }, [
    { name: 'Understood', value: 0 },
    { name: 'Partial', value: 0 },
    { name: 'Struggling', value: 0 }
  ]);
  const hasValues = totals.some((item) => item.value);

  return (
    <section className="panel rounded-lg p-5">
      <p className="text-sm font-bold uppercase text-slate-500">Understanding mix</p>
      <h2 className="mt-1 text-xl font-black">Analysed responses</h2>
      <div className="chart-shell mt-4">
        {hasValues ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={totals} dataKey="value" innerRadius={62} outerRadius={94} paddingAngle={3}>
                {totals.map((item, index) => <Cell key={item.name} fill={palette[index]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        ) : <p className="grid h-full place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Analyse a session to populate the chart.</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold">
        {totals.map((item, index) => (
          <span key={item.name} className="inline-flex items-center gap-2">
            <span className="status-dot" style={{ background: palette[index] }} />
            {item.name}
          </span>
        ))}
      </div>
    </section>
  );
};

export default UnderstandingChart;
