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
    const defaultPrompt = `Analyze this image and extract ALL text from the beginning now matter how it started while preserving the EXACT original formatting and structure. Pay close attention to the beginning of each image—some may start mid-sentence or include file names or headers. Do not assume any content is a heading unless it's clearly formatted as one. Maintain natural text flow across images that are part of the same document.

CRITICAL REQUIREMENTS:
1. Identify the text hierarchy exactly as shown (main titles, subtitles, body text)
2. Use appropriate markdown formatting:
   - # for main headings/titles
   - ## for section headings  
   - ### for subsection headings
   - Regular text for paragraphs
   - - for bullet points
   - 1. 2. 3. for numbered lists
   - **text** for bold text
   - *text* for italic text
3. Handle mathematical formulas and equations:
   - For inline math: $formula$
   - For display math (centered): $formula$
   - Preserve all mathematical notation exactly as shown
   - Keep subscripts, superscripts, fractions, Greek letters, etc.
4. Maintain original spacing and line breaks
5. Preserve the reading order and layout structure
6. Keep tables in proper markdown table format if present
7. For images/diagrams, use: [Image: brief description]
8. Maintain any indentation or grouping
9. Do NOT wrap content in code blocks unless it's actual code, when something is starting from image or complex formula you are turning whole page into code block don't do this, when starting is complex watch carefully and only wrap code into code block.

Extract EVERYTHING visible and return ONLY the properly formatted markdown text with no additional commentary. Pay special attention to mathematical formulas and scientific notation.`;
    const sanitizedPrompt = (prompt || defaultPrompt).trim();

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: sanitizedPrompt,
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
      max_tokens: 4000,
      temperature: 0.1,
      top_p: 1,
      frequency_penalty: 0.2,
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
