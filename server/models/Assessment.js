const { asId, createModel } = require('./postgresModel');

module.exports = createModel({
  table: 'assessments',
  columns: {
    _id: 'id',
    teacherId: 'teacher_id',
    classroomId: 'classroom_id',
    questionPaperId: 'question_paper_id',
    title: 'title',
    subject: 'subject',
    topic: 'topic',
    subtopic: 'subtopic',
    grade: 'grade',
    language: 'language',
    status: 'status',
    totalMarks: 'total_marks',
    processingSummary: 'processing_summary',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  jsonColumns: ['processingSummary'],
  defaults: () => ({
    language: 'English',
    status: 'draft',
    totalMarks: 0,
    processingSummary: {},
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  normalize: (assessment) => ({
    ...assessment,
    teacherId: asId(assessment.teacherId),
    classroomId: asId(assessment.classroomId),
    questionPaperId: asId(assessment.questionPaperId),
    language: assessment.language || 'English',
    status: assessment.status || 'draft',
    totalMarks: Number(assessment.totalMarks || 0),
    processingSummary: assessment.processingSummary || {},
    updatedAt: assessment.updatedAt || new Date()
  }),
  populate: async (assessment, path, fields, selectFields) => {
    if (path === 'teacherId' && assessment.teacherId) {
      const Teacher = require('./Teacher');
      const teacher = await Teacher.findById(assessment.teacherId).lean();
      assessment.teacherId = selectFields(teacher, fields);
      return;
    }

    if (path === 'questionPaperId' && assessment.questionPaperId) {
      const QuestionPaper = require('./QuestionPaper');
      const paper = await QuestionPaper.findById(assessment.questionPaperId).lean();
      assessment.questionPaperId = selectFields(paper, fields);
    }
  }
});
