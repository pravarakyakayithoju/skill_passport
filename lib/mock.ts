export const MOCK =
  process.env.MOCK_MODE === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

export const MOCK_AI =
  process.env.MOCK_MODE === 'true' ||
  (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY);

export const MOCK_JUDGE0 =
  process.env.MOCK_MODE === 'true' ||
  !process.env.JUDGE0_API_KEY;

// Global in-memory storage to simulate Supabase database tables when offline/mocking
class MockMemoryDatabase {
  assessments = new Map<string, any>();
  resumes = new Map<string, any>();
  codingQuestions = new Map<string, any>();
  mcqQuestions = new Map<string, any[]>(); // assessment_id -> mcq_questions[]
  mcqResponses = new Map<string, any[]>();  // assessment_id -> mcq_responses[]
  codeSubmissions = new Map<string, any>();
  keystrokeLogs = new Map<string, any>();
  explanationVideos = new Map<string, any>();
  skillPassports = new Map<string, any>();
}

// Attach to global scope to prevent hot-reload wipes in Next.js development mode
const globalForMockDb = globalThis as unknown as { mockMemoryDb?: MockMemoryDatabase };
export const mockMemoryDb = globalForMockDb.mockMemoryDb || new MockMemoryDatabase();
if (process.env.NODE_ENV !== 'production') {
  globalForMockDb.mockMemoryDb = mockMemoryDb;
}

export const MOCK_RESUME = {
  full_name: 'Alex Developer',
  skills: ['javascript', 'react', 'nodejs', 'typescript', 'mongodb', 'next.js', 'tailwindcss'],
  primary_skill: 'javascript',
  experience_level: 'mid',
  summary: 'Full-stack software engineer with 3+ years of experience building modern web applications with JavaScript, React, and Node.js.'
};

export const MOCK_CODING_QUESTION = {
  language: 'javascript',
  title: 'Two Sum',
  description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

### Example 1
**Input:** \`nums = [2,7,11,15]\`, \`target = 9\`  
**Output:** \`[0,1]\`  
**Explanation:** Because \`nums[0] + nums[1] == 9\`, we return \`[0, 1]\`.

### Example 2
**Input:** \`nums = [3,2,4]\`, \`target = 6\`  
**Output:** \`[1,2]\`  
`,
  starter_code: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Your code here
  
}`,
  visible_tests: [
    { input: JSON.stringify([[2, 7, 11, 15], 9]), expected: JSON.stringify([0, 1]) },
    { input: JSON.stringify([[3, 2, 4], 6]), expected: JSON.stringify([1, 2]) }
  ],
  hidden_tests: [
    { input: JSON.stringify([[3, 3], 6]), expected: JSON.stringify([0, 1]) },
    { input: JSON.stringify([[1, 5, 8, 3], 11]), expected: JSON.stringify([2, 3]) },
    { input: JSON.stringify([[1, 2, 3, 4, 5], 9]), expected: JSON.stringify([3, 4]) },
    { input: JSON.stringify([[-1, -2, -3, -4, -5], -8]), expected: JSON.stringify([2, 4]) },
    { input: JSON.stringify([[10, 20, 30, 40, 50], 90]), expected: JSON.stringify([3, 4]) },
    { input: JSON.stringify([[100, 200, 300, 400], 700]), expected: JSON.stringify([2, 3]) }
  ],
  reference_solution: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`
};

