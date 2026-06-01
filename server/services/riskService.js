const calculateRiskLevel = (studentOrHistory = []) => {
  const isArray = Array.isArray(studentOrHistory);
  const progressHistory = isArray ? studentOrHistory : (studentOrHistory.progressHistory || []);
  const learningProfile = isArray ? {} : (studentOrHistory.learningProfile || {});

  const recent = progressHistory.slice(-5);

  if (!recent.length) return 'low';

  const struggling = recent.filter((item) => !item.understood || Number(item.score) < 45).length;
  const partial = recent.filter((item) => Number(item.score) >= 45 && Number(item.score) < 75).length;

  const weakTopicsCount = (learningProfile.weakTopics || []).length;
  const recurringMistakesCount = (learningProfile.recurringMistakes || []).length;

  let declining = false;
  if (recent.length >= 3) {
    const mid = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(0, mid);
    const secondHalf = recent.slice(mid);
    const firstAvg = firstHalf.reduce((s, i) => s + Number(i.score || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, i) => s + Number(i.score || 0), 0) / secondHalf.length;
    declining = secondAvg < firstAvg - 10;
  }

  if (recent.length >= 3 && struggling / recent.length >= 0.6) return 'high';
  if (weakTopicsCount >= 3 && recurringMistakesCount >= 2 && declining) return 'high';
  if (struggling >= 1 && declining) return 'high';

  if (struggling >= 1 || partial >= 2) return 'medium';
  if (weakTopicsCount >= 2 && recurringMistakesCount >= 1) return 'medium';

  return 'low';
};

const updateStudentRisk = async (student) => {
  const nextRisk = calculateRiskLevel(student);
  student.riskLevel = nextRisk;
  console.log(`[risk] ${student.name} risk updated to ${nextRisk}.`);
  await student.save();
  return nextRisk;
};

module.exports = {
  calculateRiskLevel,
  updateStudentRisk
};
