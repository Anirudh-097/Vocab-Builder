ALTER TABLE "Word" ADD COLUMN "initialized" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Word"
SET "initialized" = true
WHERE "meaning" <> ''
  AND "example" <> ''
  AND cardinality("synonyms") = 2
  AND cardinality("distractors") = 3;
