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
    phone: '919440100101',
    email: 'sunita@classpulse.demo'
  },
  {
    name: 'Ramesh Kumar',
    school: 'Municipal School Secunderabad',
    subject: 'Science',
    grade: 'Class 7',
    language: 'Hindi',
    phone: '919440100202',
    email: 'ramesh@classpulse.demo'
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
  { scores: [28, 32, 35], riskLevel: 'high', confidenceLevel: 'low', weakTopics: ['Fractions', 'Decimals'], recurringMistakes: ['Adds denominators while adding fractions.'] },
  { scores: [38, 45, 42], riskLevel: 'high', confidenceLevel: 'low', weakTopics: ['Fractions'], recurringMistakes: ['Confuses equal parts with equal size.'] },
  { scores: [55, 62, 68], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Decimals'], recurringMistakes: ['Misses place value while comparing decimals.'] },
  { scores: [52, 58, 64], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Area and Perimeter'], recurringMistakes: ['Confuses boundary length with covered area.'] },
  { scores: [60, 70, 75], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Decimals'], recurringMistakes: ['Writes 0.65 > 0.7 because 65 > 7.'] },
  { scores: [72, 78, 80], riskLevel: 'low', confidenceLevel: 'medium', weakTopics: [], recurringMistakes: [] },
  { scores: [80, 85, 88], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] },
  { scores: [84, 88, 90], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] },
  { scores: [87, 89, 93], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] },
  { scores: [90, 92, 95], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] },
  { scores: [32, 38, 41], riskLevel: 'high', confidenceLevel: 'low', weakTopics: ['Fractions', 'Area and Perimeter'], recurringMistakes: ['Adds denominators while adding fractions.'] },
  { scores: [48, 55, 60], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Decimals'], recurringMistakes: ['Compares decimal digits as whole numbers.'] },
  { scores: [75, 78, 82], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] }
];

const sciencePatterns = [
  { scores: [30, 35, 38], riskLevel: 'high', confidenceLevel: 'low', weakTopics: ['Photosynthesis', 'Food Chains'], recurringMistakes: ['Thinks plants get prepared food directly from soil.'] },
  { scores: [35, 40, 42], riskLevel: 'high', confidenceLevel: 'low', weakTopics: ['Food Chains'], recurringMistakes: ['Reverses the direction of energy flow.'] },
  { scores: [45, 50, 55], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Water Cycle'], recurringMistakes: ['Treats evaporation and condensation as the same change.'] },
  { scores: [58, 65, 70], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Photosynthesis'], recurringMistakes: ['Says roots prepare food, not leaves.'] },
  { scores: [62, 70, 75], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Water Cycle'], recurringMistakes: ['Thinks rainwater leaves the cycle permanently.'] },
  { scores: [70, 76, 80], riskLevel: 'low', confidenceLevel: 'medium', weakTopics: [], recurringMistakes: [] },
  { scores: [78, 83, 86], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] },
  { scores: [80, 85, 88], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] },
  { scores: [84, 88, 92], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] },
  { scores: [88, 90, 94], riskLevel: 'low', confidenceLevel: 'high', weakTopics: [], recurringMistakes: [] },
  { scores: [40, 45, 48], riskLevel: 'high', confidenceLevel: 'low', weakTopics: ['Food Chains', 'Photosynthesis'], recurringMistakes: ['Confuses producers and consumers.'] },
  { scores: [55, 62, 68], riskLevel: 'medium', confidenceLevel: 'medium', weakTopics: ['Water Cycle'], recurringMistakes: ['Evaporation and condensation mixed up.'] }
];

