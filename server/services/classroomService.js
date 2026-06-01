const Classroom = require('../models/Classroom');

const getOrCreateDefaultClassroom = async (teacher) => {
  const existing = await Classroom.findOne({
    teacherId: teacher._id,
    subject: teacher.subject,
    grade: teacher.grade
  });

  if (existing) {
    return existing;
  }

  return Classroom.create({
    teacherId: teacher._id,
    name: `${teacher.grade} ${teacher.subject}`,
    school: teacher.school,
    subject: teacher.subject,
    grade: teacher.grade,
    language: teacher.language || 'English'
  });
};

module.exports = {
  getOrCreateDefaultClassroom
};
