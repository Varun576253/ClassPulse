import { ArrowLeft, BadgeCheck, ClipboardCheck, Loader2, MessageCircleHeart, Pencil, TrendingUp, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import ProgressChart from '../charts/ProgressChart';
import StudentTimeline from '../components/StudentTimeline';

const riskBadge = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-900',
  high: 'bg-rose-100 text-rose-800'
};

const confidenceBadge = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-rose-50 text-rose-700 border-rose-200'
};

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Marathi', 'Tamil'];

const StudentProgress = () => {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [answerSheets, setAnswerSheets] = useState([]);
  const [studentAnalyses, setStudentAnalyses] = useState([]);
  const [remediationHistory, setRemediationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', grade: '', language: 'English' });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get(`/students/progress/${studentId}`);
        setStudent(response.data.student);
        setMessages(response.data.messages || []);
        setAnswerSheets(response.data.answerSheets || []);
        setStudentAnalyses(response.data.studentAnalyses || []);
        setRemediationHistory(response.data.remediationHistory || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [studentId]);

  const confidenceTrend = useMemo(
    () => (student?.progressHistory || []).slice().reverse().slice(0, 6),
    [student]
  );

  const feedbackMessages = useMemo(
    () => messages.filter((m) => m.type === 'feedback').slice(0, 5),
    [messages]
  );

  const latestScore = student?.progressHistory?.at(-1)?.score ?? null;
  const sessionCount = student?.progressHistory?.length || 0;
  const avgScore = sessionCount
    ? Math.round(student.progressHistory.reduce((sum, e) => sum + (e.score || 0), 0) / sessionCount)
    : 0;
  const assessmentHistory = (student?.learningProfile?.assessmentHistory || []).slice().reverse().slice(0, 5);
  const interventionHistory = (student?.learningProfile?.interventionHistory || []).slice().reverse().slice(0, 5);
  const recentAnalyses = studentAnalyses.slice(0, 5);
  const recentSheets = answerSheets.slice(0, 6);

  const openEdit = () => {
    setEditForm({
      name: student.name || '',
      phone: student.phone || '',
      grade: student.grade || '',
      language: student.language || 'English'
    });
    setEditOpen(true);
    setError('');
    setNotice('');
  };

  const updateEdit = (field, value) => {
    const nextValue = field === 'phone' ? value.replace(/[^0-9+]/g, '') : value;
    setEditForm((curr) => ({ ...curr, [field]: nextValue }));
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      setNotice('');
      const response = await api.put(`/students/${student._id}`, editForm);
      setStudent({ ...response.data.student, teacherId: student.teacherId });
      setEditOpen(false);
      setNotice(`${response.data.student.name} updated.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 panel rounded-xl p-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span className="font-semibold text-slate-600">Loading student profile...</span>
      </div>
    );
  }

  if (!student) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 p-5 font-semibold text-rose-800">{error || 'Student not found.'}</p>;
  }

  return (
    <div className="space-y-5">
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black text-[#11233f]">Edit student</h2>
              <button type="button" onClick={() => setEditOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" title="Close">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3">
              <input className="field" value={editForm.name} onChange={(e) => updateEdit('name', e.target.value)} required placeholder="Student name" />
              <input className="field" value={editForm.phone} onChange={(e) => updateEdit('phone', e.target.value)} required placeholder="919876543210" />
              <div className="grid grid-cols-2 gap-3">
                <input className="field" value={editForm.grade} onChange={(e) => updateEdit('grade', e.target.value)} placeholder="Class 6" />
                <select className="field" value={editForm.language} onChange={(e) => updateEdit('language', e.target.value)}>
                  {LANGUAGES.map((language) => <option key={language}>{language}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setEditOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />}
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline">
            <ArrowLeft size={13} />
            Dashboard
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-[#11233f]">{student.name}</h1>
            <span className={`rounded-lg px-2 py-1 text-xs font-black uppercase ${riskBadge[student.riskLevel] || riskBadge.low}`}>
              {student.riskLevel} risk
            </span>
            <span className={`rounded-lg border px-2 py-1 text-xs font-black ${confidenceBadge[student.confidenceLevel] || confidenceBadge.medium}`}>
              {student.confidenceLevel} confidence
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {student.grade} · {student.teacherId?.name} · {student.teacherId?.school}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Sessions', value: sessionCount },
            { label: 'Avg score', value: `${avgScore}%` },
            { label: 'Latest', value: latestScore !== null ? `${latestScore}%` : '–' }
          ].map(({ label, value }) => (
            <div key={label} className="panel rounded-xl p-4 text-center min-w-[80px]">
              <p className="text-2xl font-black text-[#11233f]">{value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {notice ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">{notice}</p> : <span />}
        <button
          type="button"
          onClick={openEdit}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <Pencil size={15} />
          Edit student
        </button>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-800">{error}</p>}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <ProgressChart history={student.progressHistory} />

        <section className="panel rounded-xl p-5">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Learning profile</p>

          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-xs font-black uppercase text-emerald-700 mb-2">Strong topics</p>
              <div className="flex flex-wrap gap-2">
                {student.learningProfile?.strongTopics?.length
                  ? student.learningProfile.strongTopics.map((t) => (
                    <span key={t} className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">{t}</span>
                  ))
                  : <span className="text-xs text-emerald-700">Builds with session history</span>
                }
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-xs font-black uppercase text-amber-700 mb-2">Weak topics</p>
              <div className="flex flex-wrap gap-2">
                {student.learningProfile?.weakTopics?.length
                  ? student.learningProfile.weakTopics.map((t) => (
                    <span key={t} className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">{t}</span>
                  ))
                  : <span className="text-xs text-amber-700">No recurring weak topic yet</span>
                }
              </div>
            </div>

            <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
              <p className="text-xs font-black uppercase text-rose-700 mb-2">Recurring mistakes</p>
              <div className="space-y-1.5">
                {student.learningProfile?.recurringMistakes?.length
                  ? student.learningProfile.recurringMistakes.map((m) => (
                    <p key={m} className="rounded-lg bg-white/70 px-3 py-2 text-xs text-rose-900">{m}</p>
                  ))
                  : <p className="text-xs text-rose-700">No repeated mistake recorded</p>
                }
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <div className="mb-2 flex items-center gap-2">
                <ClipboardCheck size={15} className="text-blue-700" />
                <p className="text-xs font-black uppercase text-blue-700">Assessment history</p>
              </div>
              <div className="space-y-2">
                {assessmentHistory.length
                  ? assessmentHistory.map((entry) => (
                    <div key={`${entry.assessmentId}-${entry.date}`} className="rounded-lg bg-white/80 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-[#11233f]">{entry.topic}</span>
                        <span className="text-xs font-black text-blue-700">{Math.round(entry.score || 0)}%</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">{entry.weakTopics?.[0] || entry.strengths?.[0] || 'Profile updated'}</p>
                    </div>
                  ))
                  : <p className="text-xs text-blue-700">Assessment records will appear after answer-sheet analysis</p>
                }
              </div>
            </div>

            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4">
              <div className="mb-2 flex items-center gap-2">
                <UsersRound size={15} className="text-indigo-700" />
                <p className="text-xs font-black uppercase text-indigo-700">Interventions</p>
              </div>
              <div className="space-y-2">
                {interventionHistory.length
                  ? interventionHistory.map((entry) => (
                    <div key={`${entry.groupId}-${entry.concept}`} className="rounded-lg bg-white/80 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-[#11233f]">{entry.concept}</span>
                        <span className="text-xs font-bold capitalize text-indigo-700">{entry.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{entry.interventionType}</p>
                    </div>
                  ))
                  : <p className="text-xs text-indigo-700">Intervention group history will appear here</p>
                }
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <section className="panel rounded-xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck size={17} className="text-blue-600" />
            <h2 className="font-black text-[#11233f]">Assessment results</h2>
          </div>
          {!recentAnalyses.length && (
            <p className="text-sm text-slate-500">No assessment analysis has been recorded for this student yet.</p>
          )}
          <div className="space-y-3">
            {recentAnalyses.map((analysis) => (
              <article key={analysis._id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-[#11233f]">{analysis.assessment?.title || analysis.assessment?.topic || 'Assessment'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {analysis.assessment?.subject || student.teacherId?.subject} Â· {new Date(analysis.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-lg px-2 py-1 text-xs font-black uppercase ${riskBadge[analysis.riskLevel] || riskBadge.low}`}>
                    {Math.round(analysis.percentage || 0)}%
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(analysis.overallWeakTopics || []).slice(0, 4).map((topic) => (
                    <span key={topic} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">{topic}</span>
                  ))}
                  {(analysis.strengths || []).slice(0, 3).map((topic) => (
                    <span key={topic} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">{topic}</span>
                  ))}
                </div>
                {analysis.recommendedIntervention && (
                  <p className="mt-3 text-xs leading-5 text-slate-600">{analysis.recommendedIntervention}</p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="panel rounded-xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck size={17} className="text-emerald-600" />
            <h2 className="font-black text-[#11233f]">Answer sheets</h2>
          </div>
          {!recentSheets.length && (
            <p className="text-sm text-slate-500">Uploaded answer sheets will appear here.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {recentSheets.map((sheet) => (
              <a
                key={sheet._id}
                href={sheet.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex gap-3">
                  {sheet.thumbnailUrl && (
                    <img src={sheet.thumbnailUrl} alt="" className="h-16 w-12 rounded-lg border border-slate-200 object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#11233f]">{sheet.assessment?.title || 'Assessment sheet'}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{sheet.originalFileName}</p>
                    <span className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                      {String(sheet.processingStatus || '').replaceAll('_', ' ')}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          {!!remediationHistory.length && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Remediation records</p>
              <div className="space-y-2">
                {remediationHistory.slice(0, 4).map((item) => (
                  <div key={item._id} className="rounded-lg bg-indigo-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-black text-[#11233f]">{item.concept}</span>
                      <span className="text-xs font-bold capitalize text-indigo-700">{item.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.materialType} Â· {item.assessment?.topic || 'Assessment'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <StudentTimeline history={student.progressHistory} />

        <section className="panel rounded-xl p-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BadgeCheck size={17} className="text-blue-600" />
              <h2 className="font-black text-[#11233f]">Confidence trend</h2>
            </div>
            {!confidenceTrend.length && (
              <p className="text-sm text-slate-500">Confidence signals arrive after AI analysis.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {confidenceTrend.map((item, i) => (
                <div
                  key={i}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                    confidenceBadge[item.confidenceLevel] || confidenceBadge.medium
                  }`}
                >
                  <span className="block">{item.topic}</span>
                  <span className="capitalize opacity-80">{item.confidenceLevel}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircleHeart size={17} className="text-emerald-600" />
              <h2 className="font-black text-[#11233f]">Feedback history</h2>
            </div>
            {!feedbackMessages.length && (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                <TrendingUp size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No WhatsApp feedback yet</p>
                <p className="mt-0.5 text-xs text-slate-400">Feedback is sent after session analysis</p>
              </div>
            )}
            <div className="space-y-3">
              {feedbackMessages.map((msg) => (
                <article key={msg._id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-black uppercase ${
                      msg.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>{msg.deliveryMode} · {msg.status}</span>
                    <span className="text-xs text-slate-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs leading-5 text-slate-700">{msg.content}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
};

export default StudentProgress;
