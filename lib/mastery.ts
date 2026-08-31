export function calculateMastery(correctCount: number, timesSeen: number, repetitions: number): number {
  return Math.max(0, Math.min(100, Math.round((correctCount / Math.max(timesSeen, 1)) * 70 + Math.min(repetitions, 5) * 6)));
}
