import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { spawn } from "child_process";
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

  // Track which tools were used during execution
  const toolsUsed: Array<{
    name: string;
    arguments: any;
    timestamp: string;
    success: boolean;
    error?: string;
  }> = [];

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

    const toolStartTime = new Date().toISOString();
    let toolSuccess = false;
    let toolError: string | undefined;

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
      toolSuccess = true;

      // Record tool usage before checking action protocol
      toolsUsed.push({
        name: functionName,
        arguments: functionArgs,
        timestamp: toolStartTime,
        success: toolSuccess,
      });

      // Check if the tool returned an action protocol - if so, return it directly
      if (toolResult.shouldPerformAction && toolResult.actionToPerform) {
        console.log("🔧 Tool returned action protocol, returning directly");

        // Create debugging info with proper deduplication
        const uniqueToolNames = [...new Set(toolsUsed.map((t) => t.name))];
        const debuggingInfo = {
          toolsExecuted: toolsUsed.length,
          toolsList: uniqueToolNames,
          executionSummary: toolsUsed.map((t) => `${t.name}${t.success ? " ✅" : " ❌"}`).join(", "),
        };

        return {
          content: toolResult.content,
          shouldPerformAction: toolResult.shouldPerformAction,
          actionToPerform: toolResult.actionToPerform,
          toolsUsed: toolsUsed,
          debuggingInfo: debuggingInfo,
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
      toolError = error instanceof Error ? error.message : String(error);
      // Record failed tool usage
      toolsUsed.push({
        name: functionName,
        arguments: functionArgs,
        timestamp: toolStartTime,
        success: false,
        error: toolError,
      });
      // Return error message instead of breaking
      return `Error calling tool ${functionName}: ${error}`;
    }
  }

  console.log("✅ Function calling complete, final message:", message?.content || "No content");

  // Return response with debugging information
  const finalResponse = message?.content || "No response generated";

  // Try to extract suggested actions from the response
  let suggestedActions = undefined;
  try {
    // Look for suggestedActions in the response text
    const suggestedActionsMatch = finalResponse.match(/suggestedActions:\s*(\[.*?\])/s);
    if (suggestedActionsMatch) {
      const actionsJson = suggestedActionsMatch[1];
      suggestedActions = JSON.parse(actionsJson);
      console.log("🎯 Found suggested actions:", suggestedActions);
    }
  } catch (error) {
    console.log("⚠️ Could not parse suggested actions:", error);
  }

  // If we have tools used, wrap the response with debugging info
  if (toolsUsed.length > 0) {
    const uniqueToolNames = [...new Set(toolsUsed.map((t) => t.name))];
    const debuggingInfo = {
      toolsExecuted: toolsUsed.length,
      toolsList: uniqueToolNames,
      executionSummary: toolsUsed.map((t) => `${t.name}${t.success ? " ✅" : " ❌"}`).join(", "),
    };

    return {
      content: finalResponse,
      suggestedActions: suggestedActions,
      toolsUsed: toolsUsed,
      debuggingInfo: debuggingInfo,
    };
  }

  return {
    content: finalResponse,
    suggestedActions: suggestedActions,
  };
}

