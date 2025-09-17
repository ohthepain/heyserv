import dotenv from "dotenv";
import fetch from "node-fetch";
import { draftReplyTool } from "./src/tools/draftReply.ts";
import { rewriteReplyTool } from "./src/tools/rewriteReply.ts";
import { summarizeEmailTool } from "./src/tools/summarizeEmail.ts";
import { analyzeEmailTool } from "./src/tools/analyzeEmail.ts";
import { intelligentChatTool } from "./src/tools/intelligentChat.ts";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const BASE_URL = `http://localhost:${PORT}`;

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  response?: any;
}

interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface StatusResponse {
  name: string;
  version: string;
  status: string;
  tools: string[];
  mcpEndpoint: string;
}

async function testMCPInitialization(): Promise<TestResult> {
  const testName = "MCP Initialization Test";

  try {
    console.log(`🧪 Testing MCP initialization...`);

    const initRequest: MCPRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: "test-client",
          version: "1.0.0",
        },
      },
    };

    const response = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(initRequest),
    });

    if (!response.ok) {
      return {
        test: testName,
        passed: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = (await response.json()) as MCPResponse;

    if (result.error) {
      return {
        test: testName,
        passed: false,
        error: `MCP Error: ${result.error.message}`,
        response: result,
      };
    }

    if (!result.result) {
      return {
        test: testName,
        passed: false,
        error: "Response missing 'result' field",
        response: result,
      };
    }

    console.log(`✅ MCP initialization successful!`);
    console.log(`📋 Server: ${result.result.serverInfo?.name} v${result.result.serverInfo?.version}`);

    return {
      test: testName,
      passed: true,
      response: result,
    };
  } catch (error: any) {
    return {
      test: testName,
      passed: false,
      error: error.message,
    };
  }
}

async function testStatusEndpoint(): Promise<TestResult> {
  const testName = "Status Endpoint Test";

  try {
    console.log(`🏥 Testing status endpoint...`);

    const response = await fetch(`${BASE_URL}/`);

    if (!response.ok) {
      return {
        test: testName,
        passed: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = (await response.json()) as StatusResponse;

    if (result.status !== "running") {
      return {
        test: testName,
        passed: false,
        error: `Unexpected status: ${result.status}`,
        response: result,
      };
    }

    if (!result.tools || !Array.isArray(result.tools)) {
      return {
        test: testName,
        passed: false,
        error: "Response missing 'tools' array",
        response: result,
      };
    }

    console.log(`✅ Status check passed!`);
    console.log(`📧 Server: ${result.name} v${result.version}`);
    console.log(`🔗 MCP Endpoint: ${result.mcpEndpoint}`);
    console.log(`📋 Available tools: ${result.tools.join(", ")}`);

    return {
      test: testName,
      passed: true,
      response: result,
    };
  } catch (error: any) {
    return {
      test: testName,
      passed: false,
      error: error.message,
    };
  }
}

async function checkServerConnection(): Promise<boolean> {
  try {
    console.log(`🔍 Checking if server is running on port ${PORT}...`);
    const response = await fetch(`${BASE_URL}/`, {
      method: "GET",
    });
    return response.ok;
  } catch (error: any) {
    console.log(`❌ Server not running on port ${PORT}`);
    console.log(`💡 Error: ${error.message}`);
    console.log(`💡 Make sure to run: npm run http`);
    return false;
  }
}

async function runTests() {
  console.log(`🚀 Starting MCP Server Tests`);
  console.log(`🌐 Testing server at: ${BASE_URL}`);
  console.log(`📋 Port from .env: ${PORT}`);
  console.log(`─`.repeat(50));

  // Check if server is running
  const isServerRunning = await checkServerConnection();
  if (!isServerRunning) {
    console.log(`\n❌ Tests failed: Server is not running on port ${PORT}`);
    console.log(`💡 Please start the server with: npm run http`);
    process.exit(1);
  }

  console.log(`\n✅ Server is running! Starting tests...\n`);

  const tests = [testStatusEndpoint, testMCPInitialization];

  const results: TestResult[] = [];

  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);

      if (result.passed) {
        console.log(`✅ ${result.test}: PASSED\n`);
      } else {
        console.log(`❌ ${result.test}: FAILED`);
        console.log(`   Error: ${result.error}\n`);
      }
    } catch (error: any) {
      console.log(`💥 ${test.name}: ERROR - ${error.message}\n`);
      results.push({
        test: test.name,
        passed: false,
        error: error.message,
      });
    }
  }

  // Summary
  console.log(`─`.repeat(50));
  console.log(`📊 Test Summary:`);

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  if (passed === total) {
    console.log(`\n🎉 All tests passed!`);
    process.exit(0);
  } else {
    console.log(`❌ Failed: ${total - passed}/${total}`);
    process.exit(1);
  }
}

export async function testTools() {
  console.log("Testing draftReplyTool...");
  const draftReplyResponse = await draftReplyTool.handler({
    email: "This is a sample email content.",
    tone: "professional",
  });
  console.log("draftReplyTool response:", draftReplyResponse);

  console.log("Testing rewriteReplyTool...");
  const rewriteReplyResponse = await rewriteReplyTool.handler({
    draft: "This is a draft email.",
    instruction: "Make it more formal.",
  });
  console.log("rewriteReplyTool response:", rewriteReplyResponse);

  console.log("Testing summarizeEmailTool...");
  const summarizeEmailResponse = await summarizeEmailTool.handler({
    text: "This is a sample email content that needs summarizing.",
  });
  console.log("summarizeEmailTool response:", summarizeEmailResponse);

  console.log("Testing analyzeEmailTool...");
  const analyzeEmailResponse = await analyzeEmailTool.handler({
    emailContent: {
      subject: "Sample Subject",
      sender: "sender@example.com",
      body: "This is a sample email content.",
    },
  });
  console.log("analyzeEmailTool response:", analyzeEmailResponse);

  console.log("Testing intelligentChatTool...");
  const intelligentChatResponse = await intelligentChatTool.handler({
    message: "Draft a reply",
    conversationHistory: [],
    currentContext: {
      selectedEmailId: "123",
      threadEmails: [
        {
          id: "123",
          subject: "Sample Subject",
          sender: "sender@example.com",
          time: "2025-09-15T10:20:59Z",
          body: "This is a sample email content.",
          messageIndex: 0,
        },
      ],
      userEmail: "user@example.com",
    },
  });
  console.log("intelligentChatTool response:", intelligentChatResponse);
}

testTools().catch(console.error);

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.log("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run the tests
runTests().catch((error) => {
  console.log(`💥 Test runner error: ${error.message}`);
  process.exit(1);
});
