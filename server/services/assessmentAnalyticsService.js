const Assessment = require('../models/Assessment');
const AnswerSheet = require('../models/AnswerSheet');
const ClassroomAnalysis = require('../models/ClassroomAnalysis');
const InterventionGroup = require('../models/InterventionGroup');
const QuestionPaper = require('../models/QuestionPaper');
const RemediationHistory = require('../models/RemediationHistory');
const Student = require('../models/Student');
const StudentAnalysis = require('../models/StudentAnalysis');
const { generateClassroomInterventions } = require('./assessmentAiService');
const { updateStudentRisk } = require('./riskService');

const terminalStatuses = ['completed', 'review_required', 'failed'];

const uniq = (values = []) => [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))];

const pushUnique = (items, value) => {
  if (value && !items.includes(value)) {
    items.push(value);
  }
};

const limit = (items = [], size = 30) => items.slice(Math.max(0, items.length - size));

const confidenceLevel = (score) => {
  if (Number(score) >= 80) return 'high';
  if (Number(score) >= 55) return 'medium';
  return 'low';
};

const average = (values = []) => {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return 0;
  return Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length);
};

const bucketDistribution = (analyses = []) => analyses.reduce((buckets, analysis) => {
  const percentage = Number(analysis.percentage || 0);
  if (percentage >= 80) buckets.strong += 1;
  else if (percentage >= 50) buckets.developing += 1;
  else buckets.needsSupport += 1;
  return buckets;
}, { strong: 0, developing: 0, needsSupport: 0 });

const countItems = (items = []) => items.reduce((counts, value) => {
  const key = String(value || '').trim();
  if (!key) return counts;
  counts[key] = (counts[key] || 0) + 1;
  return counts;
}, {});

const toRankedCounts = (counts, labelName = 'name') => Object.entries(counts)
  .map(([name, count]) => ({ [labelName]: name, count }))
  .sort((a, b) => b.count - a.count);

const computeTopicAverages = (analyses = []) => {
  const byConcept = new Map();
  analyses.forEach((analysis) => {
    (analysis.questionAnalysis || []).forEach((question) => {
      const concept = question.conceptTested || question.weakConcept;
      if (!concept) return;
      const current = byConcept.get(concept) || [];
      current.push(Number(question.confidence) ? Number(question.score || 0) : Number(question.score || 0));
      byConcept.set(concept, current);
    });
  });

  return [...byConcept.entries()]
    .map(([concept, scores]) => ({ concept, averageScore: average(scores), attempts: scores.length }))
    .sort((a, b) => a.averageScore - b.averageScore);
};

const computeConceptGroups = (analyses = []) => {
  const groups = new Map();

  analyses.forEach((analysis) => {
    const weakTopics = uniq([
      ...(analysis.overallWeakTopics || []),
      ...(analysis.questionAnalysis || [])
        .filter((question) => !question.isCorrect || Number(question.score || 0) <= 0)
        .map((question) => question.weakConcept || question.conceptTested)
    ]);

    weakTopics.forEach((weakTopic) => {
      const group = groups.get(weakTopic) || {
        weakTopic,
        students: [],
        avgScore: 0,
        riskCount: 0
      };
      group.students.push({
        studentId: String(analysis.studentId),
        name: analysis.studentName,
        percentage: Number(analysis.percentage || 0),
        riskLevel: analysis.riskLevel,
        requiresTeacherReview: analysis.requiresTeacherReview
      });
      if (analysis.riskLevel === 'high') group.riskCount += 1;
      groups.set(weakTopic, group);
    });
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      avgScore: average(group.students.map((student) => student.percentage))
    }))
    .sort((a, b) => b.students.length - a.students.length || a.avgScore - b.avgScore);
};

const computeProgressTrend = (student) => {
  const history = student.progressHistory || [];
  if (history.length < 2) {
    return { direction: 'steady', latestScore: Number(history.at(-1)?.score || 0), change: 0 };
  }

  const previous = Number(history.at(-2)?.score || 0);
  const latest = Number(history.at(-1)?.score || 0);
  const change = latest - previous;
  return {
    direction: change >= 5 ? 'improving' : change <= -5 ? 'declining' : 'steady',
    latestScore: latest,
    change
  };
};

