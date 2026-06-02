const { randomUUID } = require('crypto');
const express = require('express');
const Teacher = require('../models/Teacher');
const { query } = require('../config/db');
const { sendSms } = require('../services/smsService');
const { generateCode, hashCode, hashPassword, verifyPassword } = require('../utils/password');
const { validatePhone } = require('../utils/phone');

const router = express.Router();

const RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 10);

const publicTeacher = (teacher) => ({
  _id: teacher._id,
  name: teacher.name,
  school: teacher.school,
  subject: teacher.subject,
  grade: teacher.grade,
  language: teacher.language,
  phone: teacher.phone,
  createdAt: teacher.createdAt
});

const findTeacherAuthByPhone = async (phone) => {
  const result = await query(
    `SELECT id, password_hash
     FROM teachers
     WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone]
  );
  return result.rows[0] || null;
};

const validatePassword = (password = '') => {
  if (String(password).length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return '';
};

router.post('/register', async (req, res) => {
  try {
    const phoneValidation = validatePhone(req.body.phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ success: false, error: phoneValidation.error });
    }

    const passwordError = validatePassword(req.body.password);
    if (passwordError) {
      return res.status(400).json({ success: false, error: passwordError });
    }

    const required = ['name', 'school', 'subject', 'grade'];
    const missing = required.filter((field) => !String(req.body[field] || '').trim());
    if (missing.length) {
      return res.status(400).json({ success: false, error: `Missing required fields: ${missing.join(', ')}.` });
    }

    const existing = await findTeacherAuthByPhone(phoneValidation.phone);
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this mobile number already exists.' });
    }

    const teacher = await Teacher.create({
      name: String(req.body.name).trim(),
      school: String(req.body.school).trim(),
      subject: String(req.body.subject).trim(),
      grade: String(req.body.grade).trim(),
      language: req.body.language || 'English',
      phone: phoneValidation.phone
    });

    await query(
      'UPDATE teachers SET password_hash = $1, last_login_at = NOW() WHERE id = $2::uuid',
      [hashPassword(req.body.password), teacher._id]
    );

    console.log(`[auth] Registered teacher ${teacher.name}.`);
    return res.status(201).json({ success: true, teacher: publicTeacher(teacher) });
  } catch (error) {
    console.error('[auth] Register failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const phoneValidation = validatePhone(req.body.phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ success: false, error: phoneValidation.error });
    }

    const auth = await findTeacherAuthByPhone(phoneValidation.phone);
    if (!auth || !auth.password_hash || !verifyPassword(req.body.password || '', auth.password_hash)) {
      return res.status(401).json({ success: false, error: 'Invalid mobile number or password.' });
    }

    await query('UPDATE teachers SET last_login_at = NOW() WHERE id = $1::uuid', [auth.id]);
    const teacher = await Teacher.findById(auth.id);
    console.log(`[auth] Login for teacher ${teacher.name}.`);
    return res.json({ success: true, teacher: publicTeacher(teacher) });
  } catch (error) {
    console.error('[auth] Login failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/forgot-code', async (req, res) => {
  try {
    const phoneValidation = validatePhone(req.body.phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ success: false, error: phoneValidation.error });
    }

    const auth = await findTeacherAuthByPhone(phoneValidation.phone);
    if (!auth) {
      return res.status(404).json({ success: false, error: 'No account found for this mobile number.' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO password_reset_codes (id, teacher_id, phone, code_hash, expires_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5)`,
      [randomUUID(), auth.id, phoneValidation.phone, hashCode(code), expiresAt]
    );

    const delivery = await sendSms(
      phoneValidation.phone,
      `Your ClassPulse password reset code is ${code}. It expires in ${RESET_TTL_MINUTES} minutes.`
    );

    const channel = delivery.channel === 'sms' ? 'SMS' : 'WhatsApp';
    console.log(`[auth] Sent reset code to ${phoneValidation.phone} by ${channel}.`);
    return res.json({ success: true, message: `Reset code sent by ${channel}.`, channel: delivery.channel });
  } catch (error) {
    console.error('[auth] Forgot code failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const phoneValidation = validatePhone(req.body.phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ success: false, error: phoneValidation.error });
    }

    const passwordError = validatePassword(req.body.password);
    if (passwordError) {
      return res.status(400).json({ success: false, error: passwordError });
    }

    const code = String(req.body.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Enter the 6-digit SMS code.' });
    }

    const result = await query(
      `SELECT id, teacher_id, code_hash
       FROM password_reset_codes
       WHERE phone = $1
         AND consumed_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneValidation.phone]
    );

    const reset = result.rows[0];
    if (!reset || reset.code_hash !== hashCode(code)) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset code.' });
    }

    await query('UPDATE teachers SET password_hash = $1 WHERE id = $2::uuid', [
      hashPassword(req.body.password),
      reset.teacher_id
    ]);
    await query('UPDATE password_reset_codes SET consumed_at = NOW() WHERE id = $1::uuid', [reset.id]);

    const teacher = await Teacher.findById(reset.teacher_id);
    console.log(`[auth] Password reset for teacher ${teacher.name}.`);
    return res.json({ success: true, teacher: publicTeacher(teacher) });
  } catch (error) {
    console.error('[auth] Reset password failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
