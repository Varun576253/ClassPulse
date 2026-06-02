const Student = require('../models/Student');
const Session = require('../models/Session');

const parseMinutes = (value = '') => {
  const amount = Number(String(value).match(/\d+/)?.[0] || 0);
  return Number.isFinite(amount) ? amount : 0;
};

const calculateAverageUnderstanding = (sessions = []) => {
  const marks = sessions.flatMap((session) => session.responses.map((response) => {
    if (response.understood === 'yes') return 100;
    if (response.understood === 'partial') return 60;
    if (response.understood === 'no') return 25;
    return Number(response.score || 0);
  }));
  if (!marks.length) return 0;
  return Math.round(marks.reduce((sum, score) => sum + score, 0) / marks.length);
};

const calculateTeacherTimeSaved = (sessions = []) => sessions.reduce(
  (minutes, session) => minutes + parseMinutes(session.classInsight?.estimatedTimeSaved),
  0
);

const getMostCommonWeakTopic = async (teacherId) => {
  const students = await Student.find({ teacherId }).lean();
  const topicCounts = students
    .flatMap((student) => student.learningProfile?.weakTopics || [])
    .reduce((counts, topic) => {
      counts[topic] = (counts[topic] || 0) + 1;
      return counts;
    }, {});
  const [topicName, affectedStudents] = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0] || [];
  return topicName ? { topicName, affectedStudents } : null;
};

const getMostImprovedStudent = async (teacherId) => {
  const students = await Student.find({ teacherId }).lean();
  const improved = students.map((student) => {
    const history = student.progressHistory || [];
    if (history.length < 2) return null;
    const first = Number(history[0].score || 0);
    const latest = Number(history[history.length - 1].score || 0);
    return { _id: student._id, name: student.name, improvement: latest - first, latestScore: latest };
  }).filter(Boolean).sort((a, b) => b.improvement - a.improvement);
  return improved[0] || null;
};

const calculateImprovementRate = async (teacherId) => {
  const students = await Student.find({ teacherId }).lean();
  if (!students.length) return 0;
  const withHistory = students.filter((s) => (s.progressHistory || []).length >= 2);
  if (!withHistory.length) return 0;
  const improved = withHistory.filter((s) => {
    const h = s.progressHistory;
    const recent = h.slice(-3);
    const earlier = h.slice(0, Math.max(1, h.length - 3));
    const recentAvg = recent.reduce((sum, i) => sum + Number(i.score || 0), 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, i) => sum + Number(i.score || 0), 0) / earlier.length;
    return recentAvg > earlierAvg + 5;
  }).length;
  return Math.round((improved / withHistory.length) * 100);
};

const calculateClassHealthScore = async (teacherId) => {
  const [students, sessions] = await Promise.all([
    Student.find({ teacherId }).lean(),
    Session.find({ teacherId }).lean()
  ]);
  if (!students.length) return null;

  const avgUnderstanding = calculateAverageUnderstanding(sessions);
  const masteryScore = Math.round((avgUnderstanding / 100) * 40);

  const highRisk = students.filter((s) => s.riskLevel === 'high').length;
  const medRisk = students.filter((s) => s.riskLevel === 'medium').length;
  const riskPenalty = Math.min(30, highRisk * 10 + medRisk * 4);
  const riskScore = Math.max(0, 30 - riskPenalty);

  const studentsWithHistory = students.filter((s) => (s.progressHistory || []).length >= 2);
  const improving = studentsWithHistory.filter((s) => {
    const h = s.progressHistory;
    return Number(h[h.length - 1].score || 0) > Number(h[0].score || 0);
  }).length;
  const trendScore = studentsWithHistory.length
    ? Math.round((improving / studentsWithHistory.length) * 20)
    : 10;

  const withGaps = students.filter((s) => (s.learningProfile?.weakTopics || []).length > 0).length;
  const gapScore = Math.round((1 - withGaps / students.length) * 10);

  return Math.min(100, Math.max(0, masteryScore + riskScore + trendScore + gapScore));
};

const getGapTrends = async (teacherId) => {
  const sessions = await Session.find({ teacherId })
    .sort({ date: 1 })
    .lean();

  return sessions
    .filter((s) => s.classInsight && (s.classInsight.understoodCount || s.classInsight.partialCount || s.classInsight.strugglingCount))
    .map((s) => {
      const understood = Number(s.classInsight.understoodCount || 0);
      const partial = Number(s.classInsight.partialCount || 0);
      const struggling = Number(s.classInsight.strugglingCount || 0);
      const total = Math.max(understood + partial + struggling, (s.responses || []).length, 1);
      return {
        sessionId: s._id,
        topic: s.topic,
        date: s.date,
        subject: s.subject,
        grade: s.grade,
        understoodCount: understood,
        partialCount: partial,
        strugglingCount: struggling,
        totalResponses: (s.responses || []).length,
        masteryPct: Math.round((understood / total) * 100),
        gapPct: Math.round(((partial + struggling) / total) * 100),
        commonMistake: s.classInsight.commonMistake || null,
        mostAffectedTopic: s.classInsight.mostAffectedTopic || s.topic
      };
    });
};

const calculateTeacherStats = async (teacherId) => {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const [totalStudents, sessions, sessionsThisWeek, mostCommonWeakTopic, mostImprovedStudent] = await Promise.all([
    Student.countDocuments({ teacherId }),
    Session.find({ teacherId }).sort({ date: -1 }).lean(),
    Session.countDocuments({ teacherId, date: { $gte: weekStart } }),
    getMostCommonWeakTopic(teacherId),
    getMostImprovedStudent(teacherId)
  ]);

  return {
    totalStudents,
    sessionsThisWeek,
    averageUnderstanding: calculateAverageUnderstanding(sessions),
    estimatedMinutesSaved: calculateTeacherTimeSaved(sessions),
    mostCommonWeakTopic,
    mostImprovedStudent,
    recentSessions: sessions.slice(0, 5)
  };
};

module.exports = {
  calculateTeacherStats,
  calculateClassHealthScore,
  calculateImprovementRate,
  getGapTrends,
  getMostCommonWeakTopic,
  getMostImprovedStudent,
  calculateAverageUnderstanding,
  calculateTeacherTimeSaved
};
