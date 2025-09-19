import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { callLLM } from "./llm.js";
import { summarizeEmailTool } from "./tools/summarizeEmail.js";
import { draftReplyTool } from "./tools/draftReply.js";
import { rewriteReplyTool } from "./tools/rewriteReply.js";
import { analyzeEmailTool } from "./tools/analyzeEmail.js";
import { intelligentChatTool } from "./tools/intelligentChat.js";
import {
  createContactTool,
  getContactTool,
  listContactsTool,
  updateContactTool,
  deleteContactTool,
  createMemoryTool,
  getMemoriesTool,
  getContactStatsTool,
  getGlobalStatsTool,
} from "./tools/contactTools.js";

// Load environment variables
dotenv.config();

// Direct LLM function for chat (bypasses MCP tools)
async function callLLMDirectly(prompt: string, context?: any): Promise<string> {
  let systemPrompt = `You are an AI assistant that helps manage emails, contacts, and email-related tasks. You can analyze email content, draft replies, manage contacts, and provide intelligent insights about email threads and conversations.

**Your Role:**
- Analyze email threads and provide actionable insights
- Help draft professional email replies with appropriate tone
- Manage contacts and create memories about people
- Suggest next steps and follow-up actions
- Understand email context and conversation flow

**Available tools (for reference):**
- Email Analysis: summarizeEmail, analyzeEmail, draftReply, rewriteReply
- Contact Management: createContact, getContact, listContacts, updateContact, deleteContact, createMemory, getMemories, getContactStats, getGlobalStats

**Instructions:**
- Provide helpful, actionable responses
- Be conversational and practical
- If you need to use specific tools, explain what you would do
- Respect user preferences for tone and length`;

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

  const fullPrompt = `${systemPrompt}\n\n**User Request:** ${prompt}\n\nPlease provide a helpful response.`;

  return await callLLM(fullPrompt);
}

// Create MCP server using the modern pattern
const server = new McpServer({
  name: "gmail-ai-server",
  version: "1.0.0",
});

server.tool(
  "summarizeEmail",
  summarizeEmailTool.description,
  summarizeEmailTool.inputSchema,
  summarizeEmailTool.annotations,
  summarizeEmailTool.handler
);

server.tool(
  "draftReply",
  draftReplyTool.description,
  draftReplyTool.inputSchema,
  draftReplyTool.annotations,
  draftReplyTool.handler
);

server.tool(
  "rewriteReply",
  rewriteReplyTool.description,
  rewriteReplyTool.inputSchema,
  rewriteReplyTool.annotations,
  rewriteReplyTool.handler
);

server.tool(
  "analyzeEmail",
  analyzeEmailTool.description,
  analyzeEmailTool.inputSchema,
  analyzeEmailTool.annotations,
  analyzeEmailTool.handler
);

