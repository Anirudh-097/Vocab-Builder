import { readFile } from "node:fs/promises";
import { db } from "../lib/db";

const source = JSON.parse(await readFile(new URL("../data/word-list.json", import.meta.url), "utf8"));
if (!Array.isArray(source) || source.some(word => typeof word !== "string")) throw new Error("data/word-list.json must be a JSON array of strings");
const words = [...new Set(source.map(word => word.trim().toLowerCase()).filter(Boolean))];
for (const word of words) await db.word.upsert({ where: { word }, update: {}, create: { word } });
console.log(`Seeded ${words.length} words.`);
await db.$disconnect();