// Streaming version of callLLMWithTools
async function* callLLMWithToolsStream(
  prompt: string,
  functions: any[],
  systemPrompt: string,
  server: any
): AsyncGenerator<{ type: string; data: any }, void, unknown> {
  const model = process.env.OPENAI_MODEL || "gpt-4";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  // Track which tools were used during execution
  const toolsUsed: Array<{
    name: string;
    arguments: any;
    timestamp: string;
    success: boolean;
    error?: string;
  }> = [];

  console.log(
    "🔧 Calling OpenAI with functions (streaming):",
    functions.map((f) => f.name)
  );

  // Stream the initial LLM response
  let response = await openai.chat.completions.create({
    model,
    messages,
    functions,
    function_call: "auto",
    stream: true,
  });

  let message = "";
  let functionCall: any = null;
  let functionCallBuffer = "";

  for await (const chunk of response) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;

    // Handle content streaming - this gives immediate feedback
    if (delta.content) {
      message += delta.content;
      yield { type: "content", data: delta.content };
    }

    // Handle function call streaming
    if (delta.function_call) {
      if (delta.function_call.name) {
        functionCall = {
          name: delta.function_call.name,
          arguments: "",
        };
        yield { type: "function_call_start", data: { name: delta.function_call.name } };
      }

      if (delta.function_call.arguments) {
        functionCallBuffer += delta.function_call.arguments;
        yield { type: "function_call_chunk", data: delta.function_call.arguments };
      }
    }
  }

  // If we have a complete function call, process it
  if (functionCall && functionCallBuffer) {
    const functionArgs = JSON.parse(functionCallBuffer);
    const functionName = functionCall.name;
    const toolStartTime = new Date().toISOString();
    let toolSuccess = false;
    let toolError: string | undefined;

    try {
      yield { type: "function_call_complete", data: { name: functionName, arguments: functionArgs } };

      console.log(`🔧 Calling tool: ${functionName}`, functionArgs);

      // Call the MCP tool
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
      toolSuccess = true;

      // Record tool usage before checking action protocol
      toolsUsed.push({
        name: functionName,
        arguments: functionArgs,
        timestamp: toolStartTime,
        success: toolSuccess,
      });

      // Check if the tool returned an action protocol
      if (toolResult.shouldPerformAction && toolResult.actionToPerform) {
        const uniqueToolNames = [...new Set(toolsUsed.map((t) => t.name))];
        const debuggingInfo = {
          toolsExecuted: toolsUsed.length,
          toolsList: uniqueToolNames,
          executionSummary: toolsUsed.map((t) => `${t.name}${t.success ? " ✅" : " ❌"}`).join(", "),
        };

        yield {
          type: "action_protocol",
          data: {
            content: toolResult.content,
            shouldPerformAction: toolResult.shouldPerformAction,
            actionToPerform: toolResult.actionToPerform,
            toolsUsed: toolsUsed,
            debuggingInfo: debuggingInfo,
          },
        };
        return;
      }

      // Add function result to messages and continue conversation
      messages.push({
        role: "assistant",
        content: null,
        function_call: {
          name: functionName,
          arguments: functionCallBuffer,
        },
      });

      messages.push({
        role: "function",
        name: functionName,
        content: JSON.stringify(toolResult),
      });

      // Get final response from LLM with streaming
      const finalResponse = await openai.chat.completions.create({
        model,
        messages,
        functions,
        function_call: "auto",
        stream: true,
      });

      let finalMessage = "";
      for await (const chunk of finalResponse) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          finalMessage += delta.content;
          yield { type: "content", data: delta.content };
        }
      }

      // Try to extract suggested actions from the final message
      let suggestedActions = undefined;
      try {
        const suggestedActionsMatch = finalMessage.match(/suggestedActions:\s*(\[.*?\])/s);
        if (suggestedActionsMatch) {
          const actionsJson = suggestedActionsMatch[1];
          suggestedActions = JSON.parse(actionsJson);
          console.log("🎯 Found suggested actions in stream:", suggestedActions);
        }
      } catch (error) {
        console.log("⚠️ Could not parse suggested actions in stream:", error);
      }

      const uniqueToolNames = [...new Set(toolsUsed.map((t) => t.name))];
      const debuggingInfo = {
        toolsExecuted: toolsUsed.length,
        toolsList: uniqueToolNames,
        executionSummary: toolsUsed.map((t) => `${t.name}${t.success ? " ✅" : " ❌"}`).join(", "),
      };

      yield {
        type: "complete",
        data: {
          message: finalMessage,
          suggestedActions: suggestedActions,
          toolsUsed: toolsUsed,
          debuggingInfo: debuggingInfo,
        },
      };
    } catch (error: any) {
      console.error(`❌ Error calling tool ${functionCall.name}:`, error);
      toolError = error instanceof Error ? error.message : String(error);
      // Record failed tool usage
      toolsUsed.push({
        name: functionName,
        arguments: functionArgs,
        timestamp: toolStartTime,
        success: false,
        error: toolError,
      });
      yield { type: "error", data: { error: error.message } };
    }
  } else {
    // No function call, try to extract suggested actions from the message
    let suggestedActions = undefined;
    try {
      const suggestedActionsMatch = message.match(/suggestedActions:\s*(\[.*?\])/s);
      if (suggestedActionsMatch) {
        const actionsJson = suggestedActionsMatch[1];
        suggestedActions = JSON.parse(actionsJson);
        console.log("🎯 Found suggested actions in stream (no tools):", suggestedActions);
      }
    } catch (error) {
      console.log("⚠️ Could not parse suggested actions in stream (no tools):", error);
    }

    yield { type: "complete", data: { message, suggestedActions } };
  }
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
// Function to run protocol tests in the background
function runProtocolTestsInBackground(port: number) {
  // Check if auto-tests are disabled
  if (process.env.DISABLE_AUTO_TESTS === "true") {
    console.log("🧪 Auto protocol tests disabled (DISABLE_AUTO_TESTS=true)");
    return;
  }

  // Wait a bit for the server to fully start
  setTimeout(() => {
    console.log("🧪 Running protocol tests in background...");

    const testProcess = spawn("npm", ["run", "test:protocol"], {
      stdio: "pipe",
      shell: true,
    });

    testProcess.stdout?.on("data", (data) => {
      const output = data.toString();
      // Only show test results, not the full output
      if (output.includes("✅") || output.includes("❌") || output.includes("🎉")) {
        console.log(`[TESTS] ${output.trim()}`);
      }
    });

    testProcess.stderr?.on("data", (data) => {
      const error = data.toString();
      if (error.includes("Error") || error.includes("Failed")) {
        console.log(`[TESTS] ${error.trim()}`);
      }
    });

    testProcess.on("close", (code) => {
      if (code === 0) {
        console.log("🎉 [TESTS] All protocol tests passed!");
      } else {
        console.log(`❌ [TESTS] Protocol tests failed with code ${code}`);
      }
    });

    testProcess.on("error", (error) => {
      console.log(`❌ [TESTS] Failed to run protocol tests: ${error.message}`);
    });
  }, 2000); // Wait 2 seconds for server to start
}

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
    
    🎯 CRITICAL: SUGGESTED ACTIONS FOR CLARIFICATION:
    When the user's request is ambiguous, vague, or needs clarification, you MUST provide "suggestedActions" instead of asking questions or making assumptions.
    
    🚨 NEVER ask "How would you like to..." or "What would you like to..." - ALWAYS provide suggested actions!
    
    AMBIGUOUS PROMPTS THAT REQUIRE SUGGESTED ACTIONS:
    - "make it better" → provide improvement options
    - "help me with this" → provide relevant actions  
    - "what should I do" → provide action options
    - "improve this" → provide improvement options
    - "change the tone" → provide tone options
    - "fix this" → provide fix options
    - "enhance it" → provide enhancement options
    
    🚨 MANDATORY FORMAT: End your response with:
    suggestedActions: [
      {"label": "Action Name", "prompt": "exact prompt to send", "description": "what this does"}
    ]
    
    EXAMPLE RESPONSE for "help me with this":
    I can help you with your email draft in several ways:
    
    suggestedActions: [
      {"label": "Make it shorter", "prompt": "make the draft shorter and more concise", "description": "Condense the current draft"},
      {"label": "Make it longer", "prompt": "make the draft longer with more details", "description": "Expand the current draft"},
      {"label": "Make it more formal", "prompt": "make the draft more formal and professional", "description": "Change tone to more formal"},
      {"label": "Make it more casual", "prompt": "make the draft more casual and friendly", "description": "Change tone to more casual"}
    ]
    
    🚨 VAGUE REQUESTS RULE: If the user says "make it better", "improve this", "help me", "what should I do", "I need options" - DO NOT use tools, provide suggestedActions instead!
    
    🚨 MOST IMPORTANT RULE: If the user has a currentDraft and asks to "make it shorter", they want to modify that draft, NOT summarize an email! Use rewriteReply tool in this case.
    
    🚨 SEMANTIC CLARIFICATION: 
    - "make it shorter" + currentDraft = rewrite/condense the draft (use rewriteReply)
    - "make it shorter" + no currentDraft = summarize the email (use summarizeEmail)
    - "summarize" = always summarize (use summarizeEmail)
    - "rewrite" = always rewrite (use rewriteReply)
    
    🚨 CRITICAL TOOL SELECTION RULES 🚨
    When a user asks you to draft a reply, analyze an email, or summarize content, you MUST use the appropriate tools:
    
    📝 DRAFT REPLY: If the user says "draft reply", "write a response", "reply to this", or similar - ALWAYS use the draftReply tool
    📊 SUMMARIZE: If the user says "summarize", "key points", "what's this about" - use the summarizeEmail tool  
    🔍 ANALYZE: If the user says "analyze this email", "what does this email say" - use the analyzeEmail tool
    ✏️ REWRITE: If the user says "rewrite", "make this better", "improve this" - use the rewriteReply tool
    
    🚨 CONTEXT-AWARE PRIORITY RULES 🚨
    **IF THE USER HAS A CURRENT DRAFT OPEN:**
    - Give HIGHEST PRIORITY to draft-related operations
    - "make it shorter" → ALWAYS use rewriteReply (modify the current draft)
    - "rewrite", "improve", "make it better" → use rewriteReply (modify the current draft)
    - "summarize" → use summarizeEmail (summarize the original email being replied to)
    - "draft reply" → use draftReply (create a new reply)
    
    **IF NO CURRENT DRAFT:**
    - "make it shorter", "summarize", "key points" → use summarizeEmail (summarize the email being viewed)
    - "draft reply", "write a response" → use draftReply (create a new reply)
    - "analyze this email" → use analyzeEmail
    
    **CRITICAL DISAMBIGUATION:**
    - "make it shorter" + currentDraft present = rewriteReply (modify draft)
    - "make it shorter" + no currentDraft = summarizeEmail (summarize email)
    
    🚨 CRITICAL: When using tools, you MUST use the EXACT email content from the Email Thread context below, not create your own version! 
    DO NOT make up or modify the email content - use it exactly as provided in the Email Thread section.
    
    The user's request was: "${prompt}"
    
    🚨 FINAL DECISION RULE 🚨
    Before selecting a tool, ask yourself:
    1. Does the user have a currentDraft? ${context?.currentDraft ? "YES" : "NO"}
    2. Is the user asking to "make it shorter"? ${prompt.toLowerCase().includes("make it shorter") ? "YES" : "NO"}
    3. If both are YES, you MUST use rewriteReply tool!
    
    Based on this request and the context below, you MUST select the correct tool. Always use the tools when appropriate and provide helpful responses.`;

        // Add rich context if provided
        if (context) {
          if (context.emailThread) {
            systemPrompt += `\n\n**Email Thread:**\n${context.emailThread}\n\n🚨 CRITICAL INSTRUCTION: When calling the draftReply tool, you MUST extract the email body text from the Email Thread above. Look for the line that starts with "Body:" and copy everything after it exactly as it appears. Do NOT create, modify, or paraphrase the email content. Use the original email text verbatim.`;
          }
          if (context.emailId) {
            systemPrompt += `\n\n**Email ID:** ${context.emailId}`;
          }
          if (context.currentDraft) {
            systemPrompt += `\n\n**🚨 USER IS EDITING A DRAFT 🚨**
