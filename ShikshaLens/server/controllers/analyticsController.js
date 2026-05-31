const Student = require('../models/Student');
const Session = require('../models/Session');
const { calculateTeacherStats } = require('../services/analyticsService');

const dashboard = async (req, res) => {
  try {
    const stats = await calculateTeacherStats(req.params.teacherId);
    const latestInsight = stats.recentSessions.find((session) => session.classInsight?.teacherSummary)?.classInsight || null;
    console.log(`[analytics] Dashboard requested for teacher ${req.params.teacherId}.`);
    return res.json({ success: true, dashboard: { ...stats, latestInsight } });
  } catch (error) {
    console.error('[analytics] Dashboard failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const riskStudents = async (req, res) => {
  try {
    const students = await Student.find({
      teacherId: req.params.teacherId,
      riskLevel: { $in: ['medium', 'high'] }
    }).sort({ riskLevel: 1, name: 1 }).lean();
    console.log(`[analytics] Found ${students.length} risk students for teacher ${req.params.teacherId}.`);
    return res.json({ success: true, students });
  } catch (error) {
    console.error('[analytics] Risk students failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const misconceptions = async (req, res) => {
  try {
    const sessions = await Session.find({ teacherId: req.params.teacherId }).lean();
    const misconceptionsByName = sessions.reduce((counts, session) => {
      const label = session.classInsight?.recurringMisconception || session.classInsight?.commonMistake;

      if (label) {
        counts[label] = counts[label] || { misconception: label, count: 0, topics: new Set() };
        counts[label].count += 1;
        counts[label].topics.add(session.topic);
      }

      return counts;
    }, {});
    const tracker = Object.values(misconceptionsByName)
      .map((item) => ({ ...item, topics: [...item.topics] }))
      .sort((a, b) => b.count - a.count);
    console.log(`[analytics] Misconception tracker requested for ${tracker.length} patterns.`);
    return res.json({ success: true, misconceptions: tracker });
  } catch (error) {
    console.error('[analytics] Misconceptions failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  dashboard,
  riskStudents,
  misconceptions
};
