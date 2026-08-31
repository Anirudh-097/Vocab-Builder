export type GeneratedWord = { word: string; meaning: string; example: string; synonyms: [string, string]; distractors: [string, string, string] };
function valid(value: unknown): value is GeneratedWord { const x = value as GeneratedWord; return !!x && typeof x.word === "string" && typeof x.meaning === "string" && typeof x.example === "string" && Array.isArray(x.synonyms) && x.synonyms.length === 2 && Array.isArray(x.distractors) && x.distractors.length === 3 && [...x.synonyms, ...x.distractors].every(v => typeof v === "string" && v.length > 0); }
export async function generateWordData(words: string[]): Promise<GeneratedWord[]> {
  const key = process.env.GROQ_API_KEY; if (!key) throw new Error("GROQ_API_KEY is not configured");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "llama-3.3-70b-versatile", temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Return only JSON in the shape {words:[{word,meaning,example,synonyms:[string,string],distractors:[string,string,string]}]}. Keep definitions concise and distractors plausible but unambiguously wrong." }, { role: "user", content: `Generate entries for exactly these words: ${JSON.stringify(words)}` }] }) });
  if (!response.ok) throw new Error(`Groq request failed (${response.status})`);
  const body = await response.json(); const raw = JSON.parse(body.choices?.[0]?.message?.content ?? "{}").words;
  if (!Array.isArray(raw) || raw.length !== words.length || !raw.every(valid)) throw new Error("Groq returned invalid word data");
  const byWord = new Map(raw.map((x: GeneratedWord) => [x.word.toLowerCase(), x]));
  const ordered = words.map(word => byWord.get(word.toLowerCase()));
  if (ordered.some(x => !x)) throw new Error("Groq omitted a requested word");
  return ordered as GeneratedWord[];
}
