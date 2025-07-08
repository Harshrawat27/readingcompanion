import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, context, hasDocument } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

    // Enhanced system prompt that handles documents and math
    const systemPrompt = `You are readly, an AI assistant helping users with document analysis and general questions. Answer should always be in markdown format.

IMPORTANT FORMATTING RULES:
- Use **markdown formatting** in your responses
- For mathematical expressions, use LaTeX syntax:
  - Inline math: $x = y + z$
  - Display math: $E = mc^2$
  - if there is any formula on separet line it should come between this $$ x = y + z $$ 
- Format your responses with proper headings, lists, and emphasis
- Use code blocks for code examples: \`\`\`language\n...\`\`\`
- Use > for quotes and important notes

DOCUMENT CONTEXT:
${
  hasDocument
    ? 'The user has uploaded a document. Use the provided context to answer questions about it.'
    : 'The user has not uploaded any document yet.'
}

RESPONSE GUIDELINES:
- Be helpful, accurate, and concise
- When explaining math, break down complex formulas step by step
- Use clear headings and bullet points for structured information
- Provide examples when helpful
- If referencing document content, be specific about what you're referring to`;

    // Prepare messages for the chat
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt,
      },
      {
        role: 'user' as const,
        content: hasDocument ? `${context}User question: ${message}` : message,
      },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Use GPT-4 for better math and document analysis
      messages,
      max_tokens: 2000,
      temperature: 0.7,
      stream: true, // Enable streaming
    });

    // Create a readable stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';

            if (content) {
              // Send the content chunk
              const data = JSON.stringify({
                content,
                done: false,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Check if stream is done
            if (chunk.choices[0]?.finish_reason) {
              const doneData = JSON.stringify({
                content: '',
                done: true,
                finish_reason: chunk.choices[0].finish_reason,
              });
              controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
              controller.close();
              return;
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({
            error: 'Stream failed',
            done: true,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
