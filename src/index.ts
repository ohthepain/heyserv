import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { summarizeEmailTool, draftReplyTool, rewriteReplyTool, analyzeEmailTool } from "./tools/index.js";

// Load environment variables
dotenv.config();

// Create MCP server using the modern pattern
const server = new McpServer({
  name: "gmail-ai-server",
  version: "1.0.0",
});

// Register all tools
server.registerTool(
  summarizeEmailTool.name,
  {
    title: summarizeEmailTool.title,
    description: summarizeEmailTool.description,
    inputSchema: summarizeEmailTool.inputSchema,
    annotations: summarizeEmailTool.annotations,
  },
  summarizeEmailTool.handler
);

server.registerTool(
  draftReplyTool.name,
  {
    title: draftReplyTool.title,
    description: draftReplyTool.description,
    inputSchema: draftReplyTool.inputSchema,
    annotations: draftReplyTool.annotations,
  },
  draftReplyTool.handler
);

server.registerTool(
  rewriteReplyTool.name,
  {
    title: rewriteReplyTool.title,
    description: rewriteReplyTool.description,
    inputSchema: rewriteReplyTool.inputSchema,
    annotations: rewriteReplyTool.annotations,
  },
  rewriteReplyTool.handler
);

server.registerTool(
  analyzeEmailTool.name,
  {
    title: analyzeEmailTool.title,
    description: analyzeEmailTool.description,
    inputSchema: analyzeEmailTool.inputSchema,
    annotations: analyzeEmailTool.annotations,
  },
  analyzeEmailTool.handler
);

// Start the server
async function main() {
  const mode = process.env.MCP_MODE || "stdio";

  if (mode === "http") {
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
        tools: ["summarizeEmail", "draftReply", "rewriteReply", "analyzeEmail"],
        mcpEndpoint: "/mcp",
      });
    });

    // Handle MCP requests directly
    app.post("/mcp", async (req, res) => {
      try {
        const { jsonrpc, id, method, params } = req.body;

        if (jsonrpc !== "2.0") {
          return res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32600, message: "Invalid Request" },
            id: null,
          });
        }

        let result;

        switch (method) {
          case "initialize":
            result = {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: "gmail-ai-server",
                version: "1.0.0",
              },
            };
            break;

          case "tools/list":
            result = {
              tools: [
                {
                  name: "summarizeEmail",
                  title: "Summarize Email",
                  description: "Summarize email content into key points",
                  inputSchema: {
                    type: "object",
                    properties: {
                      emailContent: { type: "string", description: "The email content to summarize" },
                    },
                    required: ["emailContent"],
                  },
                  annotations: {
                    readOnlyHint: true,
                    idempotentHint: true,
                    destructiveHint: false,
                    openWorldHint: false,
                  },
                },
                {
                  name: "draftReply",
                  title: "Draft Reply",
                  description: "Draft email replies",
                  inputSchema: {
                    type: "object",
                    properties: {
                      emailContent: { type: "string", description: "The email content to reply to" },
                      tone: { type: "string", description: "The tone for the reply", default: "professional" },
                    },
                    required: ["emailContent"],
                  },
                  annotations: {
                    readOnlyHint: true,
                    idempotentHint: false,
                    destructiveHint: false,
                    openWorldHint: false,
                  },
                },
                {
                  name: "rewriteReply",
                  title: "Rewrite Reply",
                  description: "Rewrite email drafts",
                  inputSchema: {
                    type: "object",
                    properties: {
                      draft: { type: "string", description: "The email draft to rewrite" },
                      instruction: { type: "string", description: "Instructions for rewriting" },
                    },
                    required: ["draft", "instruction"],
                  },
                  annotations: {
                    readOnlyHint: true,
                    idempotentHint: false,
                    destructiveHint: false,
                    openWorldHint: false,
                  },
                },
                {
                  name: "analyzeEmail",
                  title: "Analyze Email",
                  description: "Analyze email content with insights",
                  inputSchema: {
                    type: "object",
                    properties: {
                      emailContent: {
                        type: "string",
                        description: "The email content to analyze (can be simple text or full email object)",
                      },
                      subject: {
                        type: "string",
                        description: "Email subject (optional, defaults to 'No Subject')",
                      },
                      sender: {
                        type: "string",
                        description: "Sender email (optional, defaults to 'unknown@example.com')",
                      },
                      bodyHtml: {
                        type: "string",
                        description: "HTML version of email body (optional)",
                      },
                    },
                    required: ["emailContent"],
                  },
                  annotations: {
                    readOnlyHint: true,
                    idempotentHint: true,
                    destructiveHint: false,
                    openWorldHint: false,
                  },
                },
              ],
            };
            break;

          case "tools/call":
            const { name, arguments: args } = params;

            // Import the tool handlers
            const { summarizeEmailTool, draftReplyTool, rewriteReplyTool, analyzeEmailTool } = await import(
              "./tools/index.js"
            );

            let tool;
            let mappedArgs = args;

            switch (name) {
              case "summarizeEmail":
                tool = summarizeEmailTool;
                // Map emailContent to email for consistency
                if (args.emailContent) {
                  mappedArgs = { email: args.emailContent };
                }
                break;
              case "draftReply":
                tool = draftReplyTool;
                // Map emailContent to email for consistency
                if (args.emailContent) {
                  mappedArgs = { email: args.emailContent, tone: args.tone };
                }
                break;
              case "rewriteReply":
                tool = rewriteReplyTool;
                break;
              case "analyzeEmail":
                tool = analyzeEmailTool;
                // Map simple string to emailContent object structure
                if (args.emailContent) {
                  if (typeof args.emailContent === "string") {
                    // If it's a simple string, wrap it in the expected structure
                    mappedArgs = {
                      emailContent: {
                        subject: args.subject || "No Subject",
                        sender: args.sender || "unknown@example.com",
                        body: args.emailContent,
                        bodyHtml: args.bodyHtml || args.emailContent,
                      },
                    };
                  } else {
                    // If it's already an object, use it as-is
                    mappedArgs = { emailContent: args.emailContent };
                  }
                }
                break;
              default:
                return res.status(400).json({
                  jsonrpc: "2.0",
                  error: { code: -32601, message: "Method not found" },
                  id,
                });
            }

            // Call the tool handler
            result = await tool.handler(mappedArgs);
            break;

          default:
            return res.status(400).json({
              jsonrpc: "2.0",
              error: { code: -32601, message: "Method not found" },
              id,
            });
        }

        res.json({
          jsonrpc: "2.0",
          id,
          result,
        });
      } catch (error) {
        console.error("Error handling MCP request:", error);
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
            data: error instanceof Error ? error.message : "Unknown error",
          },
          id: req.body.id || null,
        });
      }
    });

    app.listen(port, () => {
      console.log("🚀 Gmail AI MCP Server running on HTTP");
      console.log(`🌐 Server: http://localhost:${port}`);
      console.log(`🔗 MCP Endpoint: http://localhost:${port}/mcp`);
      console.log("📧 Available tools:");
      console.log("   - summarizeEmail: Summarize email content");
      console.log("   - draftReply: Draft email replies");
      console.log("   - rewriteReply: Rewrite email drafts");
      console.log("   - analyzeEmail: Analyze email content with insights");
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
