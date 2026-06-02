import { Activity, AlertTriangle, ArrowUpRight, BookOpen, CheckCircle, TrendingUp } from 'lucide-react';

const getScoreConfig = (score) => {
  if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600', ring: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle };
  if (score >= 60) return { label: 'Good', color: 'text-blue-600', ring: '#2563eb', bg: 'bg-blue-50', border: 'border-blue-200', icon: TrendingUp };
  if (score >= 40) return { label: 'Needs Attention', color: 'text-amber-600', ring: '#d97706', bg: 'bg-amber-50', border: 'border-amber-200', icon: Activity };
  return { label: 'Critical', color: 'text-rose-600', ring: '#e11d48', bg: 'bg-rose-50', border: 'border-rose-200', icon: AlertTriangle };
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ClassHealthScore = ({
  score = null,
  studentsNeedingSupport = 0,
  mostCommonWeakTopic = null,
  averageUnderstanding = 0,
  improvementRate = 0,
  totalStudents = 0,
  totalSessions = 0
}) => {
  const hasData = score !== null && totalStudents > 0;

  if (!hasData) {
    return (
      <section className="panel rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Class Health Score</p>
            <h2 className="mt-1 text-lg font-black text-[#11233f]">Not enough data yet</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalStudents === 0
                ? 'Add students to your roster to begin.'
                : 'Run your first diagnostic session to see class health.'}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative flex h-32 w-32 items-center justify-center shrink-0">
              <svg className="absolute inset-0 -rotate-90" width="128" height="128" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="10" />
              </svg>
              <div className="text-center">
                <BookOpen size={28} className="mx-auto text-slate-300" />
                <p className="mt-1 text-[10px] font-black uppercase text-slate-400">No data</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const config = getScoreConfig(score);
  const Icon = config.icon;
  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <section className={`panel rounded-xl border ${config.border} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Class Health Score</p>
          <h2 className="mt-1 text-lg font-black text-[#11233f]">Overall learning health</h2>
          <p className="mt-0.5 text-xs text-slate-500">Mastery · Risk · Trends · Gap severity</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {improvementRate > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5">
                <ArrowUpRight size={13} className="text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">{improvementRate}% students improving</span>
              </div>
            )}
            {averageUnderstanding > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-100 px-3 py-1.5">
                <Activity size={13} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-700">{averageUnderstanding}% avg understanding</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative flex h-32 w-32 items-center justify-center shrink-0">
            <svg className="absolute inset-0 -rotate-90" width="128" height="128" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle
                cx="64"
                cy="64"
                r={RADIUS}
                fill="none"
                stroke={config.ring}
                strokeWidth="10"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="text-center">
              <p className={`text-3xl font-black ${config.color}`}>{score}</p>
              <p className="text-[10px] font-black uppercase text-slate-400">/ 100</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className={`flex items-center gap-2 rounded-xl ${config.bg} px-3 py-2`}>
              <Icon size={15} className={config.color} />
              <span className={`text-sm font-black ${config.color}`}>{config.label}</span>
            </div>
            {studentsNeedingSupport > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2">
                <AlertTriangle size={13} className="text-rose-600" />
                <span className="text-xs font-bold text-rose-700">{studentsNeedingSupport} need support</span>
              </div>
            )}
            {mostCommonWeakTopic && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
                <Activity size={13} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-700 max-w-[130px] truncate" title={mostCommonWeakTopic.topicName}>
                  {mostCommonWeakTopic.topicName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClassHealthScore;
