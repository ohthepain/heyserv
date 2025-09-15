import { z } from "zod";
import { callLLM } from "../llm.js";

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

// Schema for current context
const CurrentContextSchema = z.object({
  selectedEmailId: z.string().optional(),
  threadEmails: z.array(ThreadEmailSchema).optional(),
  availableEmails: z.array(z.any()).optional(),
  userEmail: z.string().optional(),
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
        contextString += `
- Selected Email Details:
  * Subject: ${selectedEmail.subject}
  * From: ${selectedEmail.sender}
  * Time: ${selectedEmail.time}
  * Position in thread: ${selectedEmail.messageIndex}
  * Body: ${selectedEmail.body.substring(0, 200)}${selectedEmail.body.length > 200 ? "..." : ""}`;
      }

      if (threadEmails.length > 0) {
        contextString += `
- Full Thread (${threadEmails.length} messages):`;
        threadEmails
          .sort((a, b) => a.messageIndex - b.messageIndex)
          .forEach((email) => {
            const isSelected = email.id === selectedEmailId ? " [SELECTED]" : "";
            contextString += `
  ${email.messageIndex}. ${email.sender} (${email.time})${isSelected}
     Subject: ${email.subject}
     Body: ${email.body.substring(0, 100)}${email.body.length > 100 ? "..." : ""}`;
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
2. draftReply - Draft a reply to the selected email (considering the full thread context)
3. rewriteReply - Rewrite an email draft
4. analyzeEmail - Analyze the selected email content for insights

When suggesting actions, include the relevant email content in the parameters. For example:
- For draftReply: include the emailContent from the selected email
- For analyzeEmail: include the emailContent from the selected email
- For summarizeEmail: include the emailContent from the selected email

Respond with a JSON object containing:
- "response": Your helpful response to the user
- "suggestedActions": Array of actions you think the user might want to take (optional)
- "shouldPerformAction": Boolean indicating if you want to automatically perform an action (optional)
- "actionToPerform": The specific action to perform if shouldPerformAction is true (optional)

Each suggested action should have:
- "action": The action name (e.g., "summarizeEmail", "draftReply")
- "description": What this action will do
- "parameters": Any parameters needed for the action (include emailContent from selected email)

Be helpful, conversational, and suggest relevant actions based on the user's message and the selected email context.`;

    try {
      const aiResponse = await callLLM(prompt);

      // Try to parse the AI response as JSON
      let parsedResponse;
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

      // Validate the response structure
      const validatedResponse = IntelligentChatResponseSchema.parse(parsedResponse);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(validatedResponse, null, 2),
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
            text: JSON.stringify(fallbackResponse, null, 2),
          },
        ],
      };
    }
  },
};
