const path = require('path');
const Assessment = require('../models/Assessment');
const AnswerSheet = require('../models/AnswerSheet');
const ClassroomAnalysis = require('../models/ClassroomAnalysis');
const InterventionGroup = require('../models/InterventionGroup');
const QuestionPaper = require('../models/QuestionPaper');
const RemediationHistory = require('../models/RemediationHistory');
const Student = require('../models/Student');
const StudentAnalysis = require('../models/StudentAnalysis');
const Teacher = require('../models/Teacher');
const {
  generateAssessmentPaper,
  normalizeQuestionPaper,
  parseUploadedQuestionPaper
} = require('../services/assessmentAiService');
const {
  createThumbnail,
  resolveStoredPath,
  saveUploadedFile
} = require('../services/assessmentStorageService');
const {
  rebuildClassroomAnalysis,
  updateAssessmentSummary,
  updateStudentProfileFromAnalysis
} = require('../services/assessmentAnalyticsService');
const {
  enqueueAnswerSheet,
  getQueueStatus,
  retryAnswerSheet
} = require('../services/assessmentProcessingQueue');
const { getOrCreateDefaultClassroom } = require('../services/classroomService');
const { extractTextFromStoredFile, validateExtractedText } = require('../services/ocrService');

const pickTeacher = async (teacherId) => {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw Object.assign(new Error('Teacher not found.'), { statusCode: 404 });
  }
  return teacher;
};

const totalMarksFor = (paper) => (paper.questions || [])
  .reduce((sum, question) => sum + Number(question.marks || 0), 0);

const createAssessmentFromPaper = async ({ teacher, classroom, paper, title }) => Assessment.create({
  teacherId: teacher._id,
  classroomId: classroom._id,
  questionPaperId: paper._id,
  title: title || paper.title,
  subject: paper.subject || teacher.subject,
  topic: paper.topic,
  subtopic: paper.subtopic,
  grade: paper.grade || teacher.grade,
  language: paper.language || teacher.language,
  status: 'ready_for_uploads',
  totalMarks: totalMarksFor(paper),
  processingSummary: {
    totalAnswerSheets: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    reviewRequired: 0,
    failed: 0
  }
});

