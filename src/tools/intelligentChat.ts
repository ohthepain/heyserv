import { z } from "zod";
import { callLLM } from "../llm.js";
import { draftReplyTool } from "./draftReply.js";
import { summarizeEmailTool } from "./summarizeEmail.js";
import { analyzeEmailTool } from "./analyzeEmail.js";
import { rewriteReplyTool } from "./rewriteReply.js";

// Schema for conversation history items
const ConversationItemSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.string(),
});

// Schema for email in thread
const ThreadEmailSchema = z.object({
  id: z.string(),
  subject: z.string(),
  sender: z.string(),
  time: z.string(),
  body: z.string(),
  messageIndex: z.number(),
});

// Helper function to sanitize email body
const sanitizeEmailBody = (body: string): string => {
  // Remove quoted content (everything after "On ... wrote:")
  const quotedMatch = body.match(/(?:On\s+.*\s+wrote:[\s\S]*$)/i);
  if (quotedMatch) {
    body = body.slice(0, quotedMatch.index).trim();
  }
  return body;
};

// Schema for current context
const CurrentContextSchema = z.object({
  selectedEmailId: z.string().optional(),
  threadEmails: z.array(ThreadEmailSchema).optional(),
  availableEmails: z.array(z.any()).optional(),
  userEmail: z.string().optional(),
  currentDraft: z
    .object({
      to: z.string(),
      cc: z.string(),
      bcc: z.string(),
      subject: z.string(),
      body: z.string(),
      mode: z.string(),
      originalEmailId: z.string(),
      lastUpdated: z.number(),
    })
    .optional(),
});

// Input schema for the intelligent chat tool
const IntelligentChatInputSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationHistory: z.array(ConversationItemSchema).default([]),
  currentContext: CurrentContextSchema.optional(),
});

// Schema for suggested actions
const SuggestedActionSchema = z.object({
  action: z.string(),
  description: z.string(),
  parameters: z.record(z.any()).optional(),
});

// Response schema
const IntelligentChatResponseSchema = z.object({
  response: z.string(),
  suggestedActions: z.array(SuggestedActionSchema).optional(),
  shouldPerformAction: z.boolean().optional(),
  actionToPerform: SuggestedActionSchema.optional(),
});

