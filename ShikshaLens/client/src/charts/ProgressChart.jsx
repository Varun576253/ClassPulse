import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--foreground)'
};

const ProgressChart = ({ history = [] }) => {
  const data = history.map((item) => ({
    topic: item.topic,
    score: item.score,
    date: new Date(item.date).toLocaleDateString([], { day: '2-digit', month: 'short' })
  }));

  return (
    <section className="panel rounded-lg p-5">
      <p className="text-sm font-bold uppercase text-slate-500">Score trend</p>
      <h2 className="mt-1 text-xl font-black">Progress chart</h2>
      <div className="chart-shell mt-4">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)' }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="score" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 5, fill: 'var(--chart-1)' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="grid h-full place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Scores appear after a diagnostic check.</p>}
      </div>
    </section>
  );
};

export default ProgressChart;
