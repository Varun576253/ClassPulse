const Student = require('../models/Student');
const Session = require('../models/Session');
const {
  calculateTeacherStats,
  calculateClassHealthScore,
  calculateImprovementRate,
  getGapTrends
} = require('../services/analyticsService');

const dashboard = async (req, res) => {
  try {
    const [stats, classHealthScore, studentsNeedingSupport, improvementRate] = await Promise.all([
      calculateTeacherStats(req.params.teacherId),
      calculateClassHealthScore(req.params.teacherId),
      Student.countDocuments({
        teacherId: req.params.teacherId,
        riskLevel: { $in: ['medium', 'high'] }
      }),
      calculateImprovementRate(req.params.teacherId)
    ]);

    const latestInsight = stats.recentSessions.find((session) => session.classInsight?.teacherSummary)?.classInsight || null;
    const latestReteach = stats.recentSessions.find((session) => session.classInsight?.reteachActivity)?.classInsight?.reteachActivity || null;

    console.log(`[analytics] Dashboard for teacher ${req.params.teacherId}.`);
    return res.json({
      success: true,
      dashboard: {
        ...stats,
        latestInsight,
        latestReteach,
        classHealthScore,
        studentsNeedingSupport,
        improvementRate
      }
    });
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
    console.log(`[analytics] Found ${students.length} risk students.`);
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
    console.log(`[analytics] ${tracker.length} misconception patterns.`);
    return res.json({ success: true, misconceptions: tracker });
  } catch (error) {
    console.error('[analytics] Misconceptions failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const gapTrends = async (req, res) => {
  try {
    const trends = await getGapTrends(req.params.teacherId);
    console.log(`[analytics] Gap trends: ${trends.length} sessions.`);
    return res.json({ success: true, trends });
  } catch (error) {
    console.error('[analytics] Gap trends failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const impactReport = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const [
      totalStudents,
      allStudents,
      sessions,
      studentsNeedingSupport,
      improvementRate,
      classHealthScore
    ] = await Promise.all([
      Student.countDocuments({ teacherId }),
      Student.find({ teacherId }).lean(),
      Session.find({ teacherId }).sort({ date: -1 }).lean(),
      Student.countDocuments({ teacherId, riskLevel: { $in: ['medium', 'high'] } }),
      calculateImprovementRate(teacherId),
      calculateClassHealthScore(teacherId)
    ]);

    const analysedSessions = sessions.filter((s) => s.classInsight?.teacherSummary);
    const totalGapsIdentified = sessions.reduce((sum, s) => {
      return sum + Number(s.classInsight?.strugglingCount || 0) + Number(s.classInsight?.partialCount || 0);
    }, 0);
    const totalFeedbackSent = sessions.reduce((sum, s) => sum + (s.responses?.length || 0), 0);

    const misconceptionsByName = sessions.reduce((counts, session) => {
      const label = session.classInsight?.recurringMisconception || session.classInsight?.commonMistake;
      if (label) {
        counts[label] = (counts[label] || 0) + 1;
      }
      return counts;
    }, {});
    const topMisconceptions = Object.entries(misconceptionsByName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([text, count]) => ({ text, count }));

    const studentsWithGaps = allStudents.filter((s) => (s.learningProfile?.weakTopics || []).length > 0).length;
    const studentsImproved = allStudents.filter((s) => {
      const h = s.progressHistory || [];
      if (h.length < 2) return false;
      return Number(h[h.length - 1].score || 0) > Number(h[0].score || 0);
    }).length;

    console.log(`[analytics] Impact report for teacher ${teacherId}.`);
    return res.json({
      success: true,
      report: {
        totalStudents,
        studentsNeedingSupport,
        studentsWithGaps,
        studentsImproved,
        improvementRate,
        classHealthScore,
        totalSessions: sessions.length,
        analysedSessions: analysedSessions.length,
        totalGapsIdentified,
        totalFeedbackSent,
        topMisconceptions,
        recentSessions: sessions.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('[analytics] Impact report failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { dashboard, riskStudents, misconceptions, gapTrends, impactReport };
