const { asId, createModel } = require('./postgresModel');

module.exports = createModel({
  table: 'student_analyses',
  columns: {
    _id: 'id',
    assessmentId: 'assessment_id',
    answerSheetId: 'answer_sheet_id',
    classroomId: 'classroom_id',
    studentId: 'student_id',
    teacherId: 'teacher_id',
    studentName: 'student_name',
    totalScore: 'total_score',
    maxScore: 'max_score',
    percentage: 'percentage',
    confidenceScore: 'confidence_score',
    requiresTeacherReview: 'requires_teacher_review',
    questionAnalysis: 'question_analysis',
    overallWeakTopics: 'overall_weak_topics',
    strengths: 'strengths',
    riskLevel: 'risk_level',
    recommendedIntervention: 'recommended_intervention',
    generatedRemediation: 'generated_remediation',
    overrideHistory: 'override_history',
    aiRaw: 'ai_raw',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  jsonColumns: ['questionAnalysis', 'overallWeakTopics', 'strengths', 'generatedRemediation', 'overrideHistory', 'aiRaw'],
  defaults: () => ({
    totalScore: 0,
    maxScore: 0,
    percentage: 0,
    confidenceScore: 0,
    requiresTeacherReview: false,
    questionAnalysis: [],
    overallWeakTopics: [],
    strengths: [],
    riskLevel: 'low',
    generatedRemediation: [],
    overrideHistory: [],
    aiRaw: {},
    status: 'ai_generated',
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  normalize: (analysis) => ({
    ...analysis,
    assessmentId: asId(analysis.assessmentId),
    answerSheetId: asId(analysis.answerSheetId),
    classroomId: asId(analysis.classroomId),
    studentId: asId(analysis.studentId),
    teacherId: asId(analysis.teacherId),
    totalScore: Number(analysis.totalScore || 0),
    maxScore: Number(analysis.maxScore || 0),
    percentage: Number(analysis.percentage || 0),
    confidenceScore: Number(analysis.confidenceScore || 0),
    requiresTeacherReview: Boolean(analysis.requiresTeacherReview),
    questionAnalysis: analysis.questionAnalysis || [],
    overallWeakTopics: analysis.overallWeakTopics || [],
    strengths: analysis.strengths || [],
    riskLevel: analysis.riskLevel || 'low',
    generatedRemediation: analysis.generatedRemediation || [],
    overrideHistory: analysis.overrideHistory || [],
    aiRaw: analysis.aiRaw || {},
    status: analysis.status || 'ai_generated',
    updatedAt: analysis.updatedAt || new Date()
  }),
  populate: async (analysis, path, fields, selectFields) => {
    if (path !== 'studentId' || !analysis.studentId) {
      return;
    }

    const Student = require('./Student');
    const student = await Student.findById(analysis.studentId).lean();
    analysis.studentId = selectFields(student, fields);
  }
});
