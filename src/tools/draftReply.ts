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
    console.log("draftReplyTool handler called with email:", email);
    const validatedInput = DraftReplyInputSchema.parse({ email, tone });

    const prompt = `You are a professional email assistant. Write a complete, well-structured reply to the following email. The reply should be ${validatedInput.tone} in tone.

REQUIREMENTS:
- Write a complete, professional email reply (not just a brief response)
- Include a proper greeting and closing
- Address all points mentioned in the original email
- Be specific and actionable where appropriate
- Maintain a ${validatedInput.tone} tone throughout
- Aim for 2-4 paragraphs for a substantive response
- Do not end with "..." or incomplete thoughts
- Make it ready to send as-is

ORIGINAL EMAIL:
${validatedInput.email}

Write a complete, professional reply:`;

    const reply = await callLLM(prompt);

    // Return structured response with action protocol
    return {
      content: [{ type: "text" as const, text: reply }],
      shouldPerformAction: true,
      actionToPerform: {
        action: "draftReply",
        description: "Draft a reply to the email with the specified tone",
        parameters: {
          email: validatedInput.email,
        },
      },
    };
  },
};
