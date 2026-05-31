import { CheckCircle2, KeyRound, Loader2, Monitor, Palette, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Marathi', 'Tamil'];

const emptyProfile = {
  name: '',
  school: '',
  subject: '',
  grade: '',
  language: 'English',
  phone: ''
};

const cleanPhone = (value = '') => value.replace(/[^0-9+]/g, '');
const digitsOnly = (value = '') => cleanPhone(value).replace(/^\+/, '');

const getStoredProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('classpulse-teacher-profile') || '{}');
  } catch {
    return {};
  }
};

const saveStoredProfile = (profile) => {
  localStorage.setItem('classpulse-teacher-profile', JSON.stringify(profile));
  window.dispatchEvent(new Event('classpulse-profile-change'));
};

const FieldError = ({ children }) => (
  children ? <span className="text-xs font-semibold text-rose-600">{children}</span> : null
);

const Settings = () => {
  const teacherId = localStorage.getItem('classpulse-teacher') || '';
  const [profile, setProfile] = useState({ ...emptyProfile, ...getStoredProfile() });
  const [password, setPassword] = useState({ code: '', newPassword: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [themePreference, setThemePreference] = useState(localStorage.getItem('classpulse-theme') || 'dark');

  useEffect(() => {
    if (!teacherId) return undefined;

    let cancelled = false;
    const loadTeacher = async () => {
      try {
        const response = await api.get(`/teachers/${teacherId}`);
        if (cancelled) return;
        const nextProfile = { ...emptyProfile, ...getStoredProfile(), ...(response.data.teacher || {}) };
        setProfile(nextProfile);
        saveStoredProfile(nextProfile);
      } catch {
        // Settings remains functional from local session state if the API is unavailable.
      }
    };

    loadTeacher();
    return () => { cancelled = true; };
  }, [teacherId]);

  const validation = useMemo(() => {
    const next = {};
    ['name', 'school', 'subject', 'grade'].forEach((field) => {
      if (!String(profile[field] || '').trim()) next[field] = 'Required';
    });

    const phoneDigits = digitsOnly(profile.phone);
    if (!phoneDigits) next.phone = 'Mobile number is required';
    else if (phoneDigits.length < 7 || phoneDigits.length > 15) next.phone = 'Use 7-15 digits with country code';

    return next;
  }, [profile]);

  const updateProfile = (field, value) => {
    setProfile((curr) => ({
      ...curr,
      [field]: field === 'phone' ? cleanPhone(value) : value
    }));
    setSuccess('');
    setError('');
  };

  const saveProfile = (event) => {
    event.preventDefault();
    if (Object.keys(validation).length) {
      setError('Please fix the highlighted fields before saving.');
      return;
    }

    setSavingProfile(true);
    setError('');
    const nextProfile = {
      ...getStoredProfile(),
      ...profile,
      phone: digitsOnly(profile.phone),
      language: profile.language || 'English'
    };
    saveStoredProfile(nextProfile);
    setProfile(nextProfile);
    setSuccess('Settings saved.');
    window.setTimeout(() => setSuccess(''), 3500);
    setSavingProfile(false);
  };

  const sendResetCode = async () => {
    const phoneDigits = digitsOnly(profile.phone);
    if (validation.phone) {
      setError('Enter a valid mobile number before requesting a reset code.');
      return;
    }

    try {
      setSendingCode(true);
      setError('');
      setSuccess('');
      const response = await api.post('/auth/forgot-code', { phone: phoneDigits });
      setCodeSent(true);
      setSuccess(response.data.message || 'Reset code sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingCode(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const phoneDigits = digitsOnly(profile.phone);

    if (!/^\d{6}$/.test(password.code)) {
      setError('Enter the 6-digit reset code.');
      return;
    }
    if (password.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password.newPassword !== password.confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    try {
      setChangingPassword(true);
      setError('');
      setSuccess('');
      const response = await api.post('/auth/reset-password', {
        phone: phoneDigits,
        code: password.code,
        password: password.newPassword
      });
      const nextProfile = { ...profile, ...(response.data.teacher || {}) };
      setProfile(nextProfile);
      saveStoredProfile(nextProfile);
      setPassword({ code: '', newPassword: '', confirmPassword: '' });
      setCodeSent(false);
      setSuccess('Password changed successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const saveTheme = () => {
    localStorage.setItem('classpulse-theme', themePreference);
    setSuccess('Theme preference saved.');
    window.setTimeout(() => setSuccess(''), 3500);
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">Settings</p>
          <h1 className="mt-1 text-3xl font-black text-[#11233f]">Workspace settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your account, profile, and display preferences.</p>
        </div>
      </section>

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <p className="font-semibold text-emerald-800">{success}</p>
        </div>
      )}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-800">{error}</p>}

      <form onSubmit={saveProfile} className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <section className="panel rounded-xl p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
              <UserRound size={18} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Profile Settings</p>
              <h2 className="text-lg font-black text-[#11233f]">Teacher profile</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['name', 'Teacher name', 'Full name'],
              ['school', 'School name', 'School'],
              ['subject', 'Subject', 'Mathematics'],
              ['grade', 'Grade', 'Class 6']
            ].map(([field, label, placeholder]) => (
              <label key={field} className="grid gap-1.5 text-sm font-bold text-slate-600">
                {label}
                <input
                  className={`field ${validation[field] ? 'border-rose-300' : ''}`}
                  value={profile[field] || ''}
                  onChange={(event) => updateProfile(field, event.target.value)}
                  placeholder={placeholder}
                />
                <FieldError>{validation[field]}</FieldError>
              </label>
            ))}

            <label className="grid gap-1.5 text-sm font-bold text-slate-600">
              Preferred language
              <select className="field" value={profile.language || 'English'} onChange={(event) => updateProfile('language', event.target.value)}>
                {LANGUAGES.map((language) => <option key={language}>{language}</option>)}
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Save Changes
          </button>
        </section>

        <section className="panel rounded-xl p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Account Settings</p>
              <h2 className="text-lg font-black text-[#11233f]">Account access</h2>
            </div>
          </div>

          <label className="grid gap-1.5 text-sm font-bold text-slate-600">
            Mobile number
            <input
              className={`field ${validation.phone ? 'border-rose-300' : ''}`}
              value={profile.phone || ''}
              onChange={(event) => updateProfile('phone', event.target.value)}
              inputMode="tel"
              placeholder="919876543210"
            />
            <FieldError>{validation.phone}</FieldError>
          </label>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Account details</p>
            <div className="mt-3 grid gap-2 text-sm">
              <p><span className="font-bold text-[#11233f]">Teacher ID:</span> <span className="text-slate-500">{teacherId || 'Not signed in'}</span></p>
              <p><span className="font-bold text-[#11233f]">Language:</span> <span className="text-slate-500">{profile.language || 'English'}</span></p>
              <p><span className="font-bold text-[#11233f]">Mobile:</span> <span className="text-slate-500">{profile.phone ? `+${digitsOnly(profile.phone)}` : 'Not set'}</span></p>
            </div>
          </div>
        </section>
      </form>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <form onSubmit={changePassword} className="panel rounded-xl p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <KeyRound size={18} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Change password</p>
                <h2 className="text-lg font-black text-[#11233f]">Reset with SMS code</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={sendResetCode}
              disabled={sendingCode || Boolean(validation.phone)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {sendingCode ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {codeSent ? 'Resend code' : 'Send code'}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-bold text-slate-600">
              Reset code
              <input
                className="field"
                value={password.code}
                onChange={(event) => setPassword((curr) => ({ ...curr, code: event.target.value.replace(/\D/g, '').slice(0, 6) }))}
                inputMode="numeric"
                placeholder="6-digit code"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-600">
              New password
              <input
                className="field"
                type="password"
                value={password.newPassword}
                onChange={(event) => setPassword((curr) => ({ ...curr, newPassword: event.target.value }))}
                placeholder="At least 8 characters"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-600">
              Confirm password
              <input
                className="field"
                type="password"
                value={password.confirmPassword}
                onChange={(event) => setPassword((curr) => ({ ...curr, confirmPassword: event.target.value }))}
                placeholder="Repeat password"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={changingPassword || !codeSent}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#11233f] px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Change password
          </button>
        </form>

        <section className="panel rounded-xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <Monitor size={18} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Theme Preferences</p>
              <h2 className="text-lg font-black text-[#11233f]">Display</h2>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#11233f]">Current theme</p>
                <p className="mt-1 text-sm text-slate-500">Dark theme is active for this workspace.</p>
              </div>
              <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-black uppercase text-emerald-700">
                Active
              </span>
            </div>
            <label className="mt-4 grid gap-1.5 text-sm font-bold text-slate-600">
              Preference
              <select className="field" value={themePreference} onChange={(event) => setThemePreference(event.target.value)}>
                <option value="dark">Dark theme</option>
              </select>
            </label>
            <button
              type="button"
              onClick={saveTheme}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <Palette size={15} />
              Save theme
            </button>
          </div>
        </section>
      </section>
    </div>
  );
};

export default Settings;
