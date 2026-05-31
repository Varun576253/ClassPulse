const express = require('express');
const Session = require('../models/Session');
const Message = require('../models/Message');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { previewQuestions, startSession } = require('../controllers/questionController');
const { analyzeSession } = require('../controllers/analysisController');
const { resendSessionFeedback } = require('../controllers/feedbackController');
const { addClient, removeClient, broadcast } = require('../services/sseService');
const { buildQuizQr } = require('../utils/quizQr');

const router = express.Router();

router.post('/questions/preview', previewQuestions);
router.post('/start', startSession);

router.get('/:sessionId/questions', async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('teacherId', 'name subject grade language');

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    const safeQuestions = (session.questions || []).map((q, idx) => ({
      _id: q._id || idx,
      question: q.question,
      type: q.type || 'text',
      options: q.options || []
    }));

    return res.json({
      success: true,
      session: {
        _id: session._id,
        topic: session.topic,
        subject: session.subject,
        grade: session.grade,
        language: session.language,
        status: session.status,
        formStatus: session.formStatus,
        deadline: session.deadline,
        closedAt: session.closedAt,
        teacher: session.teacherId
      },
      questions: safeQuestions
    });
  } catch (error) {
    console.error('[sessions] Public questions failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:sessionId/submit', async (req, res) => {
  try {
    const { studentName, studentMobile, answers = {} } = req.body;

    if (!studentName?.trim() || !studentMobile?.trim()) {
      return res.status(400).json({ success: false, error: 'Name and mobile are required.' });
    }

    const cleanMobile = studentMobile.trim();
    if (!/^\d{10}$/.test(cleanMobile)) {
      return res.status(400).json({ success: false, error: 'Mobile number must be 10 digits.' });
    }

    const session = await Session.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    if (session.status === 'closed') {
      return res.status(400).json({ success: false, error: 'This session has ended' });
    }

    if (session.deadline && new Date() > new Date(session.deadline)) {
      session.status = 'closed';
      session.closedAt = new Date();
      session.formStatus = 'closed';
      await session.save();
      broadcast(req.params.sessionId, 'session_closed', { type: 'session_closed', session });
      return res.status(400).json({ success: false, error: 'Session deadline has passed' });
    }

    if (session.status !== 'active' || session.formStatus === 'closed') {
      return res.status(400).json({ success: false, error: 'This session is not accepting responses.' });
    }

    const alreadySubmitted = (session.responses || []).some(
      (response) => response.studentMobile === cleanMobile
    );

    if (alreadySubmitted) {
      return res.status(400).json({ success: false, error: 'You have already submitted this quiz.' });
    }

    const normalizeAnswer = (value) => String(value || '').trim().toLowerCase();
    const questions = session.questions || [];
    let score = 0;

    questions.forEach((q, idx) => {
      const qId = String(q._id || idx);
      const submitted = normalizeAnswer(answers[qId]);
      const correct = normalizeAnswer(q.correctAnswer);
      const optionIndex = (q.options || []).findIndex((option) => normalizeAnswer(option) === submitted);
      const submittedLetter = optionIndex >= 0 ? String.fromCharCode(65 + optionIndex).toLowerCase() : submitted;

      if (submitted && correct && (submitted === correct || submittedLetter === correct)) {
        score++;
      }
    });

    const total = questions.length;
    const ratio = total ? score / total : 0;
    const understood = ratio >= 0.8 ? 'yes' : ratio >= 0.4 ? 'partial' : 'no';

    let student = await Student.findOne({ teacherId: session.teacherId, phone: cleanMobile });
    if (!student) {
      student = await Student.create({
        name: studentName.trim(),
        phone: cleanMobile,
        teacherId: session.teacherId,
        grade: session.grade,
        language: session.language || 'English'
      });
    }

    const newResponse = {
      studentId: student._id,
      studentName: studentName.trim(),
      studentMobile: cleanMobile,
      answers: Object.values(answers),
      selectedOptions: Object.values(answers),
      score: total ? Math.round((score / total) * 100) : 0,
      understood,
      submittedAt: new Date()
    };

    session.responses = [...(session.responses || []), newResponse];
    await session.save();

    broadcast(req.params.sessionId, 'response', {
      responses: session.responses
    });

    return res.json({ success: true, score, total, understood });
  } catch (error) {
    console.error('[sessions] Public submit failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/custom-questions/start', async (req, res) => {
  try {
    const { teacherId, topic, subject, grade, language, questions: customQuestions } = req.body;

    if (!teacherId || !topic || !Array.isArray(customQuestions) || !customQuestions.length) {
      return res.status(400).json({ success: false, error: 'Teacher, topic, and questions are required.' });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found.' });
    }

    const finalSubject = subject || teacher.subject;
    const finalGrade = grade || teacher.grade;
    const finalLanguage = language || teacher.language;

    // Validate questions
    const validQuestions = customQuestions.map((q, idx) => ({
      _id: q._id || `q_${idx}`,
      question: q.question || '',
      type: q.type || 'text', // 'text' or 'multiple_choice'
      options: (q.type === 'multiple_choice' && Array.isArray(q.options)) ? q.options : [],
      correctAnswer: q.correctAnswer || ''
    })).filter(q => q.question);

    if (!validQuestions.length) {
      return res.status(400).json({ success: false, error: 'Provide at least one valid question.' });
    }

    const session = await Session.create({
      teacherId,
      topic,
      subject: finalSubject,
      grade: finalGrade,
      language: finalLanguage,
      questions: validQuestions,
      status: 'active',
      formStatus: 'open',
      groupedStudents: { advanced: [], average: [], needsSupport: [] }
    });

    const { quizUrl, qrCode } = await buildQuizQr(session._id);
    session.quizUrl = quizUrl;
    session.qrCode = qrCode;
    await session.save();

    const populated = await Session.findById(session._id).populate('teacherId', 'name subject grade language');
    return res.status(201).json({
      success: true,
      session: populated,
      quizUrl,
      qrCode,
      delivery: { sent: 0, failed: 0, total: 0, method: 'qr' }
    });
  } catch (error) {
    console.error('[session] Custom start failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:sessionId/form-status', async (req, res) => {
  try {
    const { formStatus } = req.body;
    
    if (!['open', 'closed'].includes(formStatus)) {
      return res.status(400).json({ success: false, error: 'Form status must be "open" or "closed".' });
    }

    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    session.formStatus = formStatus;
    await session.save();

    const updated = await Session.findById(session._id)
      .populate('teacherId', 'name subject grade language')
      .populate('responses.studentId', 'name phone riskLevel confidenceLevel');

    console.log(`[session] Form status updated to ${formStatus} for session ${session.topic}.`);
    return res.json({ success: true, session: updated });
  } catch (error) {
    console.error('[session] Form status update failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:sessionId/analyze', analyzeSession);
router.post('/:sessionId/analyse', analyzeSession);
router.post('/:sessionId/feedback', resendSessionFeedback);

router.post('/:sessionId/close', async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    session.status = 'closed';
    session.formStatus = 'closed';
    session.closedAt = new Date();
    await session.save();

    const updated = await Session.findById(session._id)
      .populate('teacherId', 'name school subject grade language')
      .populate('responses.studentId', 'name phone riskLevel confidenceLevel');
    broadcast(String(session._id), 'session_closed', { type: 'session_closed', session: updated });
    return res.json({ success: true, session: updated });
  } catch (error) {
    console.error('[session] Close failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:sessionId/deadline', async (req, res) => {
  try {
    const minutes = Number(req.body.minutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 60) {
      return res.status(400).json({ success: false, error: 'Deadline must be 1-60 minutes.' });
    }

    const session = await Session.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    session.deadline = new Date(Date.now() + minutes * 60 * 1000);
    await session.save();

    const updated = await Session.findById(session._id)
      .populate('teacherId', 'name school subject grade language')
      .populate('responses.studentId', 'name phone riskLevel confidenceLevel');
    broadcast(String(session._id), 'deadline_set', { session: updated });
    return res.json({ success: true, session: updated });
  } catch (error) {
    console.error('[session] Deadline failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:sessionId/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const { sessionId } = req.params;
  addClient(sessionId, res);

  res.write(`event: connected\ndata: ${JSON.stringify({ sessionId })}\n\n`);

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (_) {}
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(sessionId, res);
  });
});

router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const sessions = await Session.find({ teacherId: req.params.teacherId }).sort({ date: -1 });
    return res.json({ success: true, sessions });
  } catch (error) {
    console.error('[sessions] Teacher sessions failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:sessionId', async (req, res) => {
  try {
    const [session, messages] = await Promise.all([
      Session.findById(req.params.sessionId)
        .populate('teacherId', 'name school subject grade language')
        .populate('responses.studentId', 'name phone riskLevel confidenceLevel'),
      Message.find({ sessionId: req.params.sessionId }).sort({ createdAt: -1 }).limit(50).populate('studentId', 'name')
    ]);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    return res.json({ success: true, session, messages });
  } catch (error) {
    console.error('[sessions] Detail failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
