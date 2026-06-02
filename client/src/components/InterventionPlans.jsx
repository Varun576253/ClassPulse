import { ArrowUpRight, BookOpen, Heart, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const GROUP_CONFIG = {
  advanced: {
    label: 'Advanced',
    sub: 'Strong understanding',
    color: 'text-emerald-700',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    headerBg: 'bg-emerald-100',
    dot: 'bg-emerald-500',
    icon: Zap,
    teacherAction: 'Assign peer-tutoring role or extension task. Pair with average students to reinforce the concept for both.',
    priority: 'Low urgency — maintain momentum'
  },
  average: {
    label: 'Average',
    sub: 'Partial understanding',
    color: 'text-amber-700',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    headerBg: 'bg-amber-100',
    dot: 'bg-amber-500',
    icon: BookOpen,
    teacherAction: 'Provide one worked example. Use think-pair-share to consolidate partial understanding. Re-check within 15 minutes.',
    priority: 'Medium urgency — 1 worked example needed'
  },
  needsSupport: {
    label: 'Needs Support',
    sub: 'Did not understand',
    color: 'text-rose-700',
    border: 'border-rose-200',
    bg: 'bg-rose-50',
    headerBg: 'bg-rose-100',
    dot: 'bg-rose-500',
    icon: Heart,
    teacherAction: 'Form a small group immediately. Re-teach using a concrete local example. Verify understanding before moving on.',
    priority: 'High urgency — reteach required now'
  }
};

const InterventionPlans = ({ groups = {}, insight = {} }) => {
  const totalResponded = Object.values(groups).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Users size={16} className="text-slate-400" />
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Intervention plans by group</p>
        {totalResponded > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500">{totalResponded} students</span>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {Object.entries(GROUP_CONFIG).map(([key, cfg]) => {
          const students = groups[key] || [];
          const Icon = cfg.icon;

          return (
            <section key={key} className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
              <div className={`${cfg.headerBg} px-4 py-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={15} className={cfg.color} />
                    <h3 className={`font-black text-sm ${cfg.color}`}>{cfg.label}</h3>
                  </div>
                  <span className={`rounded-lg bg-white/70 px-2.5 py-0.5 text-lg font-black ${cfg.color}`}>
                    {students.length}
                  </span>
                </div>
                <p className={`mt-0.5 text-[11px] font-semibold ${cfg.color} opacity-75`}>{cfg.sub}</p>
              </div>

              <div className="p-4 space-y-3">
                <div className="rounded-xl bg-white/70 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1.5">Teacher action</p>
                  <p className="text-xs leading-5 text-slate-700">
                    {key === 'needsSupport' && insight.reteachActivity
                      ? insight.reteachActivity
                      : cfg.teacherAction}
                  </p>
                </div>

                <div className={`rounded-lg border ${cfg.border} bg-white/40 px-2.5 py-1.5`}>
                  <p className={`text-[10px] font-black uppercase ${cfg.color}`}>{cfg.priority}</p>
                </div>

                <div className="space-y-1">
                  {!students.length && (
                    <p className="text-xs text-slate-400 py-2 text-center">No students in this group yet.</p>
                  )}
                  {students.map((student) => (
                    <Link
                      key={student.studentId || student._id}
                      to={`/students/${student.studentId || student._id}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 transition hover:bg-white group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black text-white ${cfg.dot}`}>
                          {(student.name || 'S').charAt(0).toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-[#11233f] truncate">{student.name || 'Student'}</span>
                      </div>
                      <ArrowUpRight size={12} className="shrink-0 text-slate-300 group-hover:text-slate-500" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
};

export default InterventionPlans;
