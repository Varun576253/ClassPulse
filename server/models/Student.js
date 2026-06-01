const { asId, createModel } = require('./postgresModel');

const defaultLearningProfile = () => ({
  strongTopics: [],
  weakTopics: [],
  recurringMistakes: [],
  assessmentHistory: [],
  feedbackHistory: [],
  interventionHistory: [],
  remediationRecords: [],
  conceptMasteryMap: {},
  improvementTrend: {
    direction: 'steady',
    latestScore: 0,
    change: 0
  }
});

const normalizeProgress = (entry = {}) => ({
  ...entry,
  sessionId: asId(entry.sessionId)
});

const normalize = (student) => ({
  ...student,
  teacherId: asId(student.teacherId),
  classroomId: asId(student.classroomId),
  phone: String(student.phone || '').trim(),
  language: student.language || 'English',
  riskLevel: student.riskLevel || 'low',
  confidenceLevel: student.confidenceLevel || 'medium',
  learningProfile: {
    ...defaultLearningProfile(),
    ...(student.learningProfile || {})
  },
  progressHistory: (student.progressHistory || []).map(normalizeProgress)
});

module.exports = createModel({
  table: 'students',
  columns: {
    _id: 'id',
    name: 'name',
    grade: 'grade',
    teacherId: 'teacher_id',
    classroomId: 'classroom_id',
    phone: 'phone',
    language: 'language',
    riskLevel: 'risk_level',
    confidenceLevel: 'confidence_level',
    learningProfile: 'learning_profile',
    progressHistory: 'progress_history'
  },
  jsonColumns: ['learningProfile', 'progressHistory'],
  defaults: () => ({
    language: 'English',
    riskLevel: 'low',
    confidenceLevel: 'medium',
    learningProfile: defaultLearningProfile(),
    progressHistory: []
  }),
  normalize,
  populate: async (student, path, fields, selectFields) => {
    if (path !== 'teacherId' || !student.teacherId) {
      return;
    }

    const Teacher = require('./Teacher');
    const teacher = await Teacher.findById(student.teacherId).lean();
    student.teacherId = selectFields(teacher, fields);
  }
});
