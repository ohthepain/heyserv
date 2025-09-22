import { z } from "zod";
import { callLLM } from "../llm.js";
import { RewriteReplyInputSchema } from "../schemas.js";

export const rewriteReplyTool = {
  name: "rewriteReply",
  title: "Rewrite Reply",
  description: "Rewrite an email draft according to specific instructions",
  inputSchema: {
    draft: z.string().min(1, "Email draft is required"),
    instruction: z.string().min(1, "Rewrite instruction is required"),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({ draft, instruction }: { draft: string; instruction: string }) => {
    const validatedInput = RewriteReplyInputSchema.parse({ draft, instruction });
    const prompt = `You are a professional email assistant. Here is a draft email:

${validatedInput.draft}

Rewrite this email according to this instruction: ${validatedInput.instruction}

REQUIREMENTS:
- Keep the email format (Subject, From, etc. if present)
- Maintain a professional tone
- Keep the same basic structure (greeting, body, closing)
- Make the requested changes while preserving the core message
- Return the complete email, ready to send`;
    const newDraft = await callLLM(prompt);
    return {
      content: [{ type: "text" as const, text: newDraft }],
      shouldPerformAction: true,
      actionToPerform: {
        action: "rewriteReply",
        description: "Rewrite an email draft according to specific instructions",
        parameters: {
          draft: newDraft,
          instruction: validatedInput.instruction,
        },
      },
    };
  },
};
