const { asId, createModel } = require('./postgresModel');

module.exports = createModel({
  table: 'ai_feedback_logs',
  columns: {
    _id: 'id',
    teacherId: 'teacher_id',
    assessmentId: 'assessment_id',
    studentId: 'student_id',
    task: 'task',
    model: 'model',
    status: 'status',
    requestPayload: 'request_payload',
    responsePayload: 'response_payload',
    errorMessage: 'error_message',
    createdAt: 'created_at'
  },
  jsonColumns: ['requestPayload', 'responsePayload'],
  defaults: () => ({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    status: 'success',
    requestPayload: {},
    responsePayload: {},
    createdAt: new Date()
  }),
  normalize: (log) => ({
    ...log,
    teacherId: asId(log.teacherId),
    assessmentId: asId(log.assessmentId),
    studentId: asId(log.studentId),
    model: log.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    status: log.status || 'success',
    requestPayload: log.requestPayload || {},
    responsePayload: log.responsePayload || {}
  })
});
