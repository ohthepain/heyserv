#!/usr/bin/env npx tsx

/**
 * Test script to verify MCP tool debugging functionality
 */

async function testDebuggingHints() {
  console.log("🧪 Testing MCP Tool Debugging Hints...\n");

  try {
    // Test the /chat endpoint with a request that should trigger MCP tools
    const response = await fetch("http://localhost:4000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt:
          "Summarize this email: Hi, I wanted to follow up on our meeting yesterday. Can we schedule another call next week to discuss the project details?",
        context: {
          emailThread: "Test email thread content",
          emailId: "test-email-123",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log("📋 Response Structure:");
    console.log("- Success:", data.success);
    console.log("- Has Response:", !!data.response);
    console.log("- Has Tools Used:", !!data.toolsUsed);
    console.log("- Has Debugging Info:", !!data.debuggingInfo);

    if (data.toolsUsed && data.toolsUsed.length > 0) {
      console.log("\n🔧 Tools Used:");
      data.toolsUsed.forEach((tool: any, index: number) => {
        console.log(`  ${index + 1}. ${tool.name}${tool.success ? " ✅" : " ❌"}`);
        console.log(`     Timestamp: ${tool.timestamp}`);
        if (tool.error) {
          console.log(`     Error: ${tool.error}`);
        }
      });
    }

    if (data.debuggingInfo) {
      console.log("\n🐛 Debugging Information:");
      console.log("- Tools Executed:", data.debuggingInfo.toolsExecuted);
      console.log("- Tools List:", data.debuggingInfo.toolsList?.join(", "));
      console.log("- Execution Summary:", data.debuggingInfo.executionSummary);
    }

    console.log("\n📝 Full Response:");
    console.log(JSON.stringify(data, null, 2));

    // Verify the structure
    if (data.debuggingInfo && data.debuggingInfo.toolsExecuted > 0) {
      console.log("\n✅ SUCCESS: Debugging hints are working correctly!");
      console.log(
        `   Found ${data.debuggingInfo.toolsExecuted} tool(s) used: ${data.debuggingInfo.toolsList?.join(", ")}`
      );
    } else {
      console.log("\n⚠️  WARNING: No tools were executed in this test.");
      console.log("   This might be expected if the LLM didn't choose to use any tools for this request.");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testDebuggingHints()
  .then(() => {
    console.log("\n🎉 Test completed!");
  })
  .catch((error) => {
    console.error("💥 Test error:", error);
    process.exit(1);
  });
