const { createModel } = require('./postgresModel');

module.exports = createModel({
  table: 'teachers',
  columns: {
    _id: 'id',
    name: 'name',
    school: 'school',
    subject: 'subject',
    grade: 'grade',
    language: 'language',
    phone: 'phone',
    email: 'email',
    createdAt: 'created_at'
  },
  defaults: () => ({
    language: 'English',
    createdAt: new Date()
  })
});
