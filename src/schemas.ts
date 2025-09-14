import { z } from "zod";

// Email content schema for analyzeEmail
export const EmailContentSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  sender: z.string().email("Invalid sender email address"),
  recipients: z
    .object({
      to: z.array(z.string().email()).default([]),
      cc: z.array(z.string().email()).default([]),
      bcc: z.array(z.string().email()).default([]),
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
