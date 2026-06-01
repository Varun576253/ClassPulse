const Message = require('../models/Message');
const { normalizePhone } = require('../utils/phone');

const persistMessage = async ({ student, sessionId, type, content, deliveryMode, status }) =>
  Message.create({ studentId: student._id, sessionId, type, content, deliveryMode, status });

const greenApiReady = () => Boolean(process.env.GREENAPI_INSTANCE_ID && process.env.GREENAPI_API_TOKEN);
const GREEN_API_TIMEOUT_MS = Number(process.env.GREENAPI_TIMEOUT_MS || 15000);
const GREEN_API_STATUS_TIMEOUT_MS = Number(process.env.GREENAPI_STATUS_TIMEOUT_MS || 2500);

const assertWhatsAppReady = () => {
  if (!greenApiReady()) {
    throw new Error('Green API WhatsApp is not configured. Set GREENAPI_INSTANCE_ID and GREENAPI_API_TOKEN.');
  }
};

const greenApiUrl = (method) => {
  const instanceId = process.env.GREENAPI_INSTANCE_ID;
  const apiToken = process.env.GREENAPI_API_TOKEN;
  return `https://api.green-api.com/waInstance${instanceId}/${method}/${apiToken}`;
};

const fetchGreenApiJson = async (method, timeoutMs = GREEN_API_STATUS_TIMEOUT_MS) => {
  assertWhatsAppReady();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(greenApiUrl(method), { signal: controller.signal });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(`Green API ${method} failed with ${response.status}`);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

const getGreenApiInstanceStatus = async () => {
  if (!greenApiReady()) {
    return { checked: false };
  }

  try {
    const [state, settings] = await Promise.all([
      fetchGreenApiJson('getStateInstance'),
      fetchGreenApiJson('getSettings')
    ]);

    return {
      checked: true,
      state: state?.stateInstance || '',
      webhookUrl: settings?.webhookUrl || '',
      incomingWebhook: settings?.incomingWebhook || ''
    };
  } catch (error) {
    return {
      checked: false,
      error: error.name === 'AbortError'
        ? 'Green API status check timed out.'
        : error.message
    };
  }
};

const sendWhatsAppText = async (toPhone, content) => {
  assertWhatsAppReady();

  const to = normalizePhone(toPhone);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GREEN_API_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(greenApiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        chatId: `${to}@c.us`,
        message: content
      })
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Green API request timed out after ${GREEN_API_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Green API error ${response.status}: ${err}`);
  }

  return response.json();
};

const deliverMessage = async ({ student, sessionId, type, content }) => {
  try {
    console.log(`[whatsapp] Sending ${type} message to ${student.name}.`);
    await sendWhatsAppText(student.phone, content);
    return persistMessage({ student, sessionId, type, content, deliveryMode: 'greenapi', status: 'sent' });
  } catch (error) {
    console.error(`[whatsapp] ${type} delivery failed for ${student.name}:`, error.message);
    return persistMessage({ student, sessionId, type, content, deliveryMode: 'greenapi', status: 'failed' });
  }
};

const formatQuestions = (session) => {
  const questionsList = session.questions
    .map((question, index) => {
      let formatted = `Q${index + 1}: ${question.question}\n`;
      if (question.type === 'multiple_choice' && Array.isArray(question.options)) {
        question.options.forEach((option, optIdx) => {
          formatted += `  ${String.fromCharCode(65 + optIdx)}. ${option}\n`;
        });
      }
      return formatted;
    })
    .join('\n');

  return `Hi {studentName}! Your teacher wants to check your understanding of today's topic: ${session.topic}

Please reply with your answers:
${questionsList}
For multiple choice questions, reply with the letter (A, B, C, etc.).
Just reply to this message with your answers.`;
};

const sendQuestionsToStudent = (student, session) =>
  deliverMessage({
    student,
    sessionId: session._id,
    type: 'question',
    content: formatQuestions(session).replace('{studentName}', student.name)
  });

const sendFeedbackToStudent = (student, session, content) =>
  deliverMessage({ student, sessionId: session._id, type: 'feedback', content });

const sendAcknowledgement = (student, session) =>
  deliverMessage({
    student,
    sessionId: session._id,
    type: 'acknowledgement',
    content: 'Thank you for your responses. Your teacher will review them and share personalised feedback soon.'
  });

const sendParentSummary = (student, session, content) =>
  deliverMessage({ student, sessionId: session._id, type: 'feedback', content: `Parent update: ${content}` });

module.exports = {
  assertWhatsAppReady,
  getGreenApiInstanceStatus,
  greenApiReady,
  sendWhatsAppText,
  sendQuestionsToStudent,
  sendFeedbackToStudent,
  sendAcknowledgement,
  sendParentSummary
};
