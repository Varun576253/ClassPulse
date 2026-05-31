const { asId, createModel } = require('./postgresModel');

module.exports = createModel({
  table: 'classroom_analyses',
  columns: {
    _id: 'id',
    assessmentId: 'assessment_id',
    teacherId: 'teacher_id',
    classroomId: 'classroom_id',
    classAverage: 'class_average',
    topicAverages: 'topic_averages',
    hardestConcepts: 'hardest_concepts',
    weakestConcepts: 'weakest_concepts',
    misconceptionPatterns: 'misconception_patterns',
    performanceDistribution: 'performance_distribution',
    interventionPriorities: 'intervention_priorities',
    aiRecommendations: 'ai_recommendations',
    riskStudents: 'risk_students',
    progressTrends: 'progress_trends',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  jsonColumns: [
    'topicAverages',
    'hardestConcepts',
    'weakestConcepts',
    'misconceptionPatterns',
    'performanceDistribution',
    'interventionPriorities',
    'aiRecommendations',
    'riskStudents',
    'progressTrends'
  ],
  defaults: () => ({
    classAverage: 0,
    topicAverages: [],
    hardestConcepts: [],
    weakestConcepts: [],
    misconceptionPatterns: [],
    performanceDistribution: {},
    interventionPriorities: [],
    aiRecommendations: [],
    riskStudents: [],
    progressTrends: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }),
  normalize: (analysis) => ({
    ...analysis,
    assessmentId: asId(analysis.assessmentId),
    teacherId: asId(analysis.teacherId),
    classroomId: asId(analysis.classroomId),
    classAverage: Number(analysis.classAverage || 0),
    topicAverages: analysis.topicAverages || [],
    hardestConcepts: analysis.hardestConcepts || [],
    weakestConcepts: analysis.weakestConcepts || [],
    misconceptionPatterns: analysis.misconceptionPatterns || [],
    performanceDistribution: analysis.performanceDistribution || {},
    interventionPriorities: analysis.interventionPriorities || [],
    aiRecommendations: analysis.aiRecommendations || [],
    riskStudents: analysis.riskStudents || [],
    progressTrends: analysis.progressTrends || [],
    updatedAt: analysis.updatedAt || new Date()
  })
});
