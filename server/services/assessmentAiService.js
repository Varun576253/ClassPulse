const { askGemini, isGeminiQuotaError } = require('./geminiService');
const AiFeedbackLog = require('../models/AiFeedbackLog');
const { safeJsonParse } = require('../utils/safeJsonParse');
const { z } = require('zod');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value || 0)));

const uniq = (values = []) => [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))];

const truncate = (value, max = 10000) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value || {});
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const cleanAiWarning = (error) => String(error?.message || error || 'AI service unavailable.').slice(0, 500);

const detectConcept = (input = {}) => input.subtopic || input.topic || 'the topic';

const generatedTemplatesFor = (input = {}) => {
  const topic = String(`${input.subject || ''} ${input.topic || ''} ${input.subtopic || ''}`).toLowerCase();

  if (/fraction/.test(topic)) {
    return [
      ['Add 1/2 and 1/4.', '3/4', 'Adding unlike fractions'],
      ['Which is greater: 2/3 or 1/2?', '2/3', 'Comparing fractions'],
      ['Find 1/3 of 12.', '4', 'Fraction of a quantity'],
      ['Subtract 1/4 from 3/4.', '1/2', 'Subtracting like fractions'],
      ['Write 2/4 in simplest form.', '1/2', 'Equivalent fractions']
    ];
  }

  if (/add|subtract|subraction|subtraction|sum|difference/.test(topic)) {
    return [
      ['Add 24 and 18.', '42', 'Addition with regrouping'],
      ['Subtract 27 from 56.', '29', 'Subtraction with borrowing'],
      ['A shop has 35 pencils and receives 18 more. How many pencils are there now?', '53 pencils', 'Addition word problem'],
      ['There are 90 pages in a notebook. 47 pages are used. How many pages are left?', '43 pages', 'Subtraction word problem'],
      ['Find the missing number: 38 + __ = 65.', '27', 'Inverse relationship of addition and subtraction']
    ];
  }

  const concept = detectConcept(input);
  return [
    [`Explain one important idea about ${concept}.`, `A correct answer should explain ${concept} clearly.`, concept],
    [`Give one example related to ${concept} and explain it.`, `A correct answer should include a relevant example and explanation.`, concept],
    [`Solve a short problem your teacher gives on ${concept}. Show the steps.`, `A correct answer should show accurate steps and reasoning.`, concept],
    [`Write two key terms connected to ${concept}.`, `A correct answer should name two relevant terms.`, concept],
    [`Identify one common mistake students make in ${concept}.`, `A correct answer should identify a reasonable misconception.`, concept]
  ];
};

const buildLocalQuestion = (input, template, index) => ({
  questionNumber: index + 1,
  questionText: template[0],
  type: input.questionTypes?.[0] || 'short_answer',
  marks: Number(input.marksPerQuestion || 1),
  expectedAnswer: template[1] || '',
  conceptTested: template[2] || detectConcept(input),
  difficultyLevel: input.difficultyLevel || 'medium',
  learningObjective: `Students can demonstrate understanding of ${template[2] || detectConcept(input)}.`,
  skillCompetency: 'Conceptual understanding'
});

const localGeneratedQuestionPaper = (input = {}, error) => {
  const count = Math.max(1, Number(input.numberOfQuestions || 10));
  const templates = generatedTemplatesFor(input);
  const questions = Array.from({ length: count }, (_, index) =>
    buildLocalQuestion(input, templates[index % templates.length], index)
  );
  const paper = normalizeQuestionPaper({
    title: input.title || `${input.subject || 'Subject'} ${input.topic || 'assessment'}`,
    subject: input.subject,
    topic: input.topic,
    subtopic: input.subtopic,
    grade: input.grade,
    language: input.language || 'English',
    difficultyLevel: input.difficultyLevel || 'mixed',
    questionTypes: input.questionTypes || ['short_answer'],
    questions,
    status: 'needs_teacher_review'
  }, input);

  return {
    ...paper,
    status: 'needs_teacher_review',
    parserSource: 'local_fallback',
    aiWarning: cleanAiWarning(error)
  };
};

const extractMarks = (text = '') => {
  const match = text.match(/\b(\d+(?:\.\d+)?)\s*(?:marks?|mks?)\b/i)
    || text.match(/\[(\d+(?:\.\d+)?)\]/);
  return match ? Number(match[1]) : 1;
};

