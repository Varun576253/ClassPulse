const badge = (understood) => understood
  ? 'bg-emerald-100 text-emerald-800'
  : 'bg-rose-100 text-rose-800';

const StudentTimeline = ({ history = [] }) => (
  <section className="panel rounded-lg p-5">
    <p className="text-sm font-bold uppercase text-slate-500">Learning timeline</p>
    <h2 className="mt-1 text-xl font-black">Recent checks</h2>
    <div className="mt-5 space-y-4">
      {!history.length && <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No session history yet.</p>}
      {history.slice().reverse().map((item) => (
        <article key={`${item.sessionId}-${item.topic}`} className="grid gap-3 border-l-4 border-blue-200 pl-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="font-black">{item.topic}</p>
            <p className="mt-1 text-sm text-slate-500">{new Date(item.date).toLocaleDateString()} | {item.misconception}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-black uppercase ${badge(item.understood)}`}>{item.understood ? 'understood' : 'revise'}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-sm font-black">{item.score}%</span>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default StudentTimeline;
