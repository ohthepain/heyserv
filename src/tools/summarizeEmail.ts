import { z } from "zod";
import { callLLM } from "../llm.js";
import { SummarizeEmailInputSchema } from "../schemas.js";

export const summarizeEmailTool = {
  name: "summarizeEmail",
  title: "Summarize Email",
  description: "Summarize an email into key bullet points",
  inputSchema: {
    text: z.string().min(1, "Email text is required"),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({ text }: { text: string }) => {
    const validatedInput = SummarizeEmailInputSchema.parse({ text });
    const prompt = `Summarize this email in 3 bullet points:\n\n${validatedInput.text}`;
    const summary = await callLLM(prompt);

    // Return structured response with action protocol
    return {
      content: [{ type: "text" as const, text: "I've summarized the email for you." }],
      shouldPerformAction: true,
      actionToPerform: {
        action: "summarizeEmail",
        description: "Summarize the email content into key bullet points",
        parameters: {
          text: summary, // The summary content goes here
          originalText: validatedInput.text, // Keep the original text for reference
        },
      },
    };
  },
};
