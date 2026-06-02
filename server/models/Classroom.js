const { asId, createModel } = require('./postgresModel');

module.exports = createModel({
  table: 'classrooms',
  columns: {
    _id: 'id',
    teacherId: 'teacher_id',
    name: 'name',
    school: 'school',
    subject: 'subject',
    grade: 'grade',
    language: 'language',
    createdAt: 'created_at'
  },
  defaults: () => ({
    language: 'English',
    createdAt: new Date()
  }),
  normalize: (classroom) => ({
    ...classroom,
    teacherId: asId(classroom.teacherId),
    language: classroom.language || 'English'
  }),
  populate: async (classroom, path, fields, selectFields) => {
    if (path !== 'teacherId' || !classroom.teacherId) {
      return;
    }

    const Teacher = require('./Teacher');
    const teacher = await Teacher.findById(classroom.teacherId).lean();
    classroom.teacherId = selectFields(teacher, fields);
  }
});
