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
    const prompt = `Here is a draft email:\n${validatedInput.draft}\n\nRewrite it according to this instruction: ${validatedInput.instruction}`;
    const newDraft = await callLLM(prompt);
    return {
      content: [{ type: "text" as const, text: newDraft }],
    };
  },
};
