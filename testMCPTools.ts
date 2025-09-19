import dotenv from "dotenv";

// Load environment variables from .env file FIRST
dotenv.config();

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

class MCPToolTester {
  private mcpClient: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private tools: { name: string; description: string; input_schema: any }[] = [];

  constructor() {
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

  async testToolCall(toolName: string, args: any): Promise<any> {
    console.log(`🔧 Calling tool: ${toolName}`, args);

    try {
      const result = await this.mcpClient!.callTool({
        name: toolName,
        arguments: args,
      });

      console.log(`✅ Tool result:`, JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error(`❌ Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  async cleanup() {
    await this.mcpClient!.close();
  }
}

async function main() {
  const tester = new MCPToolTester();
  await tester.connectToServer(process.env.MCP_SERVER_URL!);

  // Test realistic chat scenarios by directly calling tools
  console.log("\n🧪 Testing Chat-Like Scenarios with MCP Tools");
  console.log("=".repeat(60));

  try {
    // Scenario 1: "Create a new contact for john.doe@example.com with the name John Doe"
    console.log("\n📝 Scenario 1: Create a new contact");
    await tester.testToolCall("createContact", {
      email: "john.doe@example.com",
      name: "John Doe",
    });

    // Scenario 2: "Add a memory for john.doe@example.com that says 'John is our main client contact for the Q4 project'"
    console.log("\n📝 Scenario 2: Add a memory");
    await tester.testToolCall("createMemory", {
      email: "john.doe@example.com",
      text: "John is our main client contact for the Q4 project",
      memoryType: "professional_notes",
      priority: 3,
    });

    // Scenario 3: "Get all memories for john.doe@example.com"
    console.log("\n📝 Scenario 3: Get memories");
    await tester.testToolCall("getMemories", {
      email: "john.doe@example.com",
      limit: 10,
    });

    // Scenario 4: "Show me global statistics about all contacts and memories"
    console.log("\n📝 Scenario 4: Get global stats");
    await tester.testToolCall("getGlobalStats", {});

    // Scenario 5: "Create another contact for jane.smith@company.com named Jane Smith"
    console.log("\n📝 Scenario 5: Create another contact");
    await tester.testToolCall("createContact", {
      email: "jane.smith@company.com",
      name: "Jane Smith",
    });

    // Scenario 6: "Add a memory that she prefers morning meetings"
    console.log("\n📝 Scenario 6: Add preference memory");
    await tester.testToolCall("createMemory", {
      email: "jane.smith@company.com",
      text: "Jane prefers morning meetings and responds quickly to emails before 10 AM",
      memoryType: "preferences",
      priority: 2,
    });

    // Scenario 7: "Get contact stats for Jane"
    console.log("\n📝 Scenario 7: Get contact stats");
    await tester.testToolCall("getContactStats", {
      email: "jane.smith@company.com",
    });

    // Scenario 8: "List all contacts"
    console.log("\n📝 Scenario 8: List all contacts");
    await tester.testToolCall("listContacts", {
      limit: 20,
    });

    console.log("\n✅ All chat scenarios completed successfully!");
    console.log("\n💡 This demonstrates how an LLM would call these tools in sequence");
    console.log("   to fulfill natural language requests like:");
    console.log("   - 'Create a contact for X and add a memory about Y'");
    console.log("   - 'Show me all my contacts and their memories'");
    console.log("   - 'Get statistics about my contact database'");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }

  // Cleanup
  await tester.cleanup();
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
