import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Get the image data from the request
    const { image, prompt } = await request.json();

    // Validate inputs
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Enhanced prompt for better markdown output
    const defaultPrompt = `Extract only the text content from the image(s) and output it in clean, valid Markdown format. Do not include explanations, metadata, or commentary. Pay close attention to the beginning of each image—some may start mid-sentence or include file names or headers. Do not assume any content is a heading unless it's clearly formatted as one. Maintain natural text flow across images that are part of the same document. For mathematical expression no need to give them in markdown format give them directly ready for html`;

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || defaultPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 4000, // Increased for longer documents
      temperature: 0.1, // Low temperature for consistent text extraction
    });

    // Extract the text response
    const extractedText =
      response.choices[0]?.message?.content || 'No text found';

    // Clean up the markdown (remove any potential wrapper text)
    const cleanedMarkdown = cleanMarkdownOutput(extractedText);
    console.log(cleanedMarkdown);
    console.log(extractedText);

    return NextResponse.json({
      success: true,
      text: cleanedMarkdown,
      rawText: extractedText, // Keep original for debugging
      usage: response.usage,
    });
  } catch (error) {
    console.error('Vision API Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Clean up the markdown output to remove any wrapper text or explanations
function cleanMarkdownOutput(text: string): string {
  // Remove common wrapper phrases that GPT might add
  const patterns = [
    /^Here's the extracted text.*?:\s*/i,
    /^The extracted text is.*?:\s*/i,
    /^Based on the image.*?:\s*/i,
    /^```markdown\s*/i,
    /\s*```$/i,
  ];

  let cleaned = text;
  patterns.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Trim whitespace
  cleaned = cleaned.trim();

  // Ensure proper line ending consistency
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return cleaned;
}
