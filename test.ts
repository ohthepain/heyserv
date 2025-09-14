import dotenv from "dotenv";
import fetch from "node-fetch";

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

async function testRewriteEndpoint(): Promise<TestResult> {
  const testName = "Rewrite Endpoint Test";

  try {
    const testData = {
      draft:
        "Hi there, I wanted to let you know that the meeting is cancelled for tomorrow. Sorry for the short notice.",
      instruction: "Make it more formal and professional",
    };

    console.log(`🧪 Testing rewrite endpoint...`);
    console.log(`📝 Original draft: "${testData.draft}"`);
    console.log(`📋 Instruction: "${testData.instruction}"`);

    const response = await fetch(`${BASE_URL}/rewrite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    if (!response.ok) {
      return {
        test: testName,
        passed: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = await response.json();

    if (!result.reply) {
      return {
        test: testName,
        passed: false,
        error: "Response missing 'reply' field",
        response: result,
      };
    }

    console.log(`✅ Rewrite successful!`);
    console.log(`📄 Rewritten email: "${result.reply}"`);

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

async function testHealthEndpoint(): Promise<TestResult> {
  const testName = "Health Check Test";

  try {
    console.log(`🏥 Testing health endpoint...`);

    const response = await fetch(`${BASE_URL}/health`);

    if (!response.ok) {
      return {
        test: testName,
        passed: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = await response.json();

    if (result.status !== "ok") {
      return {
        test: testName,
        passed: false,
        error: `Unexpected status: ${result.status}`,
        response: result,
      };
    }

    console.log(`✅ Health check passed!`);
    console.log(`⏰ Server timestamp: ${result.timestamp}`);

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
    const response = await fetch(`${BASE_URL}/health`, {
      method: "GET",
      timeout: 5000,
    });
    return response.ok;
  } catch (error: any) {
    console.log(`❌ Server not running on port ${PORT}`);
    console.log(`💡 Error: ${error.message}`);
    console.log(`💡 Make sure to run: npm run dev`);
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
    console.log(`💡 Please start the server with: npm run dev`);
    process.exit(1);
  }

  console.log(`\n✅ Server is running! Starting tests...\n`);

  const tests = [testHealthEndpoint, testRewriteEndpoint];

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
