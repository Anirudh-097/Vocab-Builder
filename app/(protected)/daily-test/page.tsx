"use client";
import { useEffect, useState } from "react";

type Question = {
  id: string;
  prompt: string;
  type: string;
  options: string[];
  answer: string;
};

export default function DailyTest() {
  const [questions, setQuestions] = useState<Question[]>([]),
    [index, setIndex] = useState(0),
    [picked, setPicked] = useState<string>(),
    [score, setScore] = useState(0),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/test/today")
      .then((r) => r.json())
      .then((x) => setQuestions(x.questions || []))
      .finally(() => setLoading(false));
  }, []);
  function answer(option: string) {
    if (picked) return;
    setPicked(option);
    const q = questions[index];
    if (option === q.answer) setScore((s) => s + 1);
  }
  function next() {
    setPicked(undefined);
    setIndex((i) => i + 1);
  }
  if (loading) return <p className="muted">Loading your review…</p>;
  if (!questions.length)
    return (
      <section className="hero">
        <h1>No review words yet.</h1>
        <p>Learn today’s words first, then come back for a test.</p>
      </section>
    );
  if (index >= questions.length)
    return (
      <section className="hero">
        <div className="eyebrow">Complete</div>
        <h1>
          {score} / {questions.length}
        </h1>
        <p>Nice work. Your review schedule has been updated.</p>
      </section>
    );
  const q = questions[index];
  return (
    <section className="hero" style={{ maxWidth: 700 }}>
      <div className="eyebrow">
        Question {index + 1} of {questions.length}
      </div>
      <div className="progress">
        <span style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <article className="card question">
        <p className="muted">
          {q.type === "DEFINITION"
            ? "Which word matches this definition?"
            : "Which option is a synonym?"}
        </p>
        <h2>{q.prompt}</h2>
        <div className="options">
          {q.options.map((o) => (
            <button
              className={`option ${picked && o === q.answer ? "correct" : ""} ${picked === o && o !== q.answer ? "wrong" : ""}`}
              key={o}
              onClick={() => answer(o)}
            >
              {o}
            </button>
          ))}
        </div>
        {picked && (
          <div className="actions">
            <button
              className="button"
              onClick={async () => {
                await fetch("/api/test/answer", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    wordId: q.id,
                    correct: picked === q.answer,
                    quality: picked === q.answer ? "CORRECT" : "WRONG_CLOSE",
                  }),
                });
                next();
              }}
            >
              {index + 1 === questions.length ? "Finish" : "Next"}
            </button>
          </div>
        )}
      </article>
    </section>
  );
}
