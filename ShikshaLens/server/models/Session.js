const { asId, createModel } = require('./postgresModel');

const defaultGroups = () => ({
  advanced: [],
  average: [],
  needsSupport: []
});

const normalizeResponse = (response = {}) => ({
  ...response,
  studentId: asId(response.studentId),
  answers: response.answers || [],
  selectedOptions: response.selectedOptions || [],
  score: Number(response.score || 0),
  understood: response.understood || 'partial',
  confidenceLevel: response.confidenceLevel || 'medium'
});

const normalizeGroupCard = (card = {}) => ({
  ...card,
  studentId: asId(card.studentId)
});

const normalizeGroups = (groups = {}) => ({
  advanced: (groups.advanced || []).map(normalizeGroupCard),
  average: (groups.average || []).map(normalizeGroupCard),
  needsSupport: (groups.needsSupport || []).map(normalizeGroupCard)
});

const normalize = (session) => ({
  ...session,
  teacherId: asId(session.teacherId),
  date: session.date || new Date(),
  status: session.status || 'pending',
  questions: session.questions || [],
    responses: (session.responses || []).map(normalizeResponse),
    groupedStudents: normalizeGroups(session.groupedStudents || defaultGroups()),
    classInsight: session.classInsight || {},
    quizUrl: session.quizUrl || '',
    qrCode: session.qrCode || ''
});

module.exports = createModel({
  table: 'sessions',
  columns: {
    _id: 'id',
    teacherId: 'teacher_id',
    topic: 'topic',
    subject: 'subject',
    grade: 'grade',
    language: 'language',
    date: 'date',
    status: 'status',
    formStatus: 'form_status',
    questions: 'questions',
    responses: 'responses',
    groupedStudents: 'grouped_students',
    classInsight: 'class_insight',
    quizUrl: 'quiz_url',
    qrCode: 'qr_code'
  },
  jsonColumns: ['questions', 'responses', 'groupedStudents', 'classInsight'],
  defaults: () => ({
    date: new Date(),
    status: 'pending',
    formStatus: 'open',
    questions: [],
    responses: [],
    groupedStudents: defaultGroups(),
    classInsight: {},
    quizUrl: '',
    qrCode: ''
  }),
  normalize,
  populate: async (session, path, fields, selectFields) => {
    if (path === 'teacherId' && session.teacherId) {
      const Teacher = require('./Teacher');
      const teacher = await Teacher.findById(session.teacherId).lean();
      session.teacherId = selectFields(teacher, fields);
      return;
    }

    if (path !== 'responses.studentId' || !Array.isArray(session.responses)) {
      return;
    }

    const Student = require('./Student');
    const ids = [...new Set(session.responses.map((response) => asId(response.studentId)).filter(Boolean))];
    const students = ids.length ? await Student.find({ _id: { $in: ids } }).lean() : [];
    const studentsById = new Map(students.map((student) => [String(student._id), student]));

    session.responses = session.responses.map((response) => {
      const id = asId(response.studentId);
      return {
        ...response,
        studentId: selectFields(studentsById.get(String(id)), fields) || id
      };
    });
  }
});
