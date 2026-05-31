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

  if (!marks.length) {
    return 0;
  }

  return Math.round(marks.reduce((sum, score) => sum + score, 0) / marks.length);
};

const calculateTeacherTimeSaved = (sessions = []) => sessions.reduce(
  (minutes, session) => minutes + parseMinutes(session.classInsight?.estimatedTimeSaved),
  0
);

const getMostCommonWeakTopic = async (teacherId) => {
  const students = await Student.find({ teacherId }).lean();
  const topicCounts = students.flatMap((student) => student.learningProfile?.weakTopics || [])
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

    if (history.length < 2) {
      return null;
    }

    const first = Number(history[0].score || 0);
    const latest = Number(history[history.length - 1].score || 0);
    return {
      _id: student._id,
      name: student.name,
      improvement: latest - first,
      latestScore: latest
    };
  }).filter(Boolean).sort((a, b) => b.improvement - a.improvement);

  return improved[0] || null;
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
  getMostCommonWeakTopic,
  getMostImprovedStudent,
  calculateAverageUnderstanding,
  calculateTeacherTimeSaved
};