const stripMarks = (text = '') => String(text)
  .replace(/\b\d+(?:\.\d+)?\s*(?:marks?|mks?)\b/gi, '')
  .replace(/\[\d+(?:\.\d+)?\]/g, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const localParsedQuestionPaper = (input = {}, error) => {
  const lines = String(input.extractedText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const questions = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    const text = stripMarks(current.text);
    if (text.length >= 4) {
      questions.push(buildLocalQuestion(input, [
        text,
        '',
        input.subtopic || input.topic || 'Uploaded question'
      ], questions.length));
      questions[questions.length - 1].questionNumber = current.questionNumber || questions.length;
      questions[questions.length - 1].marks = current.marks || 1;
    }
    current = null;
  };

  for (const line of lines) {
    const match = line.match(/^(?:q(?:uestion)?\.?\s*)?(\d{1,2})[\).:\-]\s*(.+)$/i);
    if (match) {
      flush();
      current = {
        questionNumber: Number(match[1]),
        text: match[2],
        marks: extractMarks(line)
      };
      continue;
    }

    if (current) {
      current.text = `${current.text} ${line}`;
      current.marks = current.marks || extractMarks(line);
    }
  }
  flush();

  if (!questions.length) {
    const candidates = lines.filter((line) =>
      /[?=]|\b(add|subtract|solve|find|write|explain|calculate|compare|simplify)\b/i.test(line)
    );
    candidates.slice(0, 20).forEach((line) => {
      questions.push(buildLocalQuestion(input, [
        stripMarks(line),
        '',
        input.subtopic || input.topic || 'Uploaded question'
      ], questions.length));
      questions[questions.length - 1].marks = extractMarks(line);
    });
  }

  if (!questions.length) {
    questions.push(buildLocalQuestion(input, [
      `Review the uploaded question paper text: ${truncate(input.extractedText || input.fileName || 'uploaded paper', 180)}`,
      '',
      input.subtopic || input.topic || 'Uploaded paper review'
    ], 0));
  }

  const paper = normalizeQuestionPaper({
    title: input.title || `${input.subject || 'Subject'} ${input.topic || 'uploaded assessment'}`,
    subject: input.subject,
    topic: input.topic || 'Uploaded assessment',
    subtopic: input.subtopic,
    grade: input.grade,
    language: input.language || 'English',
    difficultyLevel: input.difficultyLevel || 'mixed',
    questionTypes: input.questionTypes || ['short_answer'],
    questions,
    status: 'needs_teacher_review'
  }, input);

  return {
    ...paper,
    status: 'needs_teacher_review',
    parserSource: 'local_fallback',
    aiWarning: cleanAiWarning(error)
  };
};

const questionPaperSchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  topic: z.string().optional(),
  subtopic: z.string().optional(),
  grade: z.string().optional(),
  language: z.string().optional(),
  difficultyLevel: z.string().optional(),
  questionTypes: z.array(z.string()).optional(),
  questions: z.array(z.object({
    questionNumber: z.coerce.number(),
    questionText: z.string().optional(),
    question: z.string().optional(),
    type: z.string().optional(),
    marks: z.coerce.number(),
    expectedAnswer: z.string().optional(),
    correctAnswer: z.string().optional(),
    conceptTested: z.string().optional(),
    concept: z.string().optional(),
    difficultyLevel: z.string().optional(),
    difficulty: z.string().optional(),
    learningObjective: z.string().optional(),
    skillCompetency: z.string().optional(),
    competency: z.string().optional()
  })).min(1),
  answerKey: z.array(z.any()).optional(),
  markingScheme: z.array(z.any()).optional(),
  conceptMapping: z.array(z.any()).optional(),
  learningObjectives: z.array(z.string()).optional(),
  status: z.string().optional()
});

const evaluationSchema = z.object({
  studentName: z.string(),
  totalScore: z.coerce.number(),
  confidenceScore: z.coerce.number().optional(),
  requiresTeacherReview: z.boolean().optional(),
  questionAnalysis: z.array(z.object({
    questionNumber: z.coerce.number(),
    score: z.coerce.number(),
    isCorrect: z.boolean().optional(),
    conceptTested: z.string().optional(),
    mistakeType: z.string().optional(),
    weakConcept: z.string().optional(),
    feedback: z.string().optional(),
    confidence: z.coerce.number().optional()
  })).min(1),
  overallWeakTopics: z.array(z.string()),
  strengths: z.array(z.string()),
  riskLevel: z.string(),
  recommendedIntervention: z.string(),
  generatedRemediation: z.array(z.any()).optional()
});

