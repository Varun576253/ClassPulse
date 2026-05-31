const { asId, createModel } = require('./postgresModel');

module.exports = createModel({
  table: 'messages',
  columns: {
    _id: 'id',
    studentId: 'student_id',
    sessionId: 'session_id',
    type: 'type',
    deliveryMode: 'delivery_mode',
    status: 'status',
    content: 'content',
    createdAt: 'created_at'
  },
  defaults: () => ({
    createdAt: new Date()
  }),
  normalize: (message) => ({
    ...message,
    studentId: asId(message.studentId),
    sessionId: asId(message.sessionId)
  }),
  populate: async (message, path, fields, selectFields) => {
    if (path !== 'studentId' || !message.studentId) {
      return;
    }

    const Student = require('./Student');
    const student = await Student.findById(message.studentId).lean();
    message.studentId = selectFields(student, fields);
  }
});
