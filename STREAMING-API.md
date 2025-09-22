# Streaming Chat API

The MCP server now supports real-time streaming responses through the `/chat/stream` endpoint.

## Endpoint

```
POST /chat/stream
```

## Request Format

Same as the regular `/chat` endpoint:

```json
{
  "prompt": "draft reply",
  "context": {
    "emailThread": "Email 1:\nSubject: Test\nFrom: sender@example.com\nBody: Hello...",
    "emailId": "optional-email-id",
    "currentDraft": "optional-current-draft",
    "userPreferences": {
      "tone": "professional",
      "length": "detailed"
    },
    "conversationHistory": []
  }
}
```

## Response Format

The endpoint returns Server-Sent Events (SSE) with the following event types:

### 1. Metadata Event

```json
data: {"type":"metadata","data":{"prompt":"draft reply","contextProvided":"Yes",...}}
```

### 2. Content Streaming

```json
data: {"type":"content","data":"Hello"}
data: {"type":"content","data":" there"}
data: {"type":"content","data":"!"}
```

### 3. Function Call Events

```json
data: {"type":"function_call_start","data":{"name":"draftReply"}}
data: {"type":"function_call_chunk","data":"{\""}
data: {"type":"function_call_chunk","data":"email"}
data: {"type":"function_call_complete","data":{"name":"draftReply","arguments":{...}}}
```

### 4. Action Protocol

```json
data: {"type":"action_protocol","data":{"content":[...],"shouldPerformAction":true,"actionToPerform":{...}}}
```

### 5. Completion Events

```json
data: {"type":"complete","data":{"message":"Final response"}}
data: {"type":"done"}
```

### 6. Error Events

```json
data: {"type":"error","data":{"error":"Error message"}}
```

## Usage Examples

### JavaScript/TypeScript

```javascript
const response = await fetch("http://localhost:4000/chat/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "draft reply",
    context: { emailThread: "..." },
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const event = JSON.parse(line.slice(6));
      handleEvent(event);
    }
  }
}
```

### cURL

```bash
curl -X POST http://localhost:4000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt": "draft reply", "context": {...}}' \
  --no-buffer
```

## Benefits

- **Real-time feedback**: See responses as they're generated
- **Better UX**: No waiting for complete responses
- **Function call visibility**: See when tools are being called
- **Progress indication**: Know when the AI is thinking vs responding
- **Error handling**: Immediate error feedback

## Event Types Reference

| Event Type               | Description                   | Data                   |
| ------------------------ | ----------------------------- | ---------------------- |
| `metadata`               | Initial request metadata      | Request context info   |
| `content`                | Streaming text content        | Text chunk             |
| `function_call_start`    | Function call initiated       | Function name          |
| `function_call_chunk`    | Function arguments streaming  | Argument chunk         |
| `function_call_complete` | Function call finished        | Complete function call |
| `action_protocol`        | Tool returned action protocol | Action protocol data   |
| `complete`               | Response completed            | Final message          |
| `done`                   | Stream finished               | None                   |
| `error`                  | Error occurred                | Error details          |

## Server Configuration

The streaming endpoint is available in both HTTP modes:

- `npm run streaming-http` - Includes streaming endpoint
- `npm run http` - Includes streaming endpoint

Check the status endpoint to confirm availability:

```bash
curl http://localhost:4000/ | jq .streamingChatEndpoint
```
