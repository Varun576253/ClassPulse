const Assessment = require('../models/Assessment');
const AnswerSheet = require('../models/AnswerSheet');
const QuestionPaper = require('../models/QuestionPaper');
const Student = require('../models/Student');
const StudentAnalysis = require('../models/StudentAnalysis');
const { evaluateAnswerSheet } = require('./assessmentAiService');
const {
  maybeFinalizeAssessment,
  updateAssessmentSummary,
  updateStudentProfileFromAnalysis
} = require('./assessmentAnalyticsService');
const { extractTextFromStoredFile, validateExtractedText } = require('./ocrService');

const concurrency = Number(process.env.ASSESSMENT_QUEUE_CONCURRENCY || 2);
const maxRetries = Number(process.env.ASSESSMENT_QUEUE_MAX_RETRIES || 3);
const queue = [];
const active = new Set();
const queuedIds = new Set();
const jobState = new Map();

const now = () => new Date().toISOString();

const appendLog = (sheet, stage, status, message) => {
  sheet.processingLog = [
    ...(sheet.processingLog || []),
    { stage, status, message, at: new Date() }
  ];
};

const saveStage = async (sheet, { status, stage, message, error }) => {
  sheet.processingStatus = status || sheet.processingStatus;
  sheet.processingStage = stage || sheet.processingStage;
  if (error) sheet.lastError = error;
  if (message || error) appendLog(sheet, stage || sheet.processingStage, error ? 'error' : 'info', message || error);
  await sheet.save();
};

const upsertStudentAnalysis = async ({ assessment, answerSheet, student, evaluation }) => {
  const payload = {
    assessmentId: assessment._id,
    answerSheetId: answerSheet._id,
    classroomId: assessment.classroomId,
    studentId: student._id,
    teacherId: assessment.teacherId,
    studentName: evaluation.studentName || student.name,
    totalScore: evaluation.totalScore,
    maxScore: evaluation.maxScore,
    percentage: evaluation.percentage,
    confidenceScore: evaluation.confidenceScore,
    requiresTeacherReview: evaluation.requiresTeacherReview,
    questionAnalysis: evaluation.questionAnalysis,
    overallWeakTopics: evaluation.overallWeakTopics,
    strengths: evaluation.strengths,
    riskLevel: evaluation.riskLevel,
    recommendedIntervention: evaluation.recommendedIntervention,
    generatedRemediation: evaluation.generatedRemediation,
    aiRaw: evaluation.aiRaw || {},
    status: evaluation.requiresTeacherReview ? 'needs_teacher_review' : 'ai_generated',
    updatedAt: new Date()
  };
  const existing = await StudentAnalysis.findOne({ answerSheetId: answerSheet._id });

  if (existing) {
    await StudentAnalysis.updateOne({ _id: existing._id }, payload);
    return StudentAnalysis.findById(existing._id);
  }

  return StudentAnalysis.create(payload);
};

const processAnswerSheet = async (answerSheetId) => {
  let sheet = await AnswerSheet.findById(answerSheetId);
  if (!sheet) {
    return;
  }

  const [assessment, student] = await Promise.all([
    Assessment.findById(sheet.assessmentId),
    Student.findById(sheet.studentId)
  ]);

  if (!assessment || !student) {
    await saveStage(sheet, {
      status: 'failed',
      stage: 'validation',
      error: 'Assessment or student could not be found for this answer sheet.'
    });
    return;
  }

  if (!sheet.classroomId && assessment.classroomId) {
    sheet.classroomId = assessment.classroomId;
    await sheet.save();
  }

  if (sheet.classroomId && assessment.classroomId && String(sheet.classroomId) !== String(assessment.classroomId)) {
    await saveStage(sheet, {
      status: 'failed',
      stage: 'relationship_validation',
      error: 'Answer sheet classroom does not match the selected assessment classroom.'
    });
    return;
  }

  const questionPaper = assessment.questionPaperId
    ? await QuestionPaper.findById(assessment.questionPaperId)
    : null;

  if (!questionPaper) {
    await saveStage(sheet, {
      status: 'failed',
      stage: 'validation',
      error: 'Question paper is missing for this assessment.'
    });
    return;
  }

  await saveStage(sheet, { status: 'processing', stage: 'ocr_extraction', message: 'OCR extraction started.' });
  const ocr = await extractTextFromStoredFile({
    fileUrl: sheet.fileUrl,
    mimeType: sheet.mimeType,
    originalFileName: sheet.originalFileName,
    language: assessment.language
  });

  sheet = await AnswerSheet.findById(answerSheetId);
  sheet.ocrText = ocr.text;
  await saveStage(sheet, {
    status: 'processing',
    stage: 'text_validation',
    message: `OCR completed with ${ocr.engine}; ${ocr.text?.length || 0} characters extracted${ocr.preprocessing?.processed ? ' after image preprocessing' : ''}.`
  });

  const validation = validateExtractedText(ocr.text);
  if (!validation.valid) {
    appendLog(sheet, 'text_validation', 'warning', validation.reason);
    await sheet.save();
    await saveStage(sheet, {
      status: 'review_required',
      stage: 'ocr_review_required',
      error: validation.reason
    });
    await updateAssessmentSummary(assessment);
    await maybeFinalizeAssessment(assessment._id);
    return;
  }

  await saveStage(sheet, { status: 'processing', stage: 'gemini_evaluation', message: 'Gemini evaluation started.' });
  const evaluation = await evaluateAnswerSheet({
    teacherId: assessment.teacherId,
    assessment,
    questionPaper,
    student,
    ocrText: validation.text,
    ocrMeta: {
      engine: ocr.engine,
      confidence: ocr.confidence,
      preprocessing: ocr.preprocessing,
      validation,
      error: ocr.error
    }
  });

  await saveStage(sheet, { status: 'processing', stage: 'weak_concept_detection', message: 'Weak concepts identified.' });
  const analysis = await upsertStudentAnalysis({ assessment, answerSheet: sheet, student, evaluation });

  await saveStage(sheet, { status: 'processing', stage: 'student_profile_update', message: 'Updating student learning profile.' });
  await updateStudentProfileFromAnalysis({ assessment, questionPaper, analysis });

  sheet = await AnswerSheet.findById(answerSheetId);
  sheet.lastError = validation.valid ? null : validation.reason;
  await saveStage(sheet, {
    status: evaluation.requiresTeacherReview ? 'review_required' : 'completed',
    stage: evaluation.requiresTeacherReview ? 'teacher_review_required' : 'completed',
    message: evaluation.requiresTeacherReview
      ? 'AI analysis is ready but needs teacher confirmation.'
      : 'Answer sheet analysis completed.'
  });

  await updateAssessmentSummary(assessment);
  await maybeFinalizeAssessment(assessment._id);
};

