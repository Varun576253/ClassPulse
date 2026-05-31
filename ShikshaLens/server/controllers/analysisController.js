const Session = require('../models/Session');
const Student = require('../models/Student');
const { analyzeResponses } = require('../services/geminiService');
const { updateStudentRisk } = require('../services/riskService');
const { sendFeedbackForAnalysis } = require('./feedbackController');
const { broadcast } = require('../services/sseService');

const uniquePush = (values = [], value) => {
  if (value && !values.includes(value)) {
    values.push(value);
  }
};

const asLevel = (value, score) => {
  if (['yes', 'partial', 'no'].includes(value)) {
    return value;
  }

  if (score >= 80) return 'yes';
  if (score >= 45) return 'partial';
  return 'no';
};

const confidence = (value, understood) => {
  if (['high', 'medium', 'low'].includes(value)) {
    return value;
  }

  return understood === 'yes' ? 'high' : understood === 'partial' ? 'medium' : 'low';
};

const groupFromResponses = (responses, studentsById) => {
  const mapped = responses.map((response) => ({
    studentId: String(response.studentId?._id || response.studentId),
    name: studentsById.get(String(response.studentId?._id || response.studentId))?.name || 'Student',
    score: Number(response.score || 0),
    understood: response.understood,
    confidenceLevel: response.confidenceLevel,
    riskLevel: studentsById.get(String(response.studentId?._id || response.studentId))?.riskLevel || 'low'
  }));

  return {
    advanced: mapped.filter((item) => item.understood === 'yes'),
    average: mapped.filter((item) => item.understood === 'partial'),
    needsSupport: mapped.filter((item) => item.understood === 'no')
  };
};

const analyzeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId).populate('responses.studentId');

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    if (!session.responses.length) {
      return res.status(400).json({ success: false, error: 'Add at least one student response before analysis.' });
    }

    const analysis = await analyzeResponses(session.topic, session.questions, session.responses, session.language);
    const studentIds = session.responses.map((response) => response.studentId._id || response.studentId);
    const students = await Student.find({ _id: { $in: studentIds } });
    const studentsById = new Map(students.map((student) => [String(student._id), student]));

    session.responses.forEach((response) => {
      const result = analysis.students.find((item) => String(item.studentId) === String(response.studentId._id || response.studentId));
      const score = Math.max(0, Math.min(100, Number(result?.score ?? response.score ?? 0)));
      response.score = score;
      response.understood = asLevel(result?.understood || response.understood, score);
      response.confidenceLevel = confidence(result?.confidenceLevel || response.confidenceLevel, response.understood);
      response.misconception = result?.misconception || response.misconception || analysis.commonMistake;
    });

    const understoodCount = session.responses.filter((response) => response.understood === 'yes').length;
    const partialCount = session.responses.filter((response) => response.understood === 'partial').length;
    const strugglingCount = session.responses.filter((response) => response.understood === 'no').length;

    session.groupedStudents = groupFromResponses(session.responses, studentsById);
    session.classInsight = {
      understoodCount,
      partialCount,
      strugglingCount,
      commonMistake: analysis.commonMistake,
      recurringMisconception: analysis.recurringMisconception,
      mostAffectedTopic: analysis.mostAffectedTopic || session.topic,
      reteachActivity: analysis.reteachActivity,
      teacherSummary: analysis.teacherSummary,
      estimatedTimeSaved: analysis.estimatedTimeSaved,
      analysisGeneratedAt: new Date()
    };
    session.status = 'completed';
    await session.save();

    for (const response of session.responses) {
      const student = studentsById.get(String(response.studentId._id || response.studentId));

      if (!student) {
        continue;
      }

      const understood = response.understood === 'yes';
      student.confidenceLevel = response.confidenceLevel;
      student.learningProfile = student.learningProfile || { strongTopics: [], weakTopics: [], recurringMistakes: [] };

      if (understood) {
        uniquePush(student.learningProfile.strongTopics, session.topic);
      } else {
        uniquePush(student.learningProfile.weakTopics, session.topic);
        uniquePush(student.learningProfile.recurringMistakes, response.misconception);
      }

      const existingProgress = student.progressHistory.find((entry) => String(entry.sessionId) === String(session._id));
      const progress = {
        sessionId: session._id,
        topic: session.topic,
        date: session.date,
        score: response.score,
        understood,
        misconception: response.misconception,
        confidenceLevel: response.confidenceLevel,
        feedbackSent: false
      };

      if (existingProgress) {
        Object.assign(existingProgress, progress);
      } else {
        student.progressHistory.push(progress);
      }

      await student.save();
      await updateStudentRisk(student);
    }

    const feedbackLogs = await sendFeedbackForAnalysis(session, studentsById);
    feedbackLogs.forEach(({ studentId }) => {
      const student = studentsById.get(String(studentId));
      const progress = student?.progressHistory.find((entry) => String(entry.sessionId) === String(session._id));

      if (progress) {
        progress.feedbackSent = true;
      }
    });
    await Promise.all(students.map((student) => student.save()));

    const completeSession = await Session.findById(session._id)
      .populate('teacherId', 'name school subject grade language')
      .populate('responses.studentId', 'name phone riskLevel confidenceLevel');
    broadcast(String(session._id), 'analysed', { session: completeSession });
    console.log(`[analysis] Completed ${session.topic} analysis with ${feedbackLogs.length} saved feedback records.`);
    return res.json({ success: true, analysis: completeSession.classInsight, session: completeSession });
  } catch (error) {
    console.error('[analysis] Session analysis failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  analyzeSession
};
