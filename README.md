# HeyServ - Gmail AI MCP Server

A modern Model Context Protocol (MCP) server that provides AI-powered Gmail tools for email analysis, summarization, drafting replies, and rewriting content. Built with the latest MCP SDK patterns and full type safety.

## Features

- **Email Analysis**: Comprehensive email analysis with sentiment, tone, priority, and category detection
- **Email Summarization**: Convert long emails into concise bullet points
- **Reply Drafting**: Generate contextual email replies with customizable tone
- **Content Rewriting**: Improve and modify email drafts based on instructions
- **Modern MCP**: Built with `McpServer` and `registerTool` for clean, maintainable code
- **MCP Tool Hints**: Proper `readOnlyHint` and `idempotentHint` annotations for better client integration
- **Modular Architecture**: Each tool in its own file for better organization and maintainability
- **Type Safety**: Full Zod validation and TypeScript integration
- **Runtime Validation**: Comprehensive input/output validation with detailed error messages
- **Enterprise Ready**: Production-grade error handling and fallback mechanisms

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
   # Stdio mode (default - for MCP clients like Claude Desktop)
   npm run mcp

   # HTTP mode (for web access and testing)
   npm run http

   # Production mode
   npm run build
   npm start
   ```

## MCP Tools

The server exposes the following MCP tools with full type safety, validation, and MCP tool hints for better client integration:

### `intelligent_chat`

AI-powered conversational assistant that can help with email tasks and suggest actions.

**MCP Hints:**

- `readOnlyHint: false` - Can suggest actions and operations
- `idempotentHint: false` - Different responses for same input based on context

**Parameters:**

- `message` (string, required): The user's message or question
- `conversationHistory` (array, optional): Previous messages in the conversation
  - `role` (string): "user", "assistant", or "system"
  - `content` (string): Message content
  - `timestamp` (string): When the message was sent
- `currentContext` (object, optional): Current email context
  - `selectedEmailId` (string): Currently selected email ID
  - `threadEmails` (array): All emails in the current thread
    - `id` (string): Email ID
    - `subject` (string): Email subject
    - `sender` (string): Sender email address
    - `time` (string): Email timestamp
    - `body` (string): Email body content
    - `messageIndex` (number): Position in thread (0-based)
  - `availableEmails` (array): List of available emails
  - `userEmail` (string): User's email address

**Returns:**

- `content` (array): MCP content array with structured response
  - `type`: "text"
  - `text`: JSON string containing:
    - `response`: The AI's conversational response
    - `suggestedActions`: Array of actions the user might want to take (optional)
    - `shouldPerformAction`: Boolean indicating if an action should be auto-performed (optional)
    - `actionToPerform`: Specific action to perform if auto-execution is enabled (optional)

**Example Response:**

```json
{
  "response": "I can help you draft a reply to that email!",
  "suggestedActions": [
    {
      "action": "draftReply",
      "description": "Draft a professional reply to the email",
      "parameters": {
        "emailContent": "Hi, can we reschedule our meeting for next week?",
        "tone": "professional"
      }
    }
  ]
}
```

### `analyzeEmail`

Comprehensive email analysis with structured insights.

**MCP Hints:**

- `readOnlyHint: true` - Only reads and analyzes content without making changes
- `idempotentHint: true` - Multiple calls with same input produce same results

**Parameters:**

- `emailContent` (string or object, required): Email content
  - **Simple usage**: Pass as string for basic analysis
  - **Full usage**: Pass as object with complete email structure:
    - `subject` (string, required): Email subject line
    - `sender` (string, required): Sender email address (validated)
    - `recipients` (object, optional): Recipient information
      - `to` (array of emails, default: []): To recipients
      - `cc` (array of emails, default: []): CC recipients
      - `bcc` (array of emails, default: []): BCC recipients
    - `body` (string, required): Plain text email body
    - `bodyHtml` (string, optional): HTML email body

**HTTP API Usage:**

- `emailContent` (string): The email text to analyze
- `subject` (string, optional): Email subject (defaults to "No Subject")
- `sender` (string, optional): Sender email (defaults to "unknown@example.com")
- `bodyHtml` (string, optional): HTML version of email body

**Returns:**

- `content` (array): MCP content array with structured analysis
  - `type`: "text"
  - `text`: JSON string containing:
    - `summary`: Email summary
    - `mainPoints`: Array of key points
    - `suggestedActions`: Array of suggested actions
    - `priority`: "low" | "medium" | "high"
    - `category`: "work" | "personal" | "marketing" | "notification" | "other"
    - `sentiment`: "positive" | "neutral" | "negative"
    - `tone`: "professional" | "casual" | "formal" | "urgent" | "friendly" | "polite" | "aggressive" | "apologetic" | "neutral"

### `summarizeEmail`

Convert long emails into concise bullet points.

**MCP Hints:**

- `readOnlyHint: true` - Only reads and analyzes content without making changes
- `idempotentHint: true` - Multiple calls with same input produce same results

**Parameters:**

- `text` (string, required): Email content to summarize (min 1 character)

**Returns:**

- `content` (array): MCP content array with summary
  - `type`: "text"
  - `text`: Bullet point summary

### `draftReply`

Generate contextual email replies with customizable tone.

**MCP Hints:**

- `readOnlyHint: true` - Generates draft content but doesn't send or modify emails
- `idempotentHint: false` - Multiple calls may produce different drafts due to AI generation

**Parameters:**

- `email` (string, required): Original email content (min 1 character)
- `tone` (string, optional): Reply tone (default: "polite")

**Returns:**

- `content` (array): MCP content array with generated reply
  - `type`: "text"
  - `text`: Generated reply content

### `rewriteReply`

Rewrite email drafts according to specific instructions.

**MCP Hints:**

- `readOnlyHint: true` - Modifies draft content but doesn't send or permanently change emails
- `idempotentHint: false` - Multiple calls may produce different rewrites due to AI generation

**Parameters:**

- `draft` (string, required): Original email draft (min 1 character)
- `instruction` (string, required): Rewrite instructions (min 1 character)

**Returns:**

- `content` (array): MCP content array with rewritten email
  - `type`: "text"
  - `text`: Rewritten email content

## Supported Email Formats

The server accepts various email address formats commonly used in email systems:

✅ **Simple Format**: `paul@dserv.io`
✅ **RFC 5322 Format**: `Paul Wilkinson <paul@dserv.io>`
✅ **Quoted Format**: `"Paul Wilkinson" <paul@dserv.io>`
✅ **Multiple Recipients**: `Paul Wilkinson <paul@dserv.io>, Jane Doe <jane@example.com>`
✅ **Mixed Formats**: `paul@dserv.io, "Jane Smith" <jane.smith@company.com>`

All email fields (`sender`, `recipients.to`, `recipients.cc`, `recipients.bcc`) support these formats.

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

### HTTP Mode

For web access and testing, start the server in HTTP mode:

```bash
npm run http
```

Then visit:

- **Server Status**: http://localhost:4000/
- **MCP Endpoint**: http://localhost:4000/mcp

### Other MCP Clients

The server supports both stdio and HTTP transports:

```bash
# Stdio mode (default)
npx tsx src/index.ts

