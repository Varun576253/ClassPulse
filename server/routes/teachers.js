const express = require('express');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Topic = require('../models/Topic');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const teacherId = req.query.teacherId;
    if (!teacherId) {
      return res.status(403).json({ success: false, error: 'Teacher context is required.' });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found.' });
    }

    return res.json({ success: true, teacher, teachers: [teacher] });
  } catch (error) {
    console.error('[teachers] List failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found.' });
    }

    const [students, topics] = await Promise.all([
      Student.find({ teacherId: teacher._id }).sort({ name: 1 }),
      Topic.find({
        $or: [{ grade: teacher.grade }, { subject: teacher.subject }]
      }).sort({ topicName: 1 })
    ]);
    return res.json({ success: true, teacher, students, topics });
  } catch (error) {
    console.error('[teachers] Detail failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found.' });
    }

    const allowed = ['name', 'school', 'subject', 'grade', 'language'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    await Teacher.updateOne({ _id: teacher._id }, updates);
    const updated = await Teacher.findById(teacher._id);
    console.log(`[teachers] Updated teacher ${updated.name}.`);
    return res.json({ success: true, teacher: updated });
  } catch (error) {
    console.error('[teachers] Update failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const required = ['name', 'school', 'subject', 'grade'];
    const missing = required.filter((field) => !String(req.body[field] || '').trim());

    if (missing.length) {
      return res.status(400).json({ success: false, error: `Missing required teacher fields: ${missing.join(', ')}.` });
    }

    const teacher = await Teacher.create(req.body);
    console.log(`[teachers] Created teacher ${teacher.name}.`);
    return res.status(201).json({ success: true, teacher });
  } catch (error) {
    console.error('[teachers] Create failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
