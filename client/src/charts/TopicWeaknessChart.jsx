import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--foreground)'
};

const TopicWeaknessChart = ({ sessions = [] }) => {
  const data = sessions.map((session) => ({
    topic: session.topic,
    students: Number(session.classInsight?.partialCount || 0) + Number(session.classInsight?.strugglingCount || 0)
  })).filter((item) => item.students);

  return (
    <section className="panel rounded-lg p-5">
      <p className="text-sm font-bold uppercase text-slate-500">Weakness by topic</p>
      <h2 className="mt-1 text-xl font-black">Students needing follow-up</h2>
      <div className="chart-shell mt-4">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="topic" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--muted-foreground)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="students" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="grid h-full place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Topic weakness will appear after analysis.</p>}
      </div>
    </section>
  );
};

export default TopicWeaknessChart;
