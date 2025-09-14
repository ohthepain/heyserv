import { callLLM } from "../llm.js";

export const rewriteReply = {
  name: "rewriteReply",
  description: "Rewrite an email draft according to specific instructions",
  inputSchema: {
    type: "object",
    properties: {
      draft: {
        type: "string",
        description: "The original email draft to rewrite",
      },
      instruction: {
        type: "string",
        description: "Instructions for how to rewrite the email",
      },
    },
    required: ["draft", "instruction"],
  },
};

export async function rewriteReplyHandler({ draft, instruction }: { draft: string; instruction: string }) {
  const prompt = `Here is a draft email:\n${draft}\n\nRewrite it according to this instruction: ${instruction}`;
  const newDraft = await callLLM(prompt);
  return { reply: newDraft };
}
