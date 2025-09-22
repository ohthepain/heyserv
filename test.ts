import { z } from "zod";

// Define the expected response schemas
const EmailContentSchema = z.object({
  subject: z.string(),
  sender: z.string(),
  recipients: z.object({
    to: z.array(z.string()),
    cc: z.array(z.string()),
    bcc: z.array(z.string()),
  }),
  body: z.string(),
  bodyHtml: z.string().nullable().optional(),
});

const AnalysisResultSchema = z.object({
  summary: z.string(),
  mainPoints: z.array(z.string()),
  suggestedActions: z.array(z.string()),
  priority: z.enum(["low", "medium", "high"]),
  category: z.enum(["work", "personal", "marketing", "notification", "other"]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  tone: z.enum([
    "professional",
    "casual",
    "formal",
    "urgent",
    "friendly",
    "polite",
    "aggressive",
    "apologetic",
    "neutral",
  ]),
});

const ToolResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.number(),
  result: z.object({
    content: z.array(
      z.object({
        type: z.literal("text"),
        text: z.string(),
      })
    ),
    shouldPerformAction: z.boolean(),
    actionToPerform: z.object({
      action: z.string(),
      description: z.string().optional(),
      parameters: z.record(z.any()),
    }),
  }),
});

const ChatResponseSchema = z.object({
  success: z.boolean(),
  response: z.string(),
  shouldPerformAction: z.boolean(),
  actionToPerform: z.object({
    action: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.any()),
  }),
  prompt: z.string(),
  contextProvided: z.string(),
  emailId: z.string().nullable(),
  hasEmailThread: z.string(),
  hasCurrentDraft: z.string(),
  conversationHistoryLength: z.number(),
});

const StatusResponseSchema = z.object({
  name: z.string(),
  version: z.string(),
  status: z.literal("running"),
  transport: z.string(),
  tools: z.array(z.string()),
  mcpEndpoint: z.string(),
  promptEndpoint: z.string(),
});

// Test data
const testEmail = {
  subject: "Test Email Subject",
  sender: "test@example.com",
  recipients: {
    to: ["recipient@example.com"],
    cc: [],
    bcc: [],
  },
  body: "This is a test email body content.",
};

const testDraft =
  "Dear John,\n\nThank you for your email. I appreciate you reaching out to me about this matter. I wanted to let you know that I have reviewed your request and I am happy to help you with this project. Please let me know if you need any additional information from me.\n\nBest regards,\nPaul";

const testEmailThread =
  "Email 1:\nSubject: Test Email\nFrom: test@example.com\nTime: 2025-01-01T00:00:00.000Z\nBody: This is a test email thread content.\n---";

// Helper function to make HTTP requests
async function makeRequest(url: string, payload: any, method: string = "POST") {
  const options: RequestInit = {
    method,
    headers: {
      Accept: "application/json, text/event-stream",
    },
  };

  if (method === "POST" && payload) {
    options.headers = {
      ...options.headers,
      "Content-Type": "application/json",
    };
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Test functions
async function testStatusEndpoint() {
  console.log("🧪 Testing status endpoint...");

  const response = await makeRequest("http://localhost:4000/", {}, "GET");

  // Validate response structure
  const validatedResponse = StatusResponseSchema.parse(response);
  console.log("✅ Status endpoint response structure is valid");

  // Validate that server is running
  if (validatedResponse.status !== "running") {
    throw new Error(`Expected status 'running', got '${validatedResponse.status}'`);
  }

  // Validate that required tools are present
  const requiredTools = ["summarizeEmail", "draftReply", "rewriteReply", "analyzeEmail"];
  const missingTools = requiredTools.filter((tool) => !validatedResponse.tools.includes(tool));

  if (missingTools.length > 0) {
    throw new Error(`Missing required tools: ${missingTools.join(", ")}`);
  }

  console.log("✅ Status endpoint shows server is running with required tools");
}

async function testSummarizeEmailTool() {
  console.log("🧪 Testing summarizeEmail tool...");

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "summarizeEmail",
      arguments: {
        text: testEmailThread,
      },
    },
  };

  const response = await makeRequest("http://localhost:4000/mcp", payload);

  // Validate response structure
  const validatedResponse = ToolResponseSchema.parse(response);
  console.log("✅ summarizeEmail tool response structure is valid");

  // Validate that it returns action protocol
  if (!validatedResponse.result.shouldPerformAction) {
    throw new Error("summarizeEmail should return shouldPerformAction: true");
  }

  if (validatedResponse.result.actionToPerform.action !== "summarizeEmail") {
    throw new Error(`Expected action 'summarizeEmail', got '${validatedResponse.result.actionToPerform.action}'`);
  }

  console.log("✅ summarizeEmail tool action protocol is correct");
}

