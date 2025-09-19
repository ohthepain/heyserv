import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const SERVER_URL = "http://localhost:4000/mcp";

async function makeMCPRequest(method: string, params: any = {}) {
  const response = await fetch(SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1000),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function testStreamingHTTPTools() {
  console.log("🌐 Testing Tools via Streaming HTTP Server\n");
  console.log("=".repeat(80));

  try {
    // Initialize the MCP connection
    console.log("\n🔌 1. INITIALIZING MCP CONNECTION");
    console.log("-".repeat(40));
    const initResponse = await makeMCPRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    });
    console.log("Init Response:", JSON.stringify(initResponse, null, 2));

    // List available tools
    console.log("\n📋 2. LISTING AVAILABLE TOOLS");
    console.log("-".repeat(40));
    const toolsResponse = await makeMCPRequest("tools/list");
    console.log("Tools Response:", JSON.stringify(toolsResponse, null, 2));

    // Test 1: draftReplyTool
    console.log("\n📧 3. DRAFT REPLY TOOL (via HTTP)");
    console.log("-".repeat(40));
    const draftReplyResponse = await makeMCPRequest("tools/call", {
      name: "draftReply",
      arguments: {
        email: "Hi, I need help with my account. Can you please assist me?",
        tone: "professional",
      },
    });
    console.log("Response:", JSON.stringify(draftReplyResponse, null, 2));

    // Test 2: rewriteReplyTool
    console.log("\n✏️  4. REWRITE REPLY TOOL (via HTTP)");
    console.log("-".repeat(40));
    const rewriteReplyResponse = await makeMCPRequest("tools/call", {
      name: "rewriteReply",
      arguments: {
        draft: "Thanks for your email. I'll get back to you soon.",
        instruction: "Make it more formal and detailed",
      },
    });
    console.log("Response:", JSON.stringify(rewriteReplyResponse, null, 2));

    // Test 3: summarizeEmailTool
    console.log("\n📝 5. SUMMARIZE EMAIL TOOL (via HTTP)");
    console.log("-".repeat(40));
    const summarizeEmailResponse = await makeMCPRequest("tools/call", {
      name: "summarizeEmail",
      arguments: {
        text: "Dear Team, I wanted to update you on our project progress. We have completed the initial phase and are now moving to the development stage. The timeline looks good and we should be able to deliver on schedule. Please let me know if you have any questions.",
      },
    });
    console.log("Response:", JSON.stringify(summarizeEmailResponse, null, 2));

    // Test 4: analyzeEmailTool
    console.log("\n🔍 6. ANALYZE EMAIL TOOL (via HTTP)");
    console.log("-".repeat(40));
    const analyzeEmailResponse = await makeMCPRequest("tools/call", {
      name: "analyzeEmail",
      arguments: {
        emailContent: {
          subject: "Project Update - Q4 Planning",
          sender: "manager@company.com",
          body: "Hi team, I need everyone to review the Q4 planning document and provide feedback by Friday. This is urgent as we need to finalize our budget allocation.",
        },
      },
    });
    console.log("Response:", JSON.stringify(analyzeEmailResponse, null, 2));

    // Test 5: intelligentChatTool
    console.log("\n🤖 7. INTELLIGENT CHAT TOOL (via HTTP)");
    console.log("-".repeat(40));
    const intelligentChatResponse = await makeMCPRequest("tools/call", {
      name: "intelligent_chat",
      arguments: {
        message: "draft reply",
        conversationHistory: [],
        currentContext: {
          selectedEmailId: "123",
          threadEmails: [
            {
              id: "123",
              subject: "Meeting Request",
              sender: "colleague@company.com",
              time: "2025-01-15T10:00:00Z",
              body: "Hi, would you be available for a meeting tomorrow at 2 PM to discuss the project?",
              messageIndex: 0,
            },
          ],
          userEmail: "user@company.com",
        },
      },
    });
    console.log("Response:", JSON.stringify(intelligentChatResponse, null, 2));

    console.log("\n" + "=".repeat(80));
    console.log("✅ All streaming HTTP tool tests completed successfully!");
  } catch (error) {
    console.error("❌ Error testing streaming HTTP tools:", error);
    process.exit(1);
  }
}

// Run the tests
testStreamingHTTPTools().catch(console.error);
