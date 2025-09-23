# MCP Tool Debugging Hints

This document shows how the debugging hints work for MCP tool execution.

## What's Included

When MCP tools are executed, the response now includes debugging information:

### 1. `toolsUsed` Array

Contains detailed information about each tool that was executed:

```json
{
  "toolsUsed": [
    {
      "name": "analyzeEmail",
      "arguments": {
        "emailContent": {
          "subject": "Meeting Follow-up",
          "sender": "john@example.com",
          "body": "Hi, can we schedule another call?"
        }
      },
      "timestamp": "2024-01-15T10:30:45.123Z",
      "success": true
    },
    {
      "name": "draftReply",
      "arguments": {
        "email": "Hi, can we schedule another call?",
        "tone": "professional"
      },
      "timestamp": "2024-01-15T10:30:47.456Z",
      "success": true
    }
  ]
}
```

### 2. `debuggingInfo` Object

Provides a summary of tool execution:

```json
{
  "debuggingInfo": {
    "toolsExecuted": 2,
    "toolsList": ["analyzeEmail", "draftReply"],
    "executionSummary": "analyzeEmail ✅, draftReply ✅"
  }
}
```

## Example Response

Here's a complete example of a response with debugging information:

```json
{
  "success": true,
  "response": "I've analyzed the email and drafted a professional reply for you.",
  "shouldPerformAction": true,
  "actionToPerform": {
    "action": "draftReply",
    "description": "Draft a professional reply to the email",
    "parameters": {
      "email": {
        "subject": "Re: Meeting Follow-up",
        "sender": "Your Name <your.email@example.com>",
        "recipients": {
          "to": ["john@example.com"],
          "cc": [],
          "bcc": []
        },
        "body": "Thank you for reaching out..."
      }
    }
  },
  "toolsUsed": [
    {
      "name": "analyzeEmail",
      "arguments": { "emailContent": { ... } },
      "timestamp": "2024-01-15T10:30:45.123Z",
      "success": true
    },
    {
      "name": "draftReply",
      "arguments": { "email": "...", "tone": "professional" },
      "timestamp": "2024-01-15T10:30:47.456Z",
      "success": true
    }
  ],
  "debuggingInfo": {
    "toolsExecuted": 2,
    "toolsList": ["analyzeEmail", "draftReply"],
    "executionSummary": "analyzeEmail ✅, draftReply ✅"
  }
}
```

## Error Handling

When tools fail, the debugging information includes error details:

```json
{
  "toolsUsed": [
    {
      "name": "analyzeEmail",
      "arguments": { "emailContent": { ... } },
      "timestamp": "2024-01-15T10:30:45.123Z",
      "success": false,
      "error": "Tool call failed: Invalid email content"
    }
  ],
  "debuggingInfo": {
    "toolsExecuted": 1,
    "toolsList": ["analyzeEmail"],
    "executionSummary": "analyzeEmail ❌"
  }
}
```

## Benefits

This debugging information helps you:

1. **Understand which tools were used** to generate the response
2. **Track tool execution order** and timing
3. **Debug failures** when tools don't work as expected
4. **Monitor performance** by seeing which tools are being called
5. **Optimize prompts** based on tool usage patterns

## Testing

Run the test script to verify the debugging functionality:

```bash
npx tsx test-debugging.ts
```

Make sure your MCP server is running on `http://localhost:4000` before running the test.
