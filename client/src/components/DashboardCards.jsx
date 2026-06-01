import { AlertTriangle, BookCheck, GraduationCap, TrendingUp } from 'lucide-react';

const cards = (dashboard) => [
  {
    label: 'Students',
    value: dashboard.totalStudents || 0,
    note: 'Enrolled on roster',
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
    label: 'Class mastery',
    value: `${dashboard.averageUnderstanding || 0}%`,
    note: dashboard.averageUnderstanding >= 75
      ? 'Strong understanding across class'
      : dashboard.averageUnderstanding >= 50
      ? 'Partial gaps present — review needed'
      : 'Significant gaps detected',
    icon: TrendingUp,
    gradient: dashboard.averageUnderstanding >= 75
      ? 'from-emerald-400 to-emerald-500'
      : dashboard.averageUnderstanding >= 50
      ? 'from-amber-400 to-amber-500'
      : 'from-rose-400 to-rose-500',
    bg: dashboard.averageUnderstanding >= 75
      ? 'bg-emerald-50'
      : dashboard.averageUnderstanding >= 50
      ? 'bg-amber-50'
      : 'bg-rose-50',
    text: dashboard.averageUnderstanding >= 75
      ? 'text-emerald-700'
      : dashboard.averageUnderstanding >= 50
      ? 'text-amber-700'
      : 'text-rose-700'
  },
  {
    label: 'Needs support',
    value: dashboard.studentsNeedingSupport ?? 0,
    note: dashboard.studentsNeedingSupport
      ? `Medium or high risk · ${dashboard.improvementRate ?? 0}% improving`
      : 'No at-risk flags right now',
    icon: AlertTriangle,
    gradient: dashboard.studentsNeedingSupport ? 'from-rose-500 to-rose-600' : 'from-emerald-400 to-emerald-500',
    bg: dashboard.studentsNeedingSupport ? 'bg-rose-50' : 'bg-emerald-50',
    text: dashboard.studentsNeedingSupport ? 'text-rose-700' : 'text-emerald-700'
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
