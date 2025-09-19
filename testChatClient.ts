import dotenv from "dotenv";

// Load environment variables from .env file FIRST
dotenv.config();

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import OpenAI from "openai";

class TestChatClient {
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
        "✅ Connected to server with tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log("❌ Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async testPrompt(prompt: string): Promise<string> {
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

        console.log(`✅ Tool result:`, JSON.stringify(toolResult, null, 2));

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
  const client = new TestChatClient();
  await client.connectToServer(process.env.MCP_SERVER_URL!);

  // Test prompts
  const testPrompts = [
    "Create a new contact for john.doe@example.com with the name John Doe",
    "Add a memory for john.doe@example.com that says 'John is our main client contact for the Q4 project'",
    "Get all memories for john.doe@example.com",
    "Show me global statistics about all contacts and memories",
    "Create another contact for jane.smith@company.com named Jane Smith and add a memory that she prefers morning meetings",
  ];

  for (const prompt of testPrompts) {
    console.log(`\n🧪 Testing prompt: "${prompt}"`);
    console.log("=".repeat(60));

    try {
      const response = await client.testPrompt(prompt);
      console.log(`\n🤖 Response: ${response}`);
    } catch (error) {
      console.error(`\n❌ Error:`, error);
    }

    console.log("\n" + "=".repeat(60));
  }

  // Cleanup
  await client.cleanup();
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