const sessionBlueprints = [
  {
    topic: 'Fractions',
    subject: 'Mathematics',
    grade: 'Class 6',
    language: 'Telugu',
    daysAgo: 10,
    questions: [
      { question: 'Which is larger: 2/3 of one roti or 2/3 of a smaller roti?', correctAnswer: 'The amount depends on the size of the whole roti.', commonMistake: 'Assumes equal fractions always mean equal quantities.' },
      { question: 'Why is 1/2 equal to 2/4?', correctAnswer: 'Both cover the same part of an equal whole.', commonMistake: 'Looks only at different numerators.' },
      { question: 'What happens when we add 1/4 and 2/4?', correctAnswer: 'The answer is 3/4 because the parts are same-sized fourths.', commonMistake: 'Adds denominators to get 3/8.' }
    ],
    insight: {
      commonMistake: 'Several learners add denominators when the fractional parts are already the same size.',
      recurringMisconception: 'Fraction size is being judged from numbers alone instead of the whole and equal parts.',
      reteachActivity: 'Use paper roti circles for a 5-minute shade-and-explain comparison of halves, fourths, and equivalent parts.',
      teacherSummary: 'Fractions show teachable misconceptions. Begin with one visual example using paper circles, invite explanations, and revisit the support group.'
    }
  },
  {
    topic: 'Decimals',
    subject: 'Mathematics',
    grade: 'Class 6',
    language: 'Telugu',
    daysAgo: 7,
    questions: [
      { question: 'Is 0.5 rupee the same as 0.50 rupee? Explain.', correctAnswer: 'Yes, the zero at the end does not change the value.', commonMistake: 'Thinks more digits always means a bigger number.' },
      { question: 'Which is bigger: 0.7 litre or 0.65 litre?', correctAnswer: '0.7 is 0.70, so it is greater than 0.65.', commonMistake: 'Compares 65 with 7 without place value.' },
      { question: 'Where would 0.25 sit between 0 and 1?', correctAnswer: 'At one quarter of the distance from 0 to 1.', commonMistake: 'Places it near 25 on a whole-number line.' }
    ],
    insight: {
      commonMistake: 'Place value is missed while comparing decimal digits.',
      recurringMisconception: 'Students compare decimal strings like whole numbers.',
      reteachActivity: 'Build a quick rupee-and-paise place-value table and compare 0.7, 0.70, and 0.65.',
      teacherSummary: 'Decimal place value is a persistent gap. Use money examples the students recognise to show that 0.7 = 0.70.'
    }
  },
  {
    topic: 'Photosynthesis',
    subject: 'Science',
    grade: 'Class 7',
    language: 'Hindi',
    daysAgo: 8,
    questions: [
      { question: 'If a plant gets sunlight but no water, can it make food well? Why?', correctAnswer: 'No. Water is one material needed for photosynthesis.', commonMistake: 'Says sunlight alone makes food.' },
      { question: 'What role do leaves play in food making?', correctAnswer: 'Leaves contain chlorophyll and are a main site for photosynthesis.', commonMistake: 'Says roots prepare all food.' },
      { question: 'Does soil give the plant ready-made food?', correctAnswer: 'No. Soil supplies water and minerals; the plant makes food.', commonMistake: 'Treats minerals as prepared food.' }
    ],
    insight: {
      commonMistake: 'Plants are described as taking ready-made food from soil.',
      recurringMisconception: 'The inputs and site of photosynthesis are being mixed up.',
      reteachActivity: 'Draw a leaf input-output sketch in pairs and let each pair label sunlight, water, carbon dioxide, and food.',
      teacherSummary: 'Photosynthesis inputs are confused. Draw a simple input-output diagram on the board and ask students to label each arrow.'
    }
  },
  {
    topic: 'Water Cycle',
    subject: 'Science',
    grade: 'Class 7',
    language: 'Hindi',
    daysAgo: 5,
    questions: [
      { question: 'Why do wet uniforms dry faster in sunlight?', correctAnswer: 'Heat supports evaporation of water into vapour.', commonMistake: 'Calls drying condensation.' },
      { question: 'How do clouds form after water vapour rises?', correctAnswer: 'Cooling changes vapour into tiny droplets by condensation.', commonMistake: 'Says evaporation directly makes rain.' },
      { question: 'Can the same water move through the cycle again?', correctAnswer: 'Yes. Water changes state and circulates repeatedly.', commonMistake: 'Thinks rainwater leaves the cycle forever.' }
    ],
    insight: {
      commonMistake: 'Evaporation and condensation are used interchangeably.',
      recurringMisconception: 'State changes in the water cycle need clearer sequencing.',
      reteachActivity: 'Sequence four picture cards from puddle to vapour to cloud to rain and narrate the change at each step.',
      teacherSummary: 'Water cycle state changes are confused. Use a four-card sequencing activity to build the mental model step by step.'
    }
  },
  {
    topic: 'Food Chains',
    subject: 'Science',
    grade: 'Class 7',
    language: 'Hindi',
    daysAgo: 3,
    questions: [
      { question: 'In a food chain Grass → Rabbit → Fox, who gets the most energy?', correctAnswer: 'Grass, as it is the producer and energy decreases along the chain.', commonMistake: 'Says the fox gets the most energy because it eats the most.' },
      { question: 'What would happen to the fox if all rabbits disappeared?', correctAnswer: 'The fox population would decline due to lack of food.', commonMistake: 'Says nothing would change for the fox.' },
      { question: 'Why are there usually fewer foxes than rabbits in a field?', correctAnswer: 'Energy is lost at each step, so each level supports fewer organisms.', commonMistake: 'Says foxes are just less common by chance.' }
    ],
    insight: {
      commonMistake: 'Energy flow direction is reversed — students think top predators get the most energy.',
      recurringMisconception: 'Energy decreases along a food chain, it does not increase towards the predator.',
      reteachActivity: 'Draw 100 grass units → 10 rabbit units → 1 fox unit on the board and ask where energy goes at each step.',
      teacherSummary: 'Energy flow in food chains is a recurring gap. Use the 10% energy transfer rule with a concrete diagram to show why producers dominate.'
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
      'UPDATE teachers SET password_hash = $1, email = $2 WHERE id = $3::uuid',
      [hashPassword('ClassPulse@123'), teacher.email, teacher._id]
    )));
    await Topic.insertMany(topicSeeds);
    const [sunita, ramesh] = teachers;

    const mathCount = 13;
    const studentDocs = names.map((name, index) => {
      const isMath = index < mathCount;
      const teacher = isMath ? sunita : ramesh;
      const patternSet = isMath ? mathPatterns : sciencePatterns;
      const pattern = patternSet[index % patternSet.length];
      const tenDigit = String(9876541200 + index);
      return {
        name,
        grade: teacher.grade,
        teacherId: teacher._id,
        phone: `91${tenDigit}`,
        language: teacher.language,
        riskLevel: pattern.riskLevel,
        confidenceLevel: pattern.confidenceLevel,
        learningProfile: {
          strongTopics: isMath ? (pattern.riskLevel === 'low' ? ['Area and Perimeter', 'Fractions'] : []) : (pattern.riskLevel === 'low' ? ['Water Cycle', 'Food Chains'] : []),
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
      const roster = createdStudents.filter((s) => String(s.teacherId) === String(teacher._id));
      const topicIndex = sessions.filter((s) => String(s.teacherId) === String(teacher._id)).length;
      const sessionDate = new Date(Date.now() - blueprint.daysAgo * 86400000);

      const responses = roster.map((student) => {
        const original = studentDocs.find((d) => d.name === student.name);
        const score = original.seedScores[Math.min(topicIndex, original.seedScores.length - 1)];
        const understood = scoreToLevel(score);
        return {
          studentId: student._id,
          studentName: student.name,
          studentMobile: student.phone.replace(/^91/, ''),
          answers: blueprint.questions.map((q, ai) => ai === 0 && understood === 'no'
            ? q.commonMistake
            : `I think ${q.correctAnswer}`),
          score,
          understood,
          misconception: understood === 'yes' ? 'No major misconception detected.' : blueprint.insight.commonMistake,
          confidenceLevel: understood === 'yes' ? 'high' : understood === 'partial' ? 'medium' : 'low',
          submittedAt: sessionDate
        };
      });

      const groupCard = (r) => {
        const student = roster.find((s) => String(s._id) === String(r.studentId));
        return {
          studentId: r.studentId,
          name: student.name,
          score: r.score,
          understood: r.understood,
          confidenceLevel: r.confidenceLevel,
          riskLevel: student.riskLevel
        };
      };
      const groupedStudents = {
        advanced: responses.filter((r) => r.understood === 'yes').map(groupCard),
        average: responses.filter((r) => r.understood === 'partial').map(groupCard),
        needsSupport: responses.filter((r) => r.understood === 'no').map(groupCard)
      };

      const struggling = groupedStudents.needsSupport.length;
      const partial = groupedStudents.average.length;
      const understood = groupedStudents.advanced.length;

      const session = await Session.create({
        teacherId: teacher._id,
        topic: blueprint.topic,
        subject: blueprint.subject,
        grade: blueprint.grade,
        language: blueprint.language,
        date: sessionDate,
        status: 'completed',
        formStatus: 'closed',
        closedAt: sessionDate,
        questions: blueprint.questions,
        responses,
        groupedStudents,
        classInsight: {
          understoodCount: understood,
          partialCount: partial,
          strugglingCount: struggling,
          commonMistake: blueprint.insight.commonMistake,
          recurringMisconception: blueprint.insight.recurringMisconception,
          mostAffectedTopic: blueprint.topic,
          reteachActivity: blueprint.insight.reteachActivity,
          teacherSummary: blueprint.insight.teacherSummary,
          estimatedTimeSaved: `${responses.length * 3} minutes`,
          analysisGeneratedAt: sessionDate
        }
      });
      sessions.push(session);

      for (const response of responses) {
        const student = createdStudents.find((s) => String(s._id) === String(response.studentId));
        student.progressHistory.push({
          sessionId: session._id,
          topic: blueprint.topic,
          date: sessionDate,
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
      deliveryMode: 'mock',
      status: 'sent',
      content: `Keep going on ${session.topic}. Revise one example and explain the key idea in your own words.`,
      createdAt: new Date(session.date.getTime() + 3600000)
    })));
    await Message.insertMany(messageDocs);

    console.log(`[seed] Done: ${teachers.length} teachers, ${createdStudents.length} students, ${sessions.length} sessions, ${messageDocs.length} messages.`);
    console.log('[seed] Demo login: sunita@classpulse.demo / ClassPulse@123');
    console.log('[seed] Demo login: ramesh@classpulse.demo / ClassPulse@123');
    console.log('[seed] Student quiz phones (10-digit): 9876541200 – 9876541224');
  } catch (error) {
    console.error('[seed] Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await closeDB();
    console.log('[seed] PostgreSQL connection closed.');
  }
};

seed();
