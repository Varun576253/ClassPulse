const { asId, createModel } = require('./postgresModel');

module.exports = createModel({
  table: 'remediation_history',
  columns: {
    _id: 'id',
    assessmentId: 'assessment_id',
    studentId: 'student_id',
    interventionGroupId: 'intervention_group_id',
    teacherId: 'teacher_id',
    concept: 'concept',
    materialType: 'material_type',
    language: 'language',
    content: 'content',
    status: 'status',
    assignedAt: 'assigned_at',
    completedAt: 'completed_at'
  },
  jsonColumns: ['content'],
  defaults: () => ({
    materialType: 'worksheet',
    language: 'English',
    content: {},
    status: 'assigned',
    assignedAt: new Date()
  }),
  normalize: (item) => ({
    ...item,
    assessmentId: asId(item.assessmentId),
    studentId: asId(item.studentId),
    interventionGroupId: asId(item.interventionGroupId),
    teacherId: asId(item.teacherId),
    materialType: item.materialType || 'worksheet',
    language: item.language || 'English',
    content: item.content || {},
    status: item.status || 'assigned'
  })
});
