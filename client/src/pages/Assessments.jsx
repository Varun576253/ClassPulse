import {
  AlertTriangle,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  FileText,
  Layers3,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Upload,
  UsersRound,
  X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { addNotification } from '../utils/notifications';

const savedTeacherId = () => localStorage.getItem('classpulse-teacher') || '';
const assessmentStorageKey = (teacherId) => `classpulse-assessment-${teacherId}`;

const emptyGenerateForm = {
  subject: '',
  topic: '',
  subtopic: '',
  grade: '',
  difficultyLevel: 'mixed',
  numberOfQuestions: 10,
  questionTypes: ['short_answer'],
  language: 'English'
};

const emptyUploadPaperForm = {
  subject: '',
  topic: '',
  subtopic: '',
  grade: '',
  language: 'English',
  file: null
};

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  ready_for_uploads: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-900',
  completed: 'bg-emerald-100 text-emerald-700',
  queued: 'bg-slate-100 text-slate-700',
  review_required: 'bg-rose-100 text-rose-700',
  failed: 'bg-rose-100 text-rose-700'
};

const riskStyles = {
  low: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-900',
  high: 'bg-rose-100 text-rose-800'
};

const formatDate = (value) => value
  ? new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '';

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const asArrayText = (values) => (values || []).join(', ');
const fromArrayText = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);

