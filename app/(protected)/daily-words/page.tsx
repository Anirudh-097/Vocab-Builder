"use client";
import { useEffect, useState } from "react";
type Word = {
  id: string;
  word: string;
  meaning: string;
  example: string;
  synonyms: string[];
  score: { confidence: string; masteryScore: number } | null;
};
export default function DailyWords() {
  const [words, setWords] = useState<Word[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/words/daily")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || "Could not load today’s words.");
        }
        return r.json();
      })
      .then((x) => setWords(x.words))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load today’s words."),
      )
      .finally(() => setLoading(false));
  }, []);
  async function confidence(id: string, value: string) {
    setWords((ws) =>
      ws.map((w) =>
        w.id === id
          ? {
              ...w,
              score: {
                masteryScore: w.score?.masteryScore ?? 0,
                confidence: value,
              },
            }
          : w,
      ),
    );
    await fetch(`/api/words/${id}/confidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confidence: value }),
    });
  }
  return (
    <>
      <section className="hero">
        <div className="eyebrow">Daily words</div>
        <h1>Meet your next 25 words.</h1>
        <p>
          Read each entry, notice the example, and mark how familiar it feels.
          Your answer shapes the next review.
        </p>
      </section>
      {loading && <p className="muted">Preparing your words…</p>}
      {error && <p className="error">{error}</p>}
      <section className="grid">
        {words.map((w) => (
          <article className="card wordcard" key={w.id}>
            <h2>{w.word}</h2>
            <p>{w.meaning}</p>
            <blockquote>{w.example}</blockquote>
            <div className="chips">
              {w.synonyms.map((s) => (
                <span className="chip" key={s}>
                  {s}
                </span>
              ))}
            </div>
            <div className="actions">
              <button
                className={`button ${w.score?.confidence === "KNEW_IT" ? "" : "secondary"}`}
                onClick={() => confidence(w.id, "KNEW_IT")}
              >
                I knew it
              </button>
              <button
                className={`button ${w.score?.confidence === "FORGOT" ? "" : "secondary"}`}
                onClick={() => confidence(w.id, "FORGOT")}
              >
                Forgot
              </button>
              <button
                className={`button ${w.score?.confidence === "NO_IDEA" ? "" : "secondary"}`}
                onClick={() => confidence(w.id, "NO_IDEA")}
              >
                No idea
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
