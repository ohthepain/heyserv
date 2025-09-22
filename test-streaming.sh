#!/bin/bash

echo "🧪 Testing streaming chat endpoint..."
echo ""

curl -X POST http://localhost:4000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "draft reply",
    "context": {
      "emailThread": "Email 1:\nSubject: Meeting Request\nFrom: john@example.com\nTime: 2025-01-01T00:00:00.000Z\nBody: Hi Paul, I'\''d like to schedule a meeting to discuss the project. Are you available this week?\n---"
    }
  }' \
  --no-buffer \
  -w "\n\n📊 Response completed\n"
