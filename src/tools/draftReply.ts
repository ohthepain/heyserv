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

IMPORTANT: Return your response as a JSON object with this exact structure:
{
  "subject": "Re: [original subject or appropriate subject]",
  "sender": "Your Name <your.email@example.com>",
  "recipients": {
    "to": ["recipient@example.com"],
    "cc": [],
    "bcc": []
  },
  "body": "Your complete email reply text here",
  "bodyHtml": null
}

Return ONLY the JSON object, no additional text.`;

    const reply = await callLLM(prompt);

    // Parse the JSON response
    let structuredEmail;
    try {
      structuredEmail = JSON.parse(reply);
    } catch (error) {
      console.error("Error parsing email JSON:", error);
      // Fallback to plain text format if JSON parsing fails
      structuredEmail = {
        subject: "Re: Email Reply",
        sender: "User <user@example.com>",
        recipients: {
          to: ["recipient@example.com"],
          cc: [],
          bcc: [],
        },
        body: reply,
        bodyHtml: null,
      };
    }

    // Return structured response with action protocol
    return {
      content: [{ type: "text" as const, text: "I've drafted a reply to the email for you." }],
      shouldPerformAction: true,
      actionToPerform: {
        action: "draftReply",
        parameters: {
          email: structuredEmail, // The structured email object goes here
          originalEmail: validatedInput.email, // Keep the original email for reference
        },
      },
    };
  },
};
