#!/bin/bash

echo "🧪 Testing streaming comparison..."
echo ""

echo "1️⃣ Simple response (no tools) - should stream immediately:"
echo "----------------------------------------"
curl -X POST http://localhost:4000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you today?"}' \
  --no-buffer \
  -w "\n\n⏱️  Response completed\n\n"

echo "2️⃣ Tool-based response (draftReply) - will have tool execution delay:"
echo "----------------------------------------"
curl -X POST http://localhost:4000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "draft reply",
    "context": {
      "emailThread": "Email 1:\nSubject: Quick Question\nFrom: test@example.com\nTime: 2025-01-01T00:00:00.000Z\nBody: Hi, can you help me with something?\n---"
    }
  }' \
  --no-buffer \
  -w "\n\n⏱️  Response completed\n"