const Metric = ({ label, value, icon: Icon, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700'
  };
  return (
    <div className="panel rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-[#11233f]">{value}</p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone] || tones.blue}`}>
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
};

const Assessments = () => {
  const [searchParams] = useSearchParams();
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState(savedTeacherId());
  const [students, setStudents] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [detail, setDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [generateForm, setGenerateForm] = useState(emptyGenerateForm);
  const [paperPreview, setPaperPreview] = useState(null);
  const [uploadPaperForm, setUploadPaperForm] = useState(emptyUploadPaperForm);
  const [answerRows, setAnswerRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editAnalysis, setEditAnalysis] = useState(null);
  const [analysisForm, setAnalysisForm] = useState(null);
  const [editGroup, setEditGroup] = useState(null);
  const [groupForm, setGroupForm] = useState(null);
  const assessmentStatusRef = useRef(new Map());
  const requestedAssessmentFromSearch = searchParams.get('assessmentId');

  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher._id === teacherId),
    [teacherId, teachers]
  );

  const classroomAnalysis = detail?.classroomAnalysis;
  const processingSummary = detail?.assessment?.processingSummary || {};
  const answerSheets = detail?.answerSheets || [];
  const studentAnalyses = detail?.studentAnalyses || [];
  const interventionGroups = detail?.interventionGroups || [];

  const loadTeachers = useCallback(async () => {
    const savedId = savedTeacherId();
    if (!savedId) {
      setError('Please sign in before managing assessments.');
      setLoading(false);
      return;
    }
    const response = await api.get(`/teachers?teacherId=${savedId}`);
    const teacherList = response.data.teachers || [];
    const nextId = teacherList.some((teacher) => teacher._id === savedId)
      ? savedId
      : teacherList[0]?._id || '';
    setTeachers(teacherList);
    setTeacherId(nextId);
    if (nextId) localStorage.setItem('classpulse-teacher', nextId);
  }, []);

  const loadTeacherData = useCallback(async ({ preferredAssessmentId } = {}) => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const [teacherRes, assessmentRes] = await Promise.all([
        api.get(`/teachers/${teacherId}`),
        api.get(`/assessments/teacher/${teacherId}`)
      ]);
      const roster = teacherRes.data.students || [];
      const assessmentList = assessmentRes.data.assessments || [];
      setStudents(roster);
      setAssessments(assessmentList);
      localStorage.setItem('classpulse-teacher', teacherId);

      const requestedAssessmentId = preferredAssessmentId
        || requestedAssessmentFromSearch
        || localStorage.getItem(assessmentStorageKey(teacherId))
        || selectedAssessmentId;
      const nextSelected = requestedAssessmentId && assessmentList.some((item) => item._id === requestedAssessmentId)
        ? requestedAssessmentId
        : assessmentList[0]?._id || '';
      setSelectedAssessmentId(nextSelected);
      if (nextSelected) localStorage.setItem(assessmentStorageKey(teacherId), nextSelected);

      const teacher = teacherRes.data.teacher;
      setGenerateForm((curr) => ({
        ...curr,
        subject: curr.subject || teacher?.subject || '',
        grade: curr.grade || teacher?.grade || '',
        language: curr.language || teacher?.language || 'English'
      }));
      setUploadPaperForm((curr) => ({
        ...curr,
        subject: curr.subject || teacher?.subject || '',
        grade: curr.grade || teacher?.grade || '',
        language: curr.language || teacher?.language || 'English'
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [requestedAssessmentFromSearch, selectedAssessmentId, teacherId]);

  const loadDetail = useCallback(async (assessmentId = selectedAssessmentId, { background = false } = {}) => {
    if (!assessmentId) {
      setDetail(null);
      return;
    }

    try {
      if (!background) setDetailLoading(true);
      const response = await api.get(`/assessments/${assessmentId}`);
      setDetail(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedAssessmentId]);

  useEffect(() => {
    loadTeachers().catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, [loadTeachers]);

  useEffect(() => { loadTeacherData(); }, [loadTeacherData]);
  useEffect(() => { loadDetail(); }, [loadDetail]);

  useEffect(() => {
    const hasOpenProcessing = answerSheets.some((sheet) => ['queued', 'processing'].includes(sheet.processingStatus));
    if (!selectedAssessmentId || !hasOpenProcessing) return undefined;
    const timer = window.setInterval(() => loadDetail(selectedAssessmentId, { background: true }), 5000);
    return () => window.clearInterval(timer);
  }, [answerSheets, loadDetail, selectedAssessmentId]);

  const selectAssessment = (assessmentId) => {
    setSelectedAssessmentId(assessmentId);
    localStorage.setItem(assessmentStorageKey(teacherId), assessmentId);
    setDetail(null);
    setAnswerRows([]);
    setActiveTab('overview');
    loadDetail(assessmentId);
  };

  const updateQuestionType = (type, checked) => {
    setGenerateForm((curr) => {
      const current = new Set(curr.questionTypes || []);
      if (checked) current.add(type);
      else current.delete(type);
      return { ...curr, questionTypes: [...current] };
    });
  };

  const updatePreviewQuestion = (index, field, value) => {
    setPaperPreview((curr) => ({
      ...curr,
      questions: (curr.questions || []).map((question, questionIndex) =>
        questionIndex === index
          ? { ...question, [field]: field === 'marks' ? Number(value) : value }
          : question
      )
    }));
  };

  const createGeneratedPaperPreview = async (event) => {
    event.preventDefault();
    try {
      setSaving('preview');
      setError('');
      setNotice('');
      const response = await api.post('/assessments/question-papers/preview', {
        ...generateForm,
        teacherId,
        numberOfQuestions: Number(generateForm.numberOfQuestions || 10)
      });
      setPaperPreview(response.data.questionPaper);
      setNotice('Question paper preview generated. Review it before saving the assessment.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  };

  const saveGeneratedPaperPreview = async () => {
    if (!paperPreview) return;

    try {
      setSaving('save-preview');
      setError('');
      setNotice('');
      const response = await api.post('/assessments/question-papers/save-preview', {
        teacherId,
        questionPaper: paperPreview
      });
      const nextAssessmentId = response.data.assessment._id;
      setNotice('Reviewed question paper saved as an assessment.');
      setSelectedAssessmentId(nextAssessmentId);
      localStorage.setItem(assessmentStorageKey(teacherId), nextAssessmentId);
      setActiveTab('upload');
      setPaperPreview(null);
      await loadTeacherData({ preferredAssessmentId: nextAssessmentId });
      await loadDetail(nextAssessmentId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  };

  const uploadExistingPaper = async (event) => {
    event.preventDefault();
    if (!uploadPaperForm.file) return;

    try {
      setSaving('paper-upload');
      setError('');
      setNotice('');
      const dataUrl = await fileToDataUrl(uploadPaperForm.file);
      const response = await api.post('/assessments/question-papers/upload', {
        ...uploadPaperForm,
        teacherId,
        file: {
          name: uploadPaperForm.file.name,
          type: uploadPaperForm.file.type,
          dataUrl
        }
      });
      const needsReview = response.data.questionPaper?.status === 'needs_teacher_review'
        || response.data.extraction?.parserSource === 'local_fallback'
        || !response.data.extraction?.valid;
      setNotice(needsReview
        ? 'Question paper uploaded. Please review extracted questions before scoring.'
        : 'Question paper uploaded and parsed.');
      const nextAssessmentId = response.data.assessment._id;
      setSelectedAssessmentId(nextAssessmentId);
      localStorage.setItem(assessmentStorageKey(teacherId), nextAssessmentId);
      setActiveTab('upload');
      setUploadPaperForm((curr) => ({ ...curr, file: null }));
      await loadTeacherData({ preferredAssessmentId: nextAssessmentId });
      await loadDetail(nextAssessmentId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  };

  const onAnswerFiles = (files) => {
    const nextRows = [...files].map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      file,
      studentId: ''
    }));
    setAnswerRows(nextRows);
  };

  const uploadAnswerSheets = async (event) => {
    event.preventDefault();
    const assessmentId = detail?.assessment?._id === selectedAssessmentId
      ? detail.assessment._id
      : selectedAssessmentId;

    if (!assessmentId || !answerRows.length) return;

    if (answerRows.some((row) => !row.studentId)) {
      setError('Map every answer sheet to a student before queueing processing.');
      return;
    }

    try {
      setSaving('answers');
      setError('');
      setNotice('');
      const files = [];
      for (const row of answerRows) {
        if (!row.studentId) continue;
        files.push({
          studentId: row.studentId,
          name: row.file.name,
          type: row.file.type,
          dataUrl: await fileToDataUrl(row.file)
        });
      }
      const response = await api.post(`/assessments/${assessmentId}/answer-sheets`, { assessmentId, files });
      const uploadedCount = response.data.answerSheets?.length || 0;
      setNotice(`${uploadedCount} answer sheets queued for processing.`);
      if (uploadedCount) {
        addNotification({
          type: 'assessment_upload',
          title: 'Student assessment response uploaded',
          detail: `${uploadedCount} answer ${uploadedCount === 1 ? 'sheet' : 'sheets'} queued for ${detail?.assessment?.title || 'the selected assessment'}.`,
          to: `/assessments?assessmentId=${assessmentId}`,
          dedupeKey: `assessment-upload-${assessmentId}-${Date.now()}`
        });
      }
      setAnswerRows([]);
      await loadTeacherData({ preferredAssessmentId: assessmentId });
      await loadDetail(assessmentId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  };

  const retrySheet = async (sheetId) => {
    try {
      setSaving(sheetId);
      await api.post(`/assessments/answer-sheets/${sheetId}/retry`);
      await loadDetail(selectedAssessmentId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  };

  const openAnalysisEdit = (analysis) => {
    setEditAnalysis(analysis);
    setAnalysisForm({
      totalScore: Number(analysis.totalScore || 0),
      maxScore: Number(analysis.maxScore || detail?.assessment?.totalMarks || 0),
      confidenceScore: Number(analysis.confidenceScore || 0),
      requiresTeacherReview: Boolean(analysis.requiresTeacherReview),
      overallWeakTopicsText: asArrayText(analysis.overallWeakTopics),
      strengthsText: asArrayText(analysis.strengths),
      riskLevel: analysis.riskLevel || 'low',
      recommendedIntervention: analysis.recommendedIntervention || '',
      questionAnalysis: (analysis.questionAnalysis || []).map((question) => ({ ...question }))
    });
  };

  const saveAnalysisOverride = async (event) => {
    event.preventDefault();
    try {
      setSaving('analysis-override');
      setError('');
      await api.put(`/assessments/student-analyses/${editAnalysis._id}/override`, {
        totalScore: Number(analysisForm.totalScore || 0),
        maxScore: Number(analysisForm.maxScore || 0),
        confidenceScore: Number(analysisForm.confidenceScore || 0),
        requiresTeacherReview: analysisForm.requiresTeacherReview,
        overallWeakTopics: fromArrayText(analysisForm.overallWeakTopicsText),
        strengths: fromArrayText(analysisForm.strengthsText),
        riskLevel: analysisForm.riskLevel,
        recommendedIntervention: analysisForm.recommendedIntervention,
        questionAnalysis: analysisForm.questionAnalysis,
        reason: 'Teacher reviewed assessment result'
      });
      setNotice('Student analysis updated.');
      setEditAnalysis(null);
      setAnalysisForm(null);
      await loadDetail(selectedAssessmentId);
      await loadTeacherData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  };

  const updateQuestionAnalysis = (index, field, value) => {
    setAnalysisForm((curr) => ({
      ...curr,
      questionAnalysis: curr.questionAnalysis.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: field === 'score' || field === 'confidence' ? Number(value) : value } : item
      )
    }));
  };

  const openGroupEdit = (group) => {
    setEditGroup(group);
    setGroupForm({
      name: group.name || '',
      weakTopic: group.weakTopic || '',
      status: group.status || 'planned',
      interventionType: group.interventionType || 'reteaching',
      reteachingPlan: group.reteachingPlan || '',
      peerLearningSuggestion: group.peerLearningSuggestion || '',
      selectedStudentIds: (group.students || []).map((student) => String(student.studentId))
    });
  };

  const saveGroupOverride = async (event) => {
    event.preventDefault();
    try {
      setSaving('group-override');
      setError('');
      const selectedStudents = groupForm.selectedStudentIds.map((studentId) => {
        const rosterStudent = students.find((student) => String(student._id) === String(studentId));
        const existing = (editGroup.students || []).find((student) => String(student.studentId) === String(studentId));
        return existing || {
          studentId,
          name: rosterStudent?.name || 'Student',
          percentage: 0,
          riskLevel: rosterStudent?.riskLevel || 'low'
        };
      });
      await api.put(`/assessments/intervention-groups/${editGroup._id}`, {
        ...groupForm,
        students: selectedStudents,
        reason: 'Teacher adjusted intervention group'
      });
      setNotice('Intervention group updated.');
      setEditGroup(null);
      setGroupForm(null);
      await loadDetail(selectedAssessmentId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving('');
    }
  };

  const sheetByStudentId = useMemo(() => {
    const map = new Map();
    answerSheets.forEach((sheet) => {
      const id = sheet.studentId?._id || sheet.studentId;
      map.set(String(id), sheet);
    });
    return map;
  }, [answerSheets]);

  useEffect(() => {
    const assessment = detail?.assessment;
    if (!assessment?._id) return;

    const id = String(assessment._id);
    const previousStatus = assessmentStatusRef.current.get(id);
    assessmentStatusRef.current.set(id, assessment.status);

    if (previousStatus && previousStatus !== 'completed' && assessment.status === 'completed') {
      addNotification({
        type: 'assessment_completed',
        title: 'New assessment completed',
        detail: `${assessment.title || 'Assessment'} is ready for review.`,
        to: `/assessments?assessmentId=${id}`,
        dedupeKey: `assessment-completed-${id}`
      });
    }
  }, [detail?.assessment]);

  return (
    <div className="space-y-5">
      {editAnalysis && analysisForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveAnalysisOverride} className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">Teacher review</p>
                <h2 className="text-xl font-black text-[#11233f]">{editAnalysis.studentName}</h2>
              </div>
              <button type="button" onClick={() => setEditAnalysis(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" title="Close">
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Score
                <input className="field" type="number" min="0" value={analysisForm.totalScore} onChange={(e) => setAnalysisForm((curr) => ({ ...curr, totalScore: e.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Max marks
                <input className="field" type="number" min="1" value={analysisForm.maxScore} onChange={(e) => setAnalysisForm((curr) => ({ ...curr, maxScore: e.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Confidence
                <input className="field" type="number" min="0" max="100" value={analysisForm.confidenceScore} onChange={(e) => setAnalysisForm((curr) => ({ ...curr, confidenceScore: e.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Risk
                <select className="field" value={analysisForm.riskLevel} onChange={(e) => setAnalysisForm((curr) => ({ ...curr, riskLevel: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Weak concepts
                <input className="field" value={analysisForm.overallWeakTopicsText} onChange={(e) => setAnalysisForm((curr) => ({ ...curr, overallWeakTopicsText: e.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Strengths
                <input className="field" value={analysisForm.strengthsText} onChange={(e) => setAnalysisForm((curr) => ({ ...curr, strengthsText: e.target.value }))} />
              </label>
            </div>

            <label className="mt-3 grid gap-1.5 text-sm font-bold text-slate-600">
              Teacher intervention
              <textarea className="field min-h-24" value={analysisForm.recommendedIntervention} onChange={(e) => setAnalysisForm((curr) => ({ ...curr, recommendedIntervention: e.target.value }))} />
            </label>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Question review</p>
              {analysisForm.questionAnalysis.map((question, index) => (
                <div key={`${question.questionNumber}-${index}`} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[90px_1fr_1fr_1.5fr]">
                  <label className="grid gap-1 text-xs font-bold text-slate-500">
                    Q{question.questionNumber}
                    <input className="field px-2 py-1.5 text-sm" type="number" value={question.score} onChange={(e) => updateQuestionAnalysis(index, 'score', e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-500">
                    Weak concept
                    <input className="field px-2 py-1.5 text-sm" value={question.weakConcept || ''} onChange={(e) => updateQuestionAnalysis(index, 'weakConcept', e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-500">
                    Mistake
                    <input className="field px-2 py-1.5 text-sm" value={question.mistakeType || ''} onChange={(e) => updateQuestionAnalysis(index, 'mistakeType', e.target.value)} />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-slate-500">
                    Feedback
                    <input className="field px-2 py-1.5 text-sm" value={question.feedback || ''} onChange={(e) => updateQuestionAnalysis(index, 'feedback', e.target.value)} />
                  </label>
                </div>
              ))}
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-600">
              <input type="checkbox" checked={analysisForm.requiresTeacherReview} onChange={(e) => setAnalysisForm((curr) => ({ ...curr, requiresTeacherReview: e.target.checked }))} />
              Keep marked for review
            </label>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setEditAnalysis(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={saving === 'analysis-override'} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving === 'analysis-override' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save review
              </button>
            </div>
          </form>
        </div>
      )}

      {editGroup && groupForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveGroupOverride} className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">Intervention group</p>
                <h2 className="text-xl font-black text-[#11233f]">{editGroup.name}</h2>
              </div>
              <button type="button" onClick={() => setEditGroup(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" title="Close">
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Group name
                <input className="field" value={groupForm.name} onChange={(e) => setGroupForm((curr) => ({ ...curr, name: e.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Weak topic
                <input className="field" value={groupForm.weakTopic} onChange={(e) => setGroupForm((curr) => ({ ...curr, weakTopic: e.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Type
                <select className="field" value={groupForm.interventionType} onChange={(e) => setGroupForm((curr) => ({ ...curr, interventionType: e.target.value }))}>
                  <option value="reteaching">Reteaching</option>
                  <option value="peer_learning">Peer learning</option>
                  <option value="targeted_practice">Targeted practice</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Status
                <select className="field" value={groupForm.status} onChange={(e) => setGroupForm((curr) => ({ ...curr, status: e.target.value }))}>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            <label className="mt-3 grid gap-1.5 text-sm font-bold text-slate-600">
              Reteaching plan
              <textarea className="field min-h-24" value={groupForm.reteachingPlan} onChange={(e) => setGroupForm((curr) => ({ ...curr, reteachingPlan: e.target.value }))} />
            </label>
            <label className="mt-3 grid gap-1.5 text-sm font-bold text-slate-600">
              Peer learning
              <textarea className="field min-h-20" value={groupForm.peerLearningSuggestion} onChange={(e) => setGroupForm((curr) => ({ ...curr, peerLearningSuggestion: e.target.value }))} />
            </label>

            <div className="mt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Students</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {students.map((student) => (
                  <label key={student._id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={groupForm.selectedStudentIds.includes(String(student._id))}
                      onChange={(e) => setGroupForm((curr) => ({
                        ...curr,
                        selectedStudentIds: e.target.checked
                          ? [...curr.selectedStudentIds, String(student._id)]
                          : curr.selectedStudentIds.filter((id) => id !== String(student._id))
                      }))}
                    />
                    {student.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setEditGroup(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={saving === 'group-override'} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving === 'group-override' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save group
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">Assessments</p>
          <h1 className="mt-1 text-3xl font-black text-[#11233f]">Assessment intelligence</h1>
          <p className="mt-1 text-sm text-slate-500">Create papers, process answer sheets, and plan teacher-led interventions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="field w-auto min-w-[200px]" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            {!teachers.length && <option value="">No teachers</option>}
            {teachers.map((teacher) => (
              <option key={teacher._id} value={teacher._id}>{teacher.name} - {teacher.grade}</option>
            ))}
          </select>
          <button type="button" onClick={() => loadDetail()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </section>

      {selectedTeacher && (
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          {selectedTeacher.school} - {selectedTeacher.subject} - {selectedTeacher.grade}
        </p>
      )}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-800">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">{notice}</p>}

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="panel rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black text-[#11233f]">Assessment history</h2>
              {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
            </div>
            <div className="space-y-2">
              {!assessments.length && !loading && (
                <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
                  <ClipboardCheck size={26} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-500">No assessments yet</p>
                </div>
              )}
              {assessments.map((assessment) => (
                <button
                  key={assessment._id}
                  type="button"
                  onClick={() => selectAssessment(assessment._id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedAssessmentId === assessment._id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-black text-[#11233f]">{assessment.title}</p>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${statusStyles[assessment.status] || statusStyles.draft}`}>
                      {String(assessment.status || 'draft').replaceAll('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{assessment.topic} - {formatDate(assessment.createdAt)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="panel rounded-xl p-4">
            <div className="grid gap-2">
              {[
                { key: 'overview', label: 'Overview', icon: ClipboardCheck },
                { key: 'create', label: 'Create paper', icon: FilePlus2 },
                { key: 'upload-paper', label: 'Upload paper', icon: Upload },
                { key: 'upload', label: 'Upload answers', icon: FileText }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${
                    activeTab === key ? 'bg-[#11233f] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="space-y-5">
          {activeTab === 'create' && (
            <form onSubmit={createGeneratedPaperPreview} className="panel rounded-xl p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
                  <FilePlus2 size={18} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">AI paper builder</p>
                  <h2 className="text-lg font-black text-[#11233f]">Create question paper</h2>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ['subject', 'Subject'],
                  ['topic', 'Topic'],
                  ['subtopic', 'Subtopic'],
                  ['grade', 'Grade/Class'],
                  ['language', 'Language']
                ].map(([field, label]) => (
                  <label key={field} className="grid gap-1.5 text-sm font-bold text-slate-600">
                    {label}
                    <input className="field" value={generateForm[field]} onChange={(e) => setGenerateForm((curr) => ({ ...curr, [field]: e.target.value }))} required={['subject', 'topic', 'grade'].includes(field)} />
                  </label>
                ))}
                <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                  Difficulty
                  <select className="field" value={generateForm.difficultyLevel} onChange={(e) => setGenerateForm((curr) => ({ ...curr, difficultyLevel: e.target.value }))}>
                    <option value="mixed">Mixed</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                  Questions
                  <input className="field" type="number" min="1" max="25" value={generateForm.numberOfQuestions} onChange={(e) => setGenerateForm((curr) => ({ ...curr, numberOfQuestions: e.target.value }))} />
                </label>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-sm font-bold text-slate-600">Question types</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['short_answer', 'Short answer'],
                    ['word_problem', 'Word problem'],
                    ['multiple_choice', 'MCQ'],
                    ['long_answer', 'Long answer']
                  ].map(([type, label]) => (
                    <label key={type} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={(generateForm.questionTypes || []).includes(type)} onChange={(e) => updateQuestionType(type, e.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={saving === 'preview' || !teacherId} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving === 'preview' ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
                Generate preview
              </button>

              {paperPreview && (
                <section className="mt-6 border-t border-slate-100 pt-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-blue-600">Preview</p>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-black text-[#11233f] outline-none focus:border-blue-400"
                        value={paperPreview.title || ''}
                        onChange={(e) => setPaperPreview((curr) => ({ ...curr, title: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={saving === 'preview'}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {saving === 'preview' ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                        Regenerate
                      </button>
                      <button
                        type="button"
                        onClick={saveGeneratedPaperPreview}
                        disabled={saving === 'save-preview'}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {saving === 'save-preview' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        Save assessment
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {(paperPreview.questions || []).map((question, index) => (
                      <article key={`${question.questionNumber}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="grid gap-3 lg:grid-cols-[80px_1fr_120px]">
                          <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                            Number
                            <input className="field px-2 py-1.5 text-sm" value={question.questionNumber} readOnly />
                          </label>
                          <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                            Question
                            <textarea className="field min-h-20" value={question.questionText || ''} onChange={(e) => updatePreviewQuestion(index, 'questionText', e.target.value)} />
                          </label>
                          <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                            Marks
                            <input className="field px-2 py-1.5 text-sm" type="number" min="0" value={question.marks || 0} onChange={(e) => updatePreviewQuestion(index, 'marks', e.target.value)} />
                          </label>
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-3">
                          <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                            Expected answer
                            <textarea className="field min-h-20" value={question.expectedAnswer || ''} onChange={(e) => updatePreviewQuestion(index, 'expectedAnswer', e.target.value)} />
                          </label>
                          <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                            Concept tested
                            <input className="field" value={question.conceptTested || ''} onChange={(e) => updatePreviewQuestion(index, 'conceptTested', e.target.value)} />
                          </label>
                          <label className="grid gap-1.5 text-xs font-bold text-slate-500">
                            Learning objective
                            <textarea className="field min-h-20" value={question.learningObjective || ''} onChange={(e) => updatePreviewQuestion(index, 'learningObjective', e.target.value)} />
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </form>
          )}

          {activeTab === 'upload-paper' && (
            <form onSubmit={uploadExistingPaper} className="panel rounded-xl p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Upload size={18} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Existing paper</p>
                  <h2 className="text-lg font-black text-[#11233f]">Upload question paper</h2>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ['subject', 'Subject'],
                  ['topic', 'Topic'],
                  ['subtopic', 'Subtopic'],
                  ['grade', 'Grade/Class'],
                  ['language', 'Language']
                ].map(([field, label]) => (
                  <label key={field} className="grid gap-1.5 text-sm font-bold text-slate-600">
                    {label}
                    <input className="field" value={uploadPaperForm[field]} onChange={(e) => setUploadPaperForm((curr) => ({ ...curr, [field]: e.target.value }))} required={['subject', 'topic', 'grade'].includes(field)} />
                  </label>
                ))}
                <label className="grid gap-1.5 text-sm font-bold text-slate-600 md:col-span-2">
                  PDF, image, DOC, or DOCX
                  <input className="field" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(e) => setUploadPaperForm((curr) => ({ ...curr, file: e.target.files?.[0] || null }))} required />
                </label>
              </div>
              <button type="submit" disabled={saving === 'paper-upload' || !teacherId} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving === 'paper-upload' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Upload and parse
              </button>
            </form>
          )}

          {activeTab === 'upload' && (
            <form onSubmit={uploadAnswerSheets} className="panel rounded-xl p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                    <FileText size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">Batch upload</p>
                    <h2 className="text-lg font-black text-[#11233f]">Upload student answer sheets</h2>
                  </div>
                </div>
                {!selectedAssessmentId && <span className="text-sm font-semibold text-rose-600">Create or select an assessment first</span>}
              </div>

              <label className="grid gap-1.5 text-sm font-bold text-slate-600">
                Answer sheets
                <input className="field" type="file" multiple accept=".pdf,.png,.jpg,.jpeg" disabled={!selectedAssessmentId} onChange={(e) => onAnswerFiles(e.target.files || [])} />
              </label>

              {!!answerRows.length && (
                <div className="mt-4 space-y-2">
                  {answerRows.map((row) => (
                    <div key={row.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_260px]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#11233f]">{row.file.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{Math.round(row.file.size / 1024)} KB</p>
                      </div>
                      <select
                        className="field"
                        value={row.studentId}
                        onChange={(e) => setAnswerRows((curr) => curr.map((item) => item.id === row.id ? { ...item, studentId: e.target.value } : item))}
                        required
                      >
                        <option value="">Map to student</option>
                        {students.map((student) => (
                          <option key={student._id} value={student._id}>{student.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" disabled={saving === 'answers' || !answerRows.length} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving === 'answers' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Queue processing
              </button>
            </form>
          )}

          {activeTab === 'overview' && (
            <>
              {!selectedAssessmentId && (
                <div className="panel rounded-xl p-8 text-center">
                  <ClipboardCheck size={34} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-black text-[#11233f]">Select or create an assessment</p>
                  <p className="mt-1 text-sm text-slate-500">Assessment insights appear after answer sheets are processed.</p>
                </div>
              )}

              {selectedAssessmentId && (
                <>
                  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Class average" value={`${Math.round(classroomAnalysis?.classAverage || 0)}%`} icon={BookOpenCheck} tone="blue" />
                    <Metric label="Processed" value={processingSummary.completed || 0} icon={CheckCircle2} tone="green" />
                    <Metric label="Review needed" value={processingSummary.reviewRequired || 0} icon={AlertTriangle} tone="rose" />
                    <Metric label="Groups" value={interventionGroups.length} icon={UsersRound} tone="amber" />
                  </section>

                  <section className="panel rounded-xl p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Selected assessment</p>
                        <h2 className="mt-1 text-xl font-black text-[#11233f]">{detail?.assessment?.title || 'Assessment'}</h2>
                        <p className="mt-1 text-sm text-slate-500">{detail?.assessment?.subject} - {detail?.assessment?.topic} - {detail?.assessment?.grade}</p>
                      </div>
                      <span className={`rounded-lg px-2 py-1 text-xs font-black uppercase ${statusStyles[detail?.assessment?.status] || statusStyles.draft}`}>
                        {String(detail?.assessment?.status || 'draft').replaceAll('_', ' ')}
                      </span>
                    </div>

                    {detailLoading && (
                      <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">
                        <Loader2 size={16} className="animate-spin" />
                        Loading assessment...
                      </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {answerSheets.map((sheet) => (
                        <article key={sheet._id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex gap-3">
                            {sheet.thumbnailUrl && (
                              <a href={sheet.fileUrl} target="_blank" rel="noreferrer" className="shrink-0">
                                <img src={sheet.thumbnailUrl} alt="" className="h-20 w-16 rounded-lg border border-slate-200 object-cover" />
                              </a>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[#11233f]">{sheet.studentId?.name || 'Student'}</p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">{sheet.originalFileName}</p>
                              <span className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${statusStyles[sheet.processingStatus] || statusStyles.queued}`}>
                                {String(sheet.processingStatus).replaceAll('_', ' ')}
                              </span>
                            </div>
                          </div>
                          {sheet.lastError && <p className="mt-2 line-clamp-2 text-xs font-semibold text-rose-700">{sheet.lastError}</p>}
                          {sheet.processingStatus === 'failed' && (
                            <button type="button" onClick={() => retrySheet(sheet._id)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">
                              {saving === sheet._id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                              Retry
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
                    <div className="panel rounded-xl p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Layers3 size={17} className="text-blue-600" />
                        <h2 className="font-black text-[#11233f]">Weakest concepts</h2>
                      </div>
                      <div className="space-y-2">
                        {!(classroomAnalysis?.weakestConcepts || []).length && (
                          <p className="text-sm text-slate-500">Concept insights appear after answer sheets finish processing.</p>
                        )}
                        {(classroomAnalysis?.weakestConcepts || []).map((concept) => (
                          <div key={concept.concept} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <span className="font-bold text-[#11233f]">{concept.concept}</span>
                            <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-black text-amber-900">{concept.count} students</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="panel rounded-xl p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Brain size={17} className="text-emerald-600" />
                        <h2 className="font-black text-[#11233f]">What to do next</h2>
                      </div>
                      <div className="space-y-2">
                        {!(classroomAnalysis?.interventionPriorities || []).length && (
                          <p className="text-sm text-slate-500">Intervention priorities will be generated after class analysis.</p>
                        )}
                        {(classroomAnalysis?.interventionPriorities || []).map((item, index) => (
                          <article key={`${item.concept}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-sm font-black text-[#11233f]">{item.concept}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-600">{item.nextAction || item.reason}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="panel rounded-xl p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Student results</p>
                        <h2 className="text-lg font-black text-[#11233f]">Scores, mistakes, feedback</h2>
                      </div>
                    </div>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {!studentAnalyses.length && (
                        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No student analyses yet.</p>
                      )}
                      {studentAnalyses.map((analysis, index) => {
                        const studentId = analysis.studentId?._id || analysis.studentId;
                        const sheet = sheetByStudentId.get(String(studentId));
                        return (
                          <article key={analysis._id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 gap-3">
                                {sheet?.thumbnailUrl && (
                                  <a href={sheet.fileUrl} target="_blank" rel="noreferrer" className="shrink-0">
                                    <img src={sheet.thumbnailUrl} alt="" className="h-20 w-16 rounded-lg border border-slate-200 object-cover" />
                                  </a>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Rank {index + 1}</p>
                                  <h3 className="truncate font-black text-[#11233f]">{analysis.studentName}</h3>
                                  <p className="mt-1 text-sm text-slate-500">{Math.round(analysis.percentage || 0)}% - {analysis.totalScore}/{analysis.maxScore}</p>
                                </div>
                              </div>
                              <button type="button" onClick={() => openAnalysisEdit(analysis)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Review score">
                                <Pencil size={15} />
                              </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className={`rounded-lg px-2 py-1 text-xs font-black uppercase ${riskStyles[analysis.riskLevel] || riskStyles.low}`}>{analysis.riskLevel}</span>
                              <span className={`rounded-lg px-2 py-1 text-xs font-black uppercase ${analysis.requiresTeacherReview ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {analysis.requiresTeacherReview ? 'review' : 'confirmed'}
                              </span>
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{Math.round(analysis.confidenceScore || 0)}% confidence</span>
                            </div>
                            <div className="mt-3">
                              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Weak concepts</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(analysis.overallWeakTopics || []).slice(0, 5).map((topic) => (
                                  <span key={topic} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">{topic}</span>
                                ))}
                                {!(analysis.overallWeakTopics || []).length && <span className="text-xs text-slate-400">No weak concept listed</span>}
                              </div>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-600">{analysis.recommendedIntervention}</p>
                          </article>
                        );
                      })}
                    </div>
                  </section>

                  <section className="panel rounded-xl p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <UsersRound size={17} className="text-blue-600" />
                      <h2 className="font-black text-[#11233f]">Intervention groups</h2>
                    </div>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {!interventionGroups.length && (
                        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">Groups are generated after class analysis.</p>
                      )}
                      {interventionGroups.map((group) => (
                        <article key={group._id} className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider text-slate-400">{group.interventionType}</p>
                              <h3 className="mt-1 font-black text-[#11233f]">{group.name}: {group.weakTopic}</h3>
                            </div>
                            <button type="button" onClick={() => openGroupEdit(group)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Edit group">
                              <Pencil size={15} />
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(group.students || []).map((student) => (
                              <span key={student.studentId} className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">{student.name}</span>
                            ))}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600">{group.reteachingPlan}</p>
                          {group.peerLearningSuggestion && <p className="mt-2 text-xs leading-5 text-slate-500">{group.peerLearningSuggestion}</p>}
                        </article>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Assessments;
