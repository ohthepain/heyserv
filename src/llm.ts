import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function callLLM(prompt: string): Promise<string> {
  const openaiClient = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
  const res = await openaiClient.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
  });
  return res.choices[0].message?.content ?? "";
}
