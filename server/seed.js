require('dotenv').config();

const connectDB = require('./config/db');
const { closeDB } = require('./config/db');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const Session = require('./models/Session');
const Topic = require('./models/Topic');
const Message = require('./models/Message');
const { query } = require('./config/db');
const { hashPassword } = require('./utils/password');

const teacherSeeds = [
  {
    name: 'Sunita Reddy',
    school: 'ZPHS Medchal',
    subject: 'Mathematics',
    grade: 'Class 6',
    language: 'Telugu',
    phone: '+919440100101'
  },
  {
    name: 'Ramesh Kumar',
    school: 'Municipal School Secunderabad',
    subject: 'Science',
    grade: 'Class 7',
    language: 'Hindi',
    phone: '+919440100202'
  }
];

const topicSeeds = [
  ['Mathematics', 'Class 6', 'Fractions', 'Telugu'],
  ['English', 'Class 7', 'Parts of Speech', 'English'],
  ['Science', 'Class 7', 'Photosynthesis', 'Hindi'],
  ['Mathematics', 'Class 6', 'Decimals', 'Telugu'],
  ['Science', 'Class 6', 'The Water Cycle', 'English'],
  ['English', 'Class 6', 'Adjectives and Adverbs', 'English'],
  ['Mathematics', 'Class 7', 'Simple Interest', 'English'],
  ['Science', 'Class 6', 'Food Chains', 'English'],
  ['English', 'Class 6', 'Tenses', 'English'],
  ['Mathematics', 'Class 6', 'Area and Perimeter', 'English'],
].map(([subject, grade, topicName, language]) => ({ subject, grade, topicName, language }));

const names = [
  'Aarav Sharma', 'Ananya Reddy', 'Mohammed Irfan', 'Sravani Goud', 'Karthik Naik',
  'Lakshmi Priya', 'Rohit Yadav', 'Nandini Rao', 'Sai Charan', 'Farah Begum',
  'Tejaswini K', 'Arjun Varma', 'Madhavi P', 'Vikram Patel', 'Zoya Khan',
  'Aditya Singh', 'Bhavana Das', 'Chaitanya Lal', 'Deepika Jain', 'Eshan Ali',
  'Gauri Mishra', 'Harish Meena', 'Ishita Verma', 'Jyothi Kumari', 'Kabir Ansari'
];

const mathPatterns = [
  { scores: [38, 42, 35], riskLevel: 'high', confidenceLevel: 'low', weakTopics: ['Fractions', 'Decimals'], recurringMistakes: ['Adds denominators while adding fractions.'] },
  { scores: [58, 72, 64], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Area and Perimeter'], recurringMistakes: ['Confuses boundary length with covered area.'] },
  { scores: [84, 88, 93], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] },
  { scores: [46, 78, 55], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Decimals'], recurringMistakes: ['Misses place value while comparing decimals.'] },
  { scores: [90, 82, 86], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] }
];

const sciencePatterns = [
  { scores: [44, 40, 52], riskLevel: 'high', confidenceLevel: 'low', weakTopics: ['Photosynthesis', 'Food Chains'], recurringMistakes: ['Thinks plants get prepared food directly from soil.'] },
  { scores: [68, 74, 61], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Water Cycle'], recurringMistakes: ['Treats evaporation and condensation as the same change.'] },
  { scores: [89, 92, 86], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] },
  { scores: [55, 48, 70], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Food Chains'], recurringMistakes: ['Reverses the direction of energy flow.'] },
  { scores: [81, 84, 90], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] }
];

