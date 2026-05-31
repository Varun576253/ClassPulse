import { Plus, RefreshCw, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import TopicWeaknessChart from '../charts/TopicWeaknessChart';
import UnderstandingChart from '../charts/UnderstandingChart';
import DashboardCards from '../components/DashboardCards';
import MisconceptionTracker from '../components/MisconceptionTracker';
import RiskStudents from '../components/RiskStudents';
import TeacherInsights from '../components/TeacherInsights';

const formatDate = (value) => new Date(value).toLocaleString([], {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
});

const statusColor = {
  active: 'bg-blue-100 text-blue-700',
  pending: 'bg-slate-100 text-slate-600',
  completed: 'bg-emerald-100 text-emerald-700'
};

const savedTeacherId = () => localStorage.getItem('classpulse-teacher') || '';

const Dashboard = () => {
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [dashboard, setDashboard] = useState({});
  const [riskStudents, setRiskStudents] = useState([]);
  const [misconceptions, setMisconceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const response = await api.get('/teachers');
        const teacherList = response.data.teachers || [];
        const savedId = savedTeacherId();
        const nextId = teacherList.some((t) => t._id === savedId)
          ? savedId
          : teacherList[0]?._id || '';
        setTeachers(teacherList);
        setTeacherId(nextId);
        if (nextId) localStorage.setItem('classpulse-teacher', nextId);
        else localStorage.removeItem('classpulse-teacher');
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    loadTeachers();
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

  const selectedTeacher = teachers.find((t) => t._id === teacherId);
  const recentSessions = dashboard.recentSessions || [];
  const hasActiveSession = recentSessions.some((session) => session.status === 'active');

  useEffect(() => {
    if (!teacherId || !hasActiveSession) return undefined;
    const timer = window.setInterval(() => loadDashboard({ background: true }), 5000);
    return () => window.clearInterval(timer);
  }, [teacherId, hasActiveSession, loadDashboard]);

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">Dashboard</p>
          <h1 className="mt-1 text-3xl font-black text-[#11233f]">
            {selectedTeacher ? `${selectedTeacher.name}'s class` : 'Class pulse'}
          </h1>
          {selectedTeacher && (
            <p className="mt-1 text-sm text-slate-500">
              {selectedTeacher.school} · {selectedTeacher.subject} · {selectedTeacher.grade}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="field w-auto min-w-[180px]"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            {!teachers.length && <option value="">No teachers</option>}
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>{t.name} · {t.grade}</option>
            ))}
          </select>
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
            New session
          </Link>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-800">{error}</p>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="panel h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          <DashboardCards dashboard={dashboard} />

          <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <TeacherInsights
              insight={dashboard.latestInsight}
              weakTopic={dashboard.mostCommonWeakTopic}
              improvedStudent={dashboard.mostImprovedStudent}
            />
            <RiskStudents students={riskStudents} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <UnderstandingChart sessions={recentSessions} />
            <TopicWeaknessChart sessions={recentSessions} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
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
                  Start check
                </Link>
              </div>

              <div className="space-y-2">
                {!recentSessions.length && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                    <TrendingUp size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">No sessions yet</p>
                    <p className="mt-1 text-xs text-slate-400">Start your first diagnostic check-in</p>
                  </div>
                )}
                {recentSessions.map((session) => (
                  <Link
                    key={session._id}
                    to={`/sessions/${session._id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black text-[#11233f]">{session.topic}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(session.date)} · {session.responses?.length || 0} responses
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black uppercase ${statusColor[session.status] || statusColor.pending}`}>
                      {session.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <MisconceptionTracker misconceptions={misconceptions} />
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
