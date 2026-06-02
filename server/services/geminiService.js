const fallbackQuestions = require('../utils/fallbackQuestions');
const { safeJsonParse, stripMarkdownBackticks } = require('../utils/safeJsonParse');

const parseGeminiPayload = (error) => {
  const message = String(error?.message || error || '');
  const start = message.indexOf('{');
  const end = message.lastIndexOf('}');

  if (start >= 0 && end > start) {
    try {
      return JSON.parse(message.slice(start, end + 1));
    } catch (_) {
      return null;
    }
  }

  return null;
};

const retryDelaySeconds = (payload, message = '') => {
  const retryInfo = (payload?.details || []).find((item) => item['@type']?.includes('RetryInfo'));
  const retryDelay = retryInfo?.retryDelay
    || String(message).match(/retry(?:delay)?["':\s]*(?:in\s*)?(\d+(?:\.\d+)?)\s*s/i)?.[1];
  const seconds = Number(String(retryDelay || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
};

const isGeminiQuotaError = (error) => {
  const payload = parseGeminiPayload(error);
  const text = `${error?.code || ''} ${error?.status || ''} ${error?.message || error || ''} ${payload?.status || ''}`;
  return /429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(text);
};

const normalizeGeminiError = (error) => {
  if (!error) return new Error('Gemini request failed.');
  const payload = parseGeminiPayload(error);
  const rawMessage = String(error.message || error);

  if (isGeminiQuotaError(error)) {
    const seconds = retryDelaySeconds(payload, rawMessage);
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const message = seconds
      ? `Gemini quota/rate limit exceeded for ${model}. Retry after about ${seconds} seconds or use a key/project with available quota.`
      : `Gemini quota/rate limit exceeded for ${model}. Use a key/project with available quota.`;
    return Object.assign(new Error(message), {
      code: 'GEMINI_QUOTA_EXCEEDED',
      statusCode: 429,
      retryAfterSeconds: seconds,
      cause: error
    });
  }

  if (/API key not valid|PERMISSION_DENIED|UNAUTHENTICATED|No Gemini API key/i.test(rawMessage)) {
    return Object.assign(new Error('Gemini API key is missing or invalid. Check GEMINI_API_KEY in .env.'), {
      code: 'GEMINI_AUTH_FAILED',
      statusCode: 401,
      cause: error
    });
  }

  return error;
};

const levelFromScore = (score) => {
  if (score >= 80) return 'yes';
  if (score >= 40) return 'partial';
  return 'no';
};

const fallbackAnalysis = (topic, questions, responses) => {
  const studentResults = responses.map((response) => {
    const answered = (response.answers || []).filter(Boolean).length;
    const score = Math.round((answered / Math.max(questions.length, 1)) * 100);
    const understood = levelFromScore(score);
    const misconception = understood === 'yes'
      ? 'No major misconception detected from the submitted answers.'
      : questions[0]?.commonMistake || `Needs more practice with ${topic}.`;

    return {
      studentId: String(response.studentId?._id || response.studentId),
      studentName: response.studentId?.name || 'Student',
      score,
      understood,
      misconception,
      confidenceLevel: understood === 'yes' ? 'high' : understood === 'partial' ? 'medium' : 'low',
      needsIntervention: understood !== 'yes'
    };
  });

  const understoodCount = studentResults.filter((item) => item.understood === 'yes').length;
  const partialCount = studentResults.filter((item) => item.understood === 'partial').length;
  const strugglingCount = studentResults.filter((item) => item.understood === 'no').length;
  const commonMistake = questions[0]?.commonMistake || `Students need one more guided example on ${topic}.`;

  return {
    commonMistake,
    recurringMisconception: commonMistake,
    mostAffectedTopic: topic,
    reteachActivity: `Use a 5-minute think-pair-share with one local example of ${topic}, then ask students to explain the reasoning in one sentence.`,
    teacherSummary: `Responses show a mixed understanding of ${topic}. Start with the most common mistake, model one clear example, and check the support group again.`,
    estimatedTimeSaved: `${Math.max(10, responses.length * 3)} minutes`,
    studentResults,
    students: studentResults,
    understoodCount,
    partialCount,
    strugglingCount,
    groupedStudents: {
      advanced: studentResults.filter((item) => item.understood === 'yes'),
      average: studentResults.filter((item) => item.understood === 'partial'),
      needsSupport: studentResults.filter((item) => item.understood === 'no')
    }
  };
};

const getAI = () => {
  // Use Replit AI Integration proxy if available, else fall back to direct key
  if (process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
    const { GoogleGenAI } = require('@google/genai');
    return new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: '',
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });
  }
  if (process.env.GEMINI_API_KEY) {
    const { GoogleGenAI } = require('@google/genai');
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  throw new Error('No Gemini API key configured. Please set GEMINI_API_KEY.');
};

const askGemini = async (prompt, config = {}) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: prompt,
      config,
    });
    return response.text;
  } catch (error) {
    throw normalizeGeminiError(error);
  }
};

