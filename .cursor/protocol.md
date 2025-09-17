# Reponse format

## JSON-RPC 2.0 Response format

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