const classroomInterventionSchema = z.object({
  interventionPriorities: z.array(z.any()).optional(),
  aiRecommendations: z.array(z.any()).optional(),
  groups: z.array(z.any()).optional(),
  remediationMaterials: z.array(z.any()).optional()
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const askWithRetry = async (prompt, config) => {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await askGemini(prompt, config);
    } catch (error) {
      lastError = error;
      if (isGeminiQuotaError(error)) {
        throw error;
      }
      const retryable = /429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|timeout/i.test(String(error.message || error));
      if (!retryable || attempt === 3) {
        throw error;
      }
      await sleep(750 * (2 ** (attempt - 1)));
    }
  }
  throw lastError;
};

const logAi = async ({ teacherId, assessmentId, studentId, task, status, requestPayload, responsePayload, errorMessage }) => {
  try {
    await AiFeedbackLog.create({
      teacherId,
      assessmentId,
      studentId,
      task,
      model: MODEL,
      status,
      requestPayload: { prompt: truncate(requestPayload?.prompt || requestPayload, 12000) },
      responsePayload: typeof responsePayload === 'string'
        ? { text: truncate(responsePayload, 12000) }
        : responsePayload || {},
      errorMessage
    });
  } catch (error) {
    console.warn('[assessment-ai] Failed to write AI log:', error.message);
  }
};

const askJson = async ({ teacherId, assessmentId, studentId, task, prompt, schema }) => {
  let text = '';
  try {
    text = await askWithRetry(prompt, {
      responseMimeType: 'application/json',
      temperature: 0.2
    });
    const parsed = safeJsonParse(text, null);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Gemini did not return valid JSON.');
    }
    const validated = schema ? schema.parse(parsed) : parsed;

    await logAi({
      teacherId,
      assessmentId,
      studentId,
      task,
      status: 'success',
      requestPayload: { prompt },
      responsePayload: validated
    });
    return validated;
  } catch (error) {
    console.error(`[assessment-ai] ${task} failed:`, error.message);
    await logAi({
      teacherId,
      assessmentId,
      studentId,
      task,
      status: 'failed',
      requestPayload: { prompt },
      responsePayload: text ? { rawText: truncate(text, 12000) } : {},
      errorMessage: error.message
    });
    throw error;
  }
};

const normalizeQuestionPaper = (raw = {}, input = {}) => {
  const questions = Array.isArray(raw.questions) && raw.questions.length ? raw.questions : [];
  const normalizedQuestions = questions.map((question, index) => ({
    questionNumber: Number(question.questionNumber || index + 1),
    questionText: String(question.questionText || question.question || '').trim(),
    type: question.type || input.questionTypes?.[0] || 'short_answer',
    marks: Number(question.marks || 1),
    expectedAnswer: String(question.expectedAnswer || question.correctAnswer || '').trim(),
    conceptTested: String(question.conceptTested || question.concept || input.subtopic || input.topic || '').trim(),
    difficultyLevel: question.difficultyLevel || question.difficulty || input.difficultyLevel || 'medium',
    learningObjective: String(question.learningObjective || '').trim() || `Students can demonstrate understanding of ${input.subtopic || input.topic || 'the concept'}.`,
    skillCompetency: String(question.skillCompetency || question.competency || '').trim() || 'Conceptual understanding'
  }));

  const totalMarks = normalizedQuestions.reduce((sum, question) => sum + Number(question.marks || 0), 0);

  return {
    title: raw.title || input.title || `${input.subject || raw.subject || 'Subject'} ${input.topic || raw.topic || 'assessment'}`,
    subject: raw.subject || input.subject || '',
    topic: raw.topic || input.topic || '',
    subtopic: raw.subtopic || input.subtopic || '',
    grade: raw.grade || input.grade || '',
    language: raw.language || input.language || 'English',
    difficultyLevel: raw.difficultyLevel || input.difficultyLevel || 'mixed',
    questionTypes: raw.questionTypes || input.questionTypes || ['short_answer'],
    totalMarks,
    questions: normalizedQuestions,
    answerKey: Array.isArray(raw.answerKey) && raw.answerKey.length
      ? raw.answerKey
      : normalizedQuestions.map((question) => ({
        questionNumber: question.questionNumber,
        expectedAnswer: question.expectedAnswer,
        marks: question.marks
      })),
    markingScheme: Array.isArray(raw.markingScheme) && raw.markingScheme.length
      ? raw.markingScheme
      : normalizedQuestions.map((question) => ({
        questionNumber: question.questionNumber,
        marks: question.marks,
        criteria: ['Concept accuracy', 'Reasoning or method', 'Final answer']
      })),
    conceptMapping: Array.isArray(raw.conceptMapping) && raw.conceptMapping.length
      ? raw.conceptMapping
      : normalizedQuestions.map((question) => ({
        questionNumber: question.questionNumber,
        subject: raw.subject || input.subject || '',
        topic: raw.topic || input.topic || '',
        subtopic: raw.subtopic || input.subtopic || '',
        concept: question.conceptTested,
        learningObjective: question.learningObjective,
        skillCompetency: question.skillCompetency
      })),
    learningObjectives: Array.isArray(raw.learningObjectives) && raw.learningObjectives.length
      ? raw.learningObjectives
      : uniq(normalizedQuestions.map((question) => question.learningObjective)),
    status: raw.status || 'ready'
  };
};

