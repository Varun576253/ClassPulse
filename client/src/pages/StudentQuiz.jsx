import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';

const OFFLINE_QUEUE_KEY = 'shikshalens-offline-queue';

const getQueue = () => {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'); } catch { return []; }
};
const saveQueue = (q) => localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));

const enqueueSubmission = (sessionId, payload) => {
  const queue = getQueue();
  const existing = queue.findIndex((item) => item.sessionId === sessionId);
  if (existing >= 0) queue[existing] = { sessionId, payload, ts: Date.now() };
  else queue.push({ sessionId, payload, ts: Date.now() });
  saveQueue(queue);
};

const emptyLogin = { studentMobile: '' };

const StudentQuiz = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || '';
  const [login, setLogin] = useState(emptyLogin);
  const [step, setStep] = useState('login');
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [ended, setEnded] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const syncAttempted = useRef(false);

  const currentQuestion = questions[currentIndex];
  const currentQuestionId = useMemo(
    () => currentQuestion ? String(currentQuestion._id ?? currentIndex) : '',
    [currentQuestion, currentIndex]
  );
  const progress = questions.length ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      if (!syncAttempted.current) {
        syncAttempted.current = true;
        flushOfflineQueue();
      }
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const flushOfflineQueue = useCallback(async () => {
    const queue = getQueue();
    if (!queue.length) return;
    const remaining = [];
    for (const item of queue) {
      try {
        await api.post(`/sessions/${item.sessionId}/submit`, item.payload);
      } catch {
        remaining.push(item);
      }
    }
    saveQueue(remaining);
    if (remaining.length < queue.length) {
      setOfflineQueued(false);
    }
  }, []);

  const fetchQuestions = async () => {
    if (!sessionId) {
      setError('Session link is missing.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/sessions/${sessionId}/questions`);
      setSession(response.data.session);
      setQuestions(response.data.questions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (event) => {
    event.preventDefault();
    const cleanMobile = login.studentMobile.trim();
    if (!/^\d{10}$/.test(cleanMobile)) {
      setError('Mobile number must be 10 digits.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await api.post(`/sessions/${sessionId}/student-login`, { mobile: cleanMobile });
      setStudentInfo(res.data.student);
      setStep('questions');
      await fetchQuestions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setAnswer = (value) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionId]: value }));
    setError('');
  };

  const requireCurrentAnswer = () => {
    if (!answers[currentQuestionId]?.trim()) {
      setError('Please select an answer');
      return false;
    }
    return true;
  };

  const nextQuestion = () => {
    if (!requireCurrentAnswer()) return;
    setCurrentIndex((idx) => Math.min(idx + 1, questions.length - 1));
    setError('');
  };

  const previousQuestion = () => {
    setCurrentIndex((idx) => Math.max(idx - 1, 0));
    setError('');
  };

  const submitQuiz = async (force = false) => {
    if (!force && !requireCurrentAnswer()) return;
    const payload = { studentMobile: login.studentMobile.trim(), answers };

    if (!isOnline) {
      enqueueSubmission(sessionId, payload);
      setOfflineQueued(true);
      setStep('success');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await api.post(`/sessions/${sessionId}/submit`, payload);
      if (response.data?.offline) {
        enqueueSubmission(sessionId, payload);
        setOfflineQueued(true);
        setStep('success');
        return;
      }
      setResult(response.data);
      setStep('success');
    } catch (err) {
      const msg = err.message || '';
      if (msg === 'You have already submitted this quiz.') {
        setStep('success');
      } else if (msg.toLowerCase().includes('offline') || msg.includes('503') || msg.includes('network')) {
        enqueueSubmission(sessionId, payload);
        setOfflineQueued(true);
        setStep('success');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (step === 'questions' && session?.status && (session.status !== 'active' || session.formStatus === 'closed')) {
      setEnded(true);
      setError('This session is not active. Ask your teacher.');
    }
  }, [session, step]);

  useEffect(() => {
    if (step !== 'questions' || !session?.deadline || submitting || result) return undefined;
    const timer = window.setInterval(() => {
      if (Date.now() > new Date(session.deadline).getTime()) {
        setEnded(true);
        submitQuiz(true);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [answers, result, session?.deadline, step, submitting]);

  if (step === 'success') {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">
        <div className="panel w-full rounded-xl p-8 text-center">
          <CheckCircle2 size={42} className="mx-auto text-emerald-600" />
          <h1 className="mt-4 text-2xl font-black text-[#11233f]">
            {offlineQueued ? 'Saved offline!' : 'Submitted!'}
          </h1>
          {offlineQueued ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold text-amber-700 rounded-xl bg-amber-50 border border-amber-100 p-3">
                Your answers are saved on this device and will automatically submit when you're back online.
              </p>
            </div>
          ) : result ? (
            <p className="mt-2 text-lg font-bold text-slate-600">Score: {result.score} / {result.total}</p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-500">You have already submitted this quiz</p>
          )}
          {studentInfo && (
            <p className="mt-3 text-xs text-slate-400">Submitted as {studentInfo.name}</p>
          )}
        </div>
      </div>
    );
  }

  if (step === 'questions') {
    const hasOptions = currentQuestion?.options?.length > 0;

    return (
      <div className="mx-auto min-h-[80vh] max-w-2xl px-4 py-6">
        <div className="panel rounded-xl p-5 sm:p-6">
          {!isOnline && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <WifiOff size={14} className="shrink-0 text-amber-700" />
              <p className="text-xs font-semibold text-amber-700">You're offline. Your answers will be saved locally and submitted when connected.</p>
            </div>
          )}
          {loading ? (
            <div className="flex items-center gap-3 p-4">
              <Loader2 size={18} className="animate-spin text-slate-400" />
              <span className="font-semibold text-slate-600">Loading quiz...</span>
            </div>
          ) : session?.status !== 'active' || session?.formStatus === 'closed' ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">
              This session is not active. Ask your teacher.
            </p>
          ) : !questions.length ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">
              No questions are available for this session.
            </p>
          ) : (
            <>
              {ended && (
                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  This session has ended. Please submit your answers.
                </p>
              )}

              {studentInfo && (
                <p className="mb-3 text-xs font-bold text-emerald-700">
                  Answering as {studentInfo.name} · {studentInfo.grade}
                </p>
              )}

              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                  Question {currentIndex + 1} of {questions.length}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <h1 className="text-xl font-black leading-7 text-[#11233f]">{currentQuestion.question}</h1>

              {hasOptions ? (
                <div className="mt-5 grid gap-3">
                  {currentQuestion.options.slice(0, 4).map((option, idx) => {
                    const selected = answers[currentQuestionId] === option;
                    return (
                      <button
                        key={`${option}-${idx}`}
                        type="button"
                        onClick={() => setAnswer(option)}
                        className={`rounded-xl border p-4 text-left text-sm font-bold transition ${
                          selected
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="mr-2 font-black">{String.fromCharCode(65 + idx)}.</span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  className="field mt-5 min-h-32"
                  value={answers[currentQuestionId] || ''}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Type your answer here"
                />
              )}

              {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={previousQuestion}
                  disabled={currentIndex === 0 || submitting}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                {currentIndex === questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={submitQuiz}
                    disabled={submitting}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting ? 'Submitting...' : isOnline ? 'Submit' : 'Save & Submit'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextQuestion}
                    disabled={submitting}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">
      <form onSubmit={startQuiz} className="panel w-full rounded-xl p-6">
        <h1 className="text-2xl font-black text-[#11233f]">Join Quiz</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your registered mobile number to begin.</p>

        {!isOnline && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <WifiOff size={14} className="shrink-0 text-amber-700" />
            <p className="text-xs font-semibold text-amber-700">Offline — answers will be saved and submitted when connected.</p>
          </div>
        )}

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1.5 text-sm font-bold text-slate-600">
            Mobile Number (10 digits)
            <input
              className="field"
              required
              inputMode="numeric"
              maxLength={10}
              type="tel"
              value={login.studentMobile}
              onChange={(event) => setLogin((prev) => ({
                ...prev,
                studentMobile: event.target.value.replace(/\D/g, '').slice(0, 10)
              }))}
              placeholder="10 digit mobile number"
            />
          </label>
        </div>
        {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Start Quiz'}
        </button>
      </form>
    </div>
  );
};

export default StudentQuiz;