const sessionBlueprints = [
  {
    topic: 'Fractions',
    subject: 'Mathematics',
    grade: 'Class 6',
    language: 'Telugu',
    questions: [
      { question: 'Which is larger: 2/3 of one roti or 2/3 of a smaller roti?', correctAnswer: 'The amount depends on the size of the whole roti.', commonMistake: 'Assumes equal fractions always mean equal quantities.' },
      { question: 'Why is 1/2 equal to 2/4?', correctAnswer: 'Both cover the same part of an equal whole.', commonMistake: 'Looks only at different numerators.' },
      { question: 'What happens when we add 1/4 and 2/4?', correctAnswer: 'The answer is 3/4 because the parts are same-sized fourths.', commonMistake: 'Adds denominators to get 3/8.' }
    ],
    insight: {
      commonMistake: 'Several learners add denominators when the fractional parts are already the same size.',
      recurringMisconception: 'Fraction size is being judged from numbers alone instead of the whole and equal parts.',
      reteachActivity: 'Use paper roti circles for a 5-minute shade-and-explain comparison of halves, fourths, and equivalent parts.'
    }
  },
  {
    topic: 'Decimals',
    subject: 'Mathematics',
    grade: 'Class 6',
    language: 'Telugu',
    questions: [
      { question: 'Is 0.5 rupee the same as 0.50 rupee? Explain.', correctAnswer: 'Yes, the zero at the end does not change the value.', commonMistake: 'Thinks more digits always means a bigger number.' },
      { question: 'Which is bigger: 0.7 litre or 0.65 litre?', correctAnswer: '0.7 is 0.70, so it is greater than 0.65.', commonMistake: 'Compares 65 with 7 without place value.' },
      { question: 'Where would 0.25 sit between 0 and 1?', correctAnswer: 'At one quarter of the distance from 0 to 1.', commonMistake: 'Places it near 25 on a whole-number line.' }
    ],
    insight: {
      commonMistake: 'Place value is missed while comparing decimal digits.',
      recurringMisconception: 'Students compare decimal strings like whole numbers.',
      reteachActivity: 'Build a quick rupee-and-paise place-value table and compare 0.7, 0.70, and 0.65.'
    }
  },
  {
    topic: 'Photosynthesis',
    subject: 'Science',
    grade: 'Class 7',
    language: 'Hindi',
    questions: [
      { question: 'If a plant gets sunlight but no water, can it make food well? Why?', correctAnswer: 'No. Water is one material needed for photosynthesis.', commonMistake: 'Says sunlight alone makes food.' },
      { question: 'What role do leaves play in food making?', correctAnswer: 'Leaves contain chlorophyll and are a main site for photosynthesis.', commonMistake: 'Says roots prepare all food.' },
      { question: 'Does soil give the plant ready-made food?', correctAnswer: 'No. Soil supplies water and minerals; the plant makes food.', commonMistake: 'Treats minerals as prepared food.' }
    ],
    insight: {
      commonMistake: 'Plants are described as taking ready-made food from soil.',
      recurringMisconception: 'The inputs and site of photosynthesis are being mixed up.',
      reteachActivity: 'Draw a leaf input-output sketch in pairs and let each pair label sunlight, water, carbon dioxide, and food.'
    }
  },
  {
    topic: 'Water Cycle',
    subject: 'Science',
    grade: 'Class 7',
    language: 'Hindi',
    questions: [
      { question: 'Why do wet uniforms dry faster in sunlight?', correctAnswer: 'Heat supports evaporation of water into vapour.', commonMistake: 'Calls drying condensation.' },
      { question: 'How do clouds form after water vapour rises?', correctAnswer: 'Cooling changes vapour into tiny droplets by condensation.', commonMistake: 'Says evaporation directly makes rain.' },
      { question: 'Can the same water move through the cycle again?', correctAnswer: 'Yes. Water changes state and circulates repeatedly.', commonMistake: 'Thinks rainwater leaves the cycle forever.' }
    ],
    insight: {
      commonMistake: 'Evaporation and condensation are used interchangeably.',
      recurringMisconception: 'State changes in the water cycle need clearer sequencing.',
      reteachActivity: 'Sequence four picture cards from puddle to vapour to cloud to rain and narrate the change at each step.'
    }
  }
];

const scoreToLevel = (score) => score >= 80 ? 'yes' : score >= 50 ? 'partial' : 'no';

