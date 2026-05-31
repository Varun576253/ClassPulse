import { BarChart3, CheckCircle2, Clock, Download, Loader2, MessageSquareHeart, RefreshCw, Wifi, WifiOff, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import ClassBreakdown from '../components/ClassBreakdown';
import LiveResponseFeed from '../components/LiveResponseFeed';
import ReteachSuggestion from '../components/ReteachSuggestion';
import { addNotification } from '../utils/notifications';

const statusBadge = {
  active: 'bg-blue-100 text-blue-700 border-blue-200',
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200'
};

const eventSourceUrl = (path) => {
  const rawBase = import.meta.env.VITE_API_URL || '';
  const base = rawBase.replace(/\/api\/?$/, '').replace(/\/$/, '');
  return `${base}/api${path}`;
};

const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl shadow-emerald-100 animate-slide-up">
    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
    <p className="text-sm font-bold text-[#11233f]">{message}</p>
    <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-600" title="Dismiss">
      <X size={14} />
    </button>
  </div>
);

const SessionResults = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [settingDeadline, setSettingDeadline] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sseConnected, setSseConnected] = useState(false);
  const [toast, setToast] = useState('');
  const sseRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 4000);
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const response = await api.get(`/sessions/${sessionId}`);
      const nextSession = response.data.session;
      const teacherId = nextSession.teacherId?._id || nextSession.teacherId;
      setSession(nextSession);
      setMessages(response.data.messages || []);
      if (teacherId) {
        const studentsRes = await api.get(`/students/${teacherId}`);
        setStudents(studentsRes.data.students || []);
      }
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadSession(); }, [loadSession]);

  useEffect(() => {
    if (!sessionId) return undefined;

    const evtSource = new EventSource(eventSourceUrl(`/sessions/${sessionId}/events`));
    sseRef.current = evtSource;

    evtSource.addEventListener('connected', () => setSseConnected(true));

    evtSource.addEventListener('response', (event) => {
      try {
        const data = JSON.parse(event.data);
        setSession((prev) => {
          if (!prev) return prev;
          const prevCount = prev.responses?.length || 0;
          const nextCount = data.responses?.length || 0;
          if (nextCount > prevCount) {
            const latestResponse = data.responses[data.responses.length - 1];
            const newStudent = latestResponse?.studentId?.name || latestResponse?.studentName;
            showToast(newStudent ? `New reply from ${newStudent}!` : 'New student response received!');
            addNotification({
              type: 'student_answer',
              title: newStudent ? `New answer from ${newStudent}` : 'Student submitted answers',
              detail: `Answers received for ${prev.topic || 'this session'}.`,
              to: `/sessions/${sessionId}`,
              dedupeKey: `session-response-${sessionId}-${nextCount}`
            });
          }
          return { ...prev, responses: data.responses || prev.responses };
        });
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } catch (_) {}
    });

    evtSource.addEventListener('analysed', (event) => {
      try {
        const data = JSON.parse(event.data);
        setSession(data.session);
        showToast('Analysis complete.');
        addNotification({
          type: 'session_completed',
          title: 'New assessment completed',
          detail: `${data.session?.topic || 'Session'} analysis is complete.`,
          to: `/sessions/${sessionId}`,
          dedupeKey: `session-completed-${sessionId}`
        });
      } catch (_) {}
    });

    evtSource.addEventListener('session_closed', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.session) setSession(data.session);
        showToast('Session closed.');
      } catch (_) {
        showToast('Session closed.');
      }
    });

    evtSource.addEventListener('deadline_set', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.session) setSession(data.session);
        showToast('Deadline set.');
      } catch (_) {}
    });

    evtSource.onerror = () => setSseConnected(false);

    return () => {
      evtSource.close();
      sseRef.current = null;
      setSseConnected(false);
    };
  }, [sessionId, showToast]);

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
      setNotice('Analysis complete. Personalised feedback saved for students.');
      addNotification({
        type: 'session_completed',
        title: 'New assessment completed',
        detail: `${response.data.session?.topic || 'Session'} analysis is complete.`,
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
      setNotice(`Feedback saved for ${count} students.`);
      showToast(`Feedback saved for ${count} students`);
      await loadSession();
    } catch (err) {
      setError(err.message);
      showToast(err.message);
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
      showToast('Session closed.');
    } catch (err) {
      setError(err.message);
      showToast(err.message);
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
      showToast(`Deadline set for ${custom} minutes.`);
    } catch (err) {
      setError(err.message);
      showToast(err.message);
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
    const understood = response.understood === 'yes' ? 'Understood' : response.understood === 'partial' ? 'Partial' : 'Struggling';
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
  const highest = exportRows.length ? Math.max(...exportRows.map((row) => row.score)) : 0;
  const lowest = exportRows.length ? Math.min(...exportRows.map((row) => row.score)) : 0;
  const summaryCounts = {
    understood: exportRows.filter((row) => row.status === 'Understood').length,
    partial: exportRows.filter((row) => row.status === 'Partial').length,
    struggling: exportRows.filter((row) => row.status === 'Struggling').length
  };
  const sortBy = (key) => setSortConfig((curr) => ({
    key,
    direction: curr.key === key && curr.direction === 'asc' ? 'desc' : 'asc'
  }));
  const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const exportData = () => {
    const headers = ['Student Name', 'Mobile', 'Score', '%', 'Status', 'Submitted At'];
    const rows = filteredRows.map((row) => [row.name, row.mobile, row.score, row.percent, row.status, row.submittedAt]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${String(session.topic || 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copyTable = async () => {
    const headers = ['Student Name', 'Mobile', 'Score', '%', 'Status', 'Submitted At'];
    const rows = filteredRows.map((row) => [row.name, row.mobile, row.score, row.percent, row.status, row.submittedAt]);
    await navigator.clipboard.writeText([headers, ...rows].map((row) => row.join('\t')).join('\n'));
    showToast('Table copied.');
  };

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Export Data</p>
                <h2 className="text-xl font-black text-[#11233f]">Student Results - {session.topic}</h2>
              </div>
              <button type="button" onClick={() => setExportOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" title="Close">
                <X size={16} />
              </button>
            </div>

            <section className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ['Total students', totalStudents || exportRows.length],
                ['Submitted', `${responseCount} / ${totalStudents || exportRows.length}`],
                ['Understood', summaryCounts.understood],
                ['Partial', summaryCounts.partial],
                ['Struggling', summaryCounts.struggling],
                ['Class avg', `${classAvg}%`],
                ['Highest score', `${highest}%`],
                ['Lowest score', `${lowest}%`]
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
                    {[
                      ['name', 'Student Name'],
                      ['mobile', 'Mobile'],
                      ['score', 'Score'],
                      ['score', '%'],
                      ['status', 'Status'],
                      ['submittedAt', 'Submitted At']
                    ].map(([key, label]) => (
                      <th key={label} className="cursor-pointer px-3 py-2 font-black" onClick={() => sortBy(key)}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={`${row.name}-${row.submittedAt}`} className={`border-t border-slate-200 ${
                      row.status === 'Understood' ? 'bg-emerald-50' : row.status === 'Partial' ? 'bg-amber-50' : 'bg-rose-50'
                    }`}>
                      <td className="px-3 py-2 font-bold text-[#11233f]">{row.name}</td>
                      <td className="px-3 py-2 text-slate-600">{row.mobile}</td>
                      <td className="px-3 py-2 font-bold text-slate-700">{row.score}</td>
                      <td className="px-3 py-2 font-bold text-slate-700">{row.percent}</td>
                      <td className="px-3 py-2 font-bold text-slate-700">{row.status}</td>
                      <td className="px-3 py-2 text-slate-600">{row.submittedAt}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-white">
                    <td colSpan="6" className="px-3 py-3 text-sm font-black text-[#11233f]">
                      {filteredRows.length} students | Class avg: {classAvg}%
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
          <button
            type="button"
            onClick={loadSession}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <Download size={15} />
            Export Data
          </button>
          {session.status === 'active' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDeadlineOpen((open) => !open)}
                disabled={settingDeadline}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {settingDeadline ? <Loader2 size={15} className="animate-spin" /> : <Clock size={15} />}
                Set Deadline
              </button>
              {deadlineOpen && (
                <div className="absolute right-0 top-11 z-20 grid min-w-36 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {[5, 10, 15, 30].map((minutes) => (
                    <button key={minutes} type="button" onClick={() => setDeadline(minutes)} className="rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50">
                      {minutes} min
                    </button>
                  ))}
                  <button type="button" onClick={() => setDeadline('custom')} className="rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-600 hover:bg-slate-50">
                    Custom
                  </button>
                </div>
              )}
            </div>
          )}
          {session.status === 'active' && (
            <button
              type="button"
              onClick={closeSession}
              disabled={closingSession}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-600 disabled:opacity-50"
            >
              {closingSession ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
              Close Session
            </button>
          )}
          <button
            type="button"
            onClick={analyze}
            disabled={!responseCount || analysing}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#11233f] px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <BarChart3 size={15} />
            {analysing ? 'Analysing...' : 'Analyse responses'}
          </button>
          <button
            type="button"
            onClick={sendFeedback}
            disabled={!responseCount || feedbackSending}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <MessageSquareHeart size={15} />
            {feedbackSending ? 'Sending...' : 'Send feedback'}
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
          <img src={session.qrCode} alt="QR" style={{ width: 80, height: 80 }} className="rounded-lg" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Quiz Link</p>
            <p className="text-sm font-semibold text-slate-700 break-all mt-1">{session.quizUrl}</p>
            <button
              onClick={() => navigator.clipboard.writeText(session.quizUrl)}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >Copy link</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel rounded-xl p-4">
          <p className="text-2xl font-black text-[#11233f]">{responseCount}
            {totalStudents > 0 && <span className="ml-1 text-base font-semibold text-slate-400">/ {totalStudents}</span>}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Responses received</p>
          {totalStudents > 0 && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min(100, Math.round((responseCount / totalStudents) * 100))}%` }} />
            </div>
          )}
        </div>
        <div className="panel rounded-xl p-4">
          <p className="text-2xl font-black text-emerald-600">{groups.advanced?.length || 0}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Advanced</p>
        </div>
        <div className="panel rounded-xl p-4">
          <p className="text-2xl font-black text-rose-600">{groups.needsSupport?.length || 0}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Need support</p>
        </div>
      </div>

      {session.status === 'active' && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">Listening for real replies</p>
              <p className="mt-1 text-sm font-semibold text-blue-900">
                Students scan the QR code and submit answers. Responses appear in the live feed automatically.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              {totalStudents ? `${pendingCount} pending` : 'Session active'}
            </span>
          </div>
        </section>
      )}
      {session.status === 'closed' && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-600">Session closed. No more responses accepted.</p>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <ClassBreakdown insight={insight} responseCount={responseCount} />
        <ReteachSuggestion insight={insight} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <section className="panel rounded-xl p-5">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">AI class analysis</p>
          <div className="space-y-3">
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
              <p className="text-xs font-black uppercase text-rose-600 mb-1.5">Common misconception</p>
              <p className="text-sm leading-6 text-rose-900">{insight.commonMistake || 'Run analysis to surface misconceptions.'}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-xs font-black uppercase text-amber-600 mb-1.5">Recurring pattern</p>
              <p className="text-sm leading-6 text-amber-900">{insight.recurringMisconception || 'Patterns appear after multiple sessions.'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs font-black uppercase text-slate-400 mb-1.5">Teacher summary</p>
              <p className="text-sm leading-6 text-slate-700">{insight.teacherSummary || 'Analyse responses to generate classroom summary.'}</p>
            </div>
          </div>
        </section>

        <LiveResponseFeed responses={session.responses} messages={messages} isLive={sseConnected} />
      </section>

      {responseCount > 0 && (
        <section>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Student breakdown</p>
          <div className="grid gap-4 xl:grid-cols-3">
            {[
              { label: 'Advanced', key: 'advanced', color: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
              { label: 'Average', key: 'average', color: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50', dot: 'bg-amber-500' },
              { label: 'Needs support', key: 'needsSupport', color: 'text-rose-700', border: 'border-rose-200', bg: 'bg-rose-50', dot: 'bg-rose-500' }
            ].map(({ label, key, color, border, bg, dot }) => (
              <section key={label} className={`rounded-xl border ${border} ${bg} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    <h3 className={`font-black text-sm ${color}`}>{label}</h3>
                  </div>
                  <span className="rounded-lg bg-white/70 px-2 py-0.5 text-sm font-black text-slate-600">
                    {groups[key]?.length || 0}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {!groups[key]?.length && <p className="text-xs text-slate-400 py-2">Analyse responses to populate.</p>}
                  {(groups[key] || []).map((student) => (
                    <Link
                      key={student.studentId || student._id}
                      to={`/students/${student.studentId || student._id}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm transition hover:bg-white"
                    >
                      <span className="font-semibold text-[#11233f] truncate">{student.name}</span>
                      <span className={`text-xs font-black shrink-0 ${color}`}>{student.score || 0}%</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default SessionResults;
