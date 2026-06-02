import { AlertTriangle, BookOpen, Plus, RefreshCw, Target, TrendingUp, Users, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import ClassHealthScore from '../components/ClassHealthScore';
import InterventionRecommendations from '../components/InterventionRecommendations';
import MisconceptionTracker from '../components/MisconceptionTracker';
import RiskStudents from '../components/RiskStudents';

const formatDate = (value) => new Date(value).toLocaleString([], {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
});

const statusColor = {
  active: 'bg-blue-100 text-blue-700',
  pending: 'bg-slate-100 text-slate-600',
  completed: 'bg-emerald-100 text-emerald-700'
};

const savedTeacherId = () => localStorage.getItem('classpulse-teacher') || '';
const savedTeacherProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('classpulse-teacher-profile') || '{}');
  } catch {
    return {};
  }
};

const StatPill = ({ icon: Icon, label, value, color }) => (
  <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${color}`}>
    <Icon size={14} />
    <span className="text-xs font-bold">{value} {label}</span>
  </div>
);

const Dashboard = () => {
  const [selectedTeacher, setSelectedTeacher] = useState(savedTeacherProfile());
  const [teacherId, setTeacherId] = useState(savedTeacherId());
  const [dashboard, setDashboard] = useState({});
  const [riskStudents, setRiskStudents] = useState([]);
  const [misconceptions, setMisconceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const loadTeacher = async () => {
      const storedId = savedTeacherId();
      const storedProfile = savedTeacherProfile();
      setTeacherId(storedId);
      setSelectedTeacher(storedProfile);

      if (!storedId) {
        setLoading(false);
        setError('Please sign in to view your dashboard.');
        return;
      }

      try {
        const response = await api.get(`/teachers/${storedId}`);
        const teacher = response.data.teacher || storedProfile;
        setSelectedTeacher(teacher);
        localStorage.setItem('classpulse-teacher-profile', JSON.stringify(teacher));
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    loadTeacher();
  }, []);

  const loadDashboard = useCallback(async ({ background = false } = {}) => {
    if (!teacherId) { setLoading(false); return; }
    try {
      if (!background) setLoading(true);
      setError('');
      const [dashRes, riskRes, miscRes] = await Promise.all([
        api.get(`/analytics/dashboard/${teacherId}`),
        api.get(`/analytics/risk-students/${teacherId}`),
        api.get(`/analytics/misconceptions/${teacherId}`)
      ]);
      setDashboard(dashRes.data.dashboard);
      setRiskStudents(riskRes.data.students);
      setMisconceptions(miscRes.data.misconceptions);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      localStorage.setItem('classpulse-teacher', teacherId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const recentSessions = dashboard.recentSessions || [];
  const hasActiveSession = recentSessions.some((s) => s.status === 'active');
  const totalStudents = dashboard.totalStudents || 0;
  const studentsNeedingSupport = dashboard.studentsNeedingSupport ?? 0;
  const improvementRate = dashboard.improvementRate ?? 0;
  const topMisconception = misconceptions[0];
  const latestReteach = dashboard.latestReteach;

  useEffect(() => {
    if (!teacherId || !hasActiveSession) return undefined;
    const timer = window.setInterval(() => loadDashboard({ background: true }), 5000);
    return () => window.clearInterval(timer);
  }, [teacherId, hasActiveSession, loadDashboard]);

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">Learning Gap Assistant</p>
          <h1 className="mt-1 text-2xl font-black text-[#11233f] sm:text-3xl">
            {selectedTeacher?.name ? `${selectedTeacher.name}'s class` : 'ClassPulse'}
          </h1>
          {selectedTeacher?.school && (
            <p className="mt-1 text-sm text-slate-500">
              {selectedTeacher.school} · {selectedTeacher.subject} · {selectedTeacher.grade}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw size={15} />
            {lastUpdated || 'Refresh'}
          </button>
          <Link
            to="/sessions/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <Plus size={15} />
            New check-in
          </Link>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-800">{error}</p>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="panel h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* === PRIORITY 1: Class health + key gap signals === */}
          <ClassHealthScore
            score={dashboard.classHealthScore ?? null}
            studentsNeedingSupport={studentsNeedingSupport}
            mostCommonWeakTopic={dashboard.mostCommonWeakTopic}
            averageUnderstanding={dashboard.averageUnderstanding ?? 0}
            improvementRate={improvementRate}
            totalStudents={totalStudents}
            totalSessions={recentSessions.length}
          />

          {/* === PRIORITY 2: "Who needs help right now?" === */}
          {(studentsNeedingSupport > 0 || riskStudents.length > 0) && (
            <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-rose-600" />
                  <h2 className="font-black text-rose-900">
                    {studentsNeedingSupport} {studentsNeedingSupport === 1 ? 'student needs' : 'students need'} support
                  </h2>
                </div>
                <Link to="/roster" className="text-xs font-bold text-rose-700 hover:underline">View all →</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {riskStudents.slice(0, 8).map((s) => (
                  <Link
                    key={s._id}
                    to={`/students/${s._id}`}
                    className="rounded-lg bg-white/80 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-900 hover:bg-white transition"
                  >
                    {s.name}
                    <span className="ml-1.5 capitalize opacity-60">{s.riskLevel}</span>
                  </Link>
                ))}
                {riskStudents.length > 8 && (
                  <Link to="/roster" className="rounded-lg bg-rose-100 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-800">
                    +{riskStudents.length - 8} more
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* === PRIORITY 3: Most common misconception + recommended action === */}
          {(topMisconception || latestReteach) && (
            <section className="grid gap-4 sm:grid-cols-2">
              {topMisconception && (
                <div className="panel rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} className="text-amber-700" />
                    <p className="text-xs font-black uppercase tracking-wider text-amber-700">Most common misconception</p>
                  </div>
                  <p className="font-black text-[#11233f] leading-snug">{topMisconception.misconception}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {topMisconception.topics.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">{t}</span>
                    ))}
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Found in {topMisconception.count} {topMisconception.count === 1 ? 'session' : 'sessions'}
                    </span>
                  </div>
                </div>
              )}
              {latestReteach && (
                <div className="panel rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={16} className="text-blue-700" />
                    <p className="text-xs font-black uppercase tracking-wider text-blue-700">Recommended action</p>
                  </div>
                  <p className="text-sm font-semibold text-[#11233f] leading-relaxed">{latestReteach}</p>
                </div>
              )}
            </section>
          )}

          {/* === PRIORITY 4: Quick stats row === */}
          {totalStudents > 0 && (
            <div className="flex flex-wrap gap-2">
              <StatPill icon={Users} label="students" value={totalStudents} color="bg-slate-50 border-slate-200 text-slate-700" />
              <StatPill icon={BookOpen} label="sessions this week" value={dashboard.sessionsThisWeek || 0} color="bg-blue-50 border-blue-100 text-blue-700" />
              {improvementRate > 0 && (
                <StatPill icon={TrendingUp} label="% improving" value={improvementRate} color="bg-emerald-50 border-emerald-100 text-emerald-700" />
              )}
              {studentsNeedingSupport > 0 && (
                <StatPill icon={AlertTriangle} label="need support" value={studentsNeedingSupport} color="bg-rose-50 border-rose-100 text-rose-700" />
              )}
            </div>
          )}

          {/* === PRIORITY 5: Intervention plan + risk students (full) === */}
          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <InterventionRecommendations
              reteachPlan={dashboard.latestReteach}
              weakTopic={dashboard.mostCommonWeakTopic}
              studentsNeedingSupport={studentsNeedingSupport}
              riskStudents={riskStudents}
            />
            <RiskStudents students={riskStudents} />
          </section>

          {/* === PRIORITY 6: Misconception history === */}
          {misconceptions.length > 0 && (
            <MisconceptionTracker misconceptions={misconceptions} />
          )}

          {/* === PRIORITY 7: Recent sessions === */}
          <div className="panel rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Session history</p>
                <h2 className="mt-1 text-lg font-black text-[#11233f]">Recent check-ins</h2>
              </div>
              <Link
                to="/sessions/new"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                <Plus size={14} />
                New check-in
              </Link>
            </div>

            <div className="space-y-2">
              {!recentSessions.length && (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-500">No sessions yet</p>
                  <p className="mt-1 text-xs text-slate-400">Start your first diagnostic check-in to identify learning gaps</p>
                  <Link
                    to="/sessions/new"
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    <Plus size={14} />
                    Start first check-in
                  </Link>
                </div>
              )}
              {recentSessions.map((session) => {
                const needsSupport = session.groupedStudents?.needsSupport?.length || 0;
                const totalResponses = session.responses?.length || 0;
                return (
                  <Link
                    key={session._id}
                    to={`/sessions/${session._id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black text-[#11233f]">{session.topic}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(session.date)} · {totalResponses} responses
                        {needsSupport > 0 && (
                          <span className="ml-2 text-rose-600 font-bold">· {needsSupport} need support</span>
                        )}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black uppercase ${statusColor[session.status] || statusColor.pending}`}>
                      {session.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
