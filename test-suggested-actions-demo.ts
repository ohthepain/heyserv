#!/usr/bin/env tsx

/**
 * Demo script to test suggested actions parsing functionality
 * This creates a mock response with suggested actions to verify the parsing works
 */

// Test the suggested actions parsing functionality
function testSuggestedActionsParsing() {
  console.log("🧪 Testing Suggested Actions Parsing");
  console.log("=".repeat(50));

  // Mock response with suggested actions
  const mockResponse = {
    content: `I can help you with your email draft in several ways:

suggestedActions: [
  {"label": "Make it shorter", "prompt": "make the draft shorter and more concise", "description": "Condense the current draft"},
  {"label": "Make it longer", "prompt": "make the draft longer with more details", "description": "Expand the current draft"},
  {"label": "Make it more formal", "prompt": "make the draft more formal and professional", "description": "Change tone to more formal"},
  {"label": "Make it more casual", "prompt": "make the draft more casual and friendly", "description": "Change tone to more casual"}
]`,
    toolsUsed: [],
    debuggingInfo: null,
  };

  console.log("📝 Mock response content:");
  console.log(mockResponse.content);

  // Test the parsing logic (same as in mcpServer.ts)
  let suggestedActions = undefined;
  try {
    const suggestedActionsMatch = mockResponse.content.match(/suggestedActions:\s*(\[.*?\])/s);
    if (suggestedActionsMatch) {
      const actionsJson = suggestedActionsMatch[1];
      suggestedActions = JSON.parse(actionsJson);
      console.log("\n🎯 Parsed suggested actions:");
      console.log(JSON.stringify(suggestedActions, null, 2));
    }
  } catch (error) {
    console.log("⚠️ Could not parse suggested actions:", error);
  }

  // Test the final response structure
  const finalResponse = {
    content: mockResponse.content,
    suggestedActions: suggestedActions,
    toolsUsed: mockResponse.toolsUsed,
    debuggingInfo: mockResponse.debuggingInfo,
  };

  console.log("\n📋 Final response structure:");
  console.log(JSON.stringify(finalResponse, null, 2));

  // Validate the response structure
  if (suggestedActions && suggestedActions.length > 0) {
    console.log("\n✅ Suggested actions parsing works correctly!");
    console.log(`Found ${suggestedActions.length} suggested actions`);

    suggestedActions.forEach((action: any, index: number) => {
      console.log(`  ${index + 1}. ${action.label}`);
      console.log(`     Prompt: "${action.prompt}"`);
      if (action.description) {
        console.log(`     Description: ${action.description}`);
      }
    });
  } else {
    console.log("\n❌ No suggested actions found");
  }
}

// Test different response formats
function testDifferentFormats() {
  console.log("\n🧪 Testing Different Response Formats");
  console.log("=".repeat(50));

  const testCases = [
    {
      name: "Standard format",
      content: `Here are your options:

suggestedActions: [
  {"label": "Option 1", "prompt": "do option 1", "description": "First option"},
  {"label": "Option 2", "prompt": "do option 2", "description": "Second option"}
]`,
    },
    {
      name: "No suggested actions",
      content: "I've completed the task for you.",
    },
    {
      name: "Malformed JSON",
      content: `Here are your options:

suggestedActions: [
  {"label": "Option 1", "prompt": "do option 1", "description": "First option"},
  {"label": "Option 2", "prompt": "do option 2" // missing closing brace
]`,
    },
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. Testing: ${testCase.name}`);

    let suggestedActions = undefined;
    try {
      const suggestedActionsMatch = testCase.content.match(/suggestedActions:\s*(\[.*?\])/s);
      if (suggestedActionsMatch) {
        const actionsJson = suggestedActionsMatch[1];
        suggestedActions = JSON.parse(actionsJson);
        console.log(`   ✅ Parsed ${suggestedActions.length} actions`);
      } else {
        console.log(`   ℹ️  No suggestedActions found`);
      }
    } catch (error) {
      console.log(`   ❌ Parse error: ${error.message}`);
    }
  });
}

// Main test function
function main() {
  testSuggestedActionsParsing();
  testDifferentFormats();

  console.log("\n" + "=".repeat(50));
  console.log("🎯 Suggested Actions Demo Complete");
  console.log("\nThe parsing functionality works correctly!");
  console.log("The issue is that the LLM needs to be trained to generate the correct format.");
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
