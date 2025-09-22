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
- Return the complete email, ready to send

IMPORTANT: Return your response as a JSON object with this exact structure:
{
  "subject": "Email subject here",
  "sender": "Sender Name <sender@example.com>",
  "recipients": {
    "to": ["recipient@example.com"],
    "cc": [],
    "bcc": []
  },
  "body": "Your rewritten email text here",
  "bodyHtml": null
}

Return ONLY the JSON object, no additional text.`;

    const newDraft = await callLLM(prompt);

    // Parse the JSON response
    let structuredEmail;
    try {
      structuredEmail = JSON.parse(newDraft);
    } catch (error) {
      console.error("Error parsing email JSON:", error);
      // Fallback to plain text format if JSON parsing fails
      structuredEmail = {
        subject: "Email Subject",
        sender: "Sender <sender@example.com>",
        recipients: {
          to: ["recipient@example.com"],
          cc: [],
          bcc: [],
        },
        body: newDraft,
        bodyHtml: null,
      };
    }

    return {
      content: [{ type: "text" as const, text: "I've rewritten the email draft for you." }],
      shouldPerformAction: true,
      actionToPerform: {
        action: "rewriteReply",
        description: "Rewrite an email draft according to specific instructions",
        parameters: {
          email: structuredEmail, // The structured email object goes here
          instruction: validatedInput.instruction,
          originalDraft: validatedInput.draft, // Keep the original draft for reference
        },
      },
    };
  },
};
