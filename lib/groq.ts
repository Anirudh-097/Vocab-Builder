export type GeneratedWord = {
  word: string;
  meaning: string;
  example: string;
  synonyms: [string, string];
  distractors: [string, string, string];
};

const MAX_ATTEMPTS = 2;

function nonEmptyStrings(value: unknown, length: number): value is string[] {
  return Array.isArray(value) && value.length === length && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function parseChunk(content: unknown, requestedWords: string[]): GeneratedWord[] {
  if (typeof content !== "string") throw new Error("Groq response content was not text");
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error("Groq returned unparseable JSON"); }
  const raw = parsed && typeof parsed === "object" && Array.isArray((parsed as { words?: unknown }).words) ? (parsed as { words: unknown[] }).words : Array.isArray(parsed) ? parsed : null;
  if (!raw || raw.length !== requestedWords.length) throw new Error("Groq returned the wrong number of words");

  const requested = new Set(requestedWords.map((word) => word.trim().toLowerCase()));
  const seen = new Set<string>();
  const entries = raw.map((value) => {
    if (!value || typeof value !== "object") throw new Error("Groq returned an invalid word entry");
    const item = value as Record<string, unknown>;
    if (typeof item.word !== "string") throw new Error("Groq returned an entry without a word");
    const normalized = item.word.trim().toLowerCase();
    if (!requested.has(normalized) || seen.has(normalized)) throw new Error(`Groq emitted an unexpected or duplicate word: ${item.word}`);
    if (typeof item.meaning !== "string" || !item.meaning.trim() || typeof item.example !== "string" || !item.example.trim() || !nonEmptyStrings(item.synonyms, 2) || !nonEmptyStrings(item.distractors, 3)) throw new Error(`Groq returned incomplete data for ${item.word}`);
    seen.add(normalized);
    return { normalized, item };
  });
  if (seen.size !== requested.size) throw new Error("Groq omitted a requested word");
  const byWord = new Map(entries.map((entry) => [entry.normalized, entry.item]));
  return requestedWords.map((originalWord) => { const item = byWord.get(originalWord.trim().toLowerCase())!; return { word: originalWord, meaning: (item.meaning as string).trim(), example: (item.example as string).trim(), synonyms: [(item.synonyms as string[])[0].trim(), (item.synonyms as string[])[1].trim()], distractors: [(item.distractors as string[])[0].trim(), (item.distractors as string[])[1].trim(), (item.distractors as string[])[2].trim()] }; });
}

async function generateChunk(chunkWords: string[], key: string, model: string): Promise<GeneratedWord[]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: attempt === 1 ? 0.1 : 0, max_tokens: 4096, response_format: { type: "json_object" }, messages: [{ role: "system", content: "You are a lexicographer. Return only valid JSON in this exact shape: {\"words\":[{\"word\":\"one input word\",\"meaning\":\"clear concise definition\",\"example\":\"natural example sentence\",\"synonyms\":[\"synonym 1\",\"synonym 2\"],\"distractors\":[\"wrong option 1\",\"wrong option 2\",\"wrong option 3\"]}]}. The word field MUST equal one of the strings in the user list; never output labels such as \"requested word\". Return exactly one entry for every input word, no extra words, exactly 2 synonyms and exactly 3 distractors per entry." }, { role: "user", content: `${attempt > 1 ? "Your previous response was invalid. Correct the format and try again. " : ""}Generate entries for exactly these words. Preserve each word exactly: ${JSON.stringify(chunkWords)}` }] }) });
      if (!response.ok) { const errorBody = await response.text().catch(() => ""); throw new Error(`Groq API error (${response.status}): ${errorBody || response.statusText}`); }
      const body = await response.json();
      return parseChunk(body.choices?.[0]?.message?.content, chunkWords);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) continue;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Groq word generation failed");
}

export async function generateWordData(words: string[]): Promise<GeneratedWord[]> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const chunkSize = 5;
  const chunks: string[][] = [];
  for (let index = 0; index < words.length; index += chunkSize) chunks.push(words.slice(index, index + chunkSize));
  const results = await Promise.all(chunks.map((chunk) => generateChunk(chunk, key, model)));
  return results.flat();
}
