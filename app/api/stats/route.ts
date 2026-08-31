import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { requireSession } from "../../../lib/auth";
export async function GET() {
  try {
    await requireSession();
    const [total, used, avg, due] = await Promise.all([
      db.word.count(),
      db.score.count({ where: { status: "USED" } }),
      db.score.aggregate({
        where: { status: "USED" },
        _avg: { masteryScore: true },
      }),
      db.score.count({
        where: { status: "USED", nextReviewDate: { lte: new Date() } },
      }),
    ]);
    return NextResponse.json({
      total,
      used,
      averageMastery: avg._avg.masteryScore ?? 0,
      due,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status:
          error instanceof Error && error.message === "UNAUTHORIZED"
            ? 401
            : 500,
      },
    );
  }
}