async function testDraftReplyTool() {
  console.log("🧪 Testing draftReply tool...");

  const payload = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "draftReply",
      arguments: {
        email: testEmailThread,
        tone: "professional",
      },
    },
  };

  const response = await makeRequest("http://localhost:4000/mcp", payload);

  // Validate response structure
  const validatedResponse = ToolResponseSchema.parse(response);
  console.log("✅ draftReply tool response structure is valid");

  // Validate action protocol
  if (!validatedResponse.result.shouldPerformAction) {
    throw new Error("draftReply should return shouldPerformAction: true");
  }

  if (validatedResponse.result.actionToPerform.action !== "draftReply") {
    throw new Error(`Expected action 'draftReply', got '${validatedResponse.result.actionToPerform.action}'`);
  }

  // Validate that the email parameter contains structured email
  const emailParam = validatedResponse.result.actionToPerform.parameters.email;
  if (typeof emailParam === "string") {
    throw new Error("draftReply should return structured email object, not string");
  }

  const validatedEmail = EmailContentSchema.parse(emailParam);
  console.log("✅ draftReply tool returns structured email format");
}

async function testRewriteReplyTool() {
  console.log("🧪 Testing rewriteReply tool...");

  const payload = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "rewriteReply",
      arguments: {
        draft: testDraft,
        instruction: "make it shorter",
      },
    },
  };

  const response = await makeRequest("http://localhost:4000/mcp", payload);

  // Validate response structure
  const validatedResponse = ToolResponseSchema.parse(response);
  console.log("✅ rewriteReply tool response structure is valid");

  // Validate action protocol
  if (!validatedResponse.result.shouldPerformAction) {
    throw new Error("rewriteReply should return shouldPerformAction: true");
  }

  if (validatedResponse.result.actionToPerform.action !== "rewriteReply") {
    throw new Error(`Expected action 'rewriteReply', got '${validatedResponse.result.actionToPerform.action}'`);
  }

  // Validate that the email parameter contains structured email
  const emailParam = validatedResponse.result.actionToPerform.parameters.email;
  if (typeof emailParam === "string") {
    throw new Error("rewriteReply should return structured email object, not string");
  }

  const validatedEmail = EmailContentSchema.parse(emailParam);
  console.log("✅ rewriteReply tool returns structured email format");
}

async function testAnalyzeEmailTool() {
  console.log("🧪 Testing analyzeEmail tool...");

  const payload = {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "analyzeEmail",
      arguments: {
        emailContent: testEmail,
      },
    },
  };

  const response = await makeRequest("http://localhost:4000/mcp", payload);

  // Validate response structure
  const validatedResponse = ToolResponseSchema.parse(response);
  console.log("✅ analyzeEmail tool response structure is valid");

  // Validate action protocol
  if (!validatedResponse.result.shouldPerformAction) {
    throw new Error("analyzeEmail should return shouldPerformAction: true");
  }

  if (validatedResponse.result.actionToPerform.action !== "analyzeEmail") {
    throw new Error(`Expected action 'analyzeEmail', got '${validatedResponse.result.actionToPerform.action}'`);
  }

  // Validate that the content contains structured analysis
  const contentText = validatedResponse.result.content[0].text;
  try {
    const analysis = JSON.parse(contentText);
    const validatedAnalysis = AnalysisResultSchema.parse(analysis);
    console.log("✅ analyzeEmail tool returns structured analysis format");
  } catch (error) {
    throw new Error("analyzeEmail should return structured analysis in content");
  }
}

