CREATE TYPE "Status" AS ENUM ('NOT_USED', 'USED');
CREATE TYPE "Confidence" AS ENUM ('NEW', 'KNEW_IT', 'FORGOT', 'NO_IDEA');

CREATE TABLE "Word" (
  "id" TEXT NOT NULL,
  "word" TEXT NOT NULL,
  "meaning" TEXT NOT NULL DEFAULT '',
  "example" TEXT NOT NULL DEFAULT '',
  "synonyms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "distractors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Word_word_key" ON "Word"("word");

CREATE TABLE "Score" (
  "id" TEXT NOT NULL,
  "wordId" TEXT NOT NULL,
  "status" "Status" NOT NULL DEFAULT 'NOT_USED',
  "confidence" "Confidence" NOT NULL DEFAULT 'NEW',
  "masteryScore" INTEGER NOT NULL DEFAULT 0,
  "timesSeen" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "incorrectCount" INTEGER NOT NULL DEFAULT 0,
  "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  "intervalDays" INTEGER NOT NULL DEFAULT 0,
  "repetitions" INTEGER NOT NULL DEFAULT 0,
  "lastSeenAt" TIMESTAMP(3),
  "nextReviewDate" TIMESTAMP(3),
  "introducedOn" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Score_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Score_wordId_key" UNIQUE ("wordId"),
  CONSTRAINT "Score_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