const generateAssessmentPaper = async (input = {}) => {
  const count = Number(input.numberOfQuestions || 10);
  const prompt = `You are an expert government-school assessment designer.
Create a classroom assessment question paper for a teacher.

Context:
${JSON.stringify({
  subject: input.subject,
  topic: input.topic,
  subtopic: input.subtopic,
  grade: input.grade,
  language: input.language || 'English',
  difficultyLevel: input.difficultyLevel || 'mixed',
  numberOfQuestions: count,
  questionTypes: input.questionTypes || ['short_answer']
})}

Rules:
- Produce exactly ${count} questions.
- Keep wording teacher-friendly and suitable for low-resource classrooms.
- Include marks, expected answer, concept tested, difficulty level, learning objective, and skill competency for every question.
- Include answerKey, markingScheme, conceptMapping, and learningObjectives.
- Return STRICT JSON ONLY. No markdown. No explanation.

Schema:
{
  "title": "",
  "subject": "",
  "topic": "",
  "subtopic": "",
  "grade": "",
  "language": "",
  "difficultyLevel": "",
  "questionTypes": [],
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "",
      "type": "",
      "marks": 0,
      "expectedAnswer": "",
      "conceptTested": "",
      "difficultyLevel": "",
      "learningObjective": "",
      "skillCompetency": ""
    }
  ],
  "answerKey": [],
  "markingScheme": [],
  "conceptMapping": [],
  "learningObjectives": []
}`;

  try {
    const raw = await askJson({
      teacherId: input.teacherId,
      task: 'generate_question_paper',
      prompt,
      schema: questionPaperSchema
    });
    return normalizeQuestionPaper(raw, input);
  } catch (error) {
    console.warn('[assessment-ai] Generated paper fallback used:', error.message);
    return localGeneratedQuestionPaper(input, error);
  }
};

const parseUploadedQuestionPaper = async (input = {}) => {
  const prompt = `You are an educational assessment parser for government-school teachers.
Extract a structured question paper from the OCR/DOC text below.

Teacher context:
${JSON.stringify({
  subject: input.subject,
  topic: input.topic,
  subtopic: input.subtopic,
  grade: input.grade,
  language: input.language || 'English',
  fileName: input.fileName
})}

Extracted text:
${truncate(input.extractedText || '', 18000)}

Rules:
- Infer missing marks only when clearly reasonable; otherwise mark such questions for teacher review through "status": "needs_teacher_review".
- Identify concepts tested, expected answers, learning objectives, and skill competencies.
- Return STRICT JSON ONLY. No markdown. No explanation.

Schema:
{
  "title": "",
  "subject": "",
  "topic": "",
  "subtopic": "",
  "grade": "",
  "language": "",
  "difficultyLevel": "mixed",
  "questionTypes": [],
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "",
      "type": "",
      "marks": 0,
      "expectedAnswer": "",
      "conceptTested": "",
      "difficultyLevel": "",
      "learningObjective": "",
      "skillCompetency": ""
    }
  ],
  "answerKey": [],
  "markingScheme": [],
  "conceptMapping": [],
  "learningObjectives": [],
  "status": "ready"
}`;

  try {
    const raw = await askJson({
      teacherId: input.teacherId,
      task: 'parse_question_paper',
      prompt,
      schema: questionPaperSchema
    });
    return normalizeQuestionPaper(raw, input);
  } catch (error) {
    console.warn('[assessment-ai] Uploaded paper parser fallback used:', error.message);
    return localParsedQuestionPaper(input, error);
  }
};

