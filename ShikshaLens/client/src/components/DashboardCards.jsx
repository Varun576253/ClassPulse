import { BookCheck, Clock3, GraduationCap, TrendingUp } from 'lucide-react';

const cards = (dashboard) => [
  {
    label: 'Students',
    value: dashboard.totalStudents || 0,
    note: 'On the roster',
    icon: GraduationCap,
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-700'
  },
  {
    label: 'Sessions this week',
    value: dashboard.sessionsThisWeek || 0,
    note: 'Diagnostic check-ins',
    icon: BookCheck,
    gradient: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700'
  },
  {
    label: 'Avg. understanding',
    value: `${dashboard.averageUnderstanding || 0}%`,
    note: 'Across analysed responses',
    icon: TrendingUp,
    gradient: 'from-amber-400 to-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700'
  },
  {
    label: 'Time saved',
    value: `${Math.round((dashboard.estimatedMinutesSaved || 0) / 60 * 10) / 10}h`,
    note: `${dashboard.estimatedMinutesSaved || 0} grading minutes`,
    icon: Clock3,
    gradient: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    text: 'text-violet-700'
  }
];

const DashboardCards = ({ dashboard }) => (
  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {cards(dashboard).map(({ label, value, note, icon: Icon, gradient, bg, text }) => (
      <article
        key={label}
        className="panel rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-[#11233f]">{value}</p>
          </div>
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${bg}`}>
            <Icon size={20} className={text} />
          </span>
        </div>
        <div className="mt-4">
          <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full w-3/4 rounded-full bg-gradient-to-r ${gradient} opacity-60`} />
          </div>
          <p className="mt-2 text-xs text-slate-400">{note}</p>
        </div>
      </article>
    ))}
  </section>
);

export default DashboardCards;
