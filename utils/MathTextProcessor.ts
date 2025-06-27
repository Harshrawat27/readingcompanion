// Core processor for separating math from text content

export interface MathChunk {
  content: string;
  type: 'inline' | 'display';
  index: number;
  originalMatch: string;
}

export interface TextChunk {
  content: string;
  index: number;
}

export interface ParsedContent {
  textParts: string[];
  mathParts: MathChunk[];
  hasValidMath: boolean;
}

export class MathTextProcessor {
  private static readonly MATH_PLACEHOLDER_PREFIX = '__MATH_';
  private static readonly INLINE_PLACEHOLDER = '__MATH_INLINE_';
  private static readonly DISPLAY_PLACEHOLDER = '__MATH_DISPLAY_';

  /**
   * Main parsing function - separates math from text
   */
  static parse(text: string): ParsedContent {
    if (!text || typeof text !== 'string') {
      return {
        textParts: [text || ''],
        mathParts: [],
        hasValidMath: false,
      };
    }

    try {
      // Step 1: Find all math expressions
      const mathMatches = this.extractMathExpressions(text);

      if (mathMatches.length === 0) {
        return {
          textParts: [text],
          mathParts: [],
          hasValidMath: false,
        };
      }

      // Step 2: Replace math with placeholders and split text
      const { processedText, mathParts } = this.replaceMathWithPlaceholders(
        text,
        mathMatches
      );

      // Step 3: Split text by placeholders
      const textParts = this.splitTextByPlaceholders(processedText);

      return {
        textParts,
        mathParts,
        hasValidMath: mathParts.length > 0,
      };
    } catch (error) {
      console.warn('Math parsing failed, treating as plain text:', error);
      return {
        textParts: [text],
        mathParts: [],
        hasValidMath: false,
      };
    }
  }

  /**
   * Extract all math expressions from text
   */
  private static extractMathExpressions(text: string): Array<{
    match: string;
    content: string;
    type: 'inline' | 'display';
    start: number;
    end: number;
  }> {
    const expressions: Array<{
      match: string;
      content: string;
      type: 'inline' | 'display';
      start: number;
      end: number;
    }> = [];

    // First, find all display math ($$...$$) - these take priority
    const displayMathRegex = /\$\$([^$]+?)\$\$/g;
    let match;

    while ((match = displayMathRegex.exec(text)) !== null) {
      expressions.push({
        match: match[0],
        content: match[1].trim(),
        type: 'display',
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // Then find inline math ($...$), but skip areas already covered by display math
    const inlineMathRegex = /(?<!\\)\$([^$\n]+?)\$/g;

    while ((match = inlineMathRegex.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;

      // Check if this inline math overlaps with any display math
      const overlapsWithDisplay = expressions.some(
        (expr) =>
          (start >= expr.start && start < expr.end) ||
          (end > expr.start && end <= expr.end)
      );

      if (!overlapsWithDisplay && this.isValidInlineMath(match[1])) {
        expressions.push({
          match: match[0],
          content: match[1].trim(),
          type: 'inline',
          start,
          end,
        });
      }
    }

    // Sort by position to process in order
    return expressions.sort((a, b) => a.start - b.start);
  }

  /**
   * Validate if content looks like actual math (not just text with $)
   */
  private static isValidInlineMath(content: string): boolean {
    if (!content || content.length === 0) return false;

    // Basic heuristics for math content
    const mathIndicators = [
      /[+\-*/=<>]/, // Mathematical operators
      /[{}^_]/, // LaTeX syntax
      /\\[a-zA-Z]+/, // LaTeX commands
      /\d+/, // Numbers
      /[a-zA-Z]\d/, // Variables with subscripts/superscripts
      /\([^)]*\)/, // Parentheses (common in math)
      /\[[^\]]*\]/, // Brackets
    ];

    // Must have at least one math indicator
    return mathIndicators.some((regex) => regex.test(content));
  }

  /**
   * Replace math expressions with placeholders
   */
  private static replaceMathWithPlaceholders(
    text: string,
    mathExpressions: Array<{
      match: string;
      content: string;
      type: 'inline' | 'display';
      start: number;
      end: number;
    }>
  ): { processedText: string; mathParts: MathChunk[] } {
    let processedText = text;
    const mathParts: MathChunk[] = [];
    let offset = 0;

    // Process in reverse order to maintain correct indices
    const sortedExpressions = [...mathExpressions].sort(
      (a, b) => b.start - a.start
    );

    sortedExpressions.forEach((expr, reverseIndex) => {
      const index = mathExpressions.length - 1 - reverseIndex;
      const placeholder =
        expr.type === 'inline'
          ? `${this.INLINE_PLACEHOLDER}${index}__`
          : `${this.DISPLAY_PLACEHOLDER}${index}__`;

      // Replace the math expression with placeholder
      processedText =
        processedText.slice(0, expr.start) +
        placeholder +
        processedText.slice(expr.end);

      // Store the math part
      mathParts.unshift({
        content: expr.content,
        type: expr.type,
        index,
        originalMatch: expr.match,
      });
    });

    return { processedText, mathParts };
  }

  /**
   * Split text by placeholders while preserving them
   */
  private static splitTextByPlaceholders(text: string): string[] {
    const placeholderRegex = new RegExp(
      `(${this.MATH_PLACEHOLDER_PREFIX}(?:INLINE|DISPLAY)_\\d+__)`,
      'g'
    );
    return text.split(placeholderRegex);
  }

  /**
   * Reconstruct text by replacing placeholders with rendered content
   */
  static reconstructText(
    textParts: string[],
    mathParts: MathChunk[],
    renderedMath: Map<number, string>
  ): string {
    let result = '';

    textParts.forEach((part, index) => {
      if (part.startsWith(this.MATH_PLACEHOLDER_PREFIX)) {
        // This is a placeholder, replace with rendered math
        const mathIndex = this.extractIndexFromPlaceholder(part);
        const renderedContent = renderedMath.get(mathIndex);

        if (renderedContent !== undefined) {
          result += renderedContent;
        } else {
          // Fallback to original math syntax if rendering failed
          const mathPart = mathParts.find((m) => m.index === mathIndex);
          if (mathPart) {
            result += mathPart.originalMatch;
          }
        }
      } else {
        // Regular text part
        result += part;
      }
    });

    return result;
  }

  /**
   * Extract index from placeholder string
   */
  private static extractIndexFromPlaceholder(placeholder: string): number {
    const match = placeholder.match(/(\d+)__$/);
    return match ? parseInt(match[1], 10) : -1;
  }

  /**
   * Utility to check if text contains math
   */
  static containsMath(text: string): boolean {
    if (!text) return false;

    // Quick check for math delimiters
    return /\$\$[\s\S]*?\$\$|\$[^$\n]+?\$/.test(text);
  }

  /**
   * Clean up escaped dollars
   */
  static preprocessText(text: string): string {
    // Handle escaped dollars - convert \$ to a temporary placeholder
    return text.replace(/\\\$/g, '__ESCAPED_DOLLAR__');
  }

  /**
   * Restore escaped dollars after processing
   */
  static postprocessText(text: string): string {
    // Restore escaped dollars
    return text.replace(/__ESCAPED_DOLLAR__/g, '$');
  }
}
