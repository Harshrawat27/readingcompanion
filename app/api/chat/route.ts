import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, context, hasDocument } = await request.json();

    // Validate inputs
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
      });
    }

    // Build the system prompt based on context
    const systemPrompt = hasDocument
      ? `You are Claude, an AI assistant helping users analyze and understand their document. The user has uploaded a document and you have access to its content. 

Context: ${context}

Guidelines:
- Answer questions about the document content accurately
- Provide summaries, explanations, and analysis when requested
- Help with comprehension, note-taking, and studying
- If asked about specific sections, refer to the relevant parts
- Be helpful and educational in your responses
- Keep responses concise but comprehensive
- If the question isn't related to the document, you can still help with general knowledge`
      : `You are Claude, an AI assistant. The user hasn't uploaded any document yet. Help them with their questions and guide them on how to use the reading companion application if needed.

Guidelines:
- Be helpful and informative
- Offer to help them analyze documents once they upload something
- Answer general questions to the best of your ability
- Keep responses concise and engaging`;

    // Create the streaming chat completion
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      stream: true,
      max_tokens: 2000,
      temperature: 0.7,
    });

    // Create a ReadableStream for the response
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;

            if (content) {
              // Send the content chunk to the client
              const data = JSON.stringify({
                type: 'content',
                content: content,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Send completion signal
          const endData = JSON.stringify({
            type: 'done',
          });
          controller.enqueue(encoder.encode(`data: ${endData}\n\n`));
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    // Return the stream with appropriate headers
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Chat API Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
