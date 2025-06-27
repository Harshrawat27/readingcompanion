// KaTeX-based math renderer with fallback support

import type { MathChunk } from './MathTextProcessor';

// Define KaTeX options interface
interface KaTeXOptions {
  displayMode?: boolean;
  throwOnError?: boolean;
  errorColor?: string;
  macros?: Record<string, string>;
  strict?: boolean;
  trust?: boolean;
  output?: 'html' | 'htmlAndMathml';
}

export class KaTeXMathRenderer {
  private static katexLoaded = false;
  private static katex: any = null;

  /**
   * Initialize KaTeX library
   */
  private static async initializeKaTeX(): Promise<boolean> {
    if (this.katexLoaded && this.katex) {
      return true;
    }

    try {
      // Try to load KaTeX dynamically
      if (typeof window !== 'undefined') {
        // Client-side loading
        const katexModule = await import('katex');
        this.katex = katexModule.default || katexModule;

        // Also load KaTeX CSS if not already loaded
        this.loadKaTeXCSS();

        this.katexLoaded = true;
        return true;
      }
    } catch (error) {
      console.warn('Failed to load KaTeX:', error);
      this.katexLoaded = false;
      return false;
    }

    return false;
  }

  /**
   * Load KaTeX CSS dynamically
   */
  private static loadKaTeXCSS(): void {
    if (typeof document === 'undefined') return;

    // Check if KaTeX CSS is already loaded
    const existingLink = document.querySelector('link[href*="katex"]');
    if (existingLink) return;

    // Create and append KaTeX CSS link
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    link.integrity =
      'sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  /**
   * Render a single math expression
   */
  static async renderMath(
    mathContent: string,
    isDisplayMode: boolean = false,
    options: Partial<KaTeXOptions> = {}
  ): Promise<string> {
    const initialized = await this.initializeKaTeX();

    if (!initialized || !this.katex) {
      console.warn('KaTeX not available, falling back to raw LaTeX');
      return this.createFallbackHTML(mathContent, isDisplayMode);
    }

    try {
      const defaultOptions: KaTeXOptions = {
        displayMode: isDisplayMode,
        throwOnError: false,
        errorColor: '#cc0000',
        output: 'html',
        strict: false,
        trust: false,
        macros: {
          // Common macro definitions
          '\\R': '\\mathbb{R}',
          '\\N': '\\mathbb{N}',
          '\\Z': '\\mathbb{Z}',
          '\\Q': '\\mathbb{Q}',
          '\\C': '\\mathbb{C}',
        },
        ...options,
      };

      const rendered = this.katex.renderToString(mathContent, defaultOptions);

      // Wrap in appropriate container
      const containerClass = isDisplayMode
        ? 'katex-display-container'
        : 'katex-inline-container';
      return `<span class="${containerClass}">${rendered}</span>`;
    } catch (error) {
      console.warn(`KaTeX rendering failed for: ${mathContent}`, error);
      return this.createErrorHTML(mathContent, isDisplayMode, error);
    }
  }

  /**
   * Render multiple math expressions in batch
   */
  static async renderMathBatch(
    mathParts: MathChunk[]
  ): Promise<Map<number, string>> {
    const results = new Map<number, string>();

    if (mathParts.length === 0) {
      return results;
    }

    const initialized = await this.initializeKaTeX();

    if (!initialized) {
      // Fallback for all math parts
      mathParts.forEach((mathPart) => {
        results.set(
          mathPart.index,
          this.createFallbackHTML(mathPart.content, mathPart.type === 'display')
        );
      });
      return results;
    }

    // Process all math expressions
    const renderPromises = mathParts.map(async (mathPart) => {
      try {
        const rendered = await this.renderMath(
          mathPart.content,
          mathPart.type === 'display'
        );
        results.set(mathPart.index, rendered);
      } catch (error) {
        console.warn(
          `Failed to render math at index ${mathPart.index}:`,
          error
        );
        results.set(
          mathPart.index,
          this.createErrorHTML(
            mathPart.content,
            mathPart.type === 'display',
            error
          )
        );
      }
    });

    await Promise.all(renderPromises);
    return results;
  }

  /**
   * Create fallback HTML when KaTeX is not available
   */
  private static createFallbackHTML(
    mathContent: string,
    isDisplayMode: boolean
  ): string {
    const escapedContent = this.escapeHtml(mathContent);
    const containerClass = isDisplayMode
      ? 'math-fallback-display'
      : 'math-fallback-inline';
    const mathSymbol = isDisplayMode ? '$$' : '$';

    return `<span class="${containerClass}" title="Math formula (KaTeX not loaded)">${mathSymbol}${escapedContent}${mathSymbol}</span>`;
  }

  /**
   * Create error HTML when rendering fails
   */
  private static createErrorHTML(
    mathContent: string,
    isDisplayMode: boolean,
    error: any
  ): string {
    const escapedContent = this.escapeHtml(mathContent);
    const containerClass = isDisplayMode
      ? 'math-error-display'
      : 'math-error-inline';
    const errorMessage = error?.message || 'Rendering failed';

    return `<span class="${containerClass}" title="Math error: ${this.escapeHtml(
      errorMessage
    )}">${this.escapeHtml(mathContent)}</span>`;
  }

  /**
   * Escape HTML characters
   */
  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check if KaTeX is available
   */
  static async isKaTeXAvailable(): Promise<boolean> {
    return await this.initializeKaTeX();
  }

  /**
   * Get CSS styles for math rendering
   */
  static getMathStyles(): string {
    return `
      /* KaTeX container styles */
      .katex-display-container {
        display: block;
        text-align: center;
        margin: 1rem 0;
      }
      
      .katex-inline-container {
        display: inline;
      }
      
      /* Fallback styles when KaTeX is not available */
      .math-fallback-inline,
      .math-fallback-display {
        font-family: 'Courier New', monospace;
        background-color: var(--border-color, #3a3836);
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        color: #a78bfa;
        border: 1px dashed #666;
      }
      
      .math-fallback-display {
        display: block;
        text-align: center;
        margin: 1rem 0;
        padding: 1rem;
      }
      
      /* Error styles */
      .math-error-inline,
      .math-error-display {
        font-family: 'Courier New', monospace;
        background-color: #2a1a1a;
        color: #ff6b6b;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        border: 1px solid #ff6b6b;
      }
      
      .math-error-display {
        display: block;
        text-align: center;
        margin: 1rem 0;
        padding: 1rem;
      }
      
      /* Override KaTeX styles for better theme integration */
      .katex {
        color: var(--text-color, #ffffff) !important;
      }
      
      .katex .accent {
        color: var(--accent-color, #8975EA) !important;
      }
      
      /* Responsive math */
      @media (max-width: 768px) {
        .katex-display-container .katex {
          font-size: 1.1em;
        }
        
        .math-fallback-display {
          font-size: 0.9em;
          padding: 0.5rem;
        }
      }
    `;
  }

  /**
   * Validate LaTeX syntax (basic validation)
   */
  static validateLaTeX(content: string): { isValid: boolean; error?: string } {
    try {
      // Basic validation rules
      const issues: string[] = [];

      // Check for unmatched braces
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        issues.push('Unmatched braces');
      }

      // Check for unmatched parentheses
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        issues.push('Unmatched parentheses');
      }

      // Check for common LaTeX commands
      const invalidCommands = content.match(/\\[a-zA-Z]+/g)?.filter((cmd) => {
        // List of known safe commands (extend as needed)
        const safeCommands = [
          '\\frac',
          '\\sqrt',
          '\\sum',
          '\\int',
          '\\prod',
          '\\lim',
          '\\sin',
          '\\cos',
          '\\tan',
          '\\log',
          '\\ln',
          '\\exp',
          '\\alpha',
          '\\beta',
          '\\gamma',
          '\\delta',
          '\\epsilon',
          '\\theta',
          '\\lambda',
          '\\mu',
          '\\pi',
          '\\sigma',
          '\\infty',
          '\\partial',
          '\\nabla',
          '\\cdot',
          '\\times',
          '\\leq',
          '\\geq',
          '\\neq',
          '\\approx',
          '\\equiv',
          '\\rightarrow',
          '\\leftarrow',
          '\\Rightarrow',
          '\\Leftarrow',
          '\\mathbb',
          '\\mathcal',
          '\\mathfrak',
          '\\mathbf',
          '\\text',
          '\\textbf',
          '\\textit',
          '\\mathrm',
        ];

        return !safeCommands.includes(cmd);
      });

      if (invalidCommands && invalidCommands.length > 0) {
        issues.push(`Unknown commands: ${invalidCommands.join(', ')}`);
      }

      return {
        isValid: issues.length === 0,
        error: issues.length > 0 ? issues.join('; ') : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Validation failed',
      };
    }
  }
}
