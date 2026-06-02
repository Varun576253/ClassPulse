import { Loader2, Pencil, Phone, Plus, School, Send, Trash2, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const emptyStudent = { name: '', phone: '', language: 'English', grade: '' };
const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Marathi', 'Tamil'];

const savedTeacherId = () => localStorage.getItem('classpulse-teacher') || '';

const riskColor = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-900',
  high: 'bg-rose-100 text-rose-800'
};

const Roster = () => {
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState(savedTeacherId());
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyStudent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [editStudent, setEditStudent] = useState(null);
  const [editForm, setEditForm] = useState(emptyStudent);
  const [editPhoneError, setEditPhoneError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t._id === teacherId),
    [teacherId, teachers]
  );

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const savedId = savedTeacherId();
        if (!savedId) {
          setError('Please sign in before managing the roster.');
          return;
        }
        const response = await api.get(`/teachers?teacherId=${savedId}`);
        const teacherList = response.data.teachers || [];
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

  const loadRoster = useCallback(async () => {
    if (!teacherId) { setLoading(false); return; }
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/teachers/${teacherId}`);
      setStudents(response.data.students || []);
      setForm((curr) => ({
        ...curr,
        grade: response.data.teacher?.grade || selectedTeacher?.grade || curr.grade,
        language: response.data.teacher?.language || selectedTeacher?.language || curr.language
      }));
      localStorage.setItem('classpulse-teacher', teacherId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTeacher?.grade, selectedTeacher?.language, teacherId]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  const updateForm = (field, value) => {
    if (field === 'phone') {
      const stripped = value.replace(/[^0-9+]/g, '');
      const digits = stripped.replace(/^\+/, '');
      setPhoneError(digits.length > 0 && (digits.length < 7 || digits.length > 15)
        ? 'Enter 10 local digits or 7-15 digits with country code'
        : '');
      setForm((curr) => ({ ...curr, [field]: stripped }));
      return;
    }
    setForm((curr) => ({ ...curr, [field]: value }));
  };

  const updateEditForm = (field, value) => {
    if (field === 'phone') {
      const stripped = value.replace(/[^0-9+]/g, '');
      const digits = stripped.replace(/^\+/, '');
      setEditPhoneError(digits.length > 0 && (digits.length < 7 || digits.length > 15)
        ? 'Enter 10 local digits or 7-15 digits with country code'
        : '');
      setEditForm((curr) => ({ ...curr, [field]: stripped }));
      return;
    }
    setEditForm((curr) => ({ ...curr, [field]: value }));
  };

  const openEdit = (student) => {
    setEditStudent(student);
    setEditForm({ name: student.name, phone: student.phone, grade: student.grade, language: student.language });
    setEditPhoneError('');
  };

  const closeEdit = () => { setEditStudent(null); setEditForm(emptyStudent); };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (editPhoneError) return;
    try {
      setEditSaving(true);
      setError('');
      const response = await api.put(`/students/${editStudent._id}`, editForm);
      setStudents((curr) =>
        curr.map((s) => s._id === editStudent._id ? response.data.student : s)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setNotice(`${response.data.student.name} updated.`);
      setTimeout(() => setNotice(''), 3000);
      closeEdit();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const createStudent = async (event) => {
    event.preventDefault();
    if (phoneError) return;
    try {
      setSaving(true);
      setError('');
      setNotice('');
      const response = await api.post('/students', {
        ...form,
        teacherId,
        grade: form.grade || selectedTeacher?.grade,
        language: form.language || selectedTeacher?.language
      });
      setStudents((curr) => [...curr, response.data.student].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ ...emptyStudent, grade: selectedTeacher?.grade || '', language: selectedTeacher?.language || 'English' });
      setNotice(`${response.data.student.name} added to roster.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async (student) => {
    if (!window.confirm(`Remove ${student.name} from the roster?`)) return;
    try {
      setDeleting(student._id);
      await api.delete(`/students/${student._id}`);
      setStudents((curr) => curr.filter((s) => s._id !== student._id));
      setNotice(`${student.name} removed.`);
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setDeleting('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Edit modal */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black text-[#11233f]">Edit student</h2>
              <button onClick={closeEdit} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="grid gap-3">
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Student name
                <input className="field" value={editForm.name} onChange={(e) => updateEditForm('name', e.target.value)} required placeholder="Full name" />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                WhatsApp number
                <input className="field" value={editForm.phone} onChange={(e) => updateEditForm('phone', e.target.value)} required placeholder="919876543210" />
                {editPhoneError
                  ? <span className="text-xs font-semibold text-rose-600">{editPhoneError}</span>
                  : <span className="text-xs text-slate-400">10 local digits are saved as India (+91) by default</span>}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                  Grade
                  <input className="field" value={editForm.grade} onChange={(e) => updateEditForm('grade', e.target.value)} placeholder="Class 6" />
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                  Language
                  <select className="field" value={editForm.language} onChange={(e) => updateEditForm('language', e.target.value)}>
                    {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-2 flex gap-3">
                <button type="button" onClick={closeEdit} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving || !!editPhoneError}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {editSaving ? <Loader2 size={15} className="animate-spin" /> : null}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">Roster</p>
          <h1 className="mt-1 text-3xl font-black text-[#11233f]">Student roster</h1>
          <p className="mt-1 text-sm text-slate-500">Add students with their WhatsApp number to receive check-ins.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="field w-auto min-w-[200px]"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            {!teachers.length && <option value="">No teachers</option>}
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>{t.name} · {t.grade}</option>
            ))}
          </select>
          <Link
            to="/sessions/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#11233f] px-4 text-sm font-bold text-white transition hover:bg-slate-800 shrink-0"
          >
            <Send size={15} />
            Start session
          </Link>
        </div>
      </section>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-800">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">{notice}</p>}

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <form onSubmit={createStudent} className="panel rounded-xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
              <Plus size={18} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Add learner</p>
              <h2 className="text-lg font-black text-[#11233f]">New student</h2>
            </div>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-bold text-slate-600">
              Student name
              <input
                className="field"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                required
                placeholder="Full name"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-bold text-slate-600">
              WhatsApp number
              <input
                className="field"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                required
                placeholder="919876543210"
              />
              {phoneError
                ? <span className="text-xs font-semibold text-rose-600">{phoneError}</span>
                : <span className="text-xs text-slate-400">10 local digits are saved as India (+91) by default</span>
              }
            </label>

            <div className="grid gap-3 grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Grade
                <input
                  className="field"
                  value={form.grade}
                  onChange={(e) => updateForm('grade', e.target.value)}
                  placeholder={selectedTeacher?.grade || 'Class 6'}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Language
                <select
                  className="field"
                  value={form.language}
                  onChange={(e) => updateForm('language', e.target.value)}
                >
                  {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
            </div>
          </div>

          {selectedTeacher && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <School size={14} className="shrink-0 text-slate-400" />
              <span className="truncate">{selectedTeacher.school} · {selectedTeacher.subject}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !teacherId || !!phoneError}
            className="mt-4 inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add student
          </button>
        </form>

        <section className="panel rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Class roster</p>
              <h2 className="text-lg font-black text-[#11233f]">
                {students.length} {students.length === 1 ? 'student' : 'students'}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users size={15} />
              <span>{students.filter((s) => s.riskLevel === 'high').length} high risk</span>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-6 text-slate-500">
              <Loader2 size={18} className="animate-spin shrink-0" />
              <span className="text-sm">Loading roster...</span>
            </div>
          )}

          {!loading && !students.length && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <Users size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No students yet</p>
              <p className="mt-1 text-xs text-slate-400">Add students using the form on the left</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <div
                key={student._id}
                className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/students/${student._id}`}
                      className="block truncate font-black text-[#11233f] hover:text-blue-700"
                    >
                      {student.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">{student.grade} · {student.language}</p>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-black uppercase ${riskColor[student.riskLevel] || riskColor.low}`}>
                    {student.riskLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Phone size={12} />
                    +{student.phone}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => openEdit(student)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      title="Edit student"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStudent(student)}
                      disabled={deleting === student._id}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      title="Remove student"
                    >
                      {deleting === student._id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />
                      }
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Roster;
