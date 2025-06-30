import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for request/response
interface ChatRequest {
  message: string;
  context?: string;
  hasDocument?: boolean;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  currentPage?: number;
  totalPages?: number;
}

interface ChatResponse {
  message: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ChatResponse>> {
  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const {
      message,
      context = '',
      hasDocument = false,
      conversationHistory = [],
      currentPage,
      totalPages,
    } = body;

    // Validate inputs
    if (
      !message ||
      typeof message !== 'string' ||
      message.trim().length === 0
    ) {
      return NextResponse.json(
        { message: '', error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { message: '', error: 'Message is too long (max 4000 characters)' },
        { status: 400 }
      );
    }

    // Build system prompt based on context
    const systemPrompt = buildSystemPrompt(
      hasDocument,
      currentPage,
      totalPages
    );

    // Build conversation messages
    const messages = buildConversationMessages(
      systemPrompt,
      context,
      conversationHistory,
      message,
      hasDocument
    );

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 1500,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      stream: false,
    });

    // Extract response
    const assistantMessage = response.choices[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('No response generated');
    }

    // Return successful response
    return NextResponse.json({
      message: assistantMessage.trim(),
      usage: response.usage || undefined,
    });
  } catch (error) {
    console.error('Chat API Error:', error);

    // Handle different types of errors
    if (error instanceof Error) {
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          {
            message: '',
            error: 'Too many requests. Please wait a moment and try again.',
          },
          { status: 429 }
        );
      }

      if (error.message.includes('insufficient_quota')) {
        return NextResponse.json(
          {
            message: '',
            error: 'Service temporarily unavailable. Please try again later.',
          },
          { status: 503 }
        );
      }

      if (error.message.includes('content_filter')) {
        return NextResponse.json(
          {
            message: '',
            error:
              'Message content not allowed. Please rephrase your question.',
          },
          { status: 400 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        message: '',
        error: 'Failed to generate response. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt based on document context
 */
function buildSystemPrompt(
  hasDocument: boolean,
  currentPage?: number,
  totalPages?: number
): string {
  const basePrompt = `You are Claude, an AI assistant helping users understand and analyze documents. You are knowledgeable, helpful, and provide clear, accurate responses.

Key guidelines:
- Be conversational and friendly while maintaining professionalism
- Provide specific, actionable answers when possible
- If asked about content not in the document, clearly state this
- Use markdown formatting for better readability when appropriate
- Break down complex information into digestible parts
- Ask clarifying questions when the user's intent is unclear`;

  if (!hasDocument) {
    return `${basePrompt}

Current context: The user has not uploaded any document yet. You can help with general questions, explain how to use the application, or discuss topics not requiring document analysis.`;
  }

  const pageInfo =
    totalPages && totalPages > 1
      ? ` The user is currently viewing page ${currentPage} of ${totalPages}.`
      : '';

  return `${basePrompt}

Current context: The user has uploaded a document and you have access to its content.${pageInfo} Use this document content to answer questions accurately and provide relevant insights.

When referencing the document:
- Be specific about what information you're drawing from
- Quote relevant sections when helpful
- If information spans multiple pages, mention this
- Distinguish between what's explicitly stated vs. your analysis/interpretation`;
}

/**
 * Build conversation messages for OpenAI API
 */
function buildConversationMessages(
  systemPrompt: string,
  context: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentMessage: string,
  hasDocument: boolean
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [{ role: 'system', content: systemPrompt }];

  // Add document context if available
  if (hasDocument && context.trim()) {
    // Truncate context if too long (keep most recent content)
    const maxContextLength = 8000;
    let truncatedContext = context;

    if (context.length > maxContextLength) {
      // Try to keep complete sections by splitting on common markers
      const sections = context.split(/\n\n(?=---|###|##|#)/);
      truncatedContext = '';

      for (let i = sections.length - 1; i >= 0; i--) {
        if (truncatedContext.length + sections[i].length <= maxContextLength) {
          truncatedContext = sections[i] + '\n\n' + truncatedContext;
        } else {
          break;
        }
      }

      if (truncatedContext.length === 0) {
        // Fallback: just take the last N characters
        truncatedContext = '...' + context.slice(-maxContextLength + 3);
      }
    }

    messages.push({
      role: 'user',
      content: `Here is the document content for reference:\n\n${truncatedContext.trim()}\n\n---\n\nPlease use this document to help answer my questions.`,
    });
  }

  // Add conversation history (limit to last 10 exchanges to manage token usage)
  const recentHistory = conversationHistory.slice(-10);
  recentHistory.forEach((msg) => {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  });

  // Add current message
  messages.push({
    role: 'user',
    content: currentMessage,
  });

  return messages;
}

/**
 * Utility function to estimate token count (rough approximation)
 */
function estimateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Utility function to truncate text to approximate token limit
 */
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const approximateMaxChars = maxTokens * 4;
  if (text.length <= approximateMaxChars) {
    return text;
  }

  // Try to truncate at sentence boundaries
  const sentences = text.split(/[.!?]+\s+/);
  let truncated = '';

  for (const sentence of sentences) {
    if ((truncated + sentence).length <= approximateMaxChars) {
      truncated += sentence + '. ';
    } else {
      break;
    }
  }

  return truncated.trim() || text.slice(0, approximateMaxChars) + '...';
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
