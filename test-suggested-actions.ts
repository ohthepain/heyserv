#!/usr/bin/env tsx

/**
 * Test script for suggested actions functionality
 * This tests the new suggestedActions feature where the LLM can propose action buttons
 * when it needs clarification instead of asking questions in the response text.
 */

import { z } from "zod";

// Define the expected response schema with suggested actions
const SuggestedActionSchema = z.object({
  label: z.string(),
  prompt: z.string(),
  description: z.string().optional(),
});

const ChatResponseSchema = z.object({
  success: z.boolean(),
  response: z.string(),
  suggestedActions: z.array(SuggestedActionSchema).optional(),
  shouldPerformAction: z.boolean().optional(),
  actionToPerform: z
    .object({
      action: z.string(),
      description: z.string().optional(),
      parameters: z.record(z.any()),
    })
    .optional(),
  toolsUsed: z
    .array(
      z.object({
        name: z.string(),
        arguments: z.any(),
        timestamp: z.string(),
        success: z.boolean(),
        error: z.string().optional(),
      })
    )
    .optional(),
  debuggingInfo: z
    .object({
      toolsExecuted: z.number(),
      toolsList: z.array(z.string()),
      executionSummary: z.string(),
    })
    .optional(),
});

// Helper function to make HTTP requests
async function makeRequest(url: string, payload: any) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Test cases for suggested actions
const testCases = [
  {
    name: "Ambiguous 'make it better' request",
    prompt: "make it better",
    context: {
      currentDraft:
        "Hi John,\n\nThank you for your email. I appreciate you reaching out to me about this matter.\n\nBest regards,\nPaul",
    },
    expectedActions: ["Make it shorter", "Make it longer", "Make it more formal", "Make it more casual"],
  },
  {
    name: "Ambiguous 'improve this' request",
    prompt: "improve this",
    context: {
      currentDraft: "Thanks for the email. I'll get back to you soon.",
    },
    expectedActions: ["Make it more professional", "Add more details", "Make it more polite"],
  },
  {
    name: "Ambiguous 'change the tone' request",
    prompt: "change the tone",
    context: {
      currentDraft: "Hi there,\n\nGot your message. Thanks.\n\nPaul",
    },
    expectedActions: ["Make it more formal", "Make it more casual", "Make it more professional"],
  },
];

async function testSuggestedActions() {
  console.log("🧪 Testing Suggested Actions Functionality");
  console.log("=".repeat(50));

  const baseUrl = "http://localhost:4000";

  for (const testCase of testCases) {
    console.log(`\n🔍 Test: ${testCase.name}`);
    console.log(`📝 Prompt: "${testCase.prompt}"`);

    try {
      const response = await makeRequest(`${baseUrl}/chat`, {
        prompt: testCase.prompt,
        context: testCase.context,
      });

      console.log("✅ Response received");

      // Validate response schema
      const validatedResponse = ChatResponseSchema.parse(response);
      console.log("✅ Response schema validated");

      // Check if suggested actions are present
      if (validatedResponse.suggestedActions && validatedResponse.suggestedActions.length > 0) {
        console.log(`🎯 Found ${validatedResponse.suggestedActions.length} suggested actions:`);
        validatedResponse.suggestedActions.forEach((action, index) => {
          console.log(`  ${index + 1}. ${action.label}`);
          console.log(`     Prompt: "${action.prompt}"`);
          if (action.description) {
            console.log(`     Description: ${action.description}`);
          }
        });

        // Check if any expected actions are present
        const foundActions = validatedResponse.suggestedActions.map((a) => a.label);
        const hasExpectedActions = testCase.expectedActions.some((expected) =>
          foundActions.some((found) => found.toLowerCase().includes(expected.toLowerCase()))
        );

        if (hasExpectedActions) {
          console.log("✅ Found expected action types");
        } else {
          console.log("⚠️  No expected action types found");
          console.log(`   Expected: ${testCase.expectedActions.join(", ")}`);
          console.log(`   Found: ${foundActions.join(", ")}`);
        }
      } else {
        console.log("❌ No suggested actions found");
        console.log("📄 Response:", validatedResponse.response);
      }

      // Show tools used if any
      if (validatedResponse.toolsUsed && validatedResponse.toolsUsed.length > 0) {
        console.log(`🔧 Tools used: ${validatedResponse.toolsUsed.map((t) => t.name).join(", ")}`);
      }
    } catch (error) {
      console.error(`❌ Test failed: ${error}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎯 Suggested Actions Test Complete");
}

async function testActionButtonFlow() {
  console.log("\n🔄 Testing Action Button Flow");
  console.log("=".repeat(50));

  const baseUrl = "http://localhost:4000";

  // First, get suggested actions
  console.log("\n1️⃣ Getting suggested actions...");
  const initialResponse = await makeRequest(`${baseUrl}/chat`, {
    prompt: "make it better",
    context: {
      currentDraft:
        "Hi John,\n\nThank you for your email. I appreciate you reaching out to me about this matter.\n\nBest regards,\nPaul",
    },
  });

  if (initialResponse.suggestedActions && initialResponse.suggestedActions.length > 0) {
    const firstAction = initialResponse.suggestedActions[0];
    console.log(`✅ Got suggested action: "${firstAction.label}"`);
    console.log(`📝 Action prompt: "${firstAction.prompt}"`);

    // Now use the suggested action
    console.log("\n2️⃣ Using the suggested action...");
    const actionResponse = await makeRequest(`${baseUrl}/chat`, {
      prompt: firstAction.prompt,
      context: {
        currentDraft:
          "Hi John,\n\nThank you for your email. I appreciate you reaching out to me about this matter.\n\nBest regards,\nPaul",
      },
    });

    if (actionResponse.shouldPerformAction && actionResponse.actionToPerform) {
      console.log("✅ Action was performed successfully");
      console.log(`🔧 Action: ${actionResponse.actionToPerform.action}`);
      if (actionResponse.actionToPerform.parameters?.email?.body) {
        console.log(
          "📝 Updated draft preview:",
          actionResponse.actionToPerform.parameters.email.body.substring(0, 100) + "..."
        );
      }
    } else {
      console.log("❌ Action was not performed");
      console.log("📄 Response:", actionResponse.response);
    }
  } else {
    console.log("❌ No suggested actions found in initial response");
  }
}

// Main test function
async function main() {
  try {
    await testSuggestedActions();
    await testActionButtonFlow();
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
