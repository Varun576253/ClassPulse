import {
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  MessageSquareHeart,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import ClassActionPlan from '../components/ClassActionPlan';
import InterventionPlans from '../components/InterventionPlans';
import LiveResponseFeed from '../components/LiveResponseFeed';
import SessionGapAnalysis from '../components/SessionGapAnalysis';
import { addNotification } from '../utils/notifications';

const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#11233f] px-5 py-3 text-sm font-semibold text-white shadow-2xl">
    {message}
    <button type="button" onClick={onClose} className="ml-3 opacity-60 hover:opacity-100">✕</button>
  </div>
);

const statusBadge = {
  active: 'border-blue-200 bg-blue-50 text-blue-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  closed: 'border-slate-200 bg-slate-100 text-slate-500',
  pending: 'border-amber-200 bg-amber-50 text-amber-700'
};

const SessionResults = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [settingDeadline, setSettingDeadline] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [sseConnected, setSseConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [now, setNow] = useState(Date.now());
  const sseRef = useRef(null);

  const showLocalToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadSession = useCallback(async () => {
    try {
      const [sessionRes, studentsRes] = await Promise.all([
        api.get(`/sessions/${sessionId}`),
        api.get(`/sessions/${sessionId}/students`).catch(() => ({ data: { students: [] } }))
      ]);
      setSession(sessionRes.data.session);
      setStudents(studentsRes.data.students || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadSession(); }, [loadSession]);

  useEffect(() => {
    if (!sessionId) return undefined;
    const token = localStorage.getItem('classpulse-teacher') || '';
    const evtSource = new EventSource(`${api.defaults.baseURL}/sessions/${sessionId}/stream?token=${token}`);
    sseRef.current = evtSource;

    evtSource.onopen = () => setSseConnected(true);

    evtSource.addEventListener('response_received', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.session) setSession(data.session);
        if (data.message) setMessages((prev) => [...prev, data.message]);
      } catch (_) {}
    });

    evtSource.addEventListener('analysis_complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.session) setSession(data.session);
        showLocalToast('Learning gap analysis complete.');
        addNotification({
          type: 'session_completed',
          title: 'Gap analysis complete',
          detail: `${data.session?.topic || 'Session'} — gaps detected and grouped.`,
          to: `/sessions/${sessionId}`,
          dedupeKey: `session-completed-${sessionId}`
        });
      } catch (_) {}
    });

    evtSource.addEventListener('session_closed', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.session) setSession(data.session);
        showLocalToast('Session closed.');
      } catch (_) {
        showLocalToast('Session closed.');
      }
    });

    evtSource.addEventListener('deadline_set', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.session) setSession(data.session);
        showLocalToast('Deadline set.');
      } catch (_) {}
    });

    evtSource.onerror = () => setSseConnected(false);

    return () => {
      evtSource.close();
      sseRef.current = null;
      setSseConnected(false);
    };
  }, [sessionId, addNotification]);

  useEffect(() => {
    if (session?.status !== 'active' || sseConnected) return undefined;
    const timer = window.setInterval(loadSession, 5000);
    return () => window.clearInterval(timer);
  }, [loadSession, session?.status, sseConnected]);

  useEffect(() => {
    if (!session?.deadline || session.status !== 'active') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.deadline, session?.status]);

  const analyze = async () => {
    try {
      setAnalysing(true);
      setError('');
      setNotice('');
      const response = await api.post(`/sessions/${sessionId}/analyze`);
      setSession(response.data.session);
      setNotice('Learning gap analysis complete. Students grouped by understanding level.');
      addNotification({
        type: 'session_completed',
        title: 'Gap analysis complete',
        detail: `${response.data.session?.topic || 'Session'} — gaps detected and grouped.`,
        to: `/sessions/${sessionId}`,
        dedupeKey: `session-completed-${sessionId}`
      });
      await loadSession();
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalysing(false);
    }
  };

  const sendFeedback = async () => {
    try {
      setFeedbackSending(true);
      setError('');
      const response = await api.post(`/sessions/${sessionId}/feedback`);
      const count = response.data.saved ?? response.data.sent ?? 0;
      setNotice(`Personalised feedback saved for ${count} students.`);
      showLocalToast(`Feedback saved for ${count} students`);
      await loadSession();
    } catch (err) {
      setError(err.message);
      showLocalToast(err.message);
    } finally {
      setFeedbackSending(false);
    }
  };

  const closeSession = async () => {
    if (!window.confirm("Close session? Students won't be able to submit after this.")) return;
    try {
      setClosingSession(true);
      setError('');
      const response = await api.post(`/sessions/${sessionId}/close`);
      setSession(response.data.session);
      showLocalToast('Session closed.');
    } catch (err) {
      setError(err.message);
      showLocalToast(err.message);
    } finally {
      setClosingSession(false);
    }
  };

  const setDeadline = async (minutes) => {
    const custom = minutes === 'custom' ? Number(window.prompt('Close after how many minutes? 1-60')) : minutes;
    if (!custom) return;
    try {
      setSettingDeadline(true);
      setError('');
      const response = await api.post(`/sessions/${sessionId}/deadline`, { minutes: custom });
      setSession(response.data.session);
      setDeadlineOpen(false);
      showLocalToast(`Deadline set for ${custom} minutes.`);
    } catch (err) {
      setError(err.message);
      showLocalToast(err.message);
    } finally {
      setSettingDeadline(false);
    }
  };

  const groups = useMemo(
    () => session?.groupedStudents || { advanced: [], average: [], needsSupport: [] },
    [session]
  );
  const insight = session?.classInsight || {};

  if (loading) {
    return (
      <div className="flex items-center gap-3 panel rounded-xl p-6">
        <Loader2 size={18} className="animate-spin text-slate-400" />
        <span className="font-semibold text-slate-600">Loading session...</span>
      </div>
    );
  }

  if (!session) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 p-5 font-semibold text-rose-800">{error || 'Session not found.'}</p>;
  }

  const responseCount = session.responses?.length || 0;
  const totalStudents = students.length;
  const pendingCount = totalStudents ? Math.max(totalStudents - responseCount, 0) : 0;
  const deadlineMs = session.deadline ? new Date(session.deadline).getTime() - now : null;
  const deadlineLabel = deadlineMs !== null && deadlineMs > 0
    ? `${Math.floor(deadlineMs / 60000)}:${String(Math.floor((deadlineMs % 60000) / 1000)).padStart(2, '0')}`
    : '';

  const exportRows = (session.responses || []).map((response) => {
    const student = response.studentId || {};
    const score = Number(response.score || 0);
    const understood = response.understood === 'yes' ? 'Mastered' : response.understood === 'partial' ? 'Partial gap' : 'Has gap';
    return {
      name: student.name || response.studentName || 'Student',
      mobile: student.phone || response.studentMobile || '',
      score,
      percent: `${score}%`,
      status: understood,
      submittedAt: response.submittedAt ? new Date(response.submittedAt).toLocaleString() : ''
    };
  });
  const filteredRows = exportRows
    .filter((row) => `${row.name} ${row.mobile} ${row.status}`.toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortConfig.key];
      const bv = b[sortConfig.key];
      const result = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortConfig.direction === 'asc' ? result : -result;
    });
  const classAvg = exportRows.length ? Math.round(exportRows.reduce((sum, row) => sum + row.score, 0) / exportRows.length) : 0;
  const summaryCounts = {
    mastered: exportRows.filter((row) => row.status === 'Mastered').length,
    partial: exportRows.filter((row) => row.status === 'Partial gap').length,
    gap: exportRows.filter((row) => row.status === 'Has gap').length
  };
  const sortBy = (key) => setSortConfig((curr) => ({
    key,
    direction: curr.key === key && curr.direction === 'asc' ? 'desc' : 'asc'
  }));
  const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const exportData = () => {
    const headers = ['Student Name', 'Mobile', 'Score', '%', 'Understanding', 'Submitted At'];
    const rows = filteredRows.map((row) => [row.name, row.mobile, row.score, row.percent, row.status, row.submittedAt]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${String(session.topic || 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-gaps-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copyTable = async () => {
    const headers = ['Student Name', 'Mobile', 'Score', '%', 'Understanding', 'Submitted At'];
    const rows = filteredRows.map((row) => [row.name, row.mobile, row.score, row.percent, row.status, row.submittedAt]);
    await navigator.clipboard.writeText([headers, ...rows].map((row) => row.join('\t')).join('\n'));
    showLocalToast('Table copied.');
  };

  const hasAnalysis = !!(insight.teacherSummary || insight.commonMistake || insight.reteachActivity);

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Response Data Export</p>
                <h2 className="text-xl font-black text-[#11233f]">{session.topic} — Gap Report</h2>
              </div>
              <button type="button" onClick={() => setExportOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" title="Close">
                <X size={16} />
              </button>
            </div>

            <section className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ['Total students', totalStudents || exportRows.length],
                ['Submitted', `${responseCount} / ${totalStudents || exportRows.length}`],
                ['Mastered', summaryCounts.mastered],
                ['Partial gap', summaryCounts.partial],
                ['Has gap', summaryCounts.gap],
                ['Class avg', `${classAvg}%`]
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-lg font-black text-[#11233f]">{value}</p>
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                </div>
              ))}
            </section>

            <input
              className="field mb-4"
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              placeholder="Filter students..."
            />

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    {[['name', 'Student Name'], ['mobile', 'Mobile'], ['score', 'Score'], ['status', 'Understanding'], ['submittedAt', 'Submitted At']].map(([key, label]) => (
                      <th key={label} className="cursor-pointer px-3 py-2 font-black" onClick={() => sortBy(key)}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={`${row.name}-${row.submittedAt}`} className={`border-t border-slate-200 ${
                      row.status === 'Mastered' ? 'bg-emerald-50' : row.status === 'Partial gap' ? 'bg-amber-50' : 'bg-rose-50'
                    }`}>
                      <td className="px-3 py-2 font-bold text-[#11233f]">{row.name}</td>
                      <td className="px-3 py-2 text-slate-600">{row.mobile}</td>
                      <td className="px-3 py-2 font-bold text-slate-700">{row.percent}</td>
                      <td className="px-3 py-2 font-bold text-slate-700">{row.status}</td>
                      <td className="px-3 py-2 text-slate-600">{row.submittedAt}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-white">
                    <td colSpan="5" className="px-3 py-3 text-sm font-black text-[#11233f]">
                      {filteredRows.length} students · {summaryCounts.gap} have gaps · {summaryCounts.mastered} mastered
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={exportData} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700">
                <Download size={15} />
                Download CSV
              </button>
              <button type="button" onClick={copyTable} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Copy Table
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs font-bold text-blue-600 hover:underline">Dashboard</Link>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs text-slate-400">Session</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-black text-[#11233f]">{session.topic}</h1>
            <span className={`rounded-lg border px-2.5 py-1 text-xs font-black uppercase ${statusBadge[session.status] || statusBadge.pending}`}>
              {session.status === 'active' && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-middle animate-pulse" />}
              {session.status}
            </span>
            {session.status === 'active' && (
              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold ${sseConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                {sseConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
                {sseConnected ? 'Live' : 'Polling'}
              </span>
            )}
            {session.status === 'active' && deadlineLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
                <Clock size={11} />
                Closes in: {deadlineLabel}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {session.teacherId?.name} / {session.grade} / {session.subject} / {session.language}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={loadSession} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button type="button" onClick={() => setExportOpen(true)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
            <Download size={15} />
            Export
          </button>
          {session.status === 'active' && (
            <div className="relative">
              <button type="button" onClick={() => setDeadlineOpen((open) => !open)} disabled={settingDeadline} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50">
                {settingDeadline ? <Loader2 size={15} className="animate-spin" /> : <Clock size={15} />}
                Set Deadline
              </button>
              {deadlineOpen && (
                <div className="absolute right-0 top-11 z-20 grid min-w-36 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {[5, 10, 15, 30].map((minutes) => (
                    <button key={minutes} type="button" onClick={() => setDeadline(minutes)} className="rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50">{minutes} min</button>
                  ))}
                  <button type="button" onClick={() => setDeadline('custom')} className="rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50">Custom</button>
                </div>
              )}
            </div>
          )}
          {session.status === 'active' && (
            <button type="button" onClick={closeSession} disabled={closingSession} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50">
              {closingSession ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
              Close Session
            </button>
          )}
          <button type="button" onClick={analyze} disabled={!responseCount || analysing} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#11233f] px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">
            <BarChart3 size={15} />
            {analysing ? 'Detecting gaps…' : 'Detect learning gaps'}
          </button>
          <button type="button" onClick={sendFeedback} disabled={!responseCount || feedbackSending} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
            <MessageSquareHeart size={15} />
            {feedbackSending ? 'Saving…' : 'Send feedback'}
          </button>
        </div>
      </section>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-800">{error}</p>}
      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p className="font-semibold text-emerald-800">{notice}</p>
        </div>
      )}

      {session?.qrCode && (
        <div className="flex items-center gap-4 panel rounded-xl p-4">
          <img src={session.qrCode} alt="QR code for students" style={{ width: 80, height: 80 }} className="rounded-lg" />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Diagnostic session link</p>
            <p className="text-sm font-semibold text-slate-700 break-all mt-1">{session.quizUrl}</p>
            <button onClick={() => navigator.clipboard.writeText(session.quizUrl)} className="mt-2 text-xs text-blue-600 hover:underline">Copy link</button>
          </div>
        </div>
      )}

      {session.status === 'active' && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">Collecting responses</p>
              <p className="mt-1 text-sm font-semibold text-blue-900">
                Students scan the QR and submit answers. Tap "Detect learning gaps" to analyse.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              {totalStudents ? `${pendingCount} pending · ${responseCount} received` : `${responseCount} received`}
            </span>
          </div>
        </section>
      )}
      {session.status === 'closed' && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-600">Session closed — no more responses accepted. Run gap detection to analyse results.</p>
        </section>
      )}

      <SessionGapAnalysis
        insight={insight}
        groups={groups}
        responseCount={responseCount}
        totalStudents={totalStudents}
      />

      {hasAnalysis && (
        <ClassActionPlan insight={insight} groups={groups} topic={session.topic} />
      )}

      {responseCount > 0 && (
        <InterventionPlans groups={groups} insight={insight} />
      )}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        {hasAnalysis ? (
          <section className="panel rounded-xl p-5 space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Gap insights</p>
            {insight.recurringMisconception && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-xs font-black uppercase text-amber-600 mb-1.5">Recurring pattern across sessions</p>
                <p className="text-sm leading-6 text-amber-900">{insight.recurringMisconception}</p>
              </div>
            )}
            {insight.commonMistake && (
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
                <p className="text-xs font-black uppercase text-rose-600 mb-1.5">This session — common mistake</p>
                <p className="text-sm leading-6 text-rose-900">{insight.commonMistake}</p>
              </div>
            )}
            {insight.reteachActivity && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-xs font-black uppercase text-emerald-600 mb-1.5">Recommended reteach activity</p>
                <p className="text-sm leading-6 text-emerald-900">{insight.reteachActivity}</p>
              </div>
            )}
          </section>
        ) : (
          <section className="panel rounded-xl p-5 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-400">
                {responseCount > 0
                  ? 'Tap "Detect learning gaps" to surface misconceptions and generate intervention plans.'
                  : 'Gap insights appear once students respond.'}
              </p>
            </div>
          </section>
        )}

        <LiveResponseFeed responses={session.responses} messages={messages} isLive={sseConnected} />
      </section>
    </div>
  );
};

export default SessionResults;