# HTTP mode
MCP_MODE=http npx tsx src/index.ts
```

## Testing

Run the test suite:

```bash
npm test
```

The test suite includes:

- Server status endpoint validation
- HTTP server connectivity checks
- Tool availability verification
- MCP protocol initialization testing
- MCP tool discovery testing

## Adding New Tools

The modular architecture makes it easy to add new tools:

1. **Create a new tool file** in `src/tools/`:

   ```typescript
   // src/tools/myNewTool.ts
   import { z } from "zod";
   import { callLLM } from "../llm.js";

   export const myNewTool = {
     name: "myNewTool",
     title: "My New Tool",
     description: "Description of what this tool does",
     inputSchema: {
       input: z.string().min(1, "Input is required"),
     },
     annotations: {
       readOnlyHint: true, // Set to true if tool only reads data
       idempotentHint: true, // Set to true if same input produces same output
     },
     handler: async ({ input }: { input: string }) => {
       // Tool implementation
       const result = await callLLM(`Process: ${input}`);
       return {
         content: [{ type: "text" as const, text: result }],
       };
     },
   };
   ```

2. **Export the tool** in `src/tools/index.ts`:

   ```typescript
   export { myNewTool } from "./myNewTool.js";
   ```

3. **Register the tool** in `src/index.ts`:
   ```typescript
   server.registerTool(
     myNewTool.name,
     {
       title: myNewTool.title,
       description: myNewTool.description,
       inputSchema: myNewTool.inputSchema,
       annotations: myNewTool.annotations,
     },
     myNewTool.handler
   );
   ```

## Development

- **TypeScript**: Full TypeScript support with strict type checking
- **ES Modules**: Modern ES module syntax
- **Zod Validation**: Runtime type validation with detailed error messages
- **Modern MCP**: Built with latest MCP SDK patterns (`McpServer`, `registerTool`)
- **Modular Design**: Clean separation of concerns with individual tool files
- **Error Handling**: Comprehensive error handling and logging
- **Environment Variables**: Secure configuration management

### Development Commands

```bash
# Start development server (stdio mode)
npm run mcp

