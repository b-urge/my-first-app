import { buildQuizGeneratorPrompt } from "../../../prompts/quiz-generator";

const DEFAULT_QUESTION_COUNT = 10;
const MAX_QUESTION_COUNT = 50;
const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "because",
  "before",
  "between",
  "course",
  "during",
  "example",
  "from",
  "have",
  "into",
  "learning",
  "material",
  "materials",
  "should",
  "students",
  "their",
  "there",
  "these",
  "this",
  "through",
  "under",
  "using",
  "with",
]);

function clampQuestionCount(value) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_QUESTION_COUNT;
  }

  return Math.min(Math.max(Math.round(parsedValue), 1), MAX_QUESTION_COUNT);
}

function sanitizeText(value, maxLength = 14000) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeSources(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 20).map((source) => ({
    name: sanitizeText(source.name, 160) || "Uploaded material",
    type: sanitizeText(source.type, 80) || "unknown",
    size: Number(source.size) || 0,
  }));
}

function titleCase(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function splitContextIntoSnippets(courseContext, sources, courseTitle) {
  const contextSnippets = courseContext
    .split(/[\n.!?]+/)
    .map((snippet) => sanitizeText(snippet, 240))
    .filter((snippet) => snippet.length > 32);

  if (contextSnippets.length > 0) {
    return contextSnippets.map((snippet, index) => ({
      label: sources[index % Math.max(sources.length, 1)]?.name || "Course context",
      quote: truncate(snippet, 180),
    }));
  }

  if (sources.length > 0) {
    return sources.map((source) => ({
      label: source.name,
      quote: `${courseTitle} included ${source.name} as a quiz source.`,
    }));
  }

  return [
    {
      label: "Course context",
      quote: `${courseTitle} course materials were used to build this quiz.`,
    },
  ];
}

function deriveTopic(snippet, fallbackTopic) {
  const keywords = snippet.quote
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4 && !STOP_WORDS.has(word));

  const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 3);

  if (uniqueKeywords.length === 0) {
    return fallbackTopic;
  }

  return titleCase(uniqueKeywords.join(" "));
}

function buildOptions(topic, sourceQuote, index) {
  const correctAnswers = [
    `It connects ${topic} to the course evidence and learning goal.`,
    `It explains how ${topic} should be applied, not just memorized.`,
    `It identifies ${topic} as a key idea supported by the source material.`,
    `It shows why ${topic} matters for understanding the broader lesson.`,
  ];

  const distractors = [
    `It treats ${topic} as unrelated background information.`,
    `It replaces the source evidence with a personal opinion.`,
    `It focuses only on memorizing a term without context.`,
    `It suggests the uploaded material does not affect the quiz.`,
    `It ignores the quoted source and changes the main idea.`,
  ];

  const correctAnswer = correctAnswers[index % correctAnswers.length];
  const rotatedDistractors = distractors
    .slice(index % distractors.length)
    .concat(distractors.slice(0, index % distractors.length))
    .slice(0, 3);
  const correctAnswerIndex = index % 4;
  const options = [...rotatedDistractors];

  options.splice(correctAnswerIndex, 0, correctAnswer);

  return {
    options,
    correctAnswerIndex,
    explanation: `The source points toward ${topic} through this evidence: "${sourceQuote}"`,
  };
}

function buildQuestionPrompt(topic, index) {
  const prompts = [
    `Which option best explains the role of ${topic} in this course material?`,
    `What should a student understand about ${topic} after reviewing the source?`,
    `Which statement is most supported by the material about ${topic}?`,
    `How does ${topic} fit into the lesson represented by the source?`,
  ];

  return prompts[index % prompts.length];
}

function buildLocalQuiz({ courseTitle, questionCount, courseContext, sources }) {
  const snippets = splitContextIntoSnippets(courseContext, sources, courseTitle);
  const fallbackTopic = courseTitle || "Course Concepts";

  return Array.from({ length: questionCount }, (_, index) => {
    const source = snippets[index % snippets.length];
    const topic = deriveTopic(source, fallbackTopic);
    const optionSet = buildOptions(topic, source.quote, index);

    return {
      id: `question-${index + 1}`,
      prompt: buildQuestionPrompt(topic, index),
      options: optionSet.options,
      correctAnswerIndex: optionSet.correctAnswerIndex,
      explanation: optionSet.explanation,
      source,
    };
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const courseTitle =
      sanitizeText(body.courseTitle, 160) || "Generated course quiz";
    const courseContext = sanitizeText(body.courseContext);
    const questionCount = clampQuestionCount(body.questionCount);
    const sources = sanitizeSources(body.sources);
    const promptTemplate = buildQuizGeneratorPrompt({
      courseTitle,
      questionCount,
      courseContext,
      sources,
    });
    const questions = buildLocalQuiz({
      courseTitle,
      questionCount,
      courseContext,
      sources,
    });

    return Response.json({
      quiz: {
        title: courseTitle,
        questionCount: questions.length,
        generator: promptTemplate.length > 0 ? "local-ai-ready" : "local",
        questions,
      },
    });
  } catch {
    return Response.json(
      { error: "Quiz generation failed." },
      {
        status: 400,
      },
    );
  }
}
