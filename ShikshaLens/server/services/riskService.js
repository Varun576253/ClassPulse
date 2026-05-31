const calculateRiskLevel = (progressHistory = []) => {
  const recent = progressHistory.slice(-5);

  if (!recent.length) {
    return 'low';
  }

  const struggling = recent.filter((item) => !item.understood || Number(item.score) < 45).length;
  const partial = recent.filter((item) => Number(item.score) >= 45 && Number(item.score) < 75).length;

  if (recent.length >= 3 && struggling / recent.length >= 0.6) {
    return 'high';
  }

  if (struggling || partial >= 2) {
    return 'medium';
  }

  return 'low';
};

const updateStudentRisk = async (student) => {
  const nextRisk = calculateRiskLevel(student.progressHistory);
  student.riskLevel = nextRisk;
  console.log(`[risk] ${student.name} risk updated to ${nextRisk}.`);
  await student.save();
  return nextRisk;
};

module.exports = {
  calculateRiskLevel,
  updateStudentRisk
};