const seed = async () => {
  try {
    await connectDB();
    console.log('[seed] Clearing previous ClassPulse seed data.');
    await Message.deleteMany({});
    await Session.deleteMany({});
    await Student.deleteMany({});
    await Topic.deleteMany({});
    await Teacher.deleteMany({});

    const teachers = await Teacher.insertMany(teacherSeeds);
    await Promise.all(teachers.map((teacher) => query(
      'UPDATE teachers SET password_hash = $1 WHERE id = $2::uuid',
      [hashPassword('ClassPulse@123'), teacher._id]
    )));
    await Topic.insertMany(topicSeeds);
    const [sunita, ramesh] = teachers;

    const studentDocs = names.map((name, index) => {
      const teachesMath = index < 13;
      const teacher = teachesMath ? sunita : ramesh;
      const patternSet = teachesMath ? mathPatterns : sciencePatterns;
      const pattern = patternSet[index % patternSet.length];
      return {
        name,
        grade: teacher.grade,
        teacherId: teacher._id,
        phone: `+91987654${String(1200 + index).padStart(4, '0')}`,
        language: teacher.language,
        riskLevel: pattern.riskLevel,
        confidenceLevel: pattern.confidenceLevel,
        learningProfile: {
          strongTopics: teachesMath ? ['Area and Perimeter'] : ['Water Cycle'],
          weakTopics: pattern.weakTopics,
          recurringMistakes: pattern.recurringMistakes
        },
        progressHistory: [],
        seedScores: pattern.scores
      };
    });

    const createdStudents = await Student.insertMany(studentDocs.map(({ seedScores, ...student }) => student));
    const sessions = [];

    for (const blueprint of sessionBlueprints) {
      const teacher = blueprint.subject === 'Mathematics' ? sunita : ramesh;
      const roster = createdStudents.filter((student) => String(student.teacherId) === String(teacher._id));
      const topicIndex = sessions.filter((session) => String(session.teacherId) === String(teacher._id)).length;
      const responses = roster.slice(0, 10).map((student) => {
        const original = studentDocs.find((item) => item.name === student.name);
        const score = original.seedScores[Math.min(topicIndex, original.seedScores.length - 1)];
        const understood = scoreToLevel(score);
        return {
          studentId: student._id,
          answers: blueprint.questions.map((question, answerIndex) => answerIndex === 0 && understood === 'no'
            ? question.commonMistake
            : `I think ${question.correctAnswer}`),
          score,
          understood,
          misconception: understood === 'yes' ? 'No major misconception detected.' : blueprint.insight.commonMistake,
          confidenceLevel: understood === 'yes' ? 'high' : understood === 'partial' ? 'medium' : 'low',
          submittedAt: new Date(Date.now() - (topicIndex + 1) * 86400000)
        };
      });

      const groupCard = (response) => {
        const student = roster.find((item) => String(item._id) === String(response.studentId));
        return {
          studentId: response.studentId,
          name: student.name,
          score: response.score,
          understood: response.understood,
          confidenceLevel: response.confidenceLevel,
          riskLevel: student.riskLevel
        };
      };
      const groupedStudents = {
        advanced: responses.filter((response) => response.understood === 'yes').map(groupCard),
        average: responses.filter((response) => response.understood === 'partial').map(groupCard),
        needsSupport: responses.filter((response) => response.understood === 'no').map(groupCard)
      };
      const session = await Session.create({
        teacherId: teacher._id,
        topic: blueprint.topic,
        subject: blueprint.subject,
        grade: blueprint.grade,
        language: blueprint.language,
        date: new Date(Date.now() - (topicIndex + 2) * 86400000),
        status: 'completed',
        questions: blueprint.questions,
        responses,
        groupedStudents,
        classInsight: {
          understoodCount: groupedStudents.advanced.length,
          partialCount: groupedStudents.average.length,
          strugglingCount: groupedStudents.needsSupport.length,
          commonMistake: blueprint.insight.commonMistake,
          recurringMisconception: blueprint.insight.recurringMisconception,
          mostAffectedTopic: blueprint.topic,
          reteachActivity: blueprint.insight.reteachActivity,
          teacherSummary: `${blueprint.topic} shows teachable misconceptions. Begin with one visual example, invite explanations, and revisit the support group.`,
          estimatedTimeSaved: `${responses.length * 3} minutes`,
          analysisGeneratedAt: new Date()
        }
      });
      sessions.push(session);

      for (const response of responses) {
        const student = createdStudents.find((item) => String(item._id) === String(response.studentId));
        student.progressHistory.push({
          sessionId: session._id,
          topic: blueprint.topic,
          date: session.date,
          score: response.score,
          understood: response.understood === 'yes',
          misconception: response.misconception,
          confidenceLevel: response.confidenceLevel,
          feedbackSent: true
        });
        await student.save();
      }
    }

    const messageDocs = sessions.flatMap((session) => session.responses.slice(0, 5).map((response) => ({
      studentId: response.studentId,
      sessionId: session._id,
      type: 'feedback',
      deliveryMode: 'greenapi',
      status: 'sent',
      content: `Keep going on ${session.topic}. Revise one example and explain the key idea in your own words.`,
      createdAt: new Date(session.date.getTime() + 3600000)
    })));
    await Message.insertMany(messageDocs);

    console.log(`[seed] Created ${teachers.length} teachers, ${createdStudents.length} students, ${topicSeeds.length} topics, ${sessions.length} sessions and ${messageDocs.length} messages.`);
  } catch (error) {
    console.error('[seed] Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await closeDB();
    console.log('[seed] PostgreSQL connection closed.');
  }
};

seed();