const normalizeEvaluation = (raw = {}, context = {}) => {
  const questions = context.questionPaper.questions || [];
  const maxScore = Number(context.questionPaper.totalMarks || questions.reduce((sum, q) => sum + Number(q.marks || 0), 0));
  const questionAnalysis = raw.questionAnalysis.map((item, index) => {
    const question = questions.find((q) => Number(q.questionNumber) === Number(item.questionNumber)) || questions[index] || {};
    const marks = Number(question.marks || 1);
    return {
      questionNumber: Number(item.questionNumber || question.questionNumber || index + 1),
      score: clamp(item.score, 0, marks),
      isCorrect: Boolean(item.isCorrect),
      conceptTested: String(item.conceptTested || question.conceptTested || context.questionPaper.topic || '').trim(),
      mistakeType: String(item.mistakeType || '').trim(),
      weakConcept: String(item.weakConcept || '').trim(),
      feedback: String(item.feedback || '').trim(),
      confidence: clamp(item.confidence, 0, 100)
    };
  });
  const totalScore = clamp(raw.totalScore ?? questionAnalysis.reduce((sum, item) => sum + item.score, 0), 0, maxScore);
  const percentage = maxScore ? Math.round((totalScore / maxScore) * 100) : 0;
  const confidenceScore = clamp(raw.confidenceScore ?? averageQuestionConfidence(questionAnalysis), 0, 100);
  const requiresTeacherReview = Boolean(raw.requiresTeacherReview)
    || confidenceScore < 70
    || Number(context.ocrMeta?.confidence || 0) < 0.45
    || !String(context.ocrText || '').trim();

  return {
    studentName: raw.studentName || context.student.name,
    totalScore,
    maxScore,
    percentage,
    confidenceScore,
    requiresTeacherReview,
    questionAnalysis,
    overallWeakTopics: uniq(raw.overallWeakTopics || questionAnalysis.map((item) => item.weakConcept || item.conceptTested)),
    strengths: uniq(raw.strengths || []),
    riskLevel: raw.riskLevel || (percentage < 40 ? 'high' : percentage < 65 ? 'medium' : 'low'),
    recommendedIntervention: raw.recommendedIntervention || '',
    generatedRemediation: Array.isArray(raw.generatedRemediation) ? raw.generatedRemediation : [],
    aiRaw: raw
  };
};

