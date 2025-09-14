import { z } from "zod";
import { callLLM } from "../llm.js";
import { DraftReplyInputSchema } from "../schemas.js";

export const draftReplyTool = {
  name: "draftReply",
  title: "Draft Reply",
  description: "Draft a reply to an email with a specified tone",
  inputSchema: {
    email: z.string().min(1, "Email content is required"),
    tone: z.string().optional().default("polite"),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({ email, tone = "polite" }: { email: string; tone?: string }) => {
    const validatedInput = DraftReplyInputSchema.parse({ email, tone });
    const prompt = `Write a ${validatedInput.tone} reply to this email:\n\n${validatedInput.email}`;
    const reply = await callLLM(prompt);
    return {
      content: [{ type: "text" as const, text: reply }],
    };
  },
};
