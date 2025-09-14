# HeyServ - Gmail AI MCP Server

A Model Context Protocol (MCP) server that provides AI-powered Gmail tools for email analysis, summarization, drafting replies, and rewriting content.

## Features

- **Email Analysis**: Comprehensive email analysis with sentiment, tone, priority, and category detection
- **Email Summarization**: Convert long emails into concise bullet points
- **Reply Drafting**: Generate contextual email replies with customizable tone
- **Content Rewriting**: Improve and modify email drafts based on instructions
- **MCP Protocol**: Full Model Context Protocol compliance for seamless AI client integration

## Quick Start

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file with your OpenAI API key:

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-3.5-turbo  # Optional: gpt-4o-mini, gpt-4, etc.
   ```

3. **Start the MCP server**:

   ```bash
   # Development mode
   npm run mcp

   # Production mode
   npm run build
   npm start
   ```

## MCP Tools

The server exposes the following MCP tools:

### `analyzeEmail`

Comprehensive email analysis with structured insights.

**Parameters:**

```json
{
  "emailContent": {
    "subject": "Email subject",
    "sender": "sender@example.com",
    "recipients": {
      "to": ["recipient@example.com"],
      "cc": [],
      "bcc": []
    },
    "body": "Email content",
    "bodyHtml": "HTML content (optional)"
  }
}
```

**Returns:**

```json
{
  "summary": "Email summary",
  "mainPoints": ["Key point 1", "Key point 2"],
  "suggestedActions": ["Action 1", "Action 2"],
  "priority": "low|medium|high",
  "category": "work|personal|marketing|notification|other",
  "sentiment": "positive|neutral|negative",
  "tone": "professional|casual|formal|urgent|friendly|polite|aggressive|apologetic|neutral"
}
```

### `summarizeEmail`

Convert long emails into concise bullet points.

**Parameters:**

```json
{
  "text": "Email content to summarize"
}
```

**Returns:**

```json
{
  "summary": "Bullet point summary"
}
```

### `draftReply`

Generate contextual email replies with customizable tone.

**Parameters:**

```json
{
  "email": "Original email content",
  "tone": "professional|casual|polite|friendly|formal (optional, defaults to polite)"
}
```

**Returns:**

```json
{
  "reply": "Generated reply"
}
```

### `rewriteReply`

Rewrite email drafts according to specific instructions.

**Parameters:**

```json
{
  "draft": "Original email draft",
  "instruction": "How to rewrite the email"
}
```

**Returns:**

```json
{
  "reply": "Rewritten email"
}
```

## Usage with MCP Clients

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gmail-ai": {
      "command": "npx",
      "args": ["tsx", "/path/to/heyserv/src/index.ts"],
      "env": {
        "OPENAI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Other MCP Clients

The server communicates via stdio using the MCP protocol. Connect using:

```bash
npx tsx src/index.ts
```

## Testing

Run the test suite:

```bash
npm test
```

This will test the rewrite endpoint functionality.

## Development

- **TypeScript**: Full TypeScript support with strict type checking
- **ES Modules**: Modern ES module syntax
- **Error Handling**: Comprehensive error handling and logging
- **Environment Variables**: Secure configuration management

## Project Structure

```
src/
├── index.ts          # Main MCP server file
├── llm.ts           # OpenAI client configuration
└── tools/           # MCP tool implementations
    ├── analyzeEmail.ts
    ├── draftReply.ts
    ├── rewriteReply.ts
    └── summarize.ts
```

## OpenAI API Quota Management

### Increasing Your Quota

1. **Add Payment Method**: Go to [OpenAI Platform](https://platform.openai.com/) → Settings → Billing
2. **Check Usage**: Visit [Usage Dashboard](https://platform.openai.com/usage) to see current limits
3. **Upgrade Plan**: Free tier has limited credits; paid plans offer higher quotas

### Cost-Effective Models

- `gpt-3.5-turbo`: Cheapest option, good for most tasks
- `gpt-4o-mini`: Balanced cost/performance
- `gpt-4`: Most capable but expensive

## Requirements

- Node.js 18+
- OpenAI API key
- TypeScript (for development)