server.tool(
  "intelligentChat",
  intelligentChatTool.description,
  {
    prompt: z.string().min(1, "Prompt is required"),
    context: z
      .object({
        emailThread: z.string().optional(),
        emailId: z.string().optional(),
        currentDraft: z.string().optional(),
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
      .optional(),
  },
  intelligentChatTool.annotations,
  intelligentChatTool.handler
);

server.tool(
  "createContact",
  createContactTool.description,
  createContactTool.inputSchema,
  createContactTool.annotations,
  createContactTool.handler
);

server.tool(
  "getContact",
  getContactTool.description,
  getContactTool.inputSchema,
  getContactTool.annotations,
  getContactTool.handler
);

server.tool(
  "listContacts",
  listContactsTool.description,
  listContactsTool.inputSchema,
  listContactsTool.annotations,
  listContactsTool.handler
);

server.tool(
  "updateContact",
  updateContactTool.description,
  updateContactTool.inputSchema,
  updateContactTool.annotations,
  updateContactTool.handler
);

server.tool(
  "deleteContact",
  deleteContactTool.description,
  deleteContactTool.inputSchema,
  deleteContactTool.annotations,
  deleteContactTool.handler
);

server.tool(
  "createMemory",
  createMemoryTool.description,
  createMemoryTool.inputSchema,
  createMemoryTool.annotations,
  createMemoryTool.handler
);

server.tool(
  "getMemories",
  getMemoriesTool.description,
  getMemoriesTool.inputSchema,
  getMemoriesTool.annotations,
  getMemoriesTool.handler
);

server.tool(
  "getContactStats",
  getContactStatsTool.description,
  getContactStatsTool.inputSchema,
  getContactStatsTool.annotations,
  getContactStatsTool.handler
);

server.tool(
  "getGlobalStats",
  getGlobalStatsTool.description,
  getGlobalStatsTool.inputSchema,
  getGlobalStatsTool.annotations,
  getGlobalStatsTool.handler
);

// Start the server
async function main() {
  const mode = process.env.MCP_MODE || "stdio";

  if (mode === "streaming-http") {
    // Streaming HTTP mode using StreamableHTTPServerTransport
    const port = process.env.PORT || 4000;
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true, // Enable JSON responses for easier testing
    });

    // Create Express app for the streaming HTTP transport
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Handle MCP requests using the streaming transport
    app.post("/mcp", async (req, res) => {
      await transport.handleRequest(req, res, req.body);
    });

    // Add a direct chat endpoint (bypasses MCP tools)
    app.post("/prompt", async (req, res) => {
      try {
        const { prompt, context } = req.body;
        if (!prompt) {
          return res.status(400).json({ error: "Prompt is required" });
        }

        // Direct LLM call - no MCP tool overhead
        console.log("Calling LLM directly with prompt:", prompt);
        console.log("Calling LLM directly with context:", context);
        const response = await callLLMDirectly(prompt, context);

        res.json({
          success: true,
          response: response,
          prompt: prompt,
          contextProvided: context ? "Yes" : "No",
          emailId: context?.emailId || null,
          hasEmailThread: context?.emailThread ? "Yes" : "No",
          hasCurrentDraft: context?.currentDraft ? "Yes" : "No",
          conversationHistoryLength: context?.conversationHistory?.length || 0,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Internal server error", details: error.message });
      }
    });

    // Add a simple status endpoint
    app.get("/", (req, res) => {
      res.json({
        name: "Gmail AI MCP Server (Streaming HTTP)",
        version: "1.0.0",
        status: "running",
        transport: "streamable-http",
        tools: [
          "summarizeEmail",
          "draftReply",
          "rewriteReply",
          "analyzeEmail",
          "intelligentChat",
          "createContact",
          "getContact",
          "listContacts",
          "updateContact",
          "deleteContact",
          "createMemory",
          "getMemories",
          "getContactStats",
          "getGlobalStats",
        ],
        mcpEndpoint: "/mcp",
        promptEndpoint: "/prompt",
      });
    });

    // Connect the server to the transport
    await server.connect(transport);

    // Start the Express server
    app.listen(port, () => {
      console.log("🚀 Gmail AI MCP Server running on Streaming HTTP");
      console.log(`🌐 Server: http://localhost:${port}`);
      console.log(`🔗 MCP Endpoint: http://localhost:${port}/mcp`);
      console.log("📧 Available tools:");
      console.log("   Email Tools:");
      console.log("     - summarizeEmail: Summarize email content");
      console.log("     - draftReply: Draft email replies");
      console.log("     - rewriteReply: Rewrite email drafts");
      console.log("     - analyzeEmail: Analyze email content with insights");
      console.log("   Chat Tools:");
      console.log("     - intelligentChat: Process natural language prompts with email thread context");
      console.log("   Contact Tools:");
      console.log("     - createContact: Create a new contact");
      console.log("     - getContact: Get contact by email");
      console.log("     - listContacts: List all contacts");
      console.log("     - updateContact: Update contact information");
      console.log("     - deleteContact: Delete a contact");
      console.log("     - createMemory: Create a memory for a contact");
      console.log("     - getMemories: Get memories for a contact");
      console.log("     - getContactStats: Get contact statistics");
      console.log("     - getGlobalStats: Get global database stats");
      console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? "✅ Configured" : "❌ Missing"}`);
    });
  } else if (mode === "http") {
    // HTTP mode
    const app = express();
    const port = process.env.PORT || 4000;

    app.use(cors());
    app.use(express.json());

    // Add a simple status endpoint
    app.get("/", (req, res) => {
      res.json({
        name: "Gmail AI MCP Server",
        version: "1.0.0",
        status: "running",
        tools: [
          "summarizeEmail",
          "draftReply",
          "rewriteReply",
          "analyzeEmail",
          "intelligentChat",
          "createContact",
          "getContact",
          "listContacts",
          "updateContact",
          "deleteContact",
          "createMemory",
          "getMemories",
          "getContactStats",
          "getGlobalStats",
        ],
        mcpEndpoint: "/mcp",
      });
    });

    app.listen(port, () => {
      console.log("🚀 Gmail AI MCP Server running on HTTP");
      console.log(`🌐 Server: http://localhost:${port}`);
      console.log(`🔗 MCP Endpoint: http://localhost:${port}/mcp`);
      console.log("📧 Available tools:");
      console.log("   Email Tools:");
      console.log("     - summarizeEmail: Summarize email content");
      console.log("     - draftReply: Draft email replies");
      console.log("     - rewriteReply: Rewrite email drafts");
      console.log("     - analyzeEmail: Analyze email content with insights");
      console.log("   Chat Tools:");
      console.log("     - intelligentChat: Process natural language prompts with email thread context");
      console.log("   Contact Tools:");
      console.log("     - createContact: Create a new contact");
      console.log("     - getContact: Get contact by email");
      console.log("     - listContacts: List all contacts");
      console.log("     - updateContact: Update contact information");
      console.log("     - deleteContact: Delete a contact");
      console.log("     - createMemory: Create a memory for a contact");
      console.log("     - getMemories: Get memories for a contact");
      console.log("     - getContactStats: Get contact statistics");
      console.log("     - getGlobalStats: Get global database stats");
      console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? "✅ Configured" : "❌ Missing"}`);
    });
  } else {
    // Stdio mode (default)
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("🚀 Gmail AI MCP Server running on stdio");
    console.log("📧 Available tools:");
    console.log("   - summarizeEmail: Summarize email content");
    console.log("   - draftReply: Draft email replies");
    console.log("   - rewriteReply: Rewrite email drafts");
    console.log("   - analyzeEmail: Analyze email content with insights");
    console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? "✅ Configured" : "❌ Missing"}`);
  }
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
