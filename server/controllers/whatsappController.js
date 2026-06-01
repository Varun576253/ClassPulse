const Session = require('../models/Session');
const Student = require('../models/Student');
const Message = require('../models/Message');
const Teacher = require('../models/Teacher');
const { sendAcknowledgement } = require('../services/whatsappService');
const { broadcast } = require('../services/sseService');
const { parseGreenApiReply } = require('../utils/greenApiWebhook');

const DEBUG_WEBHOOKS = String(process.env.DEBUG_WEBHOOKS || '').toLowerCase() === 'true';
const IMPORTANT_IGNORED_WEBHOOKS = new Set(['quotaExceeded']);

const splitAnswers = (body = '', count = 3) => {
  const lines = body
    .split(/\r?\n|;/)
    .map((line) => line.replace(/^\s*\d+[.)-]?\s*/, '').trim())
    .filter(Boolean);

  if (lines.length >= count) return lines.slice(0, count);
  return body.trim() ? [body.trim()] : [];
};

const parseMultipleChoice = (value = '') => {
  const direct = String(value).trim().toUpperCase().match(/^[A-Z]$/);
  if (direct) return direct[0];

  const labelled = String(value).toUpperCase().match(/\b[A-Z]\b/);
  return labelled ? labelled[0] : '';
};

const parseSessionAnswers = (body = '', questions = []) => {
  const lines = splitAnswers(body, questions.length);
  const tokens = body.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  const selectedOptions = [];

  const answers = questions.map((question, index) => {
    const source = lines[index] || tokens[index] || lines[0] || body;

    if (question.type === 'multiple_choice') {
      const selected = parseMultipleChoice(source);
      selectedOptions[index] = selected;
      return selected || String(source || '').trim();
    }

    return String(source || '').trim();
  }).filter(Boolean);

  return {
    answers,
    selectedOptions: selectedOptions.filter(Boolean)
  };
};

const findStudentForActiveSession = async (phone) => {
  const candidates = await Student.find({ phone }).lean();
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];

  const teacherIds = candidates.map((student) => student.teacherId).filter(Boolean);
  const activeSessions = await Session.find({
    teacherId: { $in: teacherIds },
    status: 'active'
  }).sort({ date: -1 }).lean();
  const activeTeacherId = activeSessions[0]?.teacherId;

  if (!activeTeacherId) return candidates[0];
  return candidates.find((student) => String(student.teacherId) === String(activeTeacherId)) || candidates[0];
};

const findOrCreateStudent = async (phone, senderName = '') => {
  const student = await findStudentForActiveSession(phone);
  if (student) return student;

  const latestActive = (await Session.find({ status: 'active' }).sort({ date: -1 }).limit(1).lean())[0];
  const teacherId = latestActive?.teacherId?._id || latestActive?.teacherId;

  if (!teacherId) {
    console.warn(`[webhook] Unknown phone ${phone} replied, but no active session exists.`);
    return null;
  }

  const teacher = await Teacher.findById(teacherId).lean();
  if (!teacher) return null;

  const created = await Student.create({
    teacherId,
    name: senderName || `Student ${phone.slice(-4)}`,
    phone,
    grade: teacher.grade || 'Class 6',
    language: teacher.language || 'English',
    riskLevel: 'low',
    confidenceLevel: 'medium',
    learningProfile: { strongTopics: [], weakTopics: [], recurringMistakes: [] },
    progressHistory: []
  });

  console.log(`[webhook] Created student ${created.name} for incoming phone ${phone}.`);
  return created;
};

const broadcastSessionSnapshot = async (sessionId) => {
  const [populated, messages] = await Promise.all([
    Session.findById(sessionId)
      .populate('teacherId', 'name subject grade language')
      .populate('responses.studentId', 'name phone riskLevel confidenceLevel'),
    Message.find({ sessionId }).sort({ createdAt: -1 }).limit(50).populate('studentId', 'name')
  ]);

  if (!populated) return null;

  const payload = {
    sessionId: String(sessionId),
    responses: populated.responses,
    responseCount: populated.responses.length,
    messages
  };

  broadcast(String(sessionId), 'response', payload);
  return payload;
};

const sendAcknowledgementAndRefresh = async (student, session) => {
  try {
    await sendAcknowledgement(student, session);
    await broadcastSessionSnapshot(session._id);
  } catch (error) {
    console.error(`[webhook] Acknowledgement failed for ${student.name}:`, error.message);
  }
};

const processWhatsappWebhook = async (rawPayload = {}) => {
  const parsedWebhook = parseGreenApiReply(rawPayload);

  if (!parsedWebhook.accepted) {
    const typeWebhook = rawPayload?.typeWebhook || 'unknown';
    if (IMPORTANT_IGNORED_WEBHOOKS.has(typeWebhook)) {
      console.warn('[webhook] Green API quota exceeded. Some WhatsApp messages may not be delivered until quota resets or plan is upgraded.');
    } else if (DEBUG_WEBHOOKS) {
      console.log(`[webhook] ${parsedWebhook.reason}.`);
    }
    return { stored: false, reason: parsedWebhook.reason };
  }

  const { phone, body, senderName, idMessage, source } = parsedWebhook;
  const student = await findOrCreateStudent(phone, senderName);
  if (!student) {
    return { stored: false, reason: `student ${phone} could not be resolved` };
  }

  const session = await Session.findOne({
    teacherId: student.teacherId,
    status: 'active'
  }).sort({ date: -1 });

  if (!session) {
    console.warn(`[webhook] ${student.name} replied, but no active session exists.`);
    return { stored: false, reason: 'no active session' };
  }

  if (session.formStatus === 'closed') {
    console.warn(`[webhook] ${student.name} replied to ${session.topic}, but the form is closed.`);
    return { stored: false, reason: 'session form closed' };
  }

  const parsed = parseSessionAnswers(body, session.questions || []);
  if (!parsed.answers.length) {
    console.warn(`[webhook] Empty answer set from ${student.name}.`);
    return { stored: false, reason: 'empty answer set' };
  }

  const responsePayload = {
    studentId: student._id,
    answers: parsed.answers,
    selectedOptions: parsed.selectedOptions,
    score: 0,
    understood: 'partial',
    misconception: '',
    confidenceLevel: 'medium',
    submittedAt: new Date()
  };

  session.responses = Array.isArray(session.responses) ? session.responses : [];
  const existing = session.responses.find((r) => String(r.studentId) === String(student._id));
  if (existing) {
    Object.assign(existing, responsePayload);
  } else {
    session.responses.push(responsePayload);
  }

  await session.save();
  await Message.create({
    studentId: student._id,
    sessionId: session._id,
    type: 'reply',
    deliveryMode: 'greenapi',
    status: 'received',
    content: body
  });

  await broadcastSessionSnapshot(session._id);
  sendAcknowledgementAndRefresh(student, session);

  console.log(`[webhook] Stored ${source === 'phone' ? 'phone-sent' : 'incoming'} reply from ${student.name} for ${session.topic}${idMessage ? ` (${idMessage})` : ''}.`);
  return {
    stored: true,
    sessionId: String(session._id),
    studentId: String(student._id)
  };
};

// Green API webhook: POST /api/webhook/whatsapp
const receiveWhatsappResponse = async (req, res) => {
  res.sendStatus(200);

  try {
    await processWhatsappWebhook(req.body || {});
  } catch (error) {
    console.error('[webhook] Processing failed:', error.message);
  }
};

module.exports = { processWhatsappWebhook, receiveWhatsappResponse };
