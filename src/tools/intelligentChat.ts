import { z } from "zod";
import { callLLM } from "../llm.js";
import { ContactsService } from "../services/contactsService.js";

const contactsService = new ContactsService();

// Schema for the intelligent chat tool
const IntelligentChatInputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  context: z
    .object({
      emailThread: z.string().optional().describe("Email thread content to analyze"),
      emailId: z.string().optional().describe("Unique identifier for the email"),
      currentDraft: z.string().optional().describe("Current draft content if editing"),
      userPreferences: z
        .object({
          tone: z.enum(["professional", "casual", "formal"]).optional(),
          length: z.enum(["brief", "detailed"]).optional(),
        })
        .optional(),
      conversationHistory: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
            timestamp: z.string(),
          })
        )
        .optional(),
    })
    .optional()
    .describe("Rich context about the email and conversation"),
});

export const intelligentChatTool = {
  name: "intelligentChat",
  title: "Intelligent Chat",
  description:
    "Process natural language prompts and intelligently use available tools to help with email and contact management tasks",
  inputSchema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        minLength: 1,
        description: "The user's natural language prompt or request",
      },
      emailThread: {
        type: "string",
        description: "Optional email thread content to analyze",
      },
      context: {
        type: "string",
        description: "Additional context about the conversation",
      },
    },
    required: ["prompt"],
    additionalProperties: false,
    $schema: "http://json-schema.org/draft-07/schema#",
  },
  annotations: {
    readOnlyHint: false,
    idempotentHint: false,
    destructiveHint: false,
    openWorldHint: true,
  },
  handler: async ({ prompt, context }: { prompt: string; context?: any }) => {
    console.log("intelligentChatTool handler called with prompt:", prompt);
    console.log("intelligentChatTool handler called with context:", context);
    try {
      // Build the context for the LLM
      let systemPrompt = `You are an AI assistant that helps manage emails, contacts, and email-related tasks. You can analyze email content, draft replies, manage contacts, and provide intelligent insights about email threads and conversations.

**Your Role:**
- Analyze email threads and provide actionable insights
- Help draft professional email replies with appropriate tone
- Manage contacts and create memories about people
- Suggest next steps and follow-up actions
- Understand email context and conversation flow

Available tools:
1. **Email Analysis Tools:**
   - summarizeEmail: Summarize email content into key bullet points
   - analyzeEmail: Analyze email content with structured insights (summary, main points, actions, priority, category, sentiment, tone)
   - draftReply: Draft email replies with specified tone
   - rewriteReply: Rewrite email drafts according to instructions

2. **Contact Management Tools:**
   - createContact: Create a new contact (email, name, avatar)
   - getContact: Get contact details by email
   - listContacts: List all contacts with optional limit
   - updateContact: Update contact information
   - deleteContact: Delete a contact and all associated data
   - createMemory: Create a memory for a contact (text, type, priority, due date)
   - getMemories: Get memories for a contact with optional filters
   - getContactStats: Get statistics for a specific contact
   - getGlobalStats: Get global database statistics

**Instructions:**
- Analyze the user's request and determine which tools would be most helpful
- For email-related requests, use the appropriate email analysis tools
- For contact management, use the contact tools
- You can use multiple tools in sequence if needed
- Always provide clear, actionable responses
- If the user asks about contacts or mentions email addresses, consider using contact tools
- If analyzing email content, use analyzeEmail for structured insights or summarizeEmail for simple summaries

**Response Format:**
Provide a helpful response that explains what you're doing and the results. Be conversational and practical.`;

      // Add rich context if provided
      if (context) {
        if (context.emailThread) {
          systemPrompt += `\n\n**Email Thread:**\n${context.emailThread}`;
        }

        if (context.emailId) {
          systemPrompt += `\n\n**Email ID:** ${context.emailId}`;
        }

        if (context.currentDraft) {
          systemPrompt += `\n\n**Current Draft:**\n${context.currentDraft}`;
        }

        if (context.userPreferences) {
          systemPrompt += `\n\n**User Preferences:**`;
          if (context.userPreferences.tone) {
            systemPrompt += `\n- Preferred tone: ${context.userPreferences.tone}`;
          }
          if (context.userPreferences.length) {
            systemPrompt += `\n- Preferred length: ${context.userPreferences.length}`;
          }
        }

        if (context.conversationHistory && context.conversationHistory.length > 0) {
          systemPrompt += `\n\n**Conversation History:**`;
          context.conversationHistory.forEach((msg: any, index: number) => {
            systemPrompt += `\n${msg.role}: ${msg.content}`;
          });
        }
      }

      // Create the full prompt
      const fullPrompt = `${systemPrompt}\n\n**User Request:** ${prompt}\n\nPlease analyze this request and provide a helpful response. If you need to use any tools, explain what you're doing and provide the results.`;

      // Call the LLM with the intelligent prompt
      const response = await callLLM(fullPrompt);

      // For now, return the LLM response directly
      // In the future, this could be enhanced to actually call the MCP tools
      // based on the LLM's analysis
      return {
        content: [{ type: "text" as const, text: response }],
      };
    } catch (error) {
      console.error("Error in intelligentChat:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: `I encountered an error processing your request: ${
              error instanceof Error ? error.message : "Unknown error"
            }. Please try again or rephrase your request.`,
          },
        ],
      };
    }
  },
};
