# Protocol Tests

This directory contains comprehensive tests to ensure the MCP server protocol doesn't break when making changes.

## Running Tests

### Manual Testing

```bash
npm run test:protocol
# or
npm test
```

### Automatic Testing

Protocol tests now run automatically in the background when you start the server:

```bash
# Start server with auto-tests (default)
npm run streaming-http

# Start server without auto-tests (faster startup)
npm run streaming-http:no-tests

# Or disable auto-tests with environment variable
DISABLE_AUTO_TESTS=true npm run streaming-http
```

The auto-tests will:

- Wait 2 seconds for the server to fully start
- Run all protocol tests in the background
- Show only test results (✅/❌/🎉) in the server logs
- Not block server startup or operation

## What These Tests Cover

### Server Health

- **Status Endpoint**: Validates server is running and has required tools

### Direct Tool Calls

- **summarizeEmail**: Validates response structure and action protocol
- **draftReply**: Validates response structure and structured email format
- **rewriteReply**: Validates response structure and structured email format
- **analyzeEmail**: Validates response structure and structured analysis format

### Chat Requests

- **"draft reply"**: Ensures it routes to `draftReply` tool and returns structured email
- **"make it shorter" with currentDraft**: Ensures it routes to `rewriteReply` tool (context-aware)
- **"make it shorter" without currentDraft**: Ensures it routes to `summarizeEmail` tool

## Test Validation

Each test validates:

1. **Response Structure**: JSON-RPC 2.0 format compliance
2. **Action Protocol**: Correct `shouldPerformAction` and `actionToPerform` structure
3. **Tool Routing**: Correct tool selection based on context
4. **Data Format**: Structured email objects vs plain text
5. **Schema Compliance**: All responses match expected Zod schemas

## Key Schemas Tested

- `EmailContentSchema`: Structured email format with subject, sender, recipients, body
- `AnalysisResultSchema`: Structured analysis with summary, points, actions, priority, etc.
- `ToolResponseSchema`: MCP tool response format
- `ChatResponseSchema`: Chat endpoint response format

## Adding New Tests

To add tests for new tools or scenarios:

1. Add the tool call test function
2. Add the corresponding chat request test
3. Update schemas if needed
4. Add to the main `runProtocolTests()` function

## Prerequisites

- MCP server must be running on `http://localhost:4000`
- Server must be in streaming-http mode: `npm run streaming-http`
