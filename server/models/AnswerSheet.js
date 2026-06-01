const { asId, createModel } = require('./postgresModel');

const normalizeLog = (entry = {}) => ({
  stage: entry.stage || 'uploaded',
  status: entry.status || 'info',
  message: entry.message || '',
  at: entry.at || new Date()
});

module.exports = createModel({
  table: 'answer_sheets',
  columns: {
    _id: 'id',
    assessmentId: 'assessment_id',
    classroomId: 'classroom_id',
    studentId: 'student_id',
    teacherId: 'teacher_id',
    fileUrl: 'file_url',
    thumbnailUrl: 'thumbnail_url',
    originalFileName: 'original_file_name',
    mimeType: 'mime_type',
    uploadedAt: 'uploaded_at',
    processingStatus: 'processing_status',
    processingStage: 'processing_stage',
    ocrText: 'ocr_text',
    retryCount: 'retry_count',
    lastError: 'last_error',
    processingLog: 'processing_log'
  },
  jsonColumns: ['processingLog'],
  defaults: () => ({
    uploadedAt: new Date(),
    processingStatus: 'queued',
    processingStage: 'uploaded',
    retryCount: 0,
    processingLog: []
  }),
  normalize: (sheet) => ({
    ...sheet,
    assessmentId: asId(sheet.assessmentId),
    classroomId: asId(sheet.classroomId),
    studentId: asId(sheet.studentId),
    teacherId: asId(sheet.teacherId),
    processingStatus: sheet.processingStatus || 'queued',
    processingStage: sheet.processingStage || 'uploaded',
    retryCount: Number(sheet.retryCount || 0),
    processingLog: (sheet.processingLog || []).map(normalizeLog)
  }),
  populate: async (sheet, path, fields, selectFields) => {
    if (path !== 'studentId' || !sheet.studentId) {
      return;
    }

    const Student = require('./Student');
    const student = await Student.findById(sheet.studentId).lean();
    sheet.studentId = selectFields(student, fields);
  }
});