export const intelligentChatTool = {
  name: "intelligent_chat",
  title: "Intelligent Chat Assistant",
  description: "AI assistant that can chat and perform email operations",
  inputSchema: {
    message: z.string().min(1, "Message is required"),
    conversationHistory: z.array(ConversationItemSchema).default([]),
    currentContext: CurrentContextSchema.optional(),
  },
  annotations: {
    readOnlyHint: false, // Can suggest actions
    idempotentHint: false, // Different responses for same input
    destructiveHint: false, // Safe to use
    openWorldHint: false, // Uses provided context
  },
  handler: async ({
    message,
    conversationHistory = [],
    currentContext,
  }: {
    message: string;
    conversationHistory?: Array<{ role: string; content: string; timestamp: string }>;
    currentContext?: any;
  }) => {
    const validatedInput = IntelligentChatInputSchema.parse({
      message,
      conversationHistory,
      currentContext,
    });

    // Build conversation context
    const conversationContext = validatedInput.conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Build current context string
    let contextString = "No current context provided";

    if (validatedInput.currentContext) {
      const context = validatedInput.currentContext;
      const selectedEmailId = context.selectedEmailId;
      const threadEmails = context.threadEmails || [];
      const selectedEmail = threadEmails.find((email) => email.id === selectedEmailId);

      contextString = `Current Context:
- Selected Email ID: ${selectedEmailId || "None"}
- User Email: ${context.userEmail || "Unknown"}
- Thread: ${threadEmails.length} emails in conversation`;

      if (selectedEmail) {
        const sanitizedBody = sanitizeEmailBody(selectedEmail.body);
        contextString += `
|- Selected Email Details:
  * From: ${selectedEmail.sender}
  * Position in thread: ${selectedEmail.messageIndex}
  * Body: ${sanitizedBody.substring(0, 200)}${sanitizedBody.length > 200 ? "..." : ""}`;
      }

      if (threadEmails.length > 0) {
        contextString += `
|- Full Thread (${threadEmails.length} messages):`;
        threadEmails
          .sort((a, b) => a.messageIndex - b.messageIndex)
          .forEach((email) => {
            const isSelected = email.id === selectedEmailId ? " [SELECTED]" : "";
            const sanitizedBody = sanitizeEmailBody(email.body);
            contextString += `
  ${email.messageIndex}. ${email.sender}${isSelected}
     Body: ${sanitizedBody.substring(0, 100)}${sanitizedBody.length > 100 ? "..." : ""}`;
          });
      }
    }

    // Create the prompt for the AI
    const prompt = `You are an intelligent email assistant. You can help users with email-related tasks and suggest actions they can take.

${contextString}

${conversationContext ? `Previous conversation:\n${conversationContext}\n` : ""}

User's current message: "${validatedInput.message}"

IMPORTANT: The user has selected a specific email in a thread. When suggesting actions like draftReply, analyzeEmail, or summarizeEmail, use the selected email's content and context. The selected email is clearly marked in the thread above.

Available email operations you can suggest:
1. summarizeEmail - Summarize the selected email content
2. draftReply - Draft a complete reply to the selected email (considering the full thread context)
3. rewriteReply - Rewrite an email draft
4. analyzeEmail - Analyze the selected email content for insights

When suggesting actions, include the relevant email content in the parameters. For example:
- For draftReply: include the emailContent from the selected email (will generate a complete reply)
- For analyzeEmail: include the emailContent from the selected email
- For summarizeEmail: include the emailContent from the selected email

IMPORTANT: When suggesting draftReply, emphasize that it will generate a complete, professional email reply ready to send, not just a brief response.

CRITICAL DECISION LOGIC:
Analyze the user's message carefully to determine if they are:

1. **REQUESTING A SPECIFIC ACTION** (use shouldPerformAction: true + actionToPerform):
   - Direct commands: "Draft a reply", "Summarize this email", "Analyze this email"
   - Imperative language: "Write a response", "Create a draft", "Generate a summary"
   - Clear intent: "I need a reply to this", "Please draft something", "Can you summarize"
   - Question forms requesting action: "Can you draft a reply?", "Could you analyze this?"

2. **ASKING FOR ADVICE/OPTIONS** (use suggestedActions):
   - General questions: "What should I do?", "How should I respond?"
   - Seeking guidance: "What are my options?", "What would you recommend?"
   - Exploratory: "What can you help me with?", "Tell me about this email"

EXAMPLES OF SPECIFIC ACTION REQUESTS:
- "Draft a reply" → shouldPerformAction: true, actionToPerform: draftReply
- "Summarize this email" → shouldPerformAction: true, actionToPerform: summarizeEmail  
- "Analyze this email" → shouldPerformAction: true, actionToPerform: analyzeEmail
- "Can you draft a response?" → shouldPerformAction: true, actionToPerform: draftReply

EXAMPLES OF ADVICE REQUESTS:
- "What should I do?" → shouldPerformAction: false, suggestedActions: [multiple options]
- "How should I respond?" → shouldPerformAction: false, suggestedActions: [multiple options]
- "What are my options?" → shouldPerformAction: false, suggestedActions: [multiple options]

STRICT RULES:
1. If shouldPerformAction is true, NEVER include suggestedActions
2. If shouldPerformAction is false, NEVER include actionToPerform
3. Always include exactly one: either actionToPerform OR suggestedActions, never both

CRITICAL: Analyze the user's exact message for these patterns:
- "draft reply" or "draft a reply" → shouldPerformAction: true, actionToPerform with draftReply
- "summarize" or "summarize this email" → shouldPerformAction: true, actionToPerform with summarizeEmail
- "analyze" or "analyze this email" → shouldPerformAction: true, actionToPerform with analyzeEmail
- "what should I do" or "how should I respond" → shouldPerformAction: false, suggestedActions

Respond with a JSON object containing:
- "response": Your helpful response to the user
- "suggestedActions": Array of actions (ONLY if shouldPerformAction is false)
- "shouldPerformAction": Boolean indicating if you detected a specific action request
- "actionToPerform": The specific action to perform (ONLY if shouldPerformAction is true)

Each suggested action or actionToPerform should have:
- "action": The action name (e.g., "summarizeEmail", "draftReply")
- "description": What this action will do
- "parameters": Any parameters needed for the action

For draftReply actions, format the parameters EXACTLY like this:
{
  "parameters": {
    "draft": "Dear Jane,\n\nThank you for your email. I am available..."
  }
}

DO NOT include any metadata (Subject, From, Time) in the parameters. Just include the actual email body or draft text.

REMEMBER: If the user says "draft reply", set shouldPerformAction to true and use actionToPerform, NOT suggestedActions.`;

    try {
      let parsedResponse;

      // Post-process to ensure correct shouldPerformAction logic for specific commands
      const message = validatedInput.message.trim().toLowerCase();

      // Check if user wants to modify current draft
      const modifyDraftPattern =
        /\b(change|update|modify|revise|rewrite|make|adjust|improve|enhance|fix|correct)\b.*\b(draft|reply|response|email|tone|style|format|it|this|that)\b/i;
      const isModifyRequest = modifyDraftPattern.test(message) && validatedInput.currentContext?.currentDraft;

      // Handle specific commands first
      if (isModifyRequest && validatedInput.currentContext?.currentDraft) {
        console.log("Found modify request and a draft");
        // Extract just the body text from the current draft
        const currentDraft = validatedInput.currentContext.currentDraft;
        const currentDraftBody = typeof currentDraft === "string" ? currentDraft : currentDraft.body;
        const bodyMatch = currentDraftBody.match(/\n\n([\s\S]+)$/);
        const bodyText = bodyMatch ? bodyMatch[1].trim() : currentDraftBody;

        // Use rewriteReply tool to modify the current draft
        const rewriteResult = await rewriteReplyTool.handler({
          draft: bodyText,
          instruction: message,
        });

        // Parse the JSON response from rewriteReply tool
        const rewriteResponse = JSON.parse(rewriteResult.content[0].text);
        const updatedDraft = rewriteResponse.actionToPerform.parameters.draft;

        parsedResponse = {
          response: "I've updated the draft based on your instructions.",
          shouldPerformAction: true,
          actionToPerform: {
            action: "draftReply",
            description: "Updated draft based on your instructions",
            parameters: {
              draft: updatedDraft,
            },
          },
        };
        console.log("✓ Modified draft");
      } else if (message === "draft reply") {
        console.log("⚡ Processing: draft reply");
        const selectedEmail = validatedInput.currentContext?.threadEmails?.find(
          (email) => email.id === validatedInput.currentContext?.selectedEmailId
        );

        if (selectedEmail) {
          // Just pass the sanitized body text to reduce request size
          const bodyText = sanitizeEmailBody(selectedEmail.body);

          // Generate the draft using draftReply tool
          const draftResult = await draftReplyTool.handler({ email: bodyText });
          const draftText = draftResult.content[0].text;

          parsedResponse = {
            response: "Here's a draft reply to the selected email.",
            shouldPerformAction: true,
            actionToPerform: {
              action: "draftReply",
              description: "Draft a reply to the selected email",
              parameters: {
                draft: draftText,
              },
            },
          };
          console.log("✓ Draft reply");
        }
      } else if (message === "summarize" || message === "summarize email") {
        const selectedEmail = validatedInput.currentContext?.threadEmails?.find(
          (email) => email.id === validatedInput.currentContext?.selectedEmailId
        );

        if (selectedEmail) {
          // Just pass the sanitized body text to reduce request size
          const bodyText = sanitizeEmailBody(selectedEmail.body);

          // Generate the summary using summarizeEmail tool
          const summaryResult = await summarizeEmailTool.handler({ text: bodyText });
          const summaryText = summaryResult.content[0].text;

          parsedResponse = {
            response: "Here's a summary of the selected email.",
            shouldPerformAction: true,
            actionToPerform: {
              action: "summarizeEmail",
              description: "Summarize the selected email",
              parameters: {
                summary: summaryText,
              },
            },
          };
        }
      } else if (message === "analyze" || message === "analyze email") {
        const selectedEmail = validatedInput.currentContext?.threadEmails?.find(
          (email) => email.id === validatedInput.currentContext?.selectedEmailId
        );

        if (selectedEmail) {
          // Just pass the sanitized body text to reduce request size
          const bodyText = sanitizeEmailBody(selectedEmail.body);

          // Generate the analysis using analyzeEmail tool
          const analysisResult = await analyzeEmailTool.handler({
            emailContent: {
              subject: selectedEmail.subject,
              sender: selectedEmail.sender,
              body: bodyText,
            },
          });
          const analysisText = analysisResult.content[0].text;

          parsedResponse = {
            response: "Here's an analysis of the selected email.",
            shouldPerformAction: true,
            actionToPerform: {
              action: "analyzeEmail",
              description: "Analyze the selected email",
              parameters: {
                analysis: analysisText,
              },
            },
          };
        }
      } else {
        // Fallback to general chat handler
        const aiResponse = await callLLM(prompt);

        // Try to parse the AI response as JSON
        try {
          parsedResponse = JSON.parse(aiResponse);
        } catch (parseError) {
          // If parsing fails, wrap the response in the expected format
          parsedResponse = {
            response: aiResponse,
            suggestedActions: [],
            shouldPerformAction: false,
          };
        }
      }

      // Validate the response structure
      const validatedResponse = IntelligentChatResponseSchema.parse(parsedResponse);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(parsedResponse),
          },
        ],
      };
    } catch (error) {
      console.error("Error in intelligent chat:", error);

      // Fallback response
      const fallbackResponse = {
        response: "I'm sorry, I encountered an error processing your request. Please try again.",
        suggestedActions: [],
        shouldPerformAction: false,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(fallbackResponse),
          },
        ],
      };
    }
  },
};
