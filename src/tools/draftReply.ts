import { z } from "zod";
import { callLLM } from "../llm.js";
import { DraftReplyInputSchema } from "../schemas.js";
import { ProfileService, NamePreferences } from "../services/profileService.js";

// Helper function to get appropriate user name based on tone
function getUserNameForTone(names: NamePreferences, tone: string): string {
  switch (tone) {
    case "formal":
      return names.formal || names.professional;
    case "casual":
    case "friendly":
      return names.casual || names.professional;
    case "professional":
    case "polite":
    case "urgent":
    case "apologetic":
    case "neutral":
    default:
      return names.professional || names.formal || names.casual;
  }
}

export const draftReplyTool = {
  name: "draftReply",
  title: "Draft Reply",
  description: "Draft a reply to an email with a specified tone",
  inputSchema: {
    email: z.string().min(1, "Email content is required"),
    tone: z.string().optional().default("polite"),
    userId: z.string().optional(), // Optional user ID for profile preferences
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: false,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({ email, tone = "polite", userId }: { email: string; tone?: string; userId?: string }) => {
    console.log("draftReplyTool handler called with email:", email);
    const validatedInput = DraftReplyInputSchema.parse({ email, tone });

    // Get user profile preferences if userId is provided
    let userPreferences = null;
    if (userId) {
      try {
        const profileService = new ProfileService();
        const profile = await profileService.getOrCreateProfile(userId);
        userPreferences = profile.emailPreferences;

        // Use profile's default tone if no tone specified
        if (!tone || tone === "polite") {
          tone = userPreferences.defaults.defaultTone;
        }
      } catch (error) {
        console.warn("Failed to load user profile, using defaults:", error);
      }
    }

    // Build prompt with user preferences
    let prompt = `You are a professional email assistant. Write a complete, well-structured reply to the following email. The reply should be ${validatedInput.tone} in tone.

REQUIREMENTS:
- Write a complete, professional email reply (not just a brief response)
- Include a proper greeting and closing
- Address all points mentioned in the original email
- Be specific and actionable where appropriate
- Maintain a ${validatedInput.tone} tone throughout
- Aim for 2-4 paragraphs for a substantive response
- Do not end with "..." or incomplete thoughts
- Make it ready to send as-is`;

    // Add user-specific preferences if available
    if (userPreferences) {
      const signoff =
        userPreferences.signoffs[tone as keyof typeof userPreferences.signoffs] ||
        userPreferences.signoffs.professional;
      
      // Get appropriate name for the tone
      const userName = getUserNameForTone(userPreferences.names, tone);
      
      prompt += `\n\nUSER PREFERENCES:
- Preferred signoff for ${validatedInput.tone} tone: "${signoff}"
- User name for this tone: "${userName || 'Not specified'}"
- Default tone: ${userPreferences.defaults.defaultTone}
- Include signature: ${userPreferences.defaults.includeSignature ? "Yes" : "No"}`;
      
      if (userPreferences.signature.text && userPreferences.signature.includeInEmails) {
        prompt += `\n- Signature: "${userPreferences.signature.text}"`;
      }
    }

    prompt += `\n\nORIGINAL EMAIL:
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
  "body": "Your complete email reply text here (without signoff - we'll add it based on preferences)",
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

    // Apply user preferences formatting if available
    if (userPreferences && structuredEmail.body) {
      try {
        const profileService = new ProfileService();
        const formattedBody = await profileService.formatEmailBody(
          userId!,
          structuredEmail.body,
          tone as any,
          userPreferences.signoffs[tone as keyof typeof userPreferences.signoffs]
        );
        structuredEmail.body = formattedBody;
      } catch (error) {
        console.warn("Failed to apply user preferences formatting:", error);
      }
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
