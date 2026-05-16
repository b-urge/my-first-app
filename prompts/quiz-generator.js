export function buildQuizGeneratorPrompt({
  courseTitle,
  questionCount,
  courseContext,
  sources,
}) {
  const sourceList = sources
    .map((source) => `- ${source.name} (${source.type || "unknown"})`)
    .join("\n");

  return `<role-and-goal>
You are an expert instructional assessment designer.
Your goal is to generate a fair multiple-choice quiz for a student course.
</role-and-goal>

<instructions>
Generate exactly ${questionCount} multiple-choice questions for ${courseTitle}.

<sub-instructions-guidelines>
Each question must have four answer options, one correct answer, and three plausible distractors.
Feedback must be held until the quiz is complete.
</sub-instructions-guidelines>

<sub-instructions-guidelines>
For every question, include an explanation that helps a student understand the correct answer.
Point to a source by name and include one short source quote.
Do not reproduce the full source document.
</sub-instructions-guidelines>
</instructions>

<output-format>
Return JSON with: title, questions, prompt, options, correctAnswerIndex, explanation, source.label, source.quote.
</output-format>

<context>
Course context:
${courseContext}

Sources:
${sourceList || "No uploaded sources provided."}
</context>

<final-instructions>
Think step by step before responding.
</final-instructions>`;
}
