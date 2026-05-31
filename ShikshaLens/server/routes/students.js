const express = require('express');
const Student = require('../models/Student');
const Message = require('../models/Message');
const Teacher = require('../models/Teacher');
const AnswerSheet = require('../models/AnswerSheet');
const Assessment = require('../models/Assessment');
const RemediationHistory = require('../models/RemediationHistory');
const StudentAnalysis = require('../models/StudentAnalysis');
const { getOrCreateDefaultClassroom } = require('../services/classroomService');
const { validatePhone } = require('../utils/phone');

const router = express.Router();

const isDuplicateStudentPhone = (error) =>
  error.code === '23505' && /students_(teacher_)?phone/.test(String(error.constraint || ''));

const duplicatePhoneMessage = 'A student with this phone number already exists in this teacher roster.';

router.post('/', async (req, res) => {
  try {
    const phoneValidation = validatePhone(req.body.phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ success: false, error: phoneValidation.error });
    }

    const payload = { ...req.body, phone: phoneValidation.phone };
    const required = ['name', 'grade', 'teacherId', 'phone'];
    const missing = required.filter((field) => !String(payload[field] || '').trim());

    if (missing.length) {
      return res.status(400).json({ success: false, error: `Missing required student fields: ${missing.join(', ')}.` });
    }

    if (!payload.classroomId) {
      const teacher = await Teacher.findById(payload.teacherId);
      if (!teacher) {
        return res.status(404).json({ success: false, error: 'Teacher not found.' });
      }
      const classroom = await getOrCreateDefaultClassroom(teacher);
      payload.classroomId = classroom._id;
    }

    const existing = await Student.findOne({ teacherId: payload.teacherId, phone: payload.phone });
    if (existing) {
      await Student.updateOne({ _id: existing._id }, payload);
      const updated = await Student.findById(existing._id);
      console.log(`[students] Reused existing student ${updated.name} with phone ${updated.phone}.`);
      return res.status(200).json({ success: true, student: updated, reused: true });
    }

    const student = await Student.create(payload);
    console.log(`[students] Created student ${student.name} with phone ${student.phone}.`);
    return res.status(201).json({ success: true, student });
  } catch (error) {
    const duplicatePhone = isDuplicateStudentPhone(error);
    console.error('[students] Create failed:', error.message);
    return res.status(duplicatePhone ? 409 : 500).json({
      success: false,
      error: duplicatePhone ? duplicatePhoneMessage : error.message
    });
  }
});

router.put('/:studentId', async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    const payload = { ...req.body };
    if (payload.phone) {
      const phoneValidation = validatePhone(payload.phone);
      if (!phoneValidation.valid) {
        return res.status(400).json({ success: false, error: phoneValidation.error });
      }
      payload.phone = phoneValidation.phone;
    }

    await Student.updateOne({ _id: student._id }, payload);
    const updated = await Student.findById(student._id);
    console.log(`[students] Updated student ${updated.name}.`);
    return res.json({ success: true, student: updated });
  } catch (error) {
    const duplicatePhone = isDuplicateStudentPhone(error);
    console.error('[students] Update failed:', error.message);
    return res.status(duplicatePhone ? 409 : 500).json({
      success: false,
      error: duplicatePhone ? duplicatePhoneMessage : error.message
    });
  }
});

router.delete('/:studentId', async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }
    const result = await Student.deleteOne({ _id: student._id });
    if (!result.deletedCount) {
      return res.status(404).json({ success: false, error: 'Student was already removed.' });
    }

    console.log(`[students] Deleted student ${student.name} (${student.phone}).`);
    return res.json({ success: true, deletedStudentId: String(student._id) });
  } catch (error) {
    console.error('[students] Delete failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/progress/:studentId', async (req, res) => {
  try {
    const [student, messages, answerSheets, studentAnalyses, remediationHistory] = await Promise.all([
      Student.findById(req.params.studentId).populate('teacherId', 'name school subject grade'),
      Message.find({ studentId: req.params.studentId }).sort({ createdAt: -1 }).limit(20),
      AnswerSheet.find({ studentId: req.params.studentId }).sort({ uploadedAt: -1 }).limit(20).lean(),
      StudentAnalysis.find({ studentId: req.params.studentId }).sort({ createdAt: -1 }).limit(20).lean(),
      RemediationHistory.find({ studentId: req.params.studentId }).sort({ assignedAt: -1 }).limit(20).lean()
    ]);

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    const assessmentIds = [
      ...answerSheets.map((sheet) => sheet.assessmentId),
      ...studentAnalyses.map((analysis) => analysis.assessmentId),
      ...remediationHistory.map((item) => item.assessmentId)
    ].filter(Boolean);
    const assessments = assessmentIds.length
      ? await Assessment.find({ _id: { $in: assessmentIds } }).lean()
      : [];
    const assessmentsById = new Map(assessments.map((assessment) => [String(assessment._id), assessment]));
    const withAssessment = (item) => ({
      ...item,
      assessment: assessmentsById.get(String(item.assessmentId)) || null
    });

    return res.json({
      success: true,
      student,
      messages,
      answerSheets: answerSheets.map(withAssessment),
      studentAnalyses: studentAnalyses.map(withAssessment),
      remediationHistory: remediationHistory.map(withAssessment)
    });
  } catch (error) {
    console.error('[students] Progress failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/by-school/:teacherId', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found.' });
    }

    const students = await Student.find({ teacherId: { $ne: req.params.teacherId } }).sort({ name: 1 });
    return res.json({ success: true, students });
  } catch (error) {
    console.error('[students] School students failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/import/:teacherId', async (req, res) => {
  try {
    const { sourceStudentIds } = req.body;
    const targetTeacherId = req.params.teacherId;

    if (!Array.isArray(sourceStudentIds) || !sourceStudentIds.length) {
      return res.status(400).json({ success: false, error: 'Provide array of student IDs to import.' });
    }

    const sourceStudents = await Student.find({ _id: { $in: sourceStudentIds } });
    const targetTeacher = await Teacher.findById(targetTeacherId);
    if (!targetTeacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found.' });
    }
    const targetClassroom = await getOrCreateDefaultClassroom(targetTeacher);
    const importedStudents = [];

    for (const sourceStudent of sourceStudents) {
      try {
        const newStudent = await Student.create({
          name: sourceStudent.name,
          grade: sourceStudent.grade,
          teacherId: targetTeacherId,
          classroomId: targetClassroom._id,
          phone: sourceStudent.phone,
          language: sourceStudent.language,
          riskLevel: sourceStudent.riskLevel,
          confidenceLevel: sourceStudent.confidenceLevel,
          learningProfile: sourceStudent.learningProfile,
          progressHistory: sourceStudent.progressHistory
        });
        importedStudents.push(newStudent);
      } catch (err) {
        console.warn(`[students] Failed to import ${sourceStudent.name}:`, err.message);
      }
    }

    console.log(`[students] Imported ${importedStudents.length} students.`);
    return res.json({ success: true, importedCount: importedStudents.length, students: importedStudents });
  } catch (error) {
    console.error('[students] Import failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:teacherId', async (req, res) => {
  try {
    const students = await Student.find({ teacherId: req.params.teacherId }).sort({ name: 1 });
    return res.json({ success: true, students });
  } catch (error) {
    console.error('[students] Teacher roster failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
