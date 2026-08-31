import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { generateWordData } from "../../../../lib/groq";

const BATCH_SIZE = 5;

function authorized(request: Request) {
  const secret = process.env.BACKGROUND_JOB_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const words = await db.word.findMany({ where: { initialized: false }, orderBy: { createdAt: "asc" }, take: BATCH_SIZE });
    if (!words.length) return NextResponse.json({ initialized: 0, remaining: 0 });
    const generated = await generateWordData(words.map((word) => word.word));
    await db.$transaction(async (tx) => {
      for (const item of generated) {
        const source = words.find((word) => word.word.toLowerCase() === item.word.toLowerCase());
        if (!source) throw new Error(`Generated word mismatch: ${item.word}`);
        await tx.word.update({ where: { id: source.id }, data: { meaning: item.meaning, example: item.example, synonyms: item.synonyms, distractors: item.distractors, initialized: true } });
      }
    });
    const remaining = await db.word.count({ where: { initialized: false } });
    return NextResponse.json({ initialized: generated.length, remaining });
  } catch (error) {
    console.error("Background word generation failed:", error);
    return NextResponse.json({ error: "Unable to initialize word metadata" }, { status: 500 });
  }
}
