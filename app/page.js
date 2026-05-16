"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

const DEFAULT_QUESTION_COUNT = 10;
const MAX_QUESTION_COUNT = 50;
const ACCEPTED_FILE_TYPES = ".pdf,.ppt,.pptx,.doc,.docx,.txt,.md";

function formatFileSize(sizeInBytes) {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${Math.round(sizeInBytes / 1024)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isReadableTextFile(file) {
  return (
    file.type.startsWith("text/") ||
    file.name.toLowerCase().endsWith(".txt") ||
    file.name.toLowerCase().endsWith(".md")
  );
}

export default function Home() {
  const [courseTitle, setCourseTitle] = useState("Foundations of the course");
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);
  const [courseContext, setCourseContext] = useState("");
  const [sourceFiles, setSourceFiles] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [phase, setPhase] = useState("setup");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activeQuestion = quiz?.questions[activeQuestionIndex];
  const answeredQuestionCount = Object.keys(answers).length;
  const score = useMemo(() => {
    if (!quiz) {
      return 0;
    }

    return quiz.questions.reduce((totalScore, question) => {
      return answers[question.id] === question.correctAnswerIndex
        ? totalScore + 1
        : totalScore;
    }, 0);
  }, [answers, quiz]);

  const canGenerateQuiz =
    !isGenerating &&
    courseTitle.trim().length > 0 &&
    (courseContext.trim().length > 0 || sourceFiles.length > 0);

  async function handleFileChange(event) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const nextSourceFiles = selectedFiles.map((file) => ({
      name: file.name,
      type: file.type || "Unknown",
      size: file.size,
    }));

    setSourceFiles(nextSourceFiles);

    const readableFiles = selectedFiles.filter(isReadableTextFile);
    const extractedTextBlocks = await Promise.all(
      readableFiles.map(async (file) => {
        const text = await file.text();
        return `Source: ${file.name}\n${text.trim()}`;
      }),
    );

    if (extractedTextBlocks.length > 0) {
      setCourseContext((currentContext) => {
        const separator = currentContext.trim().length > 0 ? "\n\n" : "";
        return `${currentContext}${separator}${extractedTextBlocks.join("\n\n")}`;
      });
    }
  }

  async function handleGenerateQuiz(event) {
    event.preventDefault();

    if (!canGenerateQuiz) {
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseTitle,
          courseContext,
          questionCount,
          sources: sourceFiles,
        }),
      });

      if (!response.ok) {
        throw new Error("The quiz could not be generated.");
      }

      const payload = await response.json();
      setQuiz(payload.quiz);
      setAnswers({});
      setActiveQuestionIndex(0);
      setPhase("quiz");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleAnswerSelect(questionId, optionIndex) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: optionIndex,
    }));
  }

  function handleQuestionCountChange(value) {
    const parsedValue = Number(value);
    const safeValue = Number.isFinite(parsedValue)
      ? Math.min(Math.max(parsedValue, 1), MAX_QUESTION_COUNT)
      : DEFAULT_QUESTION_COUNT;

    setQuestionCount(safeValue);
  }

  function handleRestart() {
    setPhase("setup");
    setQuiz(null);
    setAnswers({});
    setActiveQuestionIndex(0);
  }

  return (
    <main className={styles.page}>
      <section className={styles.workspace}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>AI Quiz Studio</p>
            <h1>Generate course quizzes from class materials.</h1>
          </div>
          <div className={styles.statusPill}>No auth</div>
        </header>

        <div className={styles.layout}>
          <form className={styles.setupPanel} onSubmit={handleGenerateQuiz}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.sectionKicker}>Admin setup</p>
                <h2>Quiz inputs</h2>
              </div>
              <span>{questionCount} questions</span>
            </div>

            <label className={styles.field}>
              <span>Course name</span>
              <input
                value={courseTitle}
                onChange={(event) => setCourseTitle(event.target.value)}
                placeholder="Course or module title"
              />
            </label>

            <label className={styles.field}>
              <span>Question count</span>
              <div className={styles.countControl}>
                <input
                  type="range"
                  min="1"
                  max={MAX_QUESTION_COUNT}
                  value={questionCount}
                  onChange={(event) =>
                    handleQuestionCountChange(event.target.value)
                  }
                />
                <input
                  type="number"
                  min="1"
                  max={MAX_QUESTION_COUNT}
                  value={questionCount}
                  onChange={(event) =>
                    handleQuestionCountChange(event.target.value)
                  }
                />
              </div>
            </label>

            <label className={styles.uploadZone}>
              <span>Materials</span>
              <strong>PDFs, slide decks, docs, or notes</strong>
              <input
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                multiple
                onChange={handleFileChange}
              />
            </label>

            {sourceFiles.length > 0 && (
              <div className={styles.sourceList}>
                {sourceFiles.map((sourceFile, sourceFileIndex) => (
                  <div
                    className={styles.sourceItem}
                    key={`${sourceFile.name}-${sourceFileIndex}`}
                  >
                    <span>{sourceFile.name}</span>
                    <small>{formatFileSize(sourceFile.size)}</small>
                  </div>
                ))}
              </div>
            )}

            <label className={styles.field}>
              <span>Related context</span>
              <textarea
                value={courseContext}
                onChange={(event) => setCourseContext(event.target.value)}
                placeholder="Paste lecture notes, excerpts, learning objectives, or any course context."
              />
            </label>

            {errorMessage && <p className={styles.error}>{errorMessage}</p>}

            <button
              className={styles.primaryButton}
              disabled={!canGenerateQuiz}
              type="submit"
            >
              {isGenerating ? "Generating..." : "Generate quiz"}
            </button>
          </form>

          <section className={styles.quizPanel}>
            {phase === "setup" && (
              <div className={styles.emptyState}>
                <p className={styles.sectionKicker}>Student view</p>
                <h2>Ready for a generated quiz.</h2>
                <p>
                  Add course materials and context, then generate a quiz for
                  students to complete before seeing feedback.
                </p>
              </div>
            )}

            {phase === "quiz" && activeQuestion && (
              <div className={styles.quizStage}>
                <div className={styles.quizTopline}>
                  <span>
                    Question {activeQuestionIndex + 1} of{" "}
                    {quiz.questions.length}
                  </span>
                  <span>
                    {answeredQuestionCount}/{quiz.questions.length} answered
                  </span>
                </div>

                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${
                        ((activeQuestionIndex + 1) / quiz.questions.length) *
                        100
                      }%`,
                    }}
                  />
                </div>

                <article className={styles.questionBlock}>
                  <p className={styles.sourceLabel}>
                    Source: {activeQuestion.source.label}
                  </p>
                  <h2>{activeQuestion.prompt}</h2>
                  <div className={styles.options}>
                    {activeQuestion.options.map((option, optionIndex) => {
                      const isSelected =
                        answers[activeQuestion.id] === optionIndex;

                      return (
                        <button
                          aria-pressed={isSelected}
                          className={styles.optionButton}
                          key={option}
                          onClick={() =>
                            handleAnswerSelect(activeQuestion.id, optionIndex)
                          }
                          type="button"
                        >
                          <span>{String.fromCharCode(65 + optionIndex)}</span>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </article>

                <div className={styles.quizActions}>
                  <button
                    className={styles.secondaryButton}
                    disabled={activeQuestionIndex === 0}
                    onClick={() =>
                      setActiveQuestionIndex((currentIndex) =>
                        Math.max(currentIndex - 1, 0),
                      )
                    }
                    type="button"
                  >
                    Back
                  </button>

                  {activeQuestionIndex < quiz.questions.length - 1 ? (
                    <button
                      className={styles.primaryButton}
                      onClick={() =>
                        setActiveQuestionIndex((currentIndex) =>
                          Math.min(currentIndex + 1, quiz.questions.length - 1),
                        )
                      }
                      type="button"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      className={styles.primaryButton}
                      disabled={answeredQuestionCount < quiz.questions.length}
                      onClick={() => setPhase("results")}
                      type="button"
                    >
                      Finish quiz
                    </button>
                  )}
                </div>
              </div>
            )}

            {phase === "results" && quiz && (
              <div className={styles.results}>
                <div className={styles.resultsSummary}>
                  <p className={styles.sectionKicker}>Feedback</p>
                  <h2>
                    {score}/{quiz.questions.length} correct
                  </h2>
                  <p>
                    Review each answer with the correct choice, explanation,
                    and source quote.
                  </p>
                </div>

                <div className={styles.feedbackList}>
                  {quiz.questions.map((question, questionIndex) => {
                    const selectedAnswerIndex = answers[question.id];
                    const isCorrect =
                      selectedAnswerIndex === question.correctAnswerIndex;

                    return (
                      <article className={styles.feedbackItem} key={question.id}>
                        <div className={styles.feedbackHeading}>
                          <span>Q{questionIndex + 1}</span>
                          <strong
                            className={
                              isCorrect
                                ? styles.correctStatus
                                : styles.reviewStatus
                            }
                          >
                            {isCorrect ? "Correct" : "Review"}
                          </strong>
                        </div>
                        <h3>{question.prompt}</h3>
                        <p>
                          Your answer:{" "}
                          {question.options[selectedAnswerIndex] ??
                            "No answer selected"}
                        </p>
                        <p>
                          Correct answer:{" "}
                          {question.options[question.correctAnswerIndex]}
                        </p>
                        <p>{question.explanation}</p>
                        <blockquote>
                          <span>{question.source.label}</span>
                          {question.source.quote}
                        </blockquote>
                      </article>
                    );
                  })}
                </div>

                <button
                  className={styles.secondaryButton}
                  onClick={handleRestart}
                  type="button"
                >
                  Build another quiz
                </button>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
