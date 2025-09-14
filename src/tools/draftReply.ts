import { callLLM } from "../llm.js";

export const draftReply = {
  name: "draftReply",
  description: "Draft a reply to an email with a specified tone",
  inputSchema: {
    type: "object",
    properties: {
      email: {
        type: "string",
        description: "The email content to reply to",
      },
      tone: {
        type: "string",
        description: "The tone for the reply (e.g., polite, professional, casual)",
        default: "polite",
      },
    },
    required: ["email"],
  },
};

export async function draftReplyHandler({ email, tone = "polite" }: { email: string; tone?: string }) {
  const prompt = `Write a ${tone} reply to this email:\n\n${email}`;
  const reply = await callLLM(prompt);
  return { reply };
}
