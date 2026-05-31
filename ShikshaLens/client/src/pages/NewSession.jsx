import { Bot, Edit, Send, Users, WandSparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import CreateCustomQuestions from '../components/CreateCustomQuestions';

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Marathi', 'Tamil'];
const savedTeacherId = () => localStorage.getItem('classpulse-teacher') || '';

const NewSession = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [topics, setTopics] = useState([]);
  const [students, setStudents] = useState([]);
  const [topicChoice, setTopicChoice] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [language, setLanguage] = useState('English');
  const [questions, setQuestions] = useState([]);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sessionMode, setSessionMode] = useState('ai');
  const [showCustomQuestions, setShowCustomQuestions] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [quizUrl, setQuizUrl] = useState('');

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
      } catch (err) {
        setError(err.message);
      }
    };
    loadTeachers();
  }, []);

  useEffect(() => {
    if (!teacherId) return;
    const loadTeacherData = async () => {
      try {
        const response = await api.get(`/teachers/${teacherId}`);
        setTopics(response.data.topics || []);
        setStudents(response.data.students || []);
        setLanguage(response.data.teacher?.language || 'English');
        setTopicChoice(response.data.topics?.[0]?.topicName || 'custom');
        setQuestions([]);
        setQrCode('');
        setQuizUrl('');
      } catch (err) {
        setError(err.message);
      }
    };
    loadTeacherData();
  }, [teacherId]);

  const teacher = teachers.find((t) => t._id === teacherId);
  const topic = topicChoice === 'custom' ? customTopic.trim() : topicChoice;
  const payload = useMemo(() => ({
    teacherId, topic,
    subject: teacher?.subject,
    grade: teacher?.grade,
    language
  }), [teacherId, topic, teacher, language]);

  const previewQuestions = async () => {
    if (!topic || !teacher) { setError('Choose a teacher and topic first.'); return; }
    try {
      setPreviewing(true);
      setError('');
      const response = await api.post('/sessions/questions/preview', payload);
      setQuestions(response.data.questions);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewing(false);
    }
  };

  const startSession = async () => {
    if (!topic || !teacher) { setError('Choose a teacher and topic first.'); return; }
    try {
      setSending(true);
      setError('');
      const response = await api.post('/sessions/start', { ...payload, questions });
      localStorage.setItem('classpulse-teacher', teacherId);
      setQrCode(response.data.qrCode || '');
      setQuizUrl(response.data.quizUrl || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (showCustomQuestions) {
    return (
      <CreateCustomQuestions
        teacherId={teacherId}
        onSessionStart={(session) => navigate(`/sessions/${session._id}`)}
        onCancel={() => setShowCustomQuestions(false)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">New session</p>
        <h1 className="mt-1 text-3xl font-black text-[#11233f]">Send a check-in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Questions are delivered by QR code · AI analyses responses instantly
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="panel rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white">
              <Bot size={19} />
            </span>
            <div>
              <p className="font-black text-[#11233f]">Session setup</p>
              <p className="text-xs text-slate-500">
                {teacher ? `${teacher.subject} · ${teacher.grade} · ${students.length} students` : 'Select a teacher'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {[
              { id: 'ai', label: 'AI generated', icon: WandSparkles },
              { id: 'custom', label: 'Custom questions', icon: Edit }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSessionMode(id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  sessionMode === id
                    ? 'bg-[#11233f] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-bold text-slate-600">
              Teacher
              <select className="field" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>{t.name} · {t.subject}</option>
                ))}
              </select>
            </label>

            {sessionMode === 'ai' && (
              <>
                <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                  Topic
                  <select className="field" value={topicChoice} onChange={(e) => setTopicChoice(e.target.value)}>
                    {topics.map((t) => (
                      <option key={t._id} value={t.topicName}>{t.topicName}</option>
                    ))}
                    <option value="custom">Custom topic...</option>
                  </select>
                </label>
                {topicChoice === 'custom' && (
                  <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                    Custom topic
                    <input
                      className="field"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="e.g. Fractions, Photosynthesis, Verb tenses..."
                    />
                  </label>
                )}
              </>
            )}

            <label className="grid gap-1.5 text-sm font-bold text-slate-600">
              Response language
              <select className="field" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
          </div>

          <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${
            students.length
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}>
            <span className="flex items-center gap-2 font-semibold">
              <Users size={16} />
              {students.length
                ? `${students.length} students in this roster`
                : 'No students in roster yet'
              }
            </span>
            {!students.length && (
              <Link to="/roster" className="font-black hover:underline">Add students</Link>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>
          )}

          {sessionMode === 'ai' ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={previewQuestions}
                disabled={previewing || sending || !topic}
                className="flex flex-1 min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <WandSparkles size={16} />
                {previewing ? 'Generating...' : 'Preview'}
              </button>
              <button
                type="button"
                onClick={startSession}
                disabled={sending || previewing || !topic}
                className="flex flex-1 min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                <Send size={16} />
                {sending ? 'Starting...' : 'Generate QR'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomQuestions(true)}
              disabled={!teacherId}
              className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-[#11233f] px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Edit size={16} />
              Create custom questions
            </button>
          )}

          {qrCode && (
            <div className="panel rounded-xl p-6 text-center mt-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                Students scan this to join
              </p>
              <img
                src={qrCode}
                alt="Quiz QR Code"
                className="mx-auto rounded-xl shadow-md"
                style={{ width: 220, height: 220 }}
              />
              <p className="mt-3 text-sm font-semibold text-slate-600 break-all">{quizUrl}</p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(quizUrl).then(() => alert('Link copied!'))}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Copy Link
              </button>
            </div>
          )}
        </section>

        <section className="panel rounded-xl p-5">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Question preview</p>
              <h2 className="mt-1 text-xl font-black text-[#11233f]">{topic || 'Select a topic'}</h2>
            </div>
            {language && (
              <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-black text-blue-700">{language}</span>
            )}
          </div>

          {!questions.length && (
            <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <div>
                <WandSparkles size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-500">
                  {sessionMode === 'ai'
                    ? 'Click "Preview" to generate 3 AI diagnostic questions'
                    : 'Switch to AI mode for question preview'
                  }
                </p>
                <p className="mt-1 text-xs text-slate-400">Questions reveal specific misconceptions, not just right/wrong</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {questions.map((q, i) => (
              <article key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">{i + 1}</span>
                  <span className="text-xs font-black uppercase text-slate-400">
                    {q.type === 'multiple_choice' ? 'Multiple choice' : 'Open answer'}
                  </span>
                </div>
                <p className="font-black text-[#11233f] leading-6">{q.question}</p>
                {q.type === 'multiple_choice' && q.options?.length > 0 && (
                  <div className="mt-3 grid gap-1.5">
                    {q.options.map((opt, idx) => (
                      <div key={idx} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="font-black text-slate-500">{String.fromCharCode(65 + idx)}.</span> {opt}
                      </div>
                    ))}
                  </div>
                )}
                {(q.correctAnswer || q.commonMistake) && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {q.correctAnswer && (
                      <div className="rounded-lg bg-emerald-50 p-3 text-sm">
                        <p className="font-black text-emerald-800 mb-1">Expected answer</p>
                        <p className="text-emerald-700 leading-5">{q.correctAnswer}</p>
                      </div>
                    )}
                    {q.commonMistake && (
                      <div className="rounded-lg bg-amber-50 p-3 text-sm">
                        <p className="font-black text-amber-800 mb-1">Likely misconception</p>
                        <p className="text-amber-700 leading-5">{q.commonMistake}</p>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default NewSession;
