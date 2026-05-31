const Session = require('../models/Session');
const Teacher = require('../models/Teacher');
const Topic = require('../models/Topic');
const { generateQuestions } = require('../services/geminiService');
const { buildQuizQr } = require('../utils/quizQr');

const previewQuestions = async (req, res) => {
  try {
    const { topic, subject, grade, language = 'English' } = req.body;

    if (!topic || !subject || !grade) {
      return res.status(400).json({ success: false, error: 'Topic, subject and grade are required.' });
    }

    const questions = await generateQuestions(topic, subject, grade, language);
    console.log(`[session] Previewed ${questions.length} questions for ${topic}.`);
    return res.json({ success: true, questions });
  } catch (error) {
    console.error('[session] Question preview failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const startSession = async (req, res) => {
  try {
    const { teacherId, topic, subject, grade, language, questions: previewedQuestions } = req.body;

    if (!teacherId || !topic) {
      return res.status(400).json({ success: false, error: 'Teacher and topic are required.' });
    }

    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found.' });
    }

    const finalSubject = subject || teacher.subject;
    const finalGrade = grade || teacher.grade;
    const finalLanguage = language || teacher.language;
    const questions = Array.isArray(previewedQuestions) && previewedQuestions.length === 3
      ? previewedQuestions
      : await generateQuestions(topic, finalSubject, finalGrade, finalLanguage);
    const session = await Session.create({
      teacherId,
      topic,
      subject: finalSubject,
      grade: finalGrade,
      language: finalLanguage,
      questions,
      status: 'active',
      groupedStudents: { advanced: [], average: [], needsSupport: [] }
    });

    await Topic.updateOne(
      { subject: finalSubject, grade: finalGrade, topicName: topic, language: finalLanguage },
      { $setOnInsert: { subject: finalSubject, grade: finalGrade, topicName: topic, language: finalLanguage } },
      { upsert: true }
    );

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
    console.error('[session] Start failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  previewQuestions,
  startSession
};
