const { asId, createModel } = require('./postgresModel');

module.exports = createModel({
  table: 'intervention_groups',
  columns: {
    _id: 'id',
    assessmentId: 'assessment_id',
    teacherId: 'teacher_id',
    classroomId: 'classroom_id',
    name: 'name',
    weakTopic: 'weak_topic',
    concept: 'concept',
    students: 'students',
    interventionType: 'intervention_type',
    reteachingPlan: 'reteaching_plan',
    peerLearningSuggestion: 'peer_learning_suggestion',
    materials: 'materials',
    status: 'status',
    overrideHistory: 'override_history',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  jsonColumns: ['students', 'materials', 'overrideHistory'],
  defaults: () => ({
    students: [],
    interventionType: 'reteaching',
    materials: [],
    status: 'planned',
    overrideHistory: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  normalize: (group) => ({
    ...group,
    assessmentId: asId(group.assessmentId),
    teacherId: asId(group.teacherId),
    classroomId: asId(group.classroomId),
    students: group.students || [],
    interventionType: group.interventionType || 'reteaching',
    materials: group.materials || [],
    status: group.status || 'planned',
    overrideHistory: group.overrideHistory || [],
    updatedAt: group.updatedAt || new Date()
  })
});