export const MOCK_MCQ_POOL = [
  {
    id: 'mcq-1',
    skill: 'javascript',
    difficulty: 1,
    question: 'Which of the following is NOT a JavaScript primitive data type?',
    options: { A: 'String', B: 'Boolean', C: 'Object', D: 'Undefined' },
    correct: 'C',
    explanation: 'Objects are non-primitive data types in JavaScript. Primitives include String, Number, Boolean, Undefined, Null, Symbol, and BigInt.'
  },
  {
    id: 'mcq-2',
    skill: 'javascript',
    difficulty: 1,
    question: 'How do you create a function in JavaScript?',
    options: {
      A: 'function myFunction()',
      B: 'function:myFunction()',
      C: 'create myFunction()',
      D: 'def myFunction()'
    },
    correct: 'A',
    explanation: 'The function keyword is used to declare a function in JavaScript, followed by the name, parentheses, and brackets.'
  },
  {
    id: 'mcq-3',
    skill: 'javascript',
    difficulty: 2,
    question: 'What is the output of `console.log(typeof NaN)` in JavaScript?',
    options: { A: '"number"', B: '"NaN"', C: '"undefined"', D: '"object"' },
    correct: 'A',
    explanation: 'Despite standing for "Not a Number", NaN is of type number.'
  },
  {
    id: 'mcq-4',
    skill: 'javascript',
    difficulty: 2,
    question: 'Which array method adds one or more elements to the end of an array and returns the new length?',
    options: { A: 'pop()', B: 'push()', C: 'shift()', D: 'unshift()' },
    correct: 'B',
    explanation: 'push() adds elements to the end; unshift() adds to the beginning; pop() removes from the end; shift() removes from the beginning.'
  },
  {
    id: 'mcq-5',
    skill: 'javascript',
    difficulty: 3,
    question: 'What is the difference between `==` and `===` in JavaScript?',
    options: {
      A: '== performs type coercion, === checks both value and type without coercion',
      B: '=== performs type coercion, == checks both value and type without coercion',
      C: '== is for assignment, === is for comparison',
      D: 'There is no difference'
    },
    correct: 'A',
    explanation: '== checks equality with type coercion, whereas === checks equality strictly without modifying the types.'
  },
  {
    id: 'mcq-6',
    skill: 'javascript',
    difficulty: 3,
    question: 'What is a closure in JavaScript?',
    options: {
      A: 'A function bundled together with references to its surrounding state',
      B: 'A method to close browser tabs or windows',
      C: 'A block of code containing a try-catch statement',
      D: 'A loop that never terminates'
    },
    correct: 'A',
    explanation: 'A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment).'
  },
  {
    id: 'mcq-7',
    skill: 'javascript',
    difficulty: 4,
    question: 'Which of the following statements about JavaScript promises is TRUE?',
    options: {
      A: 'A Promise can be resolved or rejected multiple times',
      B: 'Promise.all rejects immediately if any of the input promises reject',
      C: 'Promise.resolve() creates a pending promise',
      D: '.then() block execution is synchronous'
    },
    correct: 'B',
    explanation: 'Promise.all is fail-fast and rejects immediately if any of the passed promises reject. Promises are settled once and execute asynchronous microtasks.'
  },
  {
    id: 'mcq-8',
    skill: 'javascript',
    difficulty: 4,
    question: 'What does the `bind` method do to a function?',
    options: {
      A: 'It executes the function immediately with a specified `this` context',
      B: 'It copies a function, permanently setting the `this` keyword value for any calls',
      C: 'It connects two unrelated functions together',
      D: 'It restricts the function from accessing global scope'
    },
    correct: 'B',
    explanation: 'The bind() method creates a new function that, when called, has its `this` keyword set to the provided value, with a given sequence of arguments.'
  },
  {
    id: 'mcq-9',
    skill: 'javascript',
    difficulty: 5,
    question: 'What is the purpose of the `WeakMap` object in JavaScript?',
    options: {
      A: 'To store key-value pairs where keys must be objects and are weakly held for garbage collection',
      B: 'To store numbers in a memory-efficient way',
      C: 'To perform fast mathematical array searches',
      D: 'To map values with weak encryption'
    },
    correct: 'A',
    explanation: 'WeakMap keys must be objects and are held weakly. If there are no other references to a key object, it can be garbage collected, avoiding memory leaks.'
  },
  {
    id: 'mcq-10',
    skill: 'javascript',
    difficulty: 5,
    question: 'What is the event loop phase order in Node.js?',
    options: {
      A: 'timers, pending callbacks, idle/prepare, poll, check, close callbacks',
      B: 'poll, check, timers, idle/prepare, close callbacks, pending callbacks',
      C: 'timers, poll, check, idle/prepare, pending callbacks, close callbacks',
      D: 'close callbacks, timers, poll, check, pending callbacks, idle/prepare'
    },
    correct: 'A',
    explanation: 'Node.js event loop phases: Timers -> Pending callbacks -> Idle/Prepare -> Poll -> Check -> Close callbacks.'
  }
];

export const MOCK_WHISPER_TRANSCRIPT = 
  "To solve the Two Sum problem, I used a Hash Map to store elements and their corresponding indices. As I iterate through the array of numbers, I calculate the complement by subtracting the current value from the target. If the map contains this complement, it means we have found the pair, and I return the index of the complement and the current index. Otherwise, I store the current number and index in the map. This implementation has a time complexity of O(N) and space complexity of O(N).";

export const MOCK_CODE_ANALYSIS = {
  score: 95,
  complexity: 'O(N) Time, O(N) Space',
  readability: 'Excellent variable names and clean control flow.',
  issues: []
};

export const MOCK_EXPLANATION_ANALYSIS = {
  score: 90,
  coherent: true,
  contradictions: []
};

export const MOCK_RESUME_ANALYSIS = {
  score: 85,
  matched_skills: ['javascript', 'typescript', 'react', 'node.js'],
  missing_skills: ['docker', 'aws'],
  summary: 'Good frontend credentials. Clear experience with Javascript and React. Lacks system administration and DevOps experience.'
};
