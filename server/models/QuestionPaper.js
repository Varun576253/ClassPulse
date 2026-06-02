const { asId, createModel } = require('./postgresModel');

const normalizeQuestion = (question = {}, index = 0) => ({
  questionNumber: Number(question.questionNumber || index + 1),
  questionText: String(question.questionText || question.question || '').trim(),
  type: question.type || 'short_answer',
  marks: Number(question.marks || 1),
  expectedAnswer: String(question.expectedAnswer || question.correctAnswer || '').trim(),
  conceptTested: String(question.conceptTested || question.concept || '').trim(),
  difficultyLevel: question.difficultyLevel || question.difficulty || 'medium',
  learningObjective: String(question.learningObjective || '').trim(),
  skillCompetency: String(question.skillCompetency || question.competency || '').trim()
});

module.exports = createModel({
  table: 'question_papers',
  columns: {
    _id: 'id',
    teacherId: 'teacher_id',
    classroomId: 'classroom_id',
    title: 'title',
    subject: 'subject',
    topic: 'topic',
    subtopic: 'subtopic',
    grade: 'grade',
    language: 'language',
    difficultyLevel: 'difficulty_level',
    questionTypes: 'question_types',
    sourceType: 'source_type',
    fileUrl: 'file_url',
    extractedText: 'extracted_text',
    questions: 'questions',
    answerKey: 'answer_key',
    markingScheme: 'marking_scheme',
    conceptMapping: 'concept_mapping',
    learningObjectives: 'learning_objectives',
    status: 'status',
    createdAt: 'created_at'
  },
  jsonColumns: ['questionTypes', 'questions', 'answerKey', 'markingScheme', 'conceptMapping', 'learningObjectives'],
  defaults: () => ({
    language: 'English',
    difficultyLevel: 'mixed',
    questionTypes: [],
    sourceType: 'generated',
    questions: [],
    answerKey: [],
    markingScheme: [],
    conceptMapping: [],
    learningObjectives: [],
    status: 'ready',
    createdAt: new Date()
  }),
  normalize: (paper) => ({
    ...paper,
    teacherId: asId(paper.teacherId),
    classroomId: asId(paper.classroomId),
    language: paper.language || 'English',
    difficultyLevel: paper.difficultyLevel || 'mixed',
    questionTypes: paper.questionTypes || [],
    questions: (paper.questions || []).map(normalizeQuestion),
    answerKey: paper.answerKey || [],
    markingScheme: paper.markingScheme || [],
    conceptMapping: paper.conceptMapping || [],
    learningObjectives: paper.learningObjectives || [],
    status: paper.status || 'ready'
  })
});
