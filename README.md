# Vocab Builder

A single-user vocabulary trainer built with Next.js App Router, Prisma, PostgreSQL/Supabase, and Groq.

## Local setup

1. Copy `.env.example` to `.env` and set the database, Groq, auth, and session values.
2. Run `npx prisma migrate dev --name init` and `npm run seed:words`.
3. Run `npm run dev`.

The seed file is a JSON array at `data/word-list.json`; it is intentionally idempotent. Word content uses the just-in-time strategy: only the up-to-25 words introduced that day are sent in one Groq batch request. The test creates 30 questions when at least 30 reviewed words exist (or uses the available pool while the list is still small). Daily boundaries use Asia/Kolkata.

For Render, use `npm install && npx prisma generate && npm run build` as the build command, `npm start` as the start command, and run `npx prisma migrate deploy` before the first deploy.
