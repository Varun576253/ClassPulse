const Session = require('../models/Session');
const Student = require('../models/Student');
const Message = require('../models/Message');
const { generateStudentFeedback, generateParentSummary } = require('../services/geminiService');

const sendFeedbackForAnalysis = async (session, studentsById) => {
  const logs = [];

  for (const response of session.responses) {
    const student = studentsById.get(String(response.studentId?._id || response.studentId));

    if (!student) {
      continue;
    }

    const language = student.language || session.language || 'English';
    const feedback = await generateStudentFeedback(
      student.name,
      session.topic,
      response.understood,
      response.misconception,
      language
    );
    const parentSummary = await generateParentSummary(student.name, session.topic, response.understood, language);
    await Message.create({
      studentId: student._id,
      sessionId: session._id,
      type: 'feedback',
      deliveryMode: 'system',
      status: 'saved',
      content: feedback
    });
    await Message.create({
      studentId: student._id,
      sessionId: session._id,
      type: 'feedback',
      deliveryMode: 'system',
      status: 'saved',
      content: `Parent update: ${parentSummary}`
    });
    logs.push({ studentId: student._id, feedback, status: 'saved' });
  }

  return logs;
};

const resendSessionFeedback = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId).populate('responses.studentId');

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    const students = await Student.find({ _id: { $in: session.responses.map((response) => response.studentId._id || response.studentId) } });
    const logs = await sendFeedbackForAnalysis(session, new Map(students.map((student) => [String(student._id), student])));
    console.log(`[feedback] Saved feedback for ${logs.length} ${session.topic} responses.`);
    return res.json({ success: true, sent: logs.length, saved: logs.length });
  } catch (error) {
    console.error('[feedback] Session feedback failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  sendFeedbackForAnalysis,
  resendSessionFeedback
};
