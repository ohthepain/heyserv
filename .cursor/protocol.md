# Reponse format

## JSON-RPC 2.0 Response format

Respond with a JSON object containing:

- "response": Your helpful response to the user
  -- "suggestedActions": Array of actions you think the user might want to take (optional)
  -- "shouldPerformAction": Boolean indicating if you want to automatically perform an action (optional)
  -- "actionToPerform": The specific action to perform if shouldPerformAction is true (optional)
  +- "suggestedActions": Array of actions (ONLY if shouldPerformAction is false)
  +- "shouldPerformAction": Boolean indicating if you detected a specific action request
  +- "actionToPerform": The specific action to perform (ONLY if shouldPerformAction is true)

-Each suggested action should have:
+Each suggested action or actionToPerform should have:

- "action": The action name (e.g., "summarizeEmail", "draftReply")
- "description": What this action will do
  -- "parameters": Any parameters needed for the action (include emailContent from selected email)
  +- "parameters": Any parameters needed for the action

{
"jsonrpc": "2.0",
"id": 1,
"result": {
"content": [
{
"type": "text",
"text": "Dear [Sender],\n\nThank you for reachst regards,\n[Your Name]"
}
]
}
}

## Response "content field"

"content": [
{
"type": "text",
"text": ""
}
]

the text field contains stringified JSON.
