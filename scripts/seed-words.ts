import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

if (existsSync(".env") && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {}
}

import { db } from "../lib/db";

async function main() {
  const filePath = path.join(process.cwd(), "data", "word-list.json");

  const source = JSON.parse(await readFile(filePath, "utf8"));

  if (
    !Array.isArray(source) ||
    source.some((word) => typeof word !== "string")
  ) {
    throw new Error("data/word-list.json must be a JSON array of strings");
  }

  const words = [
    ...new Set(source.map((word) => word.trim().toLowerCase()).filter(Boolean)),
  ];

  for (const word of words) {
    await db.word.upsert({
      where: { word },
      update: {},
      create: { word },
    });
  }

  console.log(`Seeded ${words.length} words.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
