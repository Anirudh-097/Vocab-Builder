# AGENTS.md — Vocab-Builder

This file is the working spec for AI coding agents (Claude Code, etc.) building and maintaining this repo. Keep it up to date as decisions change.

## 1. Goal

Help a single user learn 1000 words in 30 days through daily word introduction + daily spaced-repetition MCQ testing.

## 2. Tech Stack

- **Frontend + Backend**: Next.js (App Router) + Next.js API routes (single app, single deploy)
- **Host**: Render (one Web Service)
- **Database**: PostgreSQL via Supabase (external managed DB, not hosted on Render)
- **ORM**: Prisma (recommended — typed schema, migrations, works cleanly with Supabase Postgres)
- **LLM**: Groq API (fast inference, used for batch word-data generation)
- **Auth**: single-user credential auth (see §5)

Single-deployment note: Next.js API routes run in the same process/service as the frontend, so one Render Web Service is sufficient. No separate backend service needed.

## 3. Data Model (Prisma-style)

```prisma
model Word {
  id          String   @id @default(cuid())
  word        String   @unique
  meaning     String
  example     String
  synonyms    String[] // exactly 2
  distractors String[] // exactly 3
  initialized Boolean  @default(false) // metadata has been generated and validated
  createdAt   DateTime @default(now())

  score       Score?
}

model Score {
  id               String    @id @default(cuid())
  wordId           String    @unique
  word             Word      @relation(fields: [wordId], references: [id])

  status           Status    @default(NOT_USED)   // NOT_USED | USED
  confidence       Confidence @default(NEW)        // NEW | KNEW_IT | FORGOT | NO_IDEA

  masteryScore     Int       @default(0)   // 0-100
  timesSeen        Int       @default(0)
  correctCount     Int       @default(0)
  incorrectCount   Int       @default(0)

  // SM-2 style spaced repetition state
  easeFactor       Float     @default(2.5)
  intervalDays     Int       @default(0)
  repetitions      Int       @default(0)

  lastSeenAt       DateTime?
  nextReviewDate   DateTime?

  updatedAt        DateTime  @updatedAt
}

enum Status {
  NOT_USED
  USED
}

enum Confidence {
  NEW
  KNEW_IT
  FORGOT
  NO_IDEA
}
```

Notes:
- A `Score` row is created for a `Word` the moment it's introduced (status flips to `USED`), not before. Keeps the "never used" pool = words with no `Score` row (or `status = NOT_USED`).
- `Word.initialized = false` means the seed word has no trusted LLM metadata yet. The background generator sets it to `true` only after validating meaning, example, exactly two synonyms, and exactly three distractors.
- `masteryScore` is a derived convenience field for prioritization/UI, recomputed on every answer (see §6.3).

## 4. Word List Seeding (how to feed the 1000 words)

1. Prepare a plain word list file at `data/word-list.json`:
   ```json
   ["intransigent", "amenable", "conciliatory", "..."]
   ```
   (or `.csv` with one word per line — either is fine, pick one and document it in `README.md`).
2. Run a one-time seed script: `npm run seed:words`
   - Script reads the list, dedupes, inserts into `Word` table with **only `word` filled**; `meaning`, `example`, `synonyms`, `distractors` left blank.
3. **Content generation strategy**: Pre-generate metadata in the background. Supabase Cron invokes `POST /api/internal/generate-content` once per hour; the endpoint processes the next five uninitialized words in one Groq request and marks them `initialized = true` only after strict validation. This keeps user-facing daily requests database-only and avoids Groq rate-limit failures in the request path.
4. Script location: `scripts/seed-words.ts`, idempotent (safe to re-run — skips words already in DB via the unique constraint).

## 5. Auth (single user)

No need for multi-user auth infra (NextAuth providers, OAuth, etc.). Keep it minimal:

