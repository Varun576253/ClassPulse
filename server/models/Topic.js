const { createModel } = require('./postgresModel');

module.exports = createModel({
  table: 'topics',
  columns: {
    _id: 'id',
    subject: 'subject',
    grade: 'grade',
    topicName: 'topic_name',
    language: 'language'
  },
  defaults: () => ({
    language: 'English'
  })
});