# Start development server (HTTP mode)
npm run http

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

## Project Structure

```
src/
├── index.ts          # Main MCP server entry point
├── llm.ts           # OpenAI client configuration
├── schemas.ts       # Zod schemas for type validation
└── tools/           # Individual tool implementations
    ├── index.ts     # Tool exports
    ├── summarizeEmail.ts
    ├── draftReply.ts
    ├── rewriteReply.ts
    └── analyzeEmail.ts
```

## Architecture

The server uses a modern, modular architecture:

- **Modular Design**: Each tool is in its own file for better organization and maintainability
- **Modern MCP**: Uses `McpServer` and `registerTool` patterns for clean tool registration
- **Zod Integration**: Full runtime validation using Zod schemas defined in `schemas.ts`
- **Type Safety**: TypeScript types are inferred from Zod schemas for compile-time safety
- **MCP Compliance**: Full Model Context Protocol compliance with proper content formatting

## MCP Tool Hints

This server uses MCP tool hints to provide better client integration and tool behavior understanding:

### Available Hints

- **`readOnlyHint`**: Indicates whether the tool only reads data without making changes
- **`idempotentHint`**: Indicates whether multiple calls with the same input produce the same result
- **`destructiveHint`**: Indicates whether the tool can cause destructive operations (not used in this server)
- **`openWorldHint`**: Indicates whether the tool can access external data (not used in this server)

### Tool Hint Usage

- **Analysis Tools** (`analyzeEmail`, `summarizeEmail`): `readOnlyHint: true`, `idempotentHint: true`
- **Generation Tools** (`draftReply`, `rewriteReply`): `readOnlyHint: true`, `idempotentHint: false`

These hints help MCP clients make better decisions about tool usage, caching, and user experience.

## Type Safety & Validation

This server implements enterprise-grade type safety:

### Zod Schemas

- **Input Validation**: All tool inputs are validated against Zod schemas
- **Output Validation**: Tool outputs are validated to ensure consistency
- **Email Validation**: Proper email address format validation
- **Enum Validation**: Strict validation for priority, category, sentiment, and tone values

### Error Handling

- **Detailed Error Messages**: Zod provides specific validation error messages
- **Graceful Fallbacks**: Fallback analysis when AI responses fail to parse
- **Runtime Safety**: Prevents runtime errors from invalid data

### Example Validation

```typescript
// Input validation with detailed error messages
const validatedInput = SummarizeEmailInputSchema.parse({ text });
// Throws: "Email text is required" if text is empty

// Email validation
const emailSchema = z.string().email("Invalid sender email address");
// Throws: "Invalid sender email address" for malformed emails
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

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your new tool following the modular pattern
4. Add tests for your tool
5. Submit a pull request

## Support

For issues and questions:

- Check the [MCP Documentation](https://modelcontextprotocol.io/)
- Review the tool examples in `src/tools/`
- Ensure your OpenAI API key is properly configured