const generateQuestions = async (topic, subject, grade, language = 'English') => {
  const prompt = `You are an experienced Indian school teacher. Generate exactly 3 short diagnostic questions to check student understanding of '${topic}' for ${grade} students studying ${subject}.
Rules:
- Questions must reveal specific misconceptions, not just right/wrong answers
- Questions should be answerable in 1-2 sentences
- Make them appropriate for Indian school context
- If language is Telugu or Hindi, generate questions in that language
Return ONLY a valid JSON array, no markdown, no explanation:
[
  { "question": "...", "correctAnswer": "...", "commonMistake": "..." },
  { "question": "...", "correctAnswer": "...", "commonMistake": "..." },
  { "question": "...", "correctAnswer": "...", "commonMistake": "..." }
]

language: ${language}`;

  try {
    console.log(`[gemini] Generating diagnostic questions for ${topic} in ${language}.`);
    const text = await askGemini(prompt);
    const parsed = safeJsonParse(text, null);

    if (!Array.isArray(parsed) || parsed.length !== 3) {
      throw new Error('Gemini question response was not an array of exactly 3 questions.');
    }

    return parsed.map((item) => ({
      question: String(item.question || '').trim(),
      correctAnswer: String(item.correctAnswer || '').trim(),
      commonMistake: String(item.commonMistake || '').trim()
    }));
  } catch (error) {
    console.error('[gemini] Question generation failed, using fallback questions:', error.message);
    return fallbackQuestions(topic, subject, grade);
  }
};

const normalizeAnalysis = (parsed, topic, questions, responses) => {
  const fallback = fallbackAnalysis(topic, questions, responses);
  const rawResults = parsed?.studentResults || parsed?.students || fallback.studentResults;
  const studentResults = rawResults.map((item) => {
    const understood = ['yes', 'partial', 'no'].includes(item.understood)
      ? item.understood
      : levelFromScore(Number(item.score ?? 0));
    const score = Number(item.score ?? (understood === 'yes' ? 90 : understood === 'partial' ? 60 : 25));

    return {
      studentId: String(item.studentId || item._id || ''),
      score,
      understood,
      misconception: item.misconception || parsed.commonMistake || fallback.commonMistake,
      confidenceLevel: item.confidenceLevel || (understood === 'yes' ? 'high' : understood === 'partial' ? 'medium' : 'low'),
      needsIntervention: item.needsIntervention ?? understood !== 'yes'
    };
  });

  const understoodCount = Number(parsed?.understoodCount ?? studentResults.filter((item) => item.understood === 'yes').length);
  const partialCount = Number(parsed?.partialCount ?? studentResults.filter((item) => item.understood === 'partial').length);
  const strugglingCount = Number(parsed?.strugglingCount ?? studentResults.filter((item) => item.understood === 'no').length);

  return {
    commonMistake: parsed?.commonMistake || fallback.commonMistake,
    recurringMisconception: parsed?.recurringMisconception || parsed?.commonMistake || fallback.recurringMisconception,
    mostAffectedTopic: parsed?.mostAffectedTopic || topic,
    reteachActivity: parsed?.reteachActivity || fallback.reteachActivity,
    teacherSummary: parsed?.teacherSummary || fallback.teacherSummary,
    estimatedTimeSaved: parsed?.estimatedTimeSaved || fallback.estimatedTimeSaved,
    studentResults,
    students: studentResults,
    understoodCount,
    partialCount,
    strugglingCount
  };
};

