export type GeneratedWord = {
  word: string;
  meaning: string;
  example: string;
  synonyms: [string, string];
  distractors: [string, string, string];
};

async function generateChunk(
  chunkWords: string[],
  key: string,
  model: string,
): Promise<GeneratedWord[]> {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a lexicographer. For each requested word, return JSON with the format: " +
              '{"words":[{"word":"<word>","meaning":"<clear concise definition>","example":"<example sentence>","synonyms":["<syn1>","<syn2>"],"distractors":["<dist1>","<dist2>","<dist3>"]}]}. ' +
              "Return exactly the requested words. Each entry must have exactly 2 synonyms and 3 plausible but incorrect distractors.",
          },
          {
            role: "user",
            content: `Generate dictionary entries for these words: ${JSON.stringify(chunkWords)}`,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(`Groq request failed (${response.status}):`, errorBody);
    throw new Error(
      `Groq API error (${response.status}): ${errorBody || response.statusText}`,
    );
  }

  const body = await response.json();
  const content = body.choices?.[0]?.message?.content ?? "{}";
  let raw: unknown[] = [];
  try {
    const parsed = JSON.parse(content);
    raw = Array.isArray(parsed.words)
      ? parsed.words
      : Array.isArray(parsed)
        ? parsed
        : [];
  } catch (err) {
    console.error("Failed to parse Groq response JSON:", content);
    throw new Error("Groq returned unparseable JSON");
  }

  return chunkWords.map((originalWord, idx) => {
    const cleanWord = originalWord.trim().toLowerCase();
    const match =
      (raw.find(
        (x: any) =>
          typeof x?.word === "string" &&
          x.word.trim().toLowerCase() === cleanWord,
      ) as any) || raw[idx];

    const meaning =
      typeof match?.meaning === "string" && match.meaning.trim()
        ? match.meaning.trim()
        : `Definition of ${originalWord}`;
    const example =
      typeof match?.example === "string" && match.example.trim()
        ? match.example.trim()
        : `This sentence demonstrates the usage of ${originalWord}.`;

    const rawSynonyms = Array.isArray(match?.synonyms)
      ? match.synonyms.filter((s: unknown) => typeof s === "string" && s.trim())
      : [];
    const synonyms: [string, string] = [
      rawSynonyms[0] || `${originalWord} equivalent`,
      rawSynonyms[1] || `${originalWord} counterpart`,
    ];

    const rawDistractors = Array.isArray(match?.distractors)
      ? match.distractors.filter(
          (d: unknown) => typeof d === "string" && d.trim(),
        )
      : [];
    const distractors: [string, string, string] = [
      rawDistractors[0] || "unrelated",
      rawDistractors[1] || "opposite",
      rawDistractors[2] || "unconnected",
    ];

    return {
      word: originalWord,
      meaning,
      example,
      synonyms,
      distractors,
    };
  });
}

export async function generateWordData(
  words: string[],
): Promise<GeneratedWord[]> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  // Batch into chunks of 5 words for 100% LLM reliability & concurrency
  const CHUNK_SIZE = 5;
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    chunks.push(words.slice(i, i + CHUNK_SIZE));
  }

  const results = await Promise.all(
    chunks.map((chunk) => generateChunk(chunk, key, model)),
  );

  return results.flat();
}
