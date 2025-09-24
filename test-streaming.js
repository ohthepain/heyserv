#!/usr/bin/env node

/**
 * Simple Node.js script to test streaming chat endpoint
 */

async function testStreaming() {
  const url = "http://localhost:4000/chat/stream";
  const payload = {
    prompt: "help me with this",
    context: {
      currentDraft:
        "Hi John,\n\nThank you for your email. I appreciate you reaching out to me about this matter.\n\nBest regards,\nPaul",
    },
  };

  console.log("🚀 Testing streaming chat endpoint...");
  console.log("📝 Prompt:", payload.prompt);
  console.log("📋 Context:", JSON.stringify(payload.context, null, 2));
  console.log("\n" + "=".repeat(50));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    console.log("📡 Streaming response:");
    console.log("-".repeat(30));

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "metadata") {
              console.log("\n📊 Metadata:");
              console.log(JSON.stringify(data.data, null, 2));
              console.log("\n💬 Content stream:");
            } else if (data.type === "content") {
              process.stdout.write(data.data);
            } else if (data.type === "complete") {
              console.log("\n\n✅ Complete response:");
              console.log(JSON.stringify(data.data, null, 2));
            } else if (data.type === "done") {
              console.log("\n🏁 Stream complete!");
            } else if (data.type === "error") {
              console.log("\n❌ Error:", data.data);
            }
          } catch (error) {
            console.log("⚠️ Parse error:", error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

// Run the test
testStreaming();
