#!/usr/bin/env tsx

/**
 * Test script to verify context documents are properly prioritized
 */

async function testContextDocuments() {
  console.log("🧪 Testing Context Documents Priority");
  console.log("=".repeat(50));

  const baseUrl = "http://localhost:4000";

  const testPayload = {
    prompt: "Draft reply with notes about the demo script",
    context: {
      emailThread:
        "LinkedIn Account Recovery Appeal [Case: 250915-001846]\nFrom: LinkedIn Customer Support <linkedin_support@cs.linkedin.com>\nTime: 2025-09-24T04:18:50.000Z\nBody: LinkedIn Support Response...",
      contextDocuments: [
        {
          title: "Demo Script",
          description: "A script for demonstrating the email assistant features",
          content: `DEMO SCRIPT

This is a demonstration script for the email assistant. The script should include:

1. Introduction to the email assistant
2. Key features demonstration
3. Sample email scenarios
4. User interaction examples

The demo script is designed to showcase how the assistant can help users with:
- Email drafting
- Tone adjustment
- Content summarization
- Contact management

This is a test document to verify that context documents are properly prioritized over email thread content.`,
        },
      ],
    },
  };

  console.log("📝 Test prompt:", testPayload.prompt);
  console.log("📄 Context documents:", testPayload.context.contextDocuments.length);
  console.log("📧 Email thread present:", !!testPayload.context.emailThread);

  try {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("\n✅ Response received");

    if (result.shouldPerformAction && result.actionToPerform) {
      const emailBody = result.actionToPerform.parameters?.email?.body;
      console.log("\n📝 Generated email body:");
      console.log(emailBody);

      // Check if the response mentions demo script content
      const mentionsDemoScript =
        emailBody?.toLowerCase().includes("demo script") ||
        emailBody?.toLowerCase().includes("demonstration") ||
        emailBody?.toLowerCase().includes("showcase");

      const mentionsLinkedIn =
        emailBody?.toLowerCase().includes("linkedin") || emailBody?.toLowerCase().includes("account recovery");

      console.log("\n🔍 Analysis:");
      console.log(`  Mentions demo script: ${mentionsDemoScript ? "✅" : "❌"}`);
      console.log(`  Mentions LinkedIn: ${mentionsLinkedIn ? "✅" : "❌"}`);

      if (mentionsDemoScript && !mentionsLinkedIn) {
        console.log("\n🎯 SUCCESS: Context documents were properly prioritized!");
      } else if (mentionsLinkedIn && !mentionsDemoScript) {
        console.log("\n❌ FAILURE: Email thread was prioritized over context documents");
      } else {
        console.log("\n⚠️  MIXED: Both demo script and LinkedIn content were mentioned");
      }
    } else {
      console.log("\n❌ No action was performed");
      console.log("Response:", result.response);
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error}`);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testContextDocuments();
}