const updateStudentProfileFromAnalysis = async ({ assessment, questionPaper, analysis }) => {
  const student = await Student.findById(analysis.studentId);
  if (!student) {
    return null;
  }

  const profile = {
    strongTopics: [],
    weakTopics: [],
    recurringMistakes: [],
    assessmentHistory: [],
    feedbackHistory: [],
    interventionHistory: [],
    remediationRecords: [],
    conceptMasteryMap: {},
    improvementTrend: { direction: 'steady', latestScore: 0, change: 0 },
    ...(student.learningProfile || {})
  };

  const weakTopics = uniq(analysis.overallWeakTopics || []);
  const strengths = uniq(analysis.strengths || []);

  strengths.forEach((topic) => pushUnique(profile.strongTopics, topic));
  weakTopics.forEach((topic) => pushUnique(profile.weakTopics, topic));
  (analysis.questionAnalysis || []).forEach((question) => {
    if (question.mistakeType) pushUnique(profile.recurringMistakes, question.mistakeType);
    const concept = question.conceptTested || question.weakConcept;
    if (!concept) return;
    const paperQuestion = (questionPaper.questions || []).find((item) =>
      Number(item.questionNumber) === Number(question.questionNumber)
    );
    const maxMarks = Number(paperQuestion?.marks || 1);
    const masteryScore = maxMarks ? Math.round((Number(question.score || 0) / maxMarks) * 100) : 0;
    const existing = profile.conceptMasteryMap[concept] || { attempts: 0, latestScore: 0, masteryLevel: 'new' };
    profile.conceptMasteryMap[concept] = {
      attempts: Number(existing.attempts || 0) + 1,
      latestScore: masteryScore,
      masteryLevel: masteryScore >= 75 ? 'mastered' : masteryScore >= 45 ? 'developing' : 'needs_support',
      lastAssessmentId: assessment._id,
      lastAssessmentAt: new Date()
    };
  });

  const progress = {
    assessmentId: assessment._id,
    topic: assessment.topic,
    subtopic: assessment.subtopic,
    date: new Date(),
    score: Number(analysis.percentage || 0),
    rawScore: Number(analysis.totalScore || 0),
    maxScore: Number(analysis.maxScore || 0),
    understood: Number(analysis.percentage || 0) >= 70,
    misconception: weakTopics[0] || '',
    weakConcepts: weakTopics,
    strengths,
    confidenceLevel: confidenceLevel(analysis.confidenceScore),
    feedback: analysis.recommendedIntervention,
    source: 'assessment'
  };

  const existingProgress = student.progressHistory.find((entry) => String(entry.assessmentId) === String(assessment._id));
  if (existingProgress) {
    Object.assign(existingProgress, progress);
  } else {
    student.progressHistory.push(progress);
  }

  const historyEntry = {
    assessmentId: assessment._id,
    title: assessment.title,
    topic: assessment.topic,
    score: Number(analysis.percentage || 0),
    weakTopics,
    strengths,
    riskLevel: analysis.riskLevel,
    date: new Date()
  };
  profile.assessmentHistory = limit([
    ...(profile.assessmentHistory || []).filter((entry) => String(entry.assessmentId) !== String(assessment._id)),
    historyEntry
  ], 40);
  profile.feedbackHistory = limit([
    ...(profile.feedbackHistory || []).filter((entry) => String(entry.assessmentId) !== String(assessment._id)),
    {
      assessmentId: assessment._id,
      feedback: analysis.recommendedIntervention,
      confidenceScore: analysis.confidenceScore,
      requiresTeacherReview: analysis.requiresTeacherReview,
      date: new Date()
    }
  ], 40);
  profile.improvementTrend = computeProgressTrend(student);

  student.confidenceLevel = confidenceLevel(analysis.confidenceScore);
  student.learningProfile = profile;
  await student.save();
  await updateStudentRisk(student);
  return student;
};

const computedSummaryFor = ({ assessment, analyses, conceptGroups }) => {
  const topicAverages = computeTopicAverages(analyses);
  const weakCounts = countItems(analyses.flatMap((analysis) => analysis.overallWeakTopics || []));
  const misconceptionCounts = countItems(analyses.flatMap((analysis) =>
    (analysis.questionAnalysis || []).map((question) => question.mistakeType || question.weakConcept)
  ));
  const riskStudents = analyses
    .filter((analysis) => analysis.riskLevel === 'high' || Number(analysis.percentage || 0) < 45)
    .map((analysis) => ({
      studentId: analysis.studentId,
      name: analysis.studentName,
      score: Number(analysis.percentage || 0),
      weakTopics: analysis.overallWeakTopics,
      requiresTeacherReview: analysis.requiresTeacherReview
    }));

  return {
    assessmentId: assessment._id,
    classAverage: average(analyses.map((analysis) => analysis.percentage)),
    topicAverages,
    hardestConcepts: topicAverages.slice(0, 5),
    weakestConcepts: toRankedCounts(weakCounts, 'concept').slice(0, 8),
    misconceptionPatterns: toRankedCounts(misconceptionCounts, 'mistake').slice(0, 8),
    performanceDistribution: bucketDistribution(analyses),
    riskStudents,
    conceptGroups
  };
};