const analyseResponses = async (topic, questions, responses, language = 'English') => {
  const simplifiedResponses = responses.map((response) => ({
    studentId: String(response.studentId?._id || response.studentId),
    studentName: response.studentId?.name,
    answers: response.answers || []
  }));
  const prompt = `You are an expert education analyst. Analyse these student responses to a diagnostic assessment on '${topic}'.
Questions asked: ${JSON.stringify(questions)}
Student responses: ${JSON.stringify(simplifiedResponses)}
Tasks:
1. Identify the single most common misconception across all responses
2. Categorise each student as 'yes' (understood), 'partial' (partial understanding), or 'no' (did not understand)
3. Suggest one specific practical re-teach activity the teacher can do tomorrow in 5 minutes using no extra materials
4. If language is Telugu or Hindi, write the reteachActivity in that language
Return ONLY valid JSON, no markdown:
{
  "commonMistake": "...",
  "reteachActivity": "...",
  "studentResults": [
    { "studentId": "...", "understood": "yes/partial/no", "misconception": "..." }
  ],
  "understoodCount": 0,
  "partialCount": 0,
  "strugglingCount": 0
}

language: ${language}`;

  try {
    console.log(`[gemini] Analysing ${responses.length} response sets for ${topic}.`);
    const text = await askGemini(prompt);
    const parsed = safeJsonParse(text, null);

    if (!parsed || (!Array.isArray(parsed.studentResults) && !Array.isArray(parsed.students))) {
      throw new Error('Gemini analysis response did not include student results.');
    }

    return normalizeAnalysis(parsed, topic, questions, responses);
  } catch (error) {
    console.error('[gemini] Analysis failed, using fallback analysis:', error.message);
    return fallbackAnalysis(topic, questions, responses);
  }
};

const generateStudentFeedback = async (studentName, topic, understood, misconception, language = 'English') => {
  const prompt = `Generate a short, encouraging WhatsApp message for a school student named ${studentName} about their performance on today's topic: ${topic}.
Their understanding level: ${understood}
Their specific misconception (if any): ${misconception}
Rules:
- Maximum 3 sentences
- Warm and encouraging tone, never discouraging
- End with one specific thing to review before tomorrow
- If language is Telugu or Hindi, write the message in that language
- Write as if from their teacher
Return ONLY the message text, no JSON, no explanation.`;

  try {
    console.log(`[gemini] Creating student feedback for ${studentName}.`);
    return stripMarkdownBackticks(await askGemini(prompt));
  } catch (error) {
    console.error('[gemini] Feedback generation failed, using fallback feedback:', error.message);
    return `Well done for sharing your thinking on ${topic}, ${studentName}. You are building the idea step by step. Review one worked example before tomorrow.`;
  }
};

const generateParentSummary = async (studentName, topic, understood, language = 'English') => {
  const prompt = `Generate a short parent-friendly summary message about a student's progress.

Student: ${studentName}
Topic: ${topic}
Understanding level: ${understood}

Rules:
- Positive and supportive tone
- Mention one strength
- Mention one thing to revise
- Keep under 3 sentences
- If language is Hindi or Telugu, respond in that language

Return ONLY plain text.`;

  try {
    console.log(`[gemini] Creating parent summary for ${studentName}.`);
    return stripMarkdownBackticks(await askGemini(prompt));
  } catch (error) {
    console.error('[gemini] Parent summary generation failed, using fallback summary:', error.message);
    return `${studentName} participated in the ${topic} check and showed a useful starting point. Please encourage one short revision of the main idea and one practice example at home.`;
  }
};

module.exports = {
  askGemini,
  isGeminiQuotaError,
  normalizeGeminiError,
  generateQuestions,
  analyseResponses,
  analyzeResponses: analyseResponses,
  generateStudentFeedback,
  generateParentSummary,
  fallbackAnalysis
};
