import type { Confidence, Score } from "@prisma/client";
import { addDays, todayKey } from "./dates";
import { calculateMastery } from "./mastery";

export type ReviewOutcome = "CORRECT" | "WRONG_CLOSE" | "NO_IDEA" | Confidence;
export function qualityFor(outcome: ReviewOutcome): number {
  if (outcome === "CORRECT" || outcome === "KNEW_IT") return 4;
  if (outcome === "WRONG_CLOSE" || outcome === "FORGOT") return 2;
  return 0;
}
export function scheduleReview(
  score: Score,
  outcome: ReviewOutcome,
  now = new Date(),
) {
  const q = qualityFor(outcome);
  let repetitions = score.repetitions;
  let intervalDays: number;
  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    intervalDays =
      repetitions === 0
        ? 1
        : repetitions === 1
          ? 3
          : Math.round(score.intervalDays * score.easeFactor);
    repetitions += 1;
  }
  const easeFactor = Math.max(
    1.3,
    score.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );
  const timesSeen = score.timesSeen + 1;
  const correctCount = score.correctCount + (q >= 3 ? 1 : 0);
  const incorrectCount = score.incorrectCount + (q >= 3 ? 0 : 1);
  return {
    confidence:
      outcome === "KNEW_IT"
        ? "KNEW_IT"
        : outcome === "FORGOT"
          ? "FORGOT"
          : outcome === "NO_IDEA"
            ? "NO_IDEA"
            : score.confidence,
    repetitions,
    intervalDays,
    easeFactor,
    timesSeen,
    correctCount,
    incorrectCount,
    masteryScore: calculateMastery(correctCount, timesSeen, repetitions),
    lastSeenAt: now,
    nextReviewDate: new Date(
      `${addDays(todayKey(now), intervalDays)}T00:00:00+05:30`,
    ),
  };
}
