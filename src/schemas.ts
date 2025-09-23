import { z } from "zod";

// Suggested action schema for when LLM needs clarification
export const SuggestedActionSchema = z.object({
  label: z.string().describe("Human-readable label for the action button"),
  prompt: z.string().describe("The exact prompt to send when this action is clicked"),
  description: z.string().optional().describe("Optional description of what this action does"),
});

// Chat response schema with suggested actions
export const ChatResponseSchema = z.object({
  success: z.boolean(),
  response: z.string(),
  suggestedActions: z
    .array(SuggestedActionSchema)
    .optional()
    .describe("Actions the user can take when clarification is needed"),
  shouldPerformAction: z.boolean().optional(),
  actionToPerform: z
    .object({
      action: z.string(),
      description: z.string().optional(),
      parameters: z.record(z.any()),
    })
    .optional(),
  toolsUsed: z
    .array(
      z.object({
        name: z.string(),
        arguments: z.any(),
        timestamp: z.string(),
        success: z.boolean(),
        error: z.string().optional(),
      })
    )
    .optional(),
  debuggingInfo: z
    .object({
      toolsExecuted: z.number(),
      toolsList: z.array(z.string()),
      executionSummary: z.string(),
    })
    .optional(),
});

// Custom email validation that handles multiple email formats
const emailWithDisplayName = z.string().refine(
  (value) => {
    // Handle multiple recipients separated by commas
    const recipients = value.split(",").map((recipient) => recipient.trim());

    for (const recipient of recipients) {
      // Handle "Display Name <email@domain.com>" or '"Display Name" <email@domain.com>' format
      const displayNameMatch = recipient.match(/^(?:"?)([^"<>]+?)(?:"?)\s*<(.+?)>$/);
      if (displayNameMatch) {
        const email = displayNameMatch[2].trim();
        if (!z.string().email().safeParse(email).success) {
          return false;
        }
        continue;
      }

      // Handle simple email format
      if (!z.string().email().safeParse(recipient).success) {
        return false;
      }
    }

    return true;
  },
  {
    message:
      "Invalid email address. Supported formats: 'email@domain.com', 'Display Name <email@domain.com>', '\"Display Name\" <email@domain.com>', or multiple recipients separated by commas",
  }
);

// Email content schema for analyzeEmail
export const EmailContentSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  sender: emailWithDisplayName,
  recipients: z
    .object({
      to: z.array(emailWithDisplayName).default([]),
      cc: z.array(emailWithDisplayName).default([]),
      bcc: z.array(emailWithDisplayName).default([]),
    })
    .optional(),
  body: z.string().min(1, "Email body is required"),
  bodyHtml: z.string().optional(),
});

// Analysis result schema
export const AnalysisResultSchema = z.object({
  summary: z.string().min(1, "Summary is required"),
  mainPoints: z.array(z.string()).min(1, "At least one main point is required"),
  suggestedActions: z.array(z.string()).min(1, "At least one suggested action is required"),
  priority: z.enum(["low", "medium", "high"]),
  category: z.enum(["work", "personal", "marketing", "notification", "other"]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  tone: z.enum([
    "professional",
    "casual",
    "formal",
    "urgent",
    "friendly",
    "polite",
    "aggressive",
    "apologetic",
    "neutral",
  ]),
});

// Tool input schemas
export const SummarizeEmailInputSchema = z.object({
  text: z.string().min(1, "Email text is required"),
});

export const DraftReplyInputSchema = z.object({
  email: z.string().min(1, "Email content is required"),
  tone: z.string().optional().default("polite"),
});

export const RewriteReplyInputSchema = z.object({
  draft: z.string().min(1, "Email draft is required"),
  instruction: z.string().min(1, "Rewrite instruction is required"),
});

export const AnalyzeEmailInputSchema = z.object({
  emailContent: EmailContentSchema,
});

// Tool output schemas
export const SummarizeEmailOutputSchema = z.object({
  summary: z.string().min(1, "Summary is required"),
});

export const DraftReplyOutputSchema = z.object({
  reply: z.string().min(1, "Reply is required"),
});

export const RewriteReplyOutputSchema = z.object({
  reply: z.string().min(1, "Rewritten reply is required"),
});

export const AnalyzeEmailOutputSchema = AnalysisResultSchema;

// Type exports for TypeScript
export type EmailContent = z.infer<typeof EmailContentSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type SummarizeEmailInput = z.infer<typeof SummarizeEmailInputSchema>;
export type DraftReplyInput = z.infer<typeof DraftReplyInputSchema>;
export type RewriteReplyInput = z.infer<typeof RewriteReplyInputSchema>;
export type AnalyzeEmailInput = z.infer<typeof AnalyzeEmailInputSchema>;
export type SummarizeEmailOutput = z.infer<typeof SummarizeEmailOutputSchema>;
export type DraftReplyOutput = z.infer<typeof DraftReplyOutputSchema>;
export type RewriteReplyOutput = z.infer<typeof RewriteReplyOutputSchema>;
export type AnalyzeEmailOutput = z.infer<typeof AnalyzeEmailOutputSchema>;
