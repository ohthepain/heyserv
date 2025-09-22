import dotenv from "dotenv";

// Load environment variables from .env file FIRST
dotenv.config();

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import OpenAI from "openai";
import readline from "readline";

class MCPClient {
  private openaiClient: OpenAI | null = null;
  private mcpClient: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private tools: { name: string; description: string; input_schema: any }[] = [];

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.openaiClient = new OpenAI({ apiKey });

    this.mcpClient = new Client(
      {
        name: "metalmail",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  }

  async callLLM(prompt: string): Promise<string> {
    const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
    const res = await this.openaiClient!.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
    });
    return res.choices[0].message?.content ?? "";
  }

  async connectToServer(serverUrl: string) {
    try {
      this.transport = new StreamableHTTPClientTransport(new URL(serverUrl));

      // Connect the client with the transport
      await this.mcpClient!.connect(this.transport);

      const toolsResult = (await this.mcpClient!.listTools()) as {
        tools: { name: string; description: string | undefined; inputSchema: any }[];
      };
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description ?? "",
          input_schema: tool.inputSchema as any,
        };
      });
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async httpChatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\n🤖 MCP Chat Client Started!");
      console.log("💬 Type your queries or 'quit' to exit.");
      console.log("📋 Available tools:", this.tools.map((t) => t.name).join(", "));

      while (true) {
        const message = await new Promise<string>((resolve) => {
          rl.question("\n💭 Query: ", resolve);
        });
        if (!message || message.toLowerCase() === "quit") {
          break;
        }

        try {
          const response = await this.callLLMWithTools(message);
          console.log("\n🤖 Response:", response);
        } catch (error) {
          console.error("\n❌ Error:", error);
        }
      }
    } finally {
      rl.close();
    }
  }

  async callLLMWithTools(prompt: string): Promise<string> {
    const model = process.env.OPENAI_MODEL || "gpt-4";

    // Convert MCP tools to OpenAI function format
    const functions = this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    }));

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are an AI assistant that can help manage contacts and emails. You have access to various tools to:
        - Create, update, and manage contacts
        - Add and retrieve memories about contacts
        - Get statistics and analytics
        - Summarize emails, draft replies, and analyze email content
        
        When a user asks you to do something, use the appropriate tools to help them. Always be helpful and provide clear explanations of what you're doing.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    let response = await this.openaiClient!.chat.completions.create({
      model,
      messages,
      functions,
      function_call: "auto",
    });

    let message = response.choices[0].message;

    // Handle function calls
    while (message?.function_call) {
      const functionName = message.function_call.name;
      const functionArgs = JSON.parse(message.function_call.arguments || "{}");

      console.log(`🔧 Calling tool: ${functionName}`, functionArgs);

      try {
        // Call the MCP tool
        const toolResult = await this.mcpClient!.callTool({
          name: functionName,
          arguments: functionArgs,
        });

        // Add function result to messages
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
        response = await this.openaiClient!.chat.completions.create({
          model,
          messages,
          functions,
          function_call: "auto",
        });

        message = response.choices[0].message;
      } catch (error) {
        console.error(`❌ Error calling tool ${functionName}:`, error);
        break;
      }
    }

    return message?.content || "No response generated";
  }

  async cleanup() {
    await this.mcpClient!.close();
  }
}

async function main() {
  const client = new MCPClient();
  await client.connectToServer(process.env.MCP_SERVER_URL!);
  console.log("✅ Client connected to MCP server");

  // Start interactive chat loop
  await client.httpChatLoop();

  // Cleanup
  await client.cleanup();
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
