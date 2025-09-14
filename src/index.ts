import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { draftReplyHandler, draftReply } from "./tools/draftReply.js";
import { summarizeEmailHandler, summarizeEmail } from "./tools/summarize.js";
import { rewriteReplyHandler, rewriteReply } from "./tools/rewriteReply.js";
import { analyzeEmailHandler, analyzeEmail } from "./tools/analyzeEmail.js";

// Load environment variables
dotenv.config();

// Create MCP server
const server = new Server(
  {
    name: "gmail-ai-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [summarizeEmail, draftReply, rewriteReply, analyzeEmail],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "summarizeEmail":
        return await summarizeEmailHandler(args as { text: string });

      case "draftReply":
        return await draftReplyHandler(args as { email: string; tone?: string });

      case "rewriteReply":
        return await rewriteReplyHandler(args as { draft: string; instruction: string });

      case "analyzeEmail":
        return await analyzeEmailHandler(args as { emailContent: any });

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw error;
  }
});

// Start the server
async function main() {
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

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