**Current Draft:**\n${context.currentDraft}

**CRITICAL:** The user has a draft open and is likely asking to modify it. If they say "make it shorter", "rewrite", "improve", or similar, they want to modify THIS DRAFT, not summarize the original email. Use rewriteReply tool for draft modifications.`;
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
              "📊 SUMMARIZE EMAIL: Extract key bullet points and main topics from email content. Use when user asks to 'summarize', 'key points', or 'what's this about'. IMPORTANT: Only use this when NO currentDraft is present, or when user explicitly wants to summarize the original email being replied to.",
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
              "✏️ REWRITE REPLY: Improve and rewrite an existing email draft. Use when user asks to 'rewrite', 'make this better', 'improve this', or 'make it shorter'. IMPORTANT: This is the PRIMARY tool to use when user has a currentDraft and wants to modify it.",
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

        // Debug: Log the system prompt to see what's being sent
        console.log("🔍 System prompt being sent to LLM:");
        console.log(systemPrompt);
        console.log("🔍 User prompt:", prompt);
        console.log("🔍 Context:", JSON.stringify(context, null, 2));

        const response = await callLLMWithTools(prompt, functions, systemPrompt, server);

        // Check if the response contains action protocol (object)
        let responseData: any = { response };
        if (typeof response === "object" && response.shouldPerformAction && response.actionToPerform) {
          // Extract action protocol fields
          responseData = {
            response: response.content?.[0]?.text || response.content,
            shouldPerformAction: response.shouldPerformAction,
            actionToPerform: response.actionToPerform,
            suggestedActions: response.suggestedActions,
            // Include debugging info if available
            toolsUsed: response.toolsUsed || [],
            debuggingInfo: response.debuggingInfo || null,
          };
        } else if (typeof response === "object" && (response.toolsUsed || response.suggestedActions)) {
          // Handle responses with tool tracking, suggested actions, or both
          responseData = {
            response: response.content || response,
            suggestedActions: response.suggestedActions,
            toolsUsed: response.toolsUsed,
            debuggingInfo: response.debuggingInfo,
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

    // Streaming chat endpoint
    app.post("/chat/stream", async (req, res) => {
      try {
        const { prompt, context, conversationHistory } = req.body;
        if (!prompt) {
          return res.status(400).json({ error: "Prompt is required" });
        }

        // Set up Server-Sent Events
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Cache-Control",
        });

        // Build the same context-aware system prompt as the regular chat endpoint
        let systemPrompt = `You are an AI assistant that helps manage emails, contacts, and email-related tasks. You have access to various tools to:
    - Create, update, and manage contacts
    - Add and retrieve memories about contacts  
    - Get statistics and analytics
    - Summarize emails, draft replies, and analyze email content
    
    🚨 MOST IMPORTANT RULE: If the user has a currentDraft and asks to "make it shorter", they want to modify that draft, NOT summarize an email! Use rewriteReply tool in this case.
    
    🚨 SEMANTIC CLARIFICATION: 
    - "make it shorter" + currentDraft = rewrite/condense the draft (use rewriteReply)
    - "make it shorter" + no currentDraft = summarize the email (use summarizeEmail)
    - "summarize" = always summarize (use summarizeEmail)
    - "rewrite" = always rewrite (use rewriteReply)
    
    🚨 CRITICAL TOOL SELECTION RULES 🚨
    When a user asks you to draft a reply, analyze an email, or summarize content, you MUST use the appropriate tools:
    
    📝 DRAFT REPLY: If the user says "draft reply", "write a response", "reply to this", or similar - ALWAYS use the draftReply tool
    📊 SUMMARIZE: If the user says "summarize", "key points", "what's this about" - use the summarizeEmail tool  
    🔍 ANALYZE: If the user says "analyze this email", "what does this email say" - use the analyzeEmail tool
    ✏️ REWRITE: If the user says "rewrite", "make this better", "improve this" - use the rewriteReply tool
    
    🚨 CONTEXT-AWARE PRIORITY RULES 🚨
    **IF THE USER HAS A CURRENT DRAFT OPEN:**
    - Give HIGHEST PRIORITY to draft-related operations
    - "make it shorter" → ALWAYS use rewriteReply (modify the current draft)
    - "rewrite", "improve", "make it better" → use rewriteReply (modify the current draft)
    - "summarize" → use summarizeEmail (summarize the original email being replied to)
    - "draft reply" → use draftReply (create a new reply)
    
    **IF NO CURRENT DRAFT:**
    - "make it shorter", "summarize", "key points" → use summarizeEmail (summarize the email being viewed)
    - "draft reply", "write a response" → use draftReply (create a new reply)
    - "analyze this email" → use analyzeEmail
    
    **CRITICAL DISAMBIGUATION:**
    - "make it shorter" + currentDraft present = rewriteReply (modify draft)
    - "make it shorter" + no currentDraft = summarizeEmail (summarize email)
    
    🚨 CRITICAL: When using tools, you MUST use the EXACT email content from the Email Thread context below, not create your own version! 
    DO NOT make up or modify the email content - use it exactly as provided in the Email Thread section.
    
    The user's request was: "${prompt}"
    
    🚨 FINAL DECISION RULE 🚨
    Before selecting a tool, ask yourself:
    1. Does the user have a currentDraft? ${context?.currentDraft ? "YES" : "NO"}
    2. Is the user asking to "make it shorter"? ${prompt.toLowerCase().includes("make it shorter") ? "YES" : "NO"}
    3. If both are YES, you MUST use rewriteReply tool!
    
    Based on this request and the context below, you MUST select the correct tool. Always use the tools when appropriate and provide helpful responses.`;

        // Add rich context if provided (same as regular chat endpoint)
        if (context) {
          if (context.emailThread) {
            systemPrompt += `\n\n**Email Thread:**\n${context.emailThread}\n\n🚨 CRITICAL INSTRUCTION: When calling the draftReply tool, you MUST extract the email body text from the Email Thread above. Look for the line that starts with "Body:" and copy everything after it exactly as it appears. Do NOT create, modify, or paraphrase the email content. Use the original email text verbatim.`;
          }
          if (context.emailId) {
            systemPrompt += `\n\n**Email ID:** ${context.emailId}`;
          }
          if (context.currentDraft) {
            systemPrompt += `\n\n**🚨 USER IS EDITING A DRAFT 🚨**
