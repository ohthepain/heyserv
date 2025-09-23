# Suggested Actions Integration Guide

## Overview

The suggested actions feature allows the LLM to propose action buttons when it needs clarification, instead of asking questions in the response text. This creates a much better user experience by providing clear, clickable options.

## API Response Structure

When the LLM needs clarification, the response will include a `suggestedActions` array:

```json
{
  "success": true,
  "response": "I can help you improve your email draft. Here are some options:",
  "suggestedActions": [
    {
      "label": "Make it shorter",
      "prompt": "make the draft shorter and more concise",
      "description": "Condense the current draft"
    },
    {
      "label": "Make it longer",
      "prompt": "make the draft longer with more details",
      "description": "Expand the current draft"
    },
    {
      "label": "Make it more formal",
      "prompt": "make the draft more formal and professional",
      "description": "Change tone to more formal"
    }
  ],
  "toolsUsed": [...],
  "debuggingInfo": {...}
}
```

## Frontend Implementation

### TypeScript Interfaces

```typescript
interface SuggestedAction {
  label: string;
  prompt: string;
  description?: string;
}

interface ChatResponse {
  success: boolean;
  response: string;
  suggestedActions?: SuggestedAction[];
  shouldPerformAction?: boolean;
  actionToPerform?: {
    action: string;
    description?: string;
    parameters: Record<string, any>;
  };
  toolsUsed?: Array<{
    name: string;
    arguments: any;
    timestamp: string;
    success: boolean;
    error?: string;
  }>;
  debuggingInfo?: {
    toolsExecuted: number;
    toolsList: string[];
    executionSummary: string;
  };
}
```

### React Component Example

```tsx
import React, { useState } from "react";

interface ChatMessageProps {
  response: ChatResponse;
  onSendMessage: (message: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ response, onSendMessage }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleActionClick = async (action: SuggestedAction) => {
    setIsProcessing(true);
    try {
      await onSendMessage(action.prompt);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="chat-message">
      <div className="message-content">{response.response}</div>

      {response.suggestedActions && response.suggestedActions.length > 0 && (
        <div className="suggested-actions">
          <h4>What would you like to do?</h4>
          <div className="action-buttons">
            {response.suggestedActions.map((action, index) => (
              <button
                key={index}
                className="action-button"
                onClick={() => handleActionClick(action)}
                disabled={isProcessing}
                title={action.description}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {response.shouldPerformAction && response.actionToPerform && (
        <div className="action-result">
          <h4>Action Performed: {response.actionToPerform.action}</h4>
          {response.actionToPerform.parameters.email?.body && (
            <div className="email-preview">
              <h5>Updated Email:</h5>
              <pre>{response.actionToPerform.parameters.email.body}</pre>
            </div>
          )}
        </div>
      )}

      {response.toolsUsed && response.toolsUsed.length > 0 && (
        <div className="debug-info">
          <details>
            <summary>Debug Info</summary>
            <p>Tools used: {response.toolsUsed.map((t) => t.name).join(", ")}</p>
            <p>Execution: {response.debuggingInfo?.executionSummary}</p>
          </details>
        </div>
      )}
    </div>
  );
};
```

### CSS Styling

```css
.suggested-actions {
  margin-top: 16px;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.suggested-actions h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: #0056b3;
}

.action-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.action-result {
  margin-top: 16px;
  padding: 16px;
  background-color: #d4edda;
  border-radius: 8px;
  border-left: 4px solid #28a745;
}

.email-preview {
  margin-top: 12px;
}

.email-preview pre {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  font-family: inherit;
}

.debug-info {
  margin-top: 16px;
  font-size: 12px;
  color: #6c757d;
}

.debug-info details summary {
  cursor: pointer;
  user-select: none;
}
```

### API Service Integration

```typescript
class ChatService {
  private baseUrl = "http://localhost:4000";

  async sendMessage(prompt: string, context?: any, conversationHistory?: any[]): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        context,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // Streaming version
  async *sendMessageStream(
    prompt: string,
    context?: any,
    conversationHistory?: any[]
  ): AsyncGenerator<ChatResponse, void, unknown> {
    const response = await fetch(`${this.baseUrl}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        context,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
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
              if (data.type === "complete") {
                yield data.data;
              }
            } catch (error) {
              console.error("Error parsing SSE data:", error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
```

### React Hook Example

```typescript
import { useState, useCallback } from "react";

export const useChat = () => {
  const [messages, setMessages] = useState<ChatResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatService = new ChatService();

  const sendMessage = useCallback(async (prompt: string, context?: any, conversationHistory?: any[]) => {
    setIsLoading(true);
    try {
      const response = await chatService.sendMessage(prompt, context, conversationHistory);
      setMessages((prev) => [...prev, response]);
      return response;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessageStream = useCallback(async function* (prompt: string, context?: any, conversationHistory?: any[]) {
    setIsLoading(true);
    try {
      for await (const response of chatService.sendMessageStream(prompt, context, conversationHistory)) {
        setMessages((prev) => [...prev, response]);
        yield response;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    sendMessageStream,
  };
};
```

## When Suggested Actions Are Generated

The LLM will generate suggested actions when:

1. **Ambiguous requests**: "make it better", "improve this", "change the tone"
2. **Vague instructions**: "fix this", "enhance it", "adjust it"
3. **Multiple possible interpretations**: "make it shorter" (could mean summarize or rewrite)
4. **Context-dependent requests**: "make it more appropriate" (for what context?)

## Example Scenarios

### Scenario 1: Ambiguous "make it better"

```
User: "make it better"
Response: "I can help you improve your email draft. Here are some options:"
Actions: [
  "Make it shorter",
  "Make it longer",
  "Make it more formal",
  "Make it more casual"
]
```

### Scenario 2: Vague "improve this"

```
User: "improve this"
Response: "I can enhance your email in several ways:"
Actions: [
  "Make it more professional",
  "Add more details",
  "Make it more polite",
  "Fix grammar and style"
]
```

### Scenario 3: Tone adjustment

```
User: "change the tone"
Response: "I can adjust the tone of your email:"
Actions: [
  "Make it more formal",
  "Make it more casual",
  "Make it more urgent",
  "Make it more friendly"
]
```

## Benefits

1. **Better UX**: Clear action buttons instead of text questions
2. **Faster interaction**: One-click actions instead of typing
3. **Consistent interface**: Standardized button layout
4. **Reduced ambiguity**: Clear, specific action descriptions
5. **Accessibility**: Better for screen readers and keyboard navigation

## Testing

Use the provided test script to verify the functionality:

```bash
npm run test:suggested-actions
# or
tsx test-suggested-actions.ts
```

The test will verify:

- Suggested actions are generated for ambiguous prompts
- Action buttons contain proper labels and prompts
- Clicking an action button works correctly
- Response schema validation
