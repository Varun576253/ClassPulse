const express = require('express');
const {
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
} = require('../controllers/assessmentController');

const router = express.Router();

router.get('/files/:folderId/:fileName', serveAssessmentFile);
router.get('/queue/status', queueStatus);
router.get('/teacher/:teacherId', listTeacherAssessments);
router.post('/question-papers/preview', previewQuestionPaper);
router.post('/question-papers/save-preview', saveQuestionPaperPreview);
router.post('/question-papers/generate', generateQuestionPaper);
router.post('/question-papers/upload', uploadQuestionPaper);
router.post('/:assessmentId/answer-sheets', uploadAnswerSheets);
router.post('/answer-sheets/:answerSheetId/retry', retryAnswerSheetProcessing);
router.put('/student-analyses/:analysisId/override', overrideStudentAnalysis);
router.put('/intervention-groups/:groupId', updateInterventionGroup);
router.get('/:assessmentId', getAssessmentDetail);

module.exports = router;