const previewQuestionPaper = async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) {
      return res.status(400).json({ success: false, error: 'Teacher is required.' });
    }

    const teacher = await pickTeacher(teacherId);
    const input = {
      ...req.body,
      teacherId,
      subject: req.body.subject || teacher.subject,
      grade: req.body.grade || teacher.grade,
      language: req.body.language || teacher.language,
      numberOfQuestions: Number(req.body.numberOfQuestions || 10)
    };
    const generated = await generateAssessmentPaper(input);
    console.log(`[assessments] Previewed generated paper ${generated.title}.`);
    return res.json({ success: true, questionPaper: generated });
  } catch (error) {
    console.error('[assessments] Paper preview failed:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

const saveQuestionPaperPreview = async (req, res) => {
  try {
    const { teacherId, questionPaper } = req.body;
    if (!teacherId || !questionPaper) {
      return res.status(400).json({ success: false, error: 'Teacher and question paper preview are required.' });
    }

    const teacher = await pickTeacher(teacherId);
    const classroom = await getOrCreateDefaultClassroom(teacher);
    const reviewed = normalizeQuestionPaper(questionPaper, {
      ...questionPaper,
      subject: questionPaper.subject || teacher.subject,
      grade: questionPaper.grade || teacher.grade,
      language: questionPaper.language || teacher.language
    });
    reviewed.answerKey = reviewed.questions.map((question) => ({
      questionNumber: question.questionNumber,
      expectedAnswer: question.expectedAnswer,
      marks: question.marks
    }));
    reviewed.markingScheme = reviewed.questions.map((question) => {
      const existing = (questionPaper.markingScheme || []).find((scheme) =>
        Number(scheme.questionNumber) === Number(question.questionNumber)
      );
      return {
        questionNumber: question.questionNumber,
        marks: question.marks,
        criteria: existing?.criteria || ['Concept accuracy', 'Method or reasoning', 'Final answer']
      };
    });
    reviewed.conceptMapping = reviewed.questions.map((question) => ({
      questionNumber: question.questionNumber,
      subject: reviewed.subject,
      topic: reviewed.topic,
      subtopic: reviewed.subtopic,
      concept: question.conceptTested,
      learningObjective: question.learningObjective,
      skillCompetency: question.skillCompetency
    }));
    reviewed.learningObjectives = [...new Set(reviewed.questions.map((question) => question.learningObjective).filter(Boolean))];
    const paper = await QuestionPaper.create({
      teacherId,
      classroomId: classroom._id,
      title: reviewed.title,
      subject: reviewed.subject || teacher.subject,
      topic: reviewed.topic,
      subtopic: reviewed.subtopic,
      grade: reviewed.grade || teacher.grade,
      language: reviewed.language || teacher.language,
      difficultyLevel: reviewed.difficultyLevel,
      questionTypes: reviewed.questionTypes,
      sourceType: 'generated',
      questions: reviewed.questions,
      answerKey: reviewed.answerKey,
      markingScheme: reviewed.markingScheme,
      conceptMapping: reviewed.conceptMapping,
      learningObjectives: reviewed.learningObjectives,
      status: 'ready'
    });
    const assessment = await createAssessmentFromPaper({ teacher, classroom, paper, title: reviewed.title });

    console.log(`[assessments] Saved reviewed paper ${paper.title}.`);
    return res.status(201).json({ success: true, assessment, questionPaper: paper });
  } catch (error) {
    console.error('[assessments] Save paper preview failed:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

const generateQuestionPaper = async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) {
      return res.status(400).json({ success: false, error: 'Teacher is required.' });
    }

    const teacher = await pickTeacher(teacherId);
    const classroom = await getOrCreateDefaultClassroom(teacher);
    const input = {
      ...req.body,
      teacherId,
      subject: req.body.subject || teacher.subject,
      grade: req.body.grade || teacher.grade,
      language: req.body.language || teacher.language,
      numberOfQuestions: Number(req.body.numberOfQuestions || 10)
    };

    const generated = await generateAssessmentPaper(input);
    const paper = await QuestionPaper.create({
      teacherId,
      classroomId: classroom._id,
      title: generated.title,
      subject: generated.subject || input.subject,
      topic: generated.topic || input.topic,
      subtopic: generated.subtopic || input.subtopic,
      grade: generated.grade || input.grade,
      language: generated.language || input.language,
      difficultyLevel: generated.difficultyLevel,
      questionTypes: generated.questionTypes,
      sourceType: 'generated',
      questions: generated.questions,
      answerKey: generated.answerKey,
      markingScheme: generated.markingScheme,
      conceptMapping: generated.conceptMapping,
      learningObjectives: generated.learningObjectives,
      status: generated.status || 'ready'
    });
    const assessment = await createAssessmentFromPaper({ teacher, classroom, paper, title: req.body.title });

    console.log(`[assessments] Generated paper ${paper.title} for teacher ${teacher.name}.`);
    return res.status(201).json({ success: true, assessment, questionPaper: paper });
  } catch (error) {
    console.error('[assessments] Generate paper failed:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

const uploadQuestionPaper = async (req, res) => {
  try {
    const { teacherId, file } = req.body;
    if (!teacherId || !file) {
      return res.status(400).json({ success: false, error: 'Teacher and question paper file are required.' });
    }

    const teacher = await pickTeacher(teacherId);
    const classroom = await getOrCreateDefaultClassroom(teacher);
    const stored = await saveUploadedFile({ folderId: `teacher-${teacherId}`, file });
    const ocr = await extractTextFromStoredFile({
      fileUrl: stored.fileUrl,
      mimeType: stored.mimeType,
      originalFileName: stored.originalFileName,
      language: req.body.language || teacher.language
    });
    const validation = validateExtractedText(ocr.text);
    const parsed = await parseUploadedQuestionPaper({
      ...req.body,
      teacherId,
      subject: req.body.subject || teacher.subject,
      grade: req.body.grade || teacher.grade,
      language: req.body.language || teacher.language,
      fileName: stored.originalFileName,
      extractedText: validation.text
    });

    const paper = await QuestionPaper.create({
      teacherId,
      classroomId: classroom._id,
      title: parsed.title,
      subject: parsed.subject || req.body.subject || teacher.subject,
      topic: parsed.topic || req.body.topic || 'Uploaded assessment',
      subtopic: parsed.subtopic || req.body.subtopic,
      grade: parsed.grade || req.body.grade || teacher.grade,
      language: parsed.language || req.body.language || teacher.language,
      difficultyLevel: parsed.difficultyLevel || 'mixed',
      questionTypes: parsed.questionTypes,
      sourceType: 'uploaded',
      fileUrl: stored.fileUrl,
      extractedText: validation.text,
      questions: parsed.questions,
      answerKey: parsed.answerKey,
      markingScheme: parsed.markingScheme,
      conceptMapping: parsed.conceptMapping,
      learningObjectives: parsed.learningObjectives,
      status: validation.valid ? (parsed.status || 'ready') : 'needs_teacher_review'
    });
    const assessment = await createAssessmentFromPaper({ teacher, classroom, paper, title: req.body.title });

    console.log(`[assessments] Uploaded and parsed paper ${paper.title}.`);
    return res.status(201).json({
      success: true,
      assessment,
      questionPaper: paper,
      extraction: {
        engine: ocr.engine,
        confidence: ocr.confidence,
        valid: validation.valid,
        reason: validation.reason,
        parserSource: parsed.parserSource || 'gemini',
        aiWarning: parsed.aiWarning || '',
        questionCount: parsed.questions?.length || 0
      }
    });
  } catch (error) {
    console.error('[assessments] Upload paper failed:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
};

const listTeacherAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find({ teacherId: req.params.teacherId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, assessments });
  } catch (error) {
    console.error('[assessments] List failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const uploadAnswerSheets = async (req, res) => {
  try {
    if (req.body.assessmentId && String(req.body.assessmentId) !== String(req.params.assessmentId)) {
      return res.status(400).json({ success: false, error: 'Assessment mismatch. Reopen the correct assessment before uploading.' });
    }

    const assessment = await Assessment.findById(req.params.assessmentId);
    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    const files = req.body.files || [];
    if (!Array.isArray(files) || !files.length) {
      return res.status(400).json({ success: false, error: 'Upload at least one answer sheet.' });
    }

    const createdSheets = [];
    const skipped = [];

    for (const file of files) {
      if (!file.studentId) {
        skipped.push({ fileName: file.name || file.fileName, reason: 'Missing student mapping.' });
        continue;
      }

      const student = await Student.findById(file.studentId);
      if (!student || String(student.teacherId) !== String(assessment.teacherId)) {
        skipped.push({ fileName: file.name || file.fileName, reason: 'Student is not in this teacher roster.' });
        continue;
      }

      if (student.classroomId && assessment.classroomId && String(student.classroomId) !== String(assessment.classroomId)) {
        skipped.push({ fileName: file.name || file.fileName, reason: 'Student belongs to a different classroom.' });
        continue;
      }

      if (!student.classroomId && assessment.classroomId) {
        student.classroomId = assessment.classroomId;
        await student.save();
      }

      const stored = await saveUploadedFile({ folderId: String(assessment._id), file });
      const thumbnailUrl = await createThumbnail({
        folderId: String(assessment._id),
        fileUrl: stored.fileUrl,
        mimeType: stored.mimeType,
        label: student.name
      });
      const payload = {
        assessmentId: assessment._id,
        classroomId: assessment.classroomId,
        studentId: student._id,
        teacherId: assessment.teacherId,
        fileUrl: stored.fileUrl,
        thumbnailUrl,
        originalFileName: stored.originalFileName,
        mimeType: stored.mimeType,
        processingStatus: 'queued',
        processingStage: 'uploaded',
        retryCount: 0,
        lastError: null,
        processingLog: [{ stage: 'uploaded', status: 'info', message: 'Answer sheet uploaded.', at: new Date() }]
      };
      const existing = await AnswerSheet.findOne({ assessmentId: assessment._id, studentId: student._id });
      let sheet;

      if (existing) {
        await AnswerSheet.updateOne({ _id: existing._id }, payload);
        sheet = await AnswerSheet.findById(existing._id);
      } else {
        sheet = await AnswerSheet.create(payload);
      }

      createdSheets.push(sheet);
      enqueueAnswerSheet(sheet._id);
    }

    if (createdSheets.length) {
      await Assessment.updateOne({ _id: assessment._id }, { status: 'processing', updatedAt: new Date() });
      const updatedAssessment = await Assessment.findById(assessment._id);
      await updateAssessmentSummary(updatedAssessment);
    }

    console.log(`[assessments] Queued ${createdSheets.length} answer sheets for assessment ${assessment.title}.`);
    return res.status(201).json({ success: true, answerSheets: createdSheets, skipped, queue: getQueueStatus() });
  } catch (error) {
    console.error('[assessments] Answer upload failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getAssessmentDetail = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.assessmentId).lean();
    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found.' });
    }

    const [questionPaper, answerSheets, studentAnalyses, classroomAnalysis, interventionGroups, remediationHistory] = await Promise.all([
      assessment.questionPaperId ? QuestionPaper.findById(assessment.questionPaperId).lean() : null,
      AnswerSheet.find({ assessmentId: assessment._id }).sort({ uploadedAt: -1 }).populate('studentId', 'name grade language riskLevel confidenceLevel').lean(),
      StudentAnalysis.find({ assessmentId: assessment._id }).sort({ percentage: -1 }).populate('studentId', 'name grade language riskLevel confidenceLevel').lean(),
      ClassroomAnalysis.findOne({ assessmentId: assessment._id }).lean(),
      InterventionGroup.find({ assessmentId: assessment._id }).sort({ createdAt: 1 }).lean(),
      RemediationHistory.find({ assessmentId: assessment._id }).sort({ assignedAt: -1 }).lean()
    ]);

    return res.json({
      success: true,
      assessment,
      questionPaper,
      answerSheets,
      studentAnalyses,
      classroomAnalysis,
      interventionGroups,
      remediationHistory,
      queue: getQueueStatus()
    });
  } catch (error) {
    console.error('[assessments] Detail failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const retryAnswerSheetProcessing = async (req, res) => {
  try {
    const sheet = await retryAnswerSheet(req.params.answerSheetId);
    return res.json({ success: true, answerSheet: sheet, queue: getQueueStatus() });
  } catch (error) {
    console.error('[assessments] Retry failed:', error.message);
    return res.status(404).json({ success: false, error: error.message });
  }
};

const overrideStudentAnalysis = async (req, res) => {
  try {
    const analysis = await StudentAnalysis.findById(req.params.analysisId);
    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Student analysis not found.' });
    }

    const assessment = await Assessment.findById(analysis.assessmentId);
    const questionPaper = assessment?.questionPaperId ? await QuestionPaper.findById(assessment.questionPaperId) : null;
    if (!assessment || !questionPaper) {
      return res.status(404).json({ success: false, error: 'Assessment context not found.' });
    }

    const maxScore = Number(req.body.maxScore ?? analysis.maxScore ?? assessment.totalMarks);
    const totalScore = Number(req.body.totalScore ?? analysis.totalScore);
    const percentage = maxScore ? Math.round((totalScore / maxScore) * 100) : Number(req.body.percentage ?? analysis.percentage);
    const next = {
      totalScore,
      maxScore,
      percentage,
      confidenceScore: Number(req.body.confidenceScore ?? analysis.confidenceScore),
      requiresTeacherReview: Boolean(req.body.requiresTeacherReview ?? false),
      questionAnalysis: req.body.questionAnalysis || analysis.questionAnalysis,
      overallWeakTopics: req.body.overallWeakTopics || analysis.overallWeakTopics,
      strengths: req.body.strengths || analysis.strengths,
      riskLevel: req.body.riskLevel || (percentage < 40 ? 'high' : percentage < 65 ? 'medium' : 'low'),
      recommendedIntervention: req.body.recommendedIntervention ?? analysis.recommendedIntervention,
      generatedRemediation: req.body.generatedRemediation || analysis.generatedRemediation,
      status: 'teacher_overridden',
      overrideHistory: [
        ...(analysis.overrideHistory || []),
        {
          at: new Date(),
          reason: req.body.reason || 'Teacher override',
          changedFields: Object.keys(req.body)
        }
      ],
      updatedAt: new Date()
    };

    await StudentAnalysis.updateOne({ _id: analysis._id }, next);
    const updated = await StudentAnalysis.findById(analysis._id);

    const sheet = await AnswerSheet.findById(updated.answerSheetId);
    if (sheet) {
      sheet.processingStatus = next.requiresTeacherReview ? 'review_required' : 'completed';
      sheet.processingStage = 'teacher_overridden';
      sheet.lastError = next.requiresTeacherReview ? sheet.lastError : null;
      sheet.processingLog = [
        ...(sheet.processingLog || []),
        { stage: 'teacher_override', status: 'info', message: 'Teacher updated AI evaluation.', at: new Date() }
      ];
      await sheet.save();
    }

    await updateStudentProfileFromAnalysis({ assessment, questionPaper, analysis: updated });
    await rebuildClassroomAnalysis(assessment._id);

    return res.json({ success: true, studentAnalysis: updated });
  } catch (error) {
    console.error('[assessments] Override failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const updateInterventionGroup = async (req, res) => {
  try {
    const group = await InterventionGroup.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Intervention group not found.' });
    }

    const payload = {
      name: req.body.name ?? group.name,
      weakTopic: req.body.weakTopic ?? group.weakTopic,
      concept: req.body.concept ?? group.concept,
      students: req.body.students || group.students,
      interventionType: req.body.interventionType ?? group.interventionType,
      reteachingPlan: req.body.reteachingPlan ?? group.reteachingPlan,
      peerLearningSuggestion: req.body.peerLearningSuggestion ?? group.peerLearningSuggestion,
      materials: req.body.materials || group.materials,
      status: req.body.status ?? group.status,
      overrideHistory: [
        ...(group.overrideHistory || []),
        {
          at: new Date(),
          reason: req.body.reason || 'Teacher adjusted intervention group',
          changedFields: Object.keys(req.body)
        }
      ],
      updatedAt: new Date()
    };

    await InterventionGroup.updateOne({ _id: group._id }, payload);
    await rebuildClassroomAnalysis(group.assessmentId);
    const updated = await InterventionGroup.findById(group._id);
    return res.json({ success: true, interventionGroup: updated });
  } catch (error) {
    console.error('[assessments] Group update failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const queueStatus = async (req, res) => {
  try {
    const [queued, processing, reviewRequired, failed] = await Promise.all([
      AnswerSheet.countDocuments({ processingStatus: 'queued' }),
      AnswerSheet.countDocuments({ processingStatus: 'processing' }),
      AnswerSheet.countDocuments({ processingStatus: 'review_required' }),
      AnswerSheet.countDocuments({ processingStatus: 'failed' })
    ]);
    return res.json({
      success: true,
      queue: {
        ...getQueueStatus(),
        totals: { queued, processing, reviewRequired, failed }
      }
    });
  } catch (error) {
    console.error('[assessments] Queue status failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const serveAssessmentFile = (req, res) => {
  try {
    const filePath = resolveStoredPath(req.params.folderId, req.params.fileName);
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    return res.status(404).json({ success: false, error: 'File not found.' });
  }
};

module.exports = {
  generateQuestionPaper,
  getAssessmentDetail,
  listTeacherAssessments,
  overrideStudentAnalysis,
  previewQuestionPaper,
  queueStatus,
  retryAnswerSheetProcessing,
  saveQuestionPaperPreview,
  serveAssessmentFile,
  updateInterventionGroup,
  uploadAnswerSheets,
  uploadQuestionPaper
};