async function testChatDraftReply() {
  console.log("🧪 Testing chat 'draft reply'...");

  const payload = {
    prompt: "draft reply",
    context: {
      emailThread: testEmailThread,
      emailId: "test-email-id",
      userPreferences: {
        tone: "professional",
        length: "detailed",
      },
      conversationHistory: [],
    },
  };

  const response = await makeRequest("http://localhost:4000/chat", payload);

  // Validate response structure
  const validatedResponse = ChatResponseSchema.parse(response);
  console.log("✅ Chat 'draft reply' response structure is valid");

  // Validate that it uses draftReply tool
  if (validatedResponse.actionToPerform.action !== "draftReply") {
    throw new Error(`Expected action 'draftReply', got '${validatedResponse.actionToPerform.action}'`);
  }

  // Validate that the email parameter contains structured email
  const emailParam = validatedResponse.actionToPerform.parameters.email;
  if (typeof emailParam === "string") {
    throw new Error("Chat draftReply should return structured email object, not string");
  }

  const validatedEmail = EmailContentSchema.parse(emailParam);
  console.log("✅ Chat 'draft reply' returns structured email format");
}

async function testChatMakeItShorter() {
  console.log("🧪 Testing chat 'make it shorter' with currentDraft...");

  const payload = {
    prompt: "make it shorter",
    context: {
      currentDraft: testDraft,
      emailThread: testEmailThread,
      emailId: "test-email-id",
      userPreferences: {
        tone: "professional",
        length: "detailed",
      },
      conversationHistory: [],
    },
  };

  const response = await makeRequest("http://localhost:4000/chat", payload);

  // Validate response structure
  const validatedResponse = ChatResponseSchema.parse(response);
  console.log("✅ Chat 'make it shorter' response structure is valid");

  // Validate that it uses rewriteReply tool (not summarizeEmail)
  if (validatedResponse.actionToPerform.action !== "rewriteReply") {
    throw new Error(
      `Expected action 'rewriteReply' (context-aware), got '${validatedResponse.actionToPerform.action}'`
    );
  }

  // Validate that the email parameter contains structured email
  const emailParam = validatedResponse.actionToPerform.parameters.email;
  if (typeof emailParam === "string") {
    throw new Error("Chat rewriteReply should return structured email object, not string");
  }

  const validatedEmail = EmailContentSchema.parse(emailParam);
  console.log("✅ Chat 'make it shorter' returns structured email format");
}

async function testChatMakeItShorterNoDraft() {
  console.log("🧪 Testing chat 'make it shorter' without currentDraft...");

  const payload = {
    prompt: "make it shorter",
    context: {
      emailThread: testEmailThread,
      emailId: "test-email-id",
      userPreferences: {
        tone: "professional",
        length: "detailed",
      },
      conversationHistory: [],
    },
  };

  const response = await makeRequest("http://localhost:4000/chat", payload);

  // Validate response structure
  const validatedResponse = ChatResponseSchema.parse(response);
  console.log("✅ Chat 'make it shorter' (no draft) response structure is valid");

  // Validate that it uses summarizeEmail tool when no currentDraft
  if (validatedResponse.actionToPerform.action !== "summarizeEmail") {
    throw new Error(
      `Expected action 'summarizeEmail' (no draft context), got '${validatedResponse.actionToPerform.action}'`
    );
  }

  console.log("✅ Chat 'make it shorter' (no draft) uses correct tool");
}

// Main test runner
async function runProtocolTests() {
  console.log("🚀 Starting Protocol Tests...\n");

  try {
    await testStatusEndpoint();
    console.log("");

    await testSummarizeEmailTool();
    console.log("");

    await testDraftReplyTool();
    console.log("");

    await testRewriteReplyTool();
    console.log("");

    await testAnalyzeEmailTool();
    console.log("");

    await testChatDraftReply();
    console.log("");

    await testChatMakeItShorter();
    console.log("");

    await testChatMakeItShorterNoDraft();
    console.log("");

    console.log("🎉 All protocol tests passed!");
  } catch (error) {
    console.error("❌ Protocol test failed:", error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runProtocolTests();
}

export { runProtocolTests };
