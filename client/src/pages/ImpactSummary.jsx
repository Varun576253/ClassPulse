import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Loader2,
  Printer,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import LearningGapTrend from '../charts/LearningGapTrend';

const MetricCard = ({ value, label, sub, color = 'text-[#11233f]', bg = 'bg-white', border = 'border-slate-200', icon: Icon }) => (
  <div className={`rounded-xl border ${border} ${bg} p-5`}>
    {Icon && <Icon size={18} className={`mb-3 ${color}`} />}
    <p className={`text-4xl font-black ${color}`}>{value}</p>
    <p className="mt-1 text-sm font-bold text-slate-600">{label}</p>
    {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
  </div>
);

const ImpactSummary = () => {
  const [report, setReport] = useState(null);
  const [gapTrends, setGapTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const teacherId = localStorage.getItem('classpulse-teacher') || '';
    if (!teacherId) return;

    const load = async () => {
      try {
        const [reportRes, trendsRes] = await Promise.all([
          api.get(`/analytics/impact-report/${teacherId}`),
          api.get(`/analytics/gap-trends/${teacherId}`)
        ]);
        setReport(reportRes.data.report);
        setGapTrends(trendsRes.data.trends || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex items-center gap-3 panel rounded-xl p-8">
        <Loader2 size={20} className="animate-spin text-slate-400" />
        <span className="font-semibold text-slate-600">Building impact report…</span>
      </div>
    );
  }

  if (error) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 p-5 font-semibold text-rose-800">{error}</p>;
  }

  const r = report || {};
  const gapRate = r.totalStudents > 0
    ? Math.round((r.studentsWithGaps / r.totalStudents) * 100)
    : 0;
  const supportRate = r.totalStudents > 0
    ? Math.round((r.studentsNeedingSupport / r.totalStudents) * 100)
    : 0;
  const healthLabel = r.classHealthScore >= 80 ? 'Excellent' : r.classHealthScore >= 60 ? 'Good' : r.classHealthScore >= 40 ? 'Needs Attention' : 'Critical';
  const healthColor = r.classHealthScore >= 80 ? 'text-emerald-600' : r.classHealthScore >= 60 ? 'text-blue-600' : r.classHealthScore >= 40 ? 'text-amber-600' : 'text-rose-600';
  const healthBg = r.classHealthScore >= 80 ? 'bg-emerald-50 border-emerald-200' : r.classHealthScore >= 60 ? 'bg-blue-50 border-blue-200' : r.classHealthScore >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200';

  const trendsForChart = gapTrends.map((t) => ({
    ...t,
    classInsight: {
      understoodCount: t.understoodCount,
      partialCount: t.partialCount,
      strugglingCount: t.strugglingCount
    },
    responses: Array(t.totalResponses).fill({})
  }));

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/" className="text-xs font-bold text-blue-600 hover:underline">Dashboard</Link>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs text-slate-400">Impact Summary</span>
          </div>
          <h1 className="text-3xl font-black text-[#11233f]">Class impact report</h1>
          <p className="mt-1 text-sm text-slate-400">
            Learning gap detection outcomes · {new Date().toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <Printer size={15} />
            Print / Share
          </button>
          <Link
            to="/sessions/new"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#11233f] px-4 text-sm font-bold text-white hover:bg-slate-800"
          >
            <Zap size={15} />
            New session
          </Link>
        </div>
      </section>

      <div className={`rounded-xl border p-5 ${healthBg}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Overall class health</p>
            <div className="flex items-baseline gap-3 mt-1">
              <span className={`text-6xl font-black ${healthColor}`}>{r.classHealthScore ?? '—'}</span>
              <span className={`text-2xl font-bold ${healthColor} opacity-60`}>/100</span>
              <span className={`text-lg font-black ${healthColor}`}>{healthLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="text-center">
              <p className="text-3xl font-black text-emerald-600">{r.improvementRate ?? 0}%</p>
              <p className="text-xs text-slate-500">students improving</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-black ${gapRate > 40 ? 'text-rose-600' : gapRate > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>{gapRate}%</p>
              <p className="text-xs text-slate-500">have learning gaps</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-black ${supportRate > 30 ? 'text-rose-600' : 'text-amber-600'}`}>{supportRate}%</p>
              <p className="text-xs text-slate-500">need support</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          value={r.totalStudents ?? 0}
          label="Students tracked"
          sub="Enrolled in your class"
          color="text-[#11233f]"
          icon={Users}
        />
        <MetricCard
          value={r.totalSessions ?? 0}
          label="Diagnostic sessions run"
          sub={`${r.analysedSessions ?? 0} with full analysis`}
          color="text-blue-600"
          bg="bg-blue-50"
          border="border-blue-200"
          icon={BarChart3}
        />
        <MetricCard
          value={r.totalGapsIdentified ?? 0}
          label="Learning gaps identified"
          sub="Across all sessions"
          color="text-rose-600"
          bg="bg-rose-50"
          border="border-rose-200"
          icon={AlertTriangle}
        />
        <MetricCard
          value={r.studentsImproved ?? 0}
          label="Students who improved"
          sub="Compared to first session"
          color="text-emerald-600"
          bg="bg-emerald-50"
          border="border-emerald-200"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <LearningGapTrend sessions={trendsForChart} />

        <section className="panel rounded-xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-rose-600" />
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Top misconceptions addressed</p>
          </div>
          {!r.topMisconceptions?.length ? (
            <p className="text-sm text-slate-400 py-4 text-center">Run analysis on sessions to surface misconceptions.</p>
          ) : (
            <div className="space-y-3">
              {r.topMisconceptions.map((m, idx) => (
                <div key={m.text} className="flex gap-3 rounded-xl border border-rose-100 bg-rose-50 p-3.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-500 text-[11px] font-black text-white">{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-rose-900 leading-5">{m.text}</p>
                    <p className="text-[11px] text-rose-600 mt-1">Detected in {m.count} session{m.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel rounded-xl p-5">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Student breakdown</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Mastering', value: (r.totalStudents || 0) - (r.studentsWithGaps || 0), color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', desc: 'On track' },
              { label: 'With gaps', value: r.studentsWithGaps || 0, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', desc: 'Weak topics identified' },
              { label: 'At risk', value: r.studentsNeedingSupport || 0, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', desc: 'Need intervention' }
            ].map(({ label, value, color, bg, desc }) => (
              <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                <p className={`text-3xl font-black ${color}`}>{value}</p>
                <p className={`text-xs font-black uppercase ${color} mt-1`}>{label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel rounded-xl p-5">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Recent sessions</p>
          <div className="space-y-2">
            {!r.recentSessions?.length && (
              <p className="text-sm text-slate-400 py-4 text-center">No sessions yet.</p>
            )}
            {(r.recentSessions || []).map((s) => {
              const understood = Number(s.classInsight?.understoodCount || 0);
              const total = (s.responses || []).length || 1;
              const pct = Math.round((understood / total) * 100);
              return (
                <Link
                  key={s._id}
                  to={`/sessions/${s._id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-[#11233f] truncate">{s.topic}</p>
                    <p className="text-[11px] text-slate-400">{s.grade} · {s.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.classInsight?.teacherSummary ? (
                      <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">Analysed</span>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">Pending</span>
                    )}
                    {s.classInsight?.teacherSummary && (
                      <span className={`text-sm font-black ${pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{pct}% mastered</span>
                    )}
                    <CheckCircle2 size={14} className={s.classInsight?.teacherSummary ? 'text-emerald-500' : 'text-slate-200'} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-600 mb-1">ShikshaLens impact</p>
            <p className="text-sm font-semibold text-blue-900 max-w-xl">
              AI-powered diagnostic sessions identify learning gaps in real time — giving teachers actionable intervention plans in seconds rather than days.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="text-center bg-white rounded-xl border border-blue-100 px-4 py-2">
              <p className="text-2xl font-black text-blue-700">{r.totalFeedbackSent ?? 0}</p>
              <p className="text-[11px] text-slate-400">feedback points given</p>
            </div>
            <div className="text-center bg-white rounded-xl border border-blue-100 px-4 py-2">
              <p className="text-2xl font-black text-blue-700">{r.analysedSessions ?? 0}</p>
              <p className="text-[11px] text-slate-400">sessions deep-analysed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactSummary;
