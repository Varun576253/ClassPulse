const prompts = {
  Fractions: [
    ['Raju ate 1/4 of a roti and Meena ate 2/4. Who ate more, and why?', 'Meena ate more because 2/4 is greater than 1/4 when the whole is the same.', 'Comparing only the denominator or saying both are equal.'],
    ['Is 1/2 of a small ladoo always the same amount as 1/2 of a large ladoo?', 'No. The fraction is the same part of each whole, but the wholes can be different sizes.', 'Assuming equal fractions always mean equal quantities.'],
    ['How would you show that 2/6 and 1/3 can represent the same part?', 'Shade equal wholes or simplify 2/6 by dividing numerator and denominator by 2.', 'Changing only the numerator or only the denominator.']
  ],
  Photosynthesis: [
    ['A plant is kept in sunlight but not watered for many days. Can it keep making food well? Explain.', 'No. Plants need water along with sunlight, carbon dioxide and chlorophyll to make food.', 'Thinking sunlight alone is enough.'],
    ['Why are leaves important when a plant makes food?', 'Leaves contain chlorophyll and are a main place where photosynthesis happens.', 'Saying roots make all the food.'],
    ['Does a plant take ready-made food from soil during photosynthesis?', 'No. It uses materials such as water and carbon dioxide to make food.', 'Confusing minerals in soil with prepared food.']
  ]
};

const makeGenericQuestions = (topic, subject, grade) => [
  {
    question: `A classmate explains ${topic} using an example from ${grade}. What detail would you check to know they understood it?`,
    correctAnswer: `The answer should name the key idea of ${topic} and explain how it fits the example.`,
    commonMistake: `Repeating a fact from ${subject} without explaining the reasoning.`
  },
  {
    question: `Can you give one simple classroom example of ${topic} and explain why it works?`,
    correctAnswer: `The example should match ${topic} and include a short reason.`,
    commonMistake: 'Giving an example but not connecting it to the concept.'
  },
  {
    question: `What is one mistake a student might make while solving a ${topic} question, and how would you correct it?`,
    correctAnswer: `The answer should identify a likely misconception and a clear correction.`,
    commonMistake: 'Correcting the final answer without addressing the misconception.'
  }
];

const fallbackQuestions = (topic, subject, grade) => {
  const selected = prompts[topic];

  if (!selected) {
    return makeGenericQuestions(topic, subject, grade);
  }

  return selected.map(([question, correctAnswer, commonMistake]) => ({
    question,
    correctAnswer,
    commonMistake
  }));
};

module.exports = fallbackQuestions;
