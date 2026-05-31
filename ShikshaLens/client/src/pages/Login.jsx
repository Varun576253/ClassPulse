import { ArrowRight, KeyRound, Loader2, LockKeyhole, Phone, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AppIcon from '../components/AppIcon';

const emptyLogin = { phone: '', password: '' };
const emptyRegister = {
  name: '',
  school: '',
  subject: 'Mathematics',
  grade: 'Class 6',
  language: 'English',
  phone: '',
  password: ''
};
const emptyReset = { phone: '', code: '', password: '' };
const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Marathi', 'Tamil'];

const cleanPhone = (value = '') => value.replace(/[^0-9+]/g, '');

const saveTeacherSession = (teacher) => {
  localStorage.setItem('classpulse-teacher', teacher._id);
  localStorage.setItem('classpulse-teacher-profile', JSON.stringify(teacher));
};

const AuthInput = ({ icon: Icon, ...props }) => (
  <label className="grid gap-1.5 text-sm font-bold text-slate-600">
    {props.label}
    <span className="relative block">
      <Icon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input {...props} label={undefined} className="field h-11 pl-12 pr-4" />
    </span>
  </label>
);

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [login, setLogin] = useState(emptyLogin);
  const [register, setRegister] = useState(emptyRegister);
  const [reset, setReset] = useState(emptyReset);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const finishAuth = (teacher) => {
    saveTeacherSession(teacher);
    navigate('/');
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      setNotice('');
      const response = await api.post('/auth/login', login);
      finishAuth(response.data.teacher);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      setNotice('');
      const response = await api.post('/auth/register', register);
      finishAuth(response.data.teacher);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendResetCode = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      setNotice('');
      const response = await api.post('/auth/forgot-code', { phone: reset.phone });
      setResetCodeSent(true);
      setNotice(`${response.data.message || 'Reset code sent.'} Enter it below with your new password.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      setNotice('');
      const response = await api.post('/auth/reset-password', reset);
      finishAuth(response.data.teacher);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl content-center gap-6 py-8 lg:grid-cols-[0.86fr_1.14fr]">
      <section className="rounded-xl bg-[#11233f] p-7 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary">
            <AppIcon size={28} className="text-primary" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-cyan-300">ClassPulse</p>
            <h1 className="text-2xl font-black leading-tight">Teacher sign in</h1>
          </div>
        </div>
        <div className="mt-8 space-y-4 text-sm leading-6 text-slate-300">
          <p>Use your registered mobile number and password to enter the teacher workspace.</p>
          <p>Forgot-password codes use Twilio SMS when configured, with WhatsApp fallback for local testing.</p>
        </div>
        <div className="mt-8 grid gap-3">
          {[
            ['Real WhatsApp', 'Green API delivery and incoming reply webhooks'],
            ['Live replies', 'Responses appear on the session screen as students answer'],
            ['Secure reset', '6-digit SMS code before password changes']
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="font-black text-white">{title}</p>
              <p className="mt-0.5 text-xs text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel rounded-xl p-6 sm:p-8">
        <div className="flex rounded-lg bg-slate-100 p-1">
          {[
            { id: 'login', label: 'Login', icon: LockKeyhole },
            { id: 'register', label: 'Register', icon: UserPlus },
            { id: 'forgot', label: 'Forgot', icon: KeyRound }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectMode(id)}
              className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md text-sm font-black transition ${
                mode === id ? 'bg-white text-[#11233f] shadow-sm' : 'text-slate-500 hover:text-[#11233f]'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>
        )}
        {notice && (
          <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p>
        )}

        {mode === 'login' && (
          <form onSubmit={submitLogin} className="mt-6 grid gap-4">
            <AuthInput
              icon={Phone}
              label="Mobile number"
              value={login.phone}
              onChange={(e) => setLogin((curr) => ({ ...curr, phone: cleanPhone(e.target.value) }))}
              required
              inputMode="tel"
              placeholder="919876543210"
            />
            <AuthInput
              icon={LockKeyhole}
              label="Password"
              value={login.password}
              onChange={(e) => setLogin((curr) => ({ ...curr, password: e.target.value }))}
              required
              type="password"
              placeholder="Your password"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
              Login
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={submitRegister} className="mt-6 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" value={register.name} onChange={(e) => setRegister((c) => ({ ...c, name: e.target.value }))} required placeholder="Full name" />
              <input className="field" value={register.school} onChange={(e) => setRegister((c) => ({ ...c, school: e.target.value }))} required placeholder="School name" />
              <input className="field" value={register.subject} onChange={(e) => setRegister((c) => ({ ...c, subject: e.target.value }))} required placeholder="Subject" />
              <input className="field" value={register.grade} onChange={(e) => setRegister((c) => ({ ...c, grade: e.target.value }))} required placeholder="Grade" />
              <select className="field" value={register.language} onChange={(e) => setRegister((c) => ({ ...c, language: e.target.value }))}>
                {LANGUAGES.map((language) => <option key={language}>{language}</option>)}
              </select>
              <input
                className="field"
                value={register.phone}
                onChange={(e) => setRegister((c) => ({ ...c, phone: cleanPhone(e.target.value) }))}
                required
                inputMode="tel"
                placeholder="Mobile number with country code"
              />
            </div>
            <AuthInput
              icon={LockKeyhole}
              label="Password"
              value={register.password}
              onChange={(e) => setRegister((curr) => ({ ...curr, password: e.target.value }))}
              required
              type="password"
              minLength={8}
              placeholder="At least 8 characters"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#11233f] px-5 font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <UserPlus size={17} />}
              Create account
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={resetCodeSent ? submitReset : sendResetCode} className="mt-6 grid gap-4">
            <AuthInput
              icon={Phone}
              label="Registered mobile number"
              value={reset.phone}
              onChange={(e) => setReset((curr) => ({ ...curr, phone: cleanPhone(e.target.value) }))}
              required
              inputMode="tel"
              placeholder="919876543210"
            />
            {resetCodeSent && (
              <>
                <AuthInput
                  icon={KeyRound}
                  label="SMS code"
                  value={reset.code}
                  onChange={(e) => setReset((curr) => ({ ...curr, code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                  required
                  inputMode="numeric"
                  placeholder="6-digit code"
                />
                <AuthInput
                  icon={LockKeyhole}
                  label="New password"
                  value={reset.password}
                  onChange={(e) => setReset((curr) => ({ ...curr, password: e.target.value }))}
                  required
                  type="password"
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />}
              {resetCodeSent ? 'Reset password' : 'Send SMS code'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
};

export default Login;
