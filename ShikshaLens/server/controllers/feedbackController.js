const Session = require('../models/Session');
const Student = require('../models/Student');
const { generateStudentFeedback, generateParentSummary } = require('../services/geminiService');
const { sendFeedbackToStudent, sendParentSummary } = require('../services/whatsappService');

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
    await sendFeedbackToStudent(student, session, feedback);
    await sendParentSummary(student, session, parentSummary);
    logs.push({ studentId: student._id, feedback });
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
    console.log(`[feedback] Sent feedback again for ${logs.length} ${session.topic} responses.`);
    return res.json({ success: true, sent: logs.length });
  } catch (error) {
    console.error('[feedback] Session feedback failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  sendFeedbackForAnalysis,
  resendSessionFeedback
};
