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
import { OpenAI } from "openai";

// Load environment variables
dotenv.config();

// Direct LLM function for chat (bypasses MCP tools)
async function callLLMDirectly(prompt: string, context?: any, conversationHistory?: any[]): Promise<string> {
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

    // Add conversation history if provided separately
    if (conversationHistory && conversationHistory.length > 0) {
      systemPrompt += `\n\n**Conversation History:**`;
      conversationHistory.forEach((msg: any, index: number) => {
        systemPrompt += `\n${msg.role}: ${msg.content}`;
      });
    }

    // Also check if conversation history is embedded in context (backward compatibility)
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

async function callLLMWithTools(
  prompt: string,
  functions: any[],
  systemPrompt: string,
  server: any
): Promise<string | any> {
  const model = process.env.OPENAI_MODEL || "gpt-4";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  console.log(
    "🔧 Calling OpenAI with functions:",
    functions.map((f) => f.name)
  );

  let response = await openai.chat.completions.create({
    model,
    messages,
    functions,
    function_call: "auto",
  });

  let message = response.choices[0].message;
  console.log("🤖 LLM response:", message?.content || "No content");
  console.log("🔧 Function call:", message?.function_call);

  // Handle function calls
  while (message?.function_call) {
    console.log("🔄 Processing function call...");
    const functionName = message.function_call.name;
    const functionArgs = JSON.parse(message.function_call.arguments || "{}");

    console.log(`🔧 Calling tool: ${functionName}`, functionArgs);

    try {
      // Call the MCP tool via HTTP request to the /mcp endpoint
      const toolResponse = await fetch("http://localhost:4000/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: functionName,
            arguments: functionArgs,
          },
        }),
      });

      const toolResponseJson = await toolResponse.json();

      if (toolResponseJson.error) {
        throw new Error(`Tool call failed: ${toolResponseJson.error.message}`);
      }

      const toolResult = toolResponseJson.result;

      // Check if the tool returned an action protocol - if so, return it directly
      if (toolResult.shouldPerformAction && toolResult.actionToPerform) {
        console.log("🔧 Tool returned action protocol, returning directly");
        return {
          content: toolResult.content,
          shouldPerformAction: toolResult.shouldPerformAction,
          actionToPerform: toolResult.actionToPerform,
        };
      }

      // Add function result to messages for tools that don't have action protocol
      messages.push({
        role: "assistant",
        content: null,
        function_call: message.function_call,
      });

      messages.push({
        role: "function",
        name: functionName,
        content: JSON.stringify(toolResult),
      });

      // Get next response from LLM
      response = await openai.chat.completions.create({
        model,
        messages,
        functions,
        function_call: "auto",
      });

      message = response.choices[0].message;
    } catch (error) {
      console.error(`❌ Error calling tool ${functionName}:`, error);
      // Return error message instead of breaking
      return `Error calling tool ${functionName}: ${error}`;
    }
  }

  console.log("✅ Function calling complete, final message:", message?.content || "No content");
  return message?.content || "No response generated";
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
        const { prompt, context, conversationHistory } = req.body;
        if (!prompt) {
          return res.status(400).json({ error: "Prompt is required" });
        }

        // Direct LLM call - no MCP tool overhead
        console.log("Calling LLM directly with prompt:", prompt);
        console.log("Calling LLM directly with context:", context);
        console.log("Calling LLM directly with conversationHistory:", conversationHistory);
        const response = await callLLMDirectly(prompt, context, conversationHistory);

        res.json({
          success: true,
          response: response,
          prompt: prompt,
          contextProvided: context ? "Yes" : "No",
          emailId: context?.emailId || null,
          hasEmailThread: context?.emailThread ? "Yes" : "No",
          hasCurrentDraft: context?.currentDraft ? "Yes" : "No",
          conversationHistoryLength: conversationHistory?.length || context?.conversationHistory?.length || 0,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Internal server error", details: error.message });
      }
    });

    // Add a new endpoint for tool orchestration with context
    app.post("/chat", async (req, res) => {
      try {
        const { prompt, context, conversationHistory } = req.body;
        if (!prompt) {
          return res.status(400).json({ error: "Prompt is required" });
        }

        // Build context-aware system prompt
        let systemPrompt = `You are an AI assistant that helps manage emails, contacts, and email-related tasks. You have access to various tools to:
    - Create, update, and manage contacts
    - Add and retrieve memories about contacts  
    - Get statistics and analytics
    - Summarize emails, draft replies, and analyze email content
    
    🚨 CRITICAL TOOL SELECTION RULES 🚨
    When a user asks you to draft a reply, analyze an email, or summarize content, you MUST use the appropriate tools:
    
    📝 DRAFT REPLY: If the user says "draft reply", "write a response", "reply to this", or similar - ALWAYS use the draftReply tool
    📊 SUMMARIZE: If the user says "summarize", "key points", "what's this about" - use the summarizeEmail tool  
    🔍 ANALYZE: If the user says "analyze this email", "what does this email say" - use the analyzeEmail tool
    ✏️ REWRITE: If the user says "rewrite", "make this better", "improve this" - use the rewriteReply tool
    
    🚨 CRITICAL: When using tools, you MUST use the EXACT email content from the Email Thread context below, not create your own version! 
    DO NOT make up or modify the email content - use it exactly as provided in the Email Thread section.
    
    The user's request was: "${prompt}"
    
    Based on this request, you MUST select the correct tool. Always use the tools when appropriate and provide helpful responses.`;

        // Add rich context if provided
        if (context) {
          if (context.emailThread) {
            systemPrompt += `\n\n**Email Thread:**\n${context.emailThread}\n\n🚨 CRITICAL INSTRUCTION: When calling the draftReply tool, you MUST extract the email body text from the Email Thread above. Look for the line that starts with "Body:" and copy everything after it exactly as it appears. Do NOT create, modify, or paraphrase the email content. Use the original email text verbatim.`;
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
            context.conversationHistory.forEach((msg: any) => {
              systemPrompt += `\n${msg.role}: ${msg.content}`;
            });
          }
        }

        // Add conversation history if provided separately
        if (conversationHistory && conversationHistory.length > 0) {
          systemPrompt += `\n\n**Conversation History:**`;
          conversationHistory.forEach((msg: any) => {
            systemPrompt += `\n${msg.role}: ${msg.content}`;
          });
        }

        // Get tools and call LLM with function calling
        // Define the available tools (matching what's registered in the server)
        const availableTools = [
          {
            name: "summarizeEmail",
            description:
              "📊 SUMMARIZE EMAIL: Extract key bullet points and main topics from email content. Use when user asks to 'summarize', 'key points', or 'what's this about'. IMPORTANT: Use the actual email content from the Email Thread context.",
            parameters: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "The actual email text from the Email Thread context to summarize",
                },
              },
              required: ["text"],
            },
          },
          {
            name: "draftReply",
            description:
              "📝 DRAFT REPLY: Write a complete email reply to respond to an email. Use when user asks to 'draft reply', 'write a response', or 'reply to this'. IMPORTANT: Use the actual email content from the Email Thread context, not a made-up version.",
            parameters: {
              type: "object",
              properties: {
                email: {
                  type: "string",
                  description:
                    "Copy the email body text from the Email Thread context. Find the line starting with 'Body:' and copy everything after it exactly as written.",
                },
                tone: {
                  type: "string",
                  enum: ["professional", "casual", "formal"],
                  description: "The tone of the reply",
                },
              },
              required: ["email"],
            },
          },
          {
            name: "analyzeEmail",
            description:
              "🔍 ANALYZE EMAIL: Provide structured insights and analysis of email content. Use when user asks to 'analyze this email' or 'what does this email say'",
            parameters: {
              type: "object",
              properties: {
                emailContent: {
                  type: "object",
                  properties: {
                    subject: { type: "string" },
                    sender: { type: "string" },
                    recipients: { type: "object" },
                    body: { type: "string" },
                  },
                  required: ["subject", "sender", "recipients", "body"],
                },
              },
              required: ["emailContent"],
            },
          },
          {
            name: "rewriteReply",
            description:
              "✏️ REWRITE REPLY: Improve and rewrite an existing email draft. Use when user asks to 'rewrite', 'make this better', or 'improve this'",
            parameters: {
              type: "object",
              properties: {
                draft: { type: "string" },
                instruction: { type: "string" },
              },
              required: ["draft", "instruction"],
            },
          },
        ];

        const functions = availableTools;

        const response = await callLLMWithTools(prompt, functions, systemPrompt, server);

        // Check if the response contains action protocol (object)
        let responseData: any = { response };
        if (typeof response === "object" && response.shouldPerformAction && response.actionToPerform) {
          // Extract action protocol fields
          responseData = {
            response: response.content?.[0]?.text || response.content,
            shouldPerformAction: response.shouldPerformAction,
            actionToPerform: response.actionToPerform,
          };
        }

        res.json({
          success: true,
          ...responseData,
          prompt: prompt,
          contextProvided: context ? "Yes" : "No",
          emailId: context?.emailId || null,
          hasEmailThread: context?.emailThread ? "Yes" : "No",
          hasCurrentDraft: context?.currentDraft ? "Yes" : "No",
          conversationHistoryLength: conversationHistory?.length || context?.conversationHistory?.length || 0,
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
