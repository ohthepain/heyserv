import { callLLM } from "../llm.js";

export const summarizeEmail = {
  name: "summarizeEmail",
  description: "Summarize an email into key bullet points",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The email text to summarize",
      },
    },
    required: ["text"],
  },
};

export async function summarizeEmailHandler({ text }: { text: string }) {
  const prompt = `Summarize this email in 3 bullet points:\n\n${text}`;
  const summary = await callLLM(prompt);
  return { summary };
}