const averageQuestionConfidence = (questionAnalysis = []) => {
  const values = questionAnalysis.map((item) => Number(item.confidence)).filter(Number.isFinite);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const teacherReviewEvaluation = (context = {}, error) => {
  const questions = Array.isArray(context.questionPaper?.questions) && context.questionPaper.questions.length
    ? context.questionPaper.questions
    : [{ questionNumber: 1, marks: 1, conceptTested: context.questionPaper?.topic || 'Uploaded answer' }];
  const questionAnalysis = questions.map((question, index) => ({
    questionNumber: Number(question.questionNumber || index + 1),
    score: 0,
    isCorrect: false,
    conceptTested: question.conceptTested || context.questionPaper?.topic || 'Uploaded answer',
    mistakeType: 'Teacher review required',
    weakConcept: question.conceptTested || context.questionPaper?.topic || 'Uploaded answer',
    feedback: 'Automatic scoring was unavailable. Please review this answer manually.',
    confidence: 0
  }));
  const evaluation = normalizeEvaluation({
    studentName: context.student?.name || 'Student',
    totalScore: 0,
    confidenceScore: 0,
    requiresTeacherReview: true,
    questionAnalysis,
    overallWeakTopics: uniq(questionAnalysis.map((item) => item.weakConcept || item.conceptTested)),
    strengths: [],
    riskLevel: 'high',
    recommendedIntervention: 'Teacher review required before using this score for remediation.',
    generatedRemediation: []
  }, context);

  return {
    ...evaluation,
    aiRaw: {
      source: 'local_teacher_review',
      errorMessage: cleanAiWarning(error)
    }
  };
};

const evaluateAnswerSheet = async (context = {}) => {
  const prompt = `You are an educational assessment evaluator for a classroom teacher.
Evaluate this student's answer sheet using only this structured context.

Context JSON:
${truncate({
  questionPaper: {
  title: context.questionPaper.title,
  subject: context.questionPaper.subject,
  topic: context.questionPaper.topic,
  subtopic: context.questionPaper.subtopic,
  grade: context.questionPaper.grade,
    questions: context.questionPaper.questions
  },
  answerKey: context.questionPaper.answerKey,
  markingScheme: context.questionPaper.markingScheme,
  conceptMappings: context.questionPaper.conceptMapping,
  learningObjectives: context.questionPaper.learningObjectives,
  studentAnswers: context.ocrText || '',
  ocrMetadata: context.ocrMeta || {},
  student: { name: context.student.name, language: context.student.language }
}, 18000)}

Strict requirements:
- Return JSON ONLY. No markdown. No prose outside JSON.
- Do not inflate scores when OCR is uncertain.
- Set requiresTeacherReview to true when OCR text is weak, answers are ambiguous, or confidence is low.
- Focus on learning gaps, conceptual mistakes, and teacher-delivered remediation.

Required schema:
{
  "studentName": "",
  "totalScore": 0,
  "confidenceScore": 0,
  "requiresTeacherReview": false,
  "questionAnalysis": [
    {
      "questionNumber": 1,
      "score": 0,
      "isCorrect": true,
      "conceptTested": "",
      "mistakeType": "",
      "weakConcept": "",
      "feedback": "",
      "confidence": 0
    }
  ],
  "overallWeakTopics": [],
  "strengths": [],
  "riskLevel": "",
  "recommendedIntervention": "",
  "generatedRemediation": []
}`;

  try {
    const raw = await askJson({
      teacherId: context.teacherId,
      assessmentId: context.assessment?._id,
      studentId: context.student?._id,
      task: 'evaluate_answer_sheet',
      prompt,
      schema: evaluationSchema
    });
    return normalizeEvaluation(raw, context);
  } catch (error) {
    console.warn('[assessment-ai] Answer evaluation fallback used:', error.message);
    return teacherReviewEvaluation(context, error);
  }
};

const generateClassroomInterventions = async ({ assessment, questionPaper, analyses, computedSummary, conceptGroups }) => {
  const prompt = `You are an intervention planning engine for a government-school classroom teacher.
Use the assessment analysis to answer: "What should the teacher do next?"

Assessment:
${truncate({
  subject: assessment.subject,
  topic: assessment.topic,
  subtopic: assessment.subtopic,
  grade: assessment.grade,
  language: assessment.language,
  learningObjectives: questionPaper.learningObjectives
}, 8000)}

Computed class summary:
${truncate(computedSummary, 12000)}

Student analysis summaries:
${truncate(analyses.map((analysis) => ({
  studentId: analysis.studentId,
  studentName: analysis.studentName,
  percentage: analysis.percentage,
  weakTopics: analysis.overallWeakTopics,
  strengths: analysis.strengths,
  riskLevel: analysis.riskLevel,
  recommendedIntervention: analysis.recommendedIntervention
})), 14000)}

Rules:
- Make recommendations practical for a large, low-resource classroom.
- Emphasize teacher-led intervention, reteaching, peer learning, paper worksheets, and bilingual support.
- Do not suggest student smartphones or home internet.
- Return STRICT JSON ONLY. No markdown. No explanation.

Schema:
{
  "interventionPriorities": [
    { "priority": 1, "concept": "", "reason": "", "nextAction": "" }
  ],
  "aiRecommendations": [],
  "groups": [
    {
      "name": "",
      "weakTopic": "",
      "interventionType": "",
      "reteachingPlan": "",
      "peerLearningSuggestion": "",
      "materials": []
    }
  ],
  "remediationMaterials": [
    {
      "concept": "",
      "materialType": "worksheet",
      "content": {}
    }
  ]
}`;

  const raw = await askJson({
    teacherId: assessment.teacherId,
    assessmentId: assessment._id,
    task: 'generate_classroom_interventions',
    prompt,
    schema: classroomInterventionSchema
  });

  return {
    interventionPriorities: Array.isArray(raw.interventionPriorities) ? raw.interventionPriorities : [],
    aiRecommendations: Array.isArray(raw.aiRecommendations) ? raw.aiRecommendations : [],
    groups: Array.isArray(raw.groups) ? raw.groups : [],
    remediationMaterials: Array.isArray(raw.remediationMaterials) ? raw.remediationMaterials : []
  };
};

module.exports = {
  evaluateAnswerSheet,
  generateAssessmentPaper,
  generateClassroomInterventions,
  normalizeQuestionPaper,
  parseUploadedQuestionPaper
};
