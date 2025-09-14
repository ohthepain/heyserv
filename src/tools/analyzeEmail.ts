import { z } from "zod";
import { callLLM } from "../llm.js";
import { AnalyzeEmailInputSchema, EmailContentSchema } from "../schemas.js";

export const analyzeEmailTool = {
  name: "analyzeEmail",
  title: "Analyze Email",
  description:
    "Analyze an email and provide structured insights including summary, main points, suggested actions, priority, category, and sentiment",
  inputSchema: {
    emailContent: EmailContentSchema,
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  handler: async ({ emailContent }: { emailContent: any }) => {
    const validatedInput = AnalyzeEmailInputSchema.parse({ emailContent });
    const { emailContent: validatedEmailContent } = validatedInput;

    try {
      // Extract text content from HTML if needed
      const textContent = validatedEmailContent.body || stripHtml(validatedEmailContent.bodyHtml || "");

      // Create a comprehensive prompt for AI analysis
      const prompt = `
Analyze this email and provide a structured response in JSON format:

Email Details:
- Subject: ${validatedEmailContent.subject}
- From: ${validatedEmailContent.sender}
- To: ${validatedEmailContent.recipients?.to?.join(", ") || "N/A"}
- CC: ${validatedEmailContent.recipients?.cc?.join(", ") || "N/A"}
- BCC: ${validatedEmailContent.recipients?.bcc?.join(", ") || "N/A"}

Email Content:
${textContent}

Please provide a JSON response with the following structure:
{
  "summary": "A concise 2-3 sentence summary of the email",
  "mainPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "suggestedActions": ["Action 1", "Action 2", "Action 3"],
  "priority": "low|medium|high",
  "category": "work|personal|marketing|notification|other",
  "sentiment": "positive|neutral|negative",
  "tone": "professional|casual|formal|urgent|friendly|polite|aggressive|apologetic|neutral"
}

Guidelines:
- Summary should be clear and actionable
- Main points should be the most important information
- Suggested actions should be specific and practical
- Priority should reflect urgency and importance
- Category should best describe the email type
- Sentiment should reflect the overall emotional tone (positive/neutral/negative)
- Tone should reflect the communication style (professional/casual/formal/urgent/friendly/polite/aggressive/apologetic/neutral)
- Respond with valid JSON only, no additional text
`;

      const aiResponse = await callLLM(prompt);

      // Parse the AI response
      try {
        const analysis = JSON.parse(aiResponse);
        const validatedAnalysis = validateAnalysis(analysis);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(validatedAnalysis, null, 2) }],
        };
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        const fallbackAnalysis = generateFallbackAnalysis(validatedEmailContent, textContent);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(fallbackAnalysis, null, 2) }],
        };
      }
    } catch (error) {
      console.error("Error in analyzeEmail:", error);
      const fallbackAnalysis = generateFallbackAnalysis(validatedEmailContent, validatedEmailContent.body || "");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(fallbackAnalysis, null, 2) }],
      };
    }
  },
};

// Helper functions for analyzeEmail
function generateFallbackAnalysis(emailContent: any, textContent: string) {
  const wordCount = textContent.split(" ").length;

  // Simple heuristics for fallback analysis
  const isUrgent =
    emailContent.subject.toLowerCase().includes("urgent") ||
    emailContent.subject.toLowerCase().includes("asap") ||
    emailContent.subject.toLowerCase().includes("important");

  const isWorkRelated =
    emailContent.sender.includes("@") &&
    !emailContent.sender.includes("noreply") &&
    !emailContent.sender.includes("no-reply");

  const hasQuestions = textContent.includes("?");
  const hasDeadlines = textContent.toLowerCase().includes("deadline") || textContent.toLowerCase().includes("due");

  // Determine tone based on content analysis
  const isAggressive =
    textContent.toLowerCase().includes("angry") ||
    textContent.toLowerCase().includes("frustrated") ||
    textContent.toLowerCase().includes("terrible") ||
    textContent.toLowerCase().includes("unacceptable");

  const isApologetic =
    textContent.toLowerCase().includes("sorry") ||
    textContent.toLowerCase().includes("apologize") ||
    textContent.toLowerCase().includes("regret");

  const isFriendly =
    textContent.toLowerCase().includes("thanks") ||
    textContent.toLowerCase().includes("appreciate") ||
    textContent.toLowerCase().includes("great");

  let tone = "neutral";
  if (isUrgent) tone = "urgent";
  else if (isAggressive) tone = "aggressive";
  else if (isApologetic) tone = "apologetic";
  else if (isFriendly) tone = "friendly";
  else if (isWorkRelated) tone = "professional";

  return {
    summary: `Email from ${emailContent.sender} regarding "${emailContent.subject}". ${
      wordCount > 100 ? "Contains detailed information." : "Brief message."
    }`,
    mainPoints: [
      `Subject: ${emailContent.subject}`,
      `From: ${emailContent.sender}`,
      hasQuestions ? "Contains questions that need responses" : "Informational content",
    ],
    suggestedActions: [
      hasQuestions ? "Respond to questions" : "Review content",
      isWorkRelated ? "Add to task list if needed" : "Archive if not important",
      hasDeadlines ? "Check for deadlines" : "No immediate action required",
    ],
    priority: isUrgent ? "high" : hasQuestions || hasDeadlines ? "medium" : "low",
    category: isWorkRelated ? "work" : "personal",
    sentiment: "neutral",
    tone: tone,
  };
}

function validateAnalysis(analysis: any) {
  return {
    summary: analysis.summary || "No summary available",
    mainPoints: Array.isArray(analysis.mainPoints) ? analysis.mainPoints : [],
    suggestedActions: Array.isArray(analysis.suggestedActions) ? analysis.suggestedActions : [],
    priority: ["low", "medium", "high"].includes(analysis.priority) ? analysis.priority : "low",
    category: ["work", "personal", "marketing", "notification", "other"].includes(analysis.category)
      ? analysis.category
      : "other",
    sentiment: ["positive", "neutral", "negative"].includes(analysis.sentiment) ? analysis.sentiment : "neutral",
    tone: [
      "professional",
      "casual",
      "formal",
      "urgent",
      "friendly",
      "polite",
      "aggressive",
      "apologetic",
      "neutral",
    ].includes(analysis.tone)
      ? analysis.tone
      : "neutral",
  };
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
