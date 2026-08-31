import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { requireSession } from "../../../../lib/auth";
import { dayStart, todayKey } from "../../../../lib/dates";

export async function GET() {
  try {
    await requireSession();
    const key = todayKey();
    const existing = await db.score.findMany({
      where: { introducedOn: key, status: "USED" },
      include: { word: true },
      orderBy: { word: { createdAt: "asc" } },
    });
    if (existing.length)
      return NextResponse.json({
        words: existing.map((x) => ({
          ...x.word,
          score: { confidence: x.confidence, masteryScore: x.masteryScore },
        })),
      });
    const unused = await db.word.findMany({
      where: { initialized: true, score: null },
      orderBy: { createdAt: "asc" },
      take: 25,
    });
    if (!unused.length) return NextResponse.json({ words: [] });
    const words = await db.$transaction(async (tx) => {
      await tx.score.createMany({
        data: unused.map((source) => ({
          wordId: source.id,
          status: "USED" as const,
          confidence: "NEW" as const,
          introducedOn: key,
          nextReviewDate: dayStart(key),
        })),
        skipDuplicates: true,
      });
      return tx.score.findMany({
        where: { introducedOn: key },
        include: { word: true },
        orderBy: { word: { createdAt: "asc" } },
      });
    });
    return NextResponse.json({
      words: words.map((x) => ({
        ...x.word,
        score: { confidence: x.confidence, masteryScore: x.masteryScore },
      })),
    });
  } catch (error) {
    console.error("Failed to prepare daily words:", error);
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(
      {
        error:
          status === 401
            ? "Unauthorized"
            : error instanceof Error
              ? error.message
              : "Unable to prepare daily words",
      },
      { status },
    );
  }
}
