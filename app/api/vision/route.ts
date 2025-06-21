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

    // Call OpenAI Vision API with specific formatting instructions
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // or "gpt-4-vision-preview"
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                prompt ||
                `Extract all text from this image preserving EXACT formatting and structure. Follow these rules:
              
1. Identify text hierarchy (headings, subheadings, body text)
2. Preserve the original formatting structure
3. Use markdown formatting:
   - # for main headings
   - ## for subheadings  
   - ### for smaller headings
   - Regular text for paragraphs
   - - for bullet points
   - 1. for numbered lists
   - **bold** for bold text
   - *italic* for italic text
4. Maintain original line breaks and spacing
5. Keep tables in markdown table format if present
6. Preserve any special formatting like quotes or code blocks

Return ONLY the formatted text with proper markdown, no explanations or additional comments.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: image, // base64 image data
                detail: 'high', // "low", "high", or "auto"
              },
            },
          ],
        },
      ],
      max_tokens: 2000, // Increased for longer content
      temperature: 0.1, // Low temperature for more accurate text extraction
    });

    // Extract the text response
    const extractedText =
      response.choices[0]?.message?.content || 'No text found';

    return NextResponse.json({
      success: true,
      text: extractedText,
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