const computedInterventionPlan = (conceptGroups = []) => ({
  interventionPriorities: conceptGroups.slice(0, 5).map((group, index) => ({
    priority: index + 1,
    concept: group.weakTopic,
    reason: `${group.students.length} students grouped from assessment evidence`,
    nextAction: `Use the assessment mistakes for ${group.weakTopic} to plan a short reteach and practice check.`
  })),
  aiRecommendations: [],
  groups: conceptGroups.map((group, index) => ({
    name: `Group ${String.fromCharCode(65 + index)}`,
    weakTopic: group.weakTopic,
    interventionType: 'reteaching',
    reteachingPlan: `Review the exact mistakes found for ${group.weakTopic}, model one corrected example, and reassess with one similar item.`,
    peerLearningSuggestion: '',
    materials: []
  })),
  remediationMaterials: []
});

const syncRemediationHistory = async ({ assessment, group, material }) => {
  for (const student of group.students || []) {
    const existing = await RemediationHistory.findOne({
      assessmentId: assessment._id,
      studentId: student.studentId,
      concept: group.weakTopic
    });

    if (!existing) {
      await RemediationHistory.create({
        assessmentId: assessment._id,
        studentId: student.studentId,
        interventionGroupId: group._id,
        teacherId: assessment.teacherId,
        concept: group.weakTopic,
        materialType: material?.type || material?.materialType || 'worksheet',
        language: assessment.language,
        content: material?.content || material || {},
        status: 'assigned'
      });
    }

    const rosterStudent = await Student.findById(student.studentId);
    if (rosterStudent) {
      const profile = {
        strongTopics: [],
        weakTopics: [],
        recurringMistakes: [],
        interventionHistory: [],
        remediationRecords: [],
        ...(rosterStudent.learningProfile || {})
      };
      profile.interventionHistory = limit([
        ...(profile.interventionHistory || []).filter((entry) => (
          String(entry.assessmentId) !== String(assessment._id) || entry.concept !== group.weakTopic
        )),
        {
          assessmentId: assessment._id,
          groupId: group._id,
          concept: group.weakTopic,
          interventionType: group.interventionType,
          status: group.status,
          date: new Date()
        }
      ], 40);
      profile.remediationRecords = limit([
        ...(profile.remediationRecords || []).filter((entry) => (
          String(entry.assessmentId) !== String(assessment._id) || entry.concept !== group.weakTopic
        )),
        {
          assessmentId: assessment._id,
          concept: group.weakTopic,
          materialType: material?.type || material?.materialType || 'worksheet',
          status: 'assigned',
          date: new Date()
        }
      ], 40);
      rosterStudent.learningProfile = profile;
      await rosterStudent.save();
    }
  }
};

const syncInterventionGroups = async ({ assessment, conceptGroups, aiPlan }) => {
  const existingGroups = await InterventionGroup.find({ assessmentId: assessment._id });
  const existingByTopic = new Map(existingGroups.map((group) => [group.weakTopic, group]));
  const desiredTopics = new Set();
  const createdOrUpdated = [];

  for (let index = 0; index < conceptGroups.length; index += 1) {
    const conceptGroup = conceptGroups[index];
    desiredTopics.add(conceptGroup.weakTopic);
    const aiGroup = (aiPlan.groups || []).find((group) =>
      String(group.weakTopic || '').toLowerCase() === String(conceptGroup.weakTopic).toLowerCase()
    ) || (aiPlan.groups || [])[index] || {};
    const existing = existingByTopic.get(conceptGroup.weakTopic);
    const hasManualOverride = Boolean(existing?.overrideHistory?.length);
    const payload = {
      assessmentId: assessment._id,
      teacherId: assessment.teacherId,
      classroomId: assessment.classroomId,
      name: existing?.name || aiGroup.name || `Group ${String.fromCharCode(65 + index)}`,
      weakTopic: conceptGroup.weakTopic,
      concept: aiGroup.concept || conceptGroup.weakTopic,
      students: hasManualOverride ? existing.students : conceptGroup.students,
      interventionType: hasManualOverride ? existing.interventionType : (aiGroup.interventionType || 'reteaching'),
      reteachingPlan: hasManualOverride ? existing.reteachingPlan : aiGroup.reteachingPlan,
      peerLearningSuggestion: hasManualOverride ? existing.peerLearningSuggestion : aiGroup.peerLearningSuggestion,
      materials: hasManualOverride ? existing.materials : (aiGroup.materials || []),
      status: existing?.status || 'planned',
      overrideHistory: existing?.overrideHistory || [],
      updatedAt: new Date()
    };

    let group;
    if (existing) {
      await InterventionGroup.updateOne({ _id: existing._id }, payload);
      group = await InterventionGroup.findById(existing._id);
    } else {
      group = await InterventionGroup.create(payload);
    }
    createdOrUpdated.push(group);

    const remediation = (aiPlan.remediationMaterials || []).find((item) =>
      String(item.concept || '').toLowerCase() === String(conceptGroup.weakTopic).toLowerCase()
    );
    await syncRemediationHistory({
      assessment,
      group,
      material: remediation || group.materials?.[0] || {}
    });
  }

  for (const group of existingGroups) {
    const hasManualOverride = Boolean(group.overrideHistory?.length);
    if (!desiredTopics.has(group.weakTopic) && !hasManualOverride) {
      await InterventionGroup.deleteOne({ _id: group._id });
    }
  }

  return createdOrUpdated;
};