**Current Draft:**\n${context.currentDraft}

**CRITICAL:** The user has a draft open and is likely asking to modify it. If they say "make it shorter", "rewrite", "improve", or similar, they want to modify THIS DRAFT, not summarize the original email. Use rewriteReply tool for draft modifications.`;
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

        // Define the same available tools as the regular chat endpoint
        const availableTools = [
          {
            name: "summarizeEmail",
            description:
              "📊 SUMMARIZE EMAIL: Extract key bullet points and main topics from email content. Use when user asks to 'summarize', 'key points', or 'what's this about'. IMPORTANT: Only use this when NO currentDraft is present, or when user explicitly wants to summarize the original email being replied to.",
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
              "✏️ REWRITE REPLY: Improve and rewrite an existing email draft. Use when user asks to 'rewrite', 'make this better', 'improve this', or 'make it shorter'. IMPORTANT: This is the PRIMARY tool to use when user has a currentDraft and wants to modify it.",
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

        // Send initial metadata
        res.write(
          `data: ${JSON.stringify({
            type: "metadata",
            data: {
              prompt,
              contextProvided: context ? "Yes" : "No",
              emailId: context?.emailId || null,
              hasEmailThread: context?.emailThread ? "Yes" : "No",
              hasCurrentDraft: context?.currentDraft ? "Yes" : "No",
              conversationHistoryLength: conversationHistory?.length || context?.conversationHistory?.length || 0,
            },
          })}\n\n`
        );

        // Stream the LLM response
        try {
          for await (const chunk of callLLMWithToolsStream(prompt, availableTools, systemPrompt, server)) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
        } catch (error: any) {
          res.write(
            `data: ${JSON.stringify({
              type: "error",
              data: { error: error.message },
            })}\n\n`
          );
        }

        // Send completion signal
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
      } catch (error: any) {
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            data: { error: "Internal server error", details: error.message },
          })}\n\n`
        );
        res.end();
      }
    });

    // Profile API endpoints
    app.get("/profile/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.getOrCreateProfile(userId);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to get profile", details: error.message });
      }
    });

    app.put("/profile/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        const { emailPreferences } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateProfile(userId, emailPreferences);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update profile", details: error.message });
      }
    });

    app.put("/profile/:userId/signoff", async (req, res) => {
      try {
        const { userId } = req.params;
        const { tone, signoff } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateSignoff(userId, tone, signoff);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update signoff", details: error.message });
      }
    });

    app.put("/profile/:userId/spacing", async (req, res) => {
      try {
        const { userId } = req.params;
        const { spacing } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateSpacing(userId, spacing);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update spacing", details: error.message });
      }
    });

    app.put("/profile/:userId/defaults", async (req, res) => {
      try {
        const { userId } = req.params;
        const { defaults } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateDefaults(userId, defaults);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update defaults", details: error.message });
      }
    });

    app.put("/profile/:userId/signature", async (req, res) => {
      try {
        const { userId } = req.params;
        const { signature } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateSignature(userId, signature);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update signature", details: error.message });
      }
    });

    app.put("/profile/:userId/names", async (req, res) => {
      try {
        const { userId } = req.params;
        const { names } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateNames(userId, names);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update names", details: error.message });
      }
    });

    app.delete("/profile/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        await profileService.deleteProfile(userId);
        res.json({
          success: true,
          message: "Profile deleted successfully",
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to delete profile", details: error.message });
      }
    });

    app.post("/profile/:userId/reset", async (req, res) => {
      try {
        const { userId } = req.params;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.resetProfile(userId);
        res.json({
          success: true,
          profile: profile,
          message: "Profile reset to defaults",
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to reset profile", details: error.message });
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
        profileEndpoints: [
          "GET /profile/:userId - Get user profile",
          "PUT /profile/:userId - Update user profile",
          "PUT /profile/:userId/signoff - Update signoff for tone",
          "PUT /profile/:userId/spacing - Update spacing preferences",
          "PUT /profile/:userId/defaults - Update default preferences",
          "PUT /profile/:userId/signature - Update signature preferences",
          "PUT /profile/:userId/names - Update name preferences",
          "DELETE /profile/:userId - Delete user profile",
          "POST /profile/:userId/reset - Reset profile to defaults",
        ],
        mcpEndpoint: "/mcp",
        promptEndpoint: "/prompt",
        chatEndpoint: "/chat",
        streamingChatEndpoint: "/chat/stream",
      });
    });

    // Add streaming chat endpoint to streaming-http mode
    app.post("/chat/stream", async (req, res) => {
      try {
        const { prompt, context, conversationHistory } = req.body;
        if (!prompt) {
          return res.status(400).json({ error: "Prompt is required" });
        }

        // Set up Server-Sent Events
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Cache-Control",
        });

        // Build the same context-aware system prompt as the regular chat endpoint
        let systemPrompt = `You are an AI assistant that helps manage emails, contacts, and email-related tasks. You have access to various tools to:
    - Create, update, and manage contacts
    - Add and retrieve memories about contacts  
    - Get statistics and analytics
    - Summarize emails, draft replies, and analyze email content
    
    🚨 MOST IMPORTANT RULE: If the user has a currentDraft and asks to "make it shorter", they want to modify that draft, NOT summarize an email! Use rewriteReply tool in this case.
    
    🚨 SEMANTIC CLARIFICATION: 
    - "make it shorter" + currentDraft = rewrite/condense the draft (use rewriteReply)
    - "make it shorter" + no currentDraft = summarize the email (use summarizeEmail)
    - "summarize" = always summarize (use summarizeEmail)
    - "rewrite" = always rewrite (use rewriteReply)
    
    🚨 CRITICAL TOOL SELECTION RULES 🚨
    When a user asks you to draft a reply, analyze an email, or summarize content, you MUST use the appropriate tools:
    
    📝 DRAFT REPLY: If the user says "draft reply", "write a response", "reply to this", or similar - ALWAYS use the draftReply tool
    📊 SUMMARIZE: If the user says "summarize", "key points", "what's this about" - use the summarizeEmail tool  
    🔍 ANALYZE: If the user says "analyze this email", "what does this email say" - use the analyzeEmail tool
    ✏️ REWRITE: If the user says "rewrite", "make this better", "improve this" - use the rewriteReply tool
    
    🚨 CONTEXT-AWARE PRIORITY RULES 🚨
    **IF THE USER HAS A CURRENT DRAFT OPEN:**
    - Give HIGHEST PRIORITY to draft-related operations
    - "make it shorter" → ALWAYS use rewriteReply (modify the current draft)
    - "rewrite", "improve", "make it better" → use rewriteReply (modify the current draft)
    - "summarize" → use summarizeEmail (summarize the original email being replied to)
    - "draft reply" → use draftReply (create a new reply)
    
    **IF NO CURRENT DRAFT:**
    - "make it shorter", "summarize", "key points" → use summarizeEmail (summarize the email being viewed)
    - "draft reply", "write a response" → use draftReply (create a new reply)
    - "analyze this email" → use analyzeEmail
    
    **CRITICAL DISAMBIGUATION:**
    - "make it shorter" + currentDraft present = rewriteReply (modify draft)
    - "make it shorter" + no currentDraft = summarizeEmail (summarize email)
    
    🚨 CRITICAL: When using tools, you MUST use the EXACT email content from the Email Thread context below, not create your own version! 
    DO NOT make up or modify the email content - use it exactly as provided in the Email Thread section.
    
    The user's request was: "${prompt}"
    
    🚨 FINAL DECISION RULE 🚨
    Before selecting a tool, ask yourself:
    1. Does the user have a currentDraft? ${context?.currentDraft ? "YES" : "NO"}
    2. Is the user asking to "make it shorter"? ${prompt.toLowerCase().includes("make it shorter") ? "YES" : "NO"}
    3. If both are YES, you MUST use rewriteReply tool!
    
    Based on this request and the context below, you MUST select the correct tool. Always use the tools when appropriate and provide helpful responses.`;

        // Add rich context if provided (same as regular chat endpoint)
        if (context) {
          if (context.emailThread) {
            systemPrompt += `\n\n**Email Thread:**\n${context.emailThread}\n\n🚨 CRITICAL INSTRUCTION: When calling the draftReply tool, you MUST extract the email body text from the Email Thread above. Look for the line that starts with "Body:" and copy everything after it exactly as it appears. Do NOT create, modify, or paraphrase the email content. Use the original email text verbatim.`;
          }
          if (context.emailId) {
            systemPrompt += `\n\n**Email ID:** ${context.emailId}`;
          }
          if (context.currentDraft) {
            systemPrompt += `\n\n**🚨 USER IS EDITING A DRAFT 🚨**
**Current Draft:**\n${context.currentDraft}

**CRITICAL:** The user has a draft open and is likely asking to modify it. If they say "make it shorter", "rewrite", "improve", or similar, they want to modify THIS DRAFT, not summarize the original email. Use rewriteReply tool for draft modifications.`;
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

        // Define the same available tools as the regular chat endpoint
        const availableTools = [
          {
            name: "summarizeEmail",
            description:
              "📊 SUMMARIZE EMAIL: Extract key bullet points and main topics from email content. Use when user asks to 'summarize', 'key points', or 'what's this about'. IMPORTANT: Only use this when NO currentDraft is present, or when user explicitly wants to summarize the original email being replied to.",
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
              "✏️ REWRITE REPLY: Improve and rewrite an existing email draft. Use when user asks to 'rewrite', 'make this better', 'improve this', or 'make it shorter'. IMPORTANT: This is the PRIMARY tool to use when user has a currentDraft and wants to modify it.",
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

        // Send initial metadata
        res.write(
          `data: ${JSON.stringify({
            type: "metadata",
            data: {
              prompt,
              contextProvided: context ? "Yes" : "No",
              emailId: context?.emailId || null,
              hasEmailThread: context?.emailThread ? "Yes" : "No",
              hasCurrentDraft: context?.currentDraft ? "Yes" : "No",
              conversationHistoryLength: conversationHistory?.length || context?.conversationHistory?.length || 0,
            },
          })}\n\n`
        );

        // Stream the LLM response
        try {
          for await (const chunk of callLLMWithToolsStream(prompt, availableTools, systemPrompt, server)) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
        } catch (error: any) {
          res.write(
            `data: ${JSON.stringify({
              type: "error",
              data: { error: error.message },
            })}\n\n`
          );
        }

        // Send completion signal
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
      } catch (error: any) {
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            data: { error: "Internal server error", details: error.message },
          })}\n\n`
        );
        res.end();
      }
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

      // Run protocol tests in background
      runProtocolTestsInBackground(Number(port));
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
        promptEndpoint: "/prompt",
        chatEndpoint: "/chat",
        profileEndpoints: [
          "GET /profile/:userId - Get user profile",
          "PUT /profile/:userId - Update user profile",
          "PUT /profile/:userId/signoff - Update signoff for tone",
          "PUT /profile/:userId/spacing - Update spacing preferences",
          "PUT /profile/:userId/defaults - Update default preferences",
          "PUT /profile/:userId/signature - Update signature preferences",
          "PUT /profile/:userId/names - Update name preferences",
          "DELETE /profile/:userId - Delete user profile",
          "POST /profile/:userId/reset - Reset profile to defaults",
        ],
      });
    });

    // Profile API endpoints
    app.get("/profile/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.getOrCreateProfile(userId);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to get profile", details: error.message });
      }
    });

    app.put("/profile/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        const { emailPreferences } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateProfile(userId, emailPreferences);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update profile", details: error.message });
      }
    });

    app.put("/profile/:userId/signoff", async (req, res) => {
      try {
        const { userId } = req.params;
        const { tone, signoff } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateSignoff(userId, tone, signoff);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update signoff", details: error.message });
      }
    });

    app.put("/profile/:userId/spacing", async (req, res) => {
      try {
        const { userId } = req.params;
        const { spacing } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateSpacing(userId, spacing);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update spacing", details: error.message });
      }
    });

    app.put("/profile/:userId/defaults", async (req, res) => {
      try {
        const { userId } = req.params;
        const { defaults } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateDefaults(userId, defaults);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update defaults", details: error.message });
      }
    });

    app.put("/profile/:userId/signature", async (req, res) => {
      try {
        const { userId } = req.params;
        const { signature } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateSignature(userId, signature);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update signature", details: error.message });
      }
    });

    app.put("/profile/:userId/names", async (req, res) => {
      try {
        const { userId } = req.params;
        const { names } = req.body;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.updateNames(userId, names);
        res.json({
          success: true,
          profile: profile,
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update names", details: error.message });
      }
    });

    app.delete("/profile/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        await profileService.deleteProfile(userId);
        res.json({
          success: true,
          message: "Profile deleted successfully",
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to delete profile", details: error.message });
      }
    });

    app.post("/profile/:userId/reset", async (req, res) => {
      try {
        const { userId } = req.params;
        const profileService = new (await import("./services/profileService.js")).ProfileService();

        const profile = await profileService.resetProfile(userId);
        res.json({
          success: true,
          profile: profile,
          message: "Profile reset to defaults",
        });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to reset profile", details: error.message });
      }
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

      // Run protocol tests in background
      runProtocolTestsInBackground(Number(port));
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
