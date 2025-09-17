import dotenv from "dotenv";
import { draftReplyTool } from "./src/tools/draftReply.js";
import { rewriteReplyTool } from "./src/tools/rewriteReply.js";
import { summarizeEmailTool } from "./src/tools/summarizeEmail.js";
import { analyzeEmailTool } from "./src/tools/analyzeEmail.js";
import { intelligentChatTool } from "./src/tools/intelligentChat.js";

// Load environment variables
dotenv.config();

async function testToolOutputs() {
  console.log("🔧 Testing Tool Outputs\n");
  console.log("=".repeat(80));

  try {
    // Test 1: draftReplyTool
    console.log("\n📧 1. DRAFT REPLY TOOL");
    console.log("-".repeat(40));
    const draftReplyResponse = await draftReplyTool.handler({
      email: "Hi, I need help with my account. Can you please assist me?",
      tone: "professional",
    });
    console.log("Response:", JSON.stringify(draftReplyResponse, null, 2));

    // Test 2: rewriteReplyTool
    console.log("\n✏️  2. REWRITE REPLY TOOL");
    console.log("-".repeat(40));
    const rewriteReplyResponse = await rewriteReplyTool.handler({
      draft: "Thanks for your email. I'll get back to you soon.",
      instruction: "Make it more formal and detailed",
    });
    console.log("Response:", JSON.stringify(rewriteReplyResponse, null, 2));

    // Test 3: summarizeEmailTool
    console.log("\n📝 3. SUMMARIZE EMAIL TOOL");
    console.log("-".repeat(40));
    const summarizeEmailResponse = await summarizeEmailTool.handler({
      text: "Dear Team, I wanted to update you on our project progress. We have completed the initial phase and are now moving to the development stage. The timeline looks good and we should be able to deliver on schedule. Please let me know if you have any questions.",
    });
    console.log("Response:", JSON.stringify(summarizeEmailResponse, null, 2));

    // Test 4: analyzeEmailTool
    console.log("\n🔍 4. ANALYZE EMAIL TOOL");
    console.log("-".repeat(40));
    const analyzeEmailResponse = await analyzeEmailTool.handler({
      emailContent: {
        subject: "Project Update - Q4 Planning",
        sender: "manager@company.com",
        body: "Hi team, I need everyone to review the Q4 planning document and provide feedback by Friday. This is urgent as we need to finalize our budget allocation.",
      },
    });
    console.log("Response:", JSON.stringify(analyzeEmailResponse, null, 2));

    // Test 5: intelligentChatTool
    console.log("\n🤖 5. INTELLIGENT CHAT TOOL");
    console.log("-".repeat(40));
    const intelligentChatResponse = await intelligentChatTool.handler({
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
    });
    console.log("Response:", JSON.stringify(intelligentChatResponse, null, 2));

    console.log("\n" + "=".repeat(80));
    console.log("✅ All tool tests completed successfully!");
  } catch (error) {
    console.error("❌ Error testing tools:", error);
    process.exit(1);
  }
}

// Run the tests
testToolOutputs().catch(console.error);