const updateAssessmentSummary = async (assessment) => {
  const sheets = await AnswerSheet.find({ assessmentId: assessment._id }).lean();
  const analyses = await StudentAnalysis.find({ assessmentId: assessment._id }).lean();
  const summary = {
    totalAnswerSheets: sheets.length,
    queued: sheets.filter((sheet) => sheet.processingStatus === 'queued').length,
    processing: sheets.filter((sheet) => sheet.processingStatus === 'processing').length,
    completed: sheets.filter((sheet) => sheet.processingStatus === 'completed').length,
    reviewRequired: sheets.filter((sheet) => sheet.processingStatus === 'review_required').length,
    failed: sheets.filter((sheet) => sheet.processingStatus === 'failed').length,
    analysedStudents: analyses.length,
    lastUpdatedAt: new Date()
  };
  const stillRunning = summary.queued + summary.processing;
  const nextStatus = stillRunning
    ? 'processing'
    : summary.totalAnswerSheets
      ? 'completed'
      : assessment.status;

  await Assessment.updateOne({ _id: assessment._id }, {
    processingSummary: summary,
    status: nextStatus,
    updatedAt: new Date()
  });

  return summary;
};

const rebuildClassroomAnalysis = async (assessmentId) => {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) {
    return null;
  }

  const questionPaper = assessment.questionPaperId
    ? await QuestionPaper.findById(assessment.questionPaperId).lean()
    : null;
  const analyses = await StudentAnalysis.find({ assessmentId }).sort({ percentage: -1 }).lean();
  const conceptGroups = computeConceptGroups(analyses);
  const computedSummary = computedSummaryFor({ assessment, analyses, conceptGroups });
  const aiPlan = await generateClassroomInterventions({
    assessment,
    questionPaper: questionPaper || {},
    analyses,
    computedSummary,
    conceptGroups
  }).catch((error) => {
    console.warn('[assessment-analytics] Gemini intervention plan unavailable:', error.message);
    return computedInterventionPlan(conceptGroups);
  });
  const payload = {
    assessmentId: assessment._id,
    teacherId: assessment.teacherId,
    classroomId: assessment.classroomId,
    classAverage: computedSummary.classAverage,
    topicAverages: computedSummary.topicAverages,
    hardestConcepts: computedSummary.hardestConcepts,
    weakestConcepts: computedSummary.weakestConcepts,
    misconceptionPatterns: computedSummary.misconceptionPatterns,
    performanceDistribution: computedSummary.performanceDistribution,
    interventionPriorities: aiPlan.interventionPriorities,
    aiRecommendations: aiPlan.aiRecommendations,
    riskStudents: computedSummary.riskStudents,
    progressTrends: [],
    updatedAt: new Date()
  };
  const existing = await ClassroomAnalysis.findOne({ assessmentId: assessment._id });

  if (existing) {
    await ClassroomAnalysis.updateOne({ _id: existing._id }, payload);
  } else {
    await ClassroomAnalysis.create(payload);
  }

  await syncInterventionGroups({ assessment, conceptGroups, aiPlan });
  await updateAssessmentSummary(assessment);

  return ClassroomAnalysis.findOne({ assessmentId: assessment._id });
};

const maybeFinalizeAssessment = async (assessmentId) => {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) return null;
  const sheets = await AnswerSheet.find({ assessmentId }).lean();
  const hasOpenWork = sheets.some((sheet) => !terminalStatuses.includes(sheet.processingStatus));

  await updateAssessmentSummary(assessment);
  if (!sheets.length || hasOpenWork) {
    return null;
  }

  return rebuildClassroomAnalysis(assessmentId);
};

module.exports = {
  computeConceptGroups,
  maybeFinalizeAssessment,
  rebuildClassroomAnalysis,
  updateAssessmentSummary,
  updateStudentProfileFromAnalysis
};
