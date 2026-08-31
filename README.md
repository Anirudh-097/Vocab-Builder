# Vocab Builder

A single-user vocabulary trainer built with Next.js App Router, Prisma, PostgreSQL/Supabase, and Groq.

## Local setup

1. Copy `.env.example` to `.env` and set the database, Groq, auth, and session values.
2. Run `npx prisma migrate dev --name init` and `npm run seed:words`.
3. Run `npm run dev`.

The seed file is a JSON array at `data/word-list.json`; it is intentionally idempotent. Every `Word` starts with `initialized = false`. A Supabase Cron job calls the internal generation endpoint hourly; it generates metadata for the next five uninitialized words and marks them initialized. The daily words endpoint only reads initialized, never-used words, so it does not call Groq during a user request. The test creates 30 questions when at least 30 reviewed words exist (or uses the available pool while the list is still small). Daily boundaries use Asia/Kolkata.

## Supabase Cron setup

1. Set `BACKGROUND_JOB_SECRET` in Render to a long random value.
2. Deploy the web service.
3. Open `supabase/cron.sql`, replace the Render URL and secret, and run it in the Supabase SQL Editor. The SQL stores the values in Supabase Vault and schedules the job for the top of every hour.
4. Check `cron.job_run_details` if a run needs investigating.

One five-word run makes one Groq request (with a retry only when the response is invalid). At five words per hour, 1000 words takes about 8 days and 8 hours; six words per hour completes it in a week. Adjust `BATCH_SIZE` and the cron schedule only if your Groq token limits allow it.

For Render, use `yarn install --frozen-lockfile && npx prisma generate && npm run build` as the build command, `npm start` as the start command, and run `npx prisma migrate deploy` before the first deploy. Configure `DATABASE_URL`, `GROQ_API_KEY`, `GROQ_MODEL`, `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, `SESSION_SECRET`, and `BACKGROUND_JOB_SECRET`.