- Store a single username + bcrypt password hash in environment variables (`AUTH_USERNAME`, `AUTH_PASSWORD_HASH`).
- Login page (`/login`) posts credentials to `POST /api/auth/login`, which verifies against the env hash and sets a signed, httpOnly session cookie (JWT, e.g. via `jose`, short-lived + refreshed, or a long-lived single session since it's one user).
- Next.js `middleware.ts` protects all routes under `/` (except `/login`, `/api/auth/*`, and the bearer-secret-protected internal generation endpoint) by checking the session cookie; redirects to `/login` if absent/invalid.
- All other API routes (`/api/words/*`, `/api/test/*`) re-validate the session server-side before touching the DB — "API can be called only if login is authorised" applies to every route, not just page loads.
- No signup flow, no password reset flow — it's provisioned via env vars at deploy time.

## 6. Core Logic

### 6.1 Daily Words

- Query up to 25 `Word` rows with `status = NOT_USED` (or no `Score` row), ordered by `id`/insertion order (or randomized — pick one, keep it deterministic per day so a refresh doesn't reshuffle).
- **Single LLM call**: send all 25 words in one prompt to Groq, ask for a structured JSON array response containing `{ word, meaning, example, synonyms[2], distractors[3] }` for each. Validate/parse strictly (reject and retry on malformed JSON).
- Persist results: upsert into `Word` (fill meaning/example/synonyms/distractors) and create the matching `Score` row per word with `status = USED`, `confidence = NEW`, `nextReviewDate = today` (so it enters the review queue immediately).
- UI lets the user set confidence per word (`KNEW_IT` / `FORGOT` / `NO_IDEA`, default `NEW` until touched) — this updates `Score.confidence` and feeds into `nextReviewDate` calc (§6.4) the same way a test answer would.

### 6.2 Daily Test

Pool assembly (must total ≥ 30 words):
1. **Yesterday's words** — all words introduced in the previous day's batch (up to 25).
2. **Weak words** — `Score` rows with low `masteryScore` or `confidence IN (FORGOT, NO_IDEA)`, regardless of `nextReviewDate`.
3. **Due for spaced repetition** — `Score` rows where `nextReviewDate <= today`.
4. Deduplicate across the three buckets, then if total < 30, backfill with the next-most-overdue `nextReviewDate` words until 30 is reached.

Question generation (no LLM call needed at test time — everything is already in DB):
- **Definition → Word**: prompt = word's `meaning`; options = shuffled [correct word, its 3 `distractors`].
- **Word → Synonyms**: prompt = the word; options = shuffled [1 random synonym of the word, its 3 `distractors`].
- Randomize question type per word; randomize option order each render.

### 6.3 Mastery Score (derived)

Recompute on every answer (test or confidence self-report):

```
masteryScore = clamp(
  0,
  100,
  round(
    (correctCount / max(timesSeen, 1)) * 70   // accuracy component
    + min(repetitions, 5) * 6                  // repetition/streak component
  )
)
```

Confidence self-reports count as a "soft" signal: `KNEW_IT` treated as a correct answer, `FORGOT`/`NO_IDEA` as incorrect, for the purposes of `correctCount`/`incorrectCount`/`timesSeen`.

### 6.4 Scheduling Algorithm — simplified SM-2

Chosen because it's a well-understood, easy-to-implement spaced repetition algorithm that fits a single-user MVP better than full SuperMemo/FSRS complexity, while still adapting interval length to performance.

Map each outcome to a quality score `q` (0–5 scale, SM-2 convention):

| Outcome                          | q |
|-----------------------------------|---|
| Correct in test, fast/confident   | 5 |
| Correct in test                   | 4 |
| Self-reported `KNEW_IT`           | 4 |
| Self-reported `FORGOT` / wrong (close) | 2 |
| Self-reported `NO_IDEA` / wrong   | 0 |

On each review of a word:
```
if q < 3:
  repetitions = 0
  intervalDays = 1
else:
  if repetitions == 0: intervalDays = 1
  elif repetitions == 1: intervalDays = 3
  else: intervalDays = round(intervalDays * easeFactor)
  repetitions += 1

easeFactor = max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
nextReviewDate = today + intervalDays days
timesSeen += 1
lastSeenAt = now
if q >= 3: correctCount += 1 else: incorrectCount += 1
```

This naturally produces the Leitner-like behavior the spec asks for: words marked `NO_IDEA`/wrong come back tomorrow, words consistently known stretch out (1 → 3 → ~7-8 → ~15+ days), and `masteryScore` (§6.3) gives a simple UI-friendly number on top of the same data.

## 7. API Routes (suggested)

- `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/words/daily` — fetch today's up-to-25 initialized, never-used words and create their Score rows
- `POST /api/internal/generate-content` — internal Supabase Cron endpoint; bearer-secret protected, generates metadata for five uninitialized words, then marks them initialized
- `POST /api/words/:id/confidence` — set confidence, triggers §6.4 update
- `GET /api/test/today` — assemble today's ≥30-word test pool + generated questions
- `POST /api/test/answer` — submit one answer, triggers §6.4 update
- `GET /api/stats` — overall progress (words used, avg mastery, streak, etc.) for a dashboard/home view

## 8. Folder Structure (suggested)

```
/app
  /login
  /(protected)/daily-words
  /(protected)/daily-test
  /(protected)/dashboard
  /api/auth/...
  /api/words/...
  /api/test/...
/lib
  db.ts            # Prisma client
  groq.ts           # Groq API wrapper + prompt templates
  scheduler.ts       # SM-2 logic (§6.4)
  mastery.ts         # masteryScore calc (§6.3)
  auth.ts             # session cookie helpers
/prisma
  schema.prisma
/scripts
  seed-words.ts
/data
  word-list.json
/supabase
  cron.sql              # Supabase pg_cron + pg_net setup for metadata generation
middleware.ts
AGENTS.md
```

## 9. Environment Variables

```
DATABASE_URL=              # Supabase Postgres connection string
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
AUTH_USERNAME=
AUTH_PASSWORD_HASH=        # bcrypt hash, generate via a small local script
SESSION_SECRET=            # for signing the session JWT/cookie
BACKGROUND_JOB_SECRET=     # bearer secret for the Supabase Cron endpoint
```

## 10. Deployment (Render, single service)

1. Push repo to GitHub.
2. Create a new **Web Service** on Render, connect the repo.
3. Build command: `yarn install --frozen-lockfile && npx prisma generate && npm run build`
4. Start command: `npm start`
5. Add all env vars from §9 in Render's dashboard (DB lives on Supabase, so no Render Postgres add-on needed).
6. Run `npx prisma migrate deploy` (as a Render pre-deploy/one-off job, or manually the first time) against the Supabase `DATABASE_URL`.
7. Run `npm run seed:words` once (locally against the prod `DATABASE_URL`, or as a Render one-off job) to load the 1000-word list. Seeded words remain uninitialized until Supabase Cron enriches them.
8. Run `supabase/cron.sql` in Supabase SQL Editor after replacing its URL and secret placeholders.

## 11. Open Decisions to Confirm Before Building

- Word list source file format: JSON array vs CSV (default: JSON, §4).
- Exact test question count beyond the 30 minimum, and whether both question types appear for every word or are sampled.
- Timezone for "daily" boundaries (chosen: Asia/Kolkata).