const scheduleNext = () => {
  while (active.size < concurrency && queue.length) {
    const answerSheetId = queue.shift();
    queuedIds.delete(answerSheetId);
    active.add(answerSheetId);
    jobState.set(answerSheetId, { status: 'processing', startedAt: now() });

    processAnswerSheet(answerSheetId)
      .then(() => {
        jobState.set(answerSheetId, { status: 'completed', completedAt: now() });
      })
      .catch(async (error) => {
        console.error('[assessment-queue] Job failed:', error.message);
        const sheet = await AnswerSheet.findById(answerSheetId);
        if (sheet) {
          const retryCount = Number(sheet.retryCount || 0) + 1;
          sheet.retryCount = retryCount;
          sheet.lastError = error.message;
          appendLog(sheet, sheet.processingStage || 'processing', 'error', error.message);

          if (retryCount < maxRetries) {
            sheet.processingStatus = 'queued';
            sheet.processingStage = 'retry_wait';
            await sheet.save();
            const delayMs = Math.min(60000, 1000 * (2 ** retryCount));
            jobState.set(answerSheetId, {
              status: 'retry_scheduled',
              retryCount,
              nextRunAt: new Date(Date.now() + delayMs).toISOString(),
              error: error.message
            });
            setTimeout(() => enqueueAnswerSheet(answerSheetId), delayMs);
          } else {
            sheet.processingStatus = 'failed';
            sheet.processingStage = 'failed';
            await sheet.save();
            jobState.set(answerSheetId, {
              status: 'failed',
              retryCount,
              failedAt: now(),
              error: error.message
            });
            await maybeFinalizeAssessment(sheet.assessmentId);
          }
        }
      })
      .finally(() => {
        active.delete(answerSheetId);
        scheduleNext();
      });
  }
};

const enqueueAnswerSheet = (answerSheetId) => {
  const id = String(answerSheetId);
  if (active.has(id) || queuedIds.has(id)) {
    return;
  }
  queue.push(id);
  queuedIds.add(id);
  jobState.set(id, { status: 'queued', queuedAt: now() });
  scheduleNext();
};

const retryAnswerSheet = async (answerSheetId) => {
  const sheet = await AnswerSheet.findById(answerSheetId);
  if (!sheet) {
    throw new Error('Answer sheet not found.');
  }

  sheet.processingStatus = 'queued';
  sheet.processingStage = 'manual_retry';
  sheet.lastError = null;
  appendLog(sheet, 'manual_retry', 'info', 'Teacher requested a processing retry.');
  await sheet.save();
  enqueueAnswerSheet(sheet._id);
  return sheet;
};

const recoverPendingJobs = async () => {
  const pending = await AnswerSheet.find({
    processingStatus: { $in: ['queued', 'processing'] }
  }).lean();

  pending.forEach((sheet) => enqueueAnswerSheet(sheet._id));
  if (pending.length) {
    console.log(`[assessment-queue] Recovered ${pending.length} queued answer sheet jobs.`);
  }
};

const getQueueStatus = () => ({
  concurrency,
  pending: queue.length,
  active: active.size,
  queuedIds: [...queuedIds],
  activeIds: [...active],
  jobs: [...jobState.entries()].slice(-50).map(([answerSheetId, state]) => ({
    answerSheetId,
    ...state
  }))
});

module.exports = {
  enqueueAnswerSheet,
  getQueueStatus,
  recoverPendingJobs,
  retryAnswerSheet
};
