import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  isLatexElement,
  isKatexElement,
  isMathJaxElement,
  extractLatex,
  isDisplayMath,
  wrapLatex,
} from './latex-parser';

function createDOM(html: string): Document {
  const dom = new JSDOM(html);
  return dom.window.document;
}

describe('latex-parser', () => {
  describe('isKatexElement', () => {
    it('should identify .katex elements', () => {
      const doc = createDOM('<span class="katex"></span>');
      const element = doc.querySelector('.katex')!;
      expect(isKatexElement(element)).toBe(true);
    });

    it('should identify .katex-mathml elements', () => {
      const doc = createDOM('<span class="katex-mathml"></span>');
      const element = doc.querySelector('.katex-mathml')!;
      expect(isKatexElement(element)).toBe(true);
    });

    it('should identify .katex-html elements', () => {
      const doc = createDOM('<span class="katex-html"></span>');
      const element = doc.querySelector('.katex-html')!;
      expect(isKatexElement(element)).toBe(true);
    });

    it('should reject non-KaTeX elements', () => {
      const doc = createDOM('<span class="regular"></span>');
      const element = doc.querySelector('.regular')!;
      expect(isKatexElement(element)).toBe(false);
    });
  });

  describe('isMathJaxElement', () => {
    it('should identify mjx-container tags', () => {
      const doc = createDOM('<mjx-container></mjx-container>');
      const element = doc.querySelector('mjx-container')!;
      expect(isMathJaxElement(element)).toBe(true);
    });

    it('should identify .MathJax elements', () => {
      const doc = createDOM('<span class="MathJax"></span>');
      const element = doc.querySelector('.MathJax')!;
      expect(isMathJaxElement(element)).toBe(true);
    });

    it('should identify .mjx-container elements', () => {
      const doc = createDOM('<div class="mjx-container"></div>');
      const element = doc.querySelector('.mjx-container')!;
      expect(isMathJaxElement(element)).toBe(true);
    });

    it('should reject non-MathJax elements', () => {
      const doc = createDOM('<span class="regular"></span>');
      const element = doc.querySelector('.regular')!;
      expect(isMathJaxElement(element)).toBe(false);
    });
  });

  describe('isLatexElement', () => {
    it('should identify KaTeX elements', () => {
      const doc = createDOM('<span class="katex"></span>');
      const element = doc.querySelector('.katex')!;
      expect(isLatexElement(element)).toBe(true);
    });

    it('should identify MathJax elements', () => {
      const doc = createDOM('<mjx-container></mjx-container>');
      const element = doc.querySelector('mjx-container')!;
      expect(isLatexElement(element)).toBe(true);
    });

    it('should reject non-LaTeX elements', () => {
      const doc = createDOM('<span class="regular"></span>');
      const element = doc.querySelector('.regular')!;
      expect(isLatexElement(element)).toBe(false);
    });
  });

  describe('extractLatex - KaTeX', () => {
    it('should extract TeX from KaTeX annotation tag', () => {
      const html = `
        <span class="katex">
          <span class="katex-mathml">
            <math>
              <annotation encoding="application/x-tex">E = mc^2</annotation>
            </math>
          </span>
        </span>
      `;
      const doc = createDOM(html);
      const element = doc.querySelector('.katex')!;
      expect(extractLatex(element)).toBe('E = mc^2');
    });

    it('should extract TeX from generic annotation', () => {
      const html = `
        <span class="katex">
          <math>
            <annotation>\\frac{a}{b}</annotation>
          </math>
        </span>
      `;
      const doc = createDOM(html);
      const element = doc.querySelector('.katex')!;
      expect(extractLatex(element)).toBe('\\frac{a}{b}');
    });

    it('should return null if no annotation found', () => {
      const html = '<span class="katex"><span>No math here</span></span>';
      const doc = createDOM(html);
      const element = doc.querySelector('.katex')!;
      expect(extractLatex(element)).toBeNull();
    });
  });

  describe('extractLatex - MathJax', () => {
    it('should extract TeX from MathJax script tag', () => {
      const html = `
        <mjx-container>
          <script type="math/tex">\\sum_{i=1}^{n} i</script>
        </mjx-container>
      `;
      const doc = createDOM(html);
      const element = doc.querySelector('mjx-container')!;
      expect(extractLatex(element)).toBe('\\sum_{i=1}^{n} i');
    });

    it('should extract TeX from display mode script', () => {
      const html = `
        <mjx-container>
          <script type="math/tex; mode=display">\\int_0^1 x dx</script>
        </mjx-container>
      `;
      const doc = createDOM(html);
      const element = doc.querySelector('mjx-container')!;
      expect(extractLatex(element)).toBe('\\int_0^1 x dx');
    });

    it('should extract TeX from data-tex attribute', () => {
      const html = '<mjx-container data-tex="x^2 + y^2 = z^2"></mjx-container>';
      const doc = createDOM(html);
      const element = doc.querySelector('mjx-container')!;
      expect(extractLatex(element)).toBe('x^2 + y^2 = z^2');
    });

    it('should extract TeX from annotation tag', () => {
      const html = `
        <mjx-container>
          <math>
            <annotation encoding="application/x-tex">\\alpha + \\beta</annotation>
          </math>
        </mjx-container>
      `;
      const doc = createDOM(html);
      const element = doc.querySelector('mjx-container')!;
      expect(extractLatex(element)).toBe('\\alpha + \\beta');
    });

    it('should return null if no TeX found', () => {
      const html = '<mjx-container><span>No math</span></mjx-container>';
      const doc = createDOM(html);
      const element = doc.querySelector('mjx-container')!;
      expect(extractLatex(element)).toBeNull();
    });
  });

  describe('isDisplayMath', () => {
    it('should identify KaTeX display math by class', () => {
      const doc = createDOM('<span class="katex katex-display"></span>');
      const element = doc.querySelector('.katex')!;
      expect(isDisplayMath(element)).toBe(true);
    });

    it('should identify MathJax display math by class', () => {
      const doc = createDOM('<mjx-container class="mjx-container-display"></mjx-container>');
      const element = doc.querySelector('mjx-container')!;
      expect(isDisplayMath(element)).toBe(true);
    });

    it('should identify display math by script type', () => {
      const html = `
        <div>
          <script type="math/tex; mode=display">\\int</script>
        </div>
      `;
      const doc = createDOM(html);
      const element = doc.querySelector('div')!;
      expect(isDisplayMath(element)).toBe(true);
    });

    it('should identify display math by display attribute', () => {
      const doc = createDOM('<mjx-container display="block"></mjx-container>');
      const element = doc.querySelector('mjx-container')!;
      expect(isDisplayMath(element)).toBe(true);
    });

    it('should return false for inline math', () => {
      const doc = createDOM('<span class="katex"></span>');
      const element = doc.querySelector('.katex')!;
      expect(isDisplayMath(element)).toBe(false);
    });
  });

  describe('wrapLatex', () => {
    it('should wrap inline math with Obsidian format', () => {
      expect(wrapLatex('x = 5', false)).toBe('${x = 5}$');
    });

    it('should wrap display math with Obsidian format', () => {
      expect(wrapLatex('\\int_0^1 x dx', true)).toBe('$${\\int_0^1 x dx}$$');
    });

    it('should handle empty string', () => {
      expect(wrapLatex('', false)).toBe('${}$');
      expect(wrapLatex('', true)).toBe('$${}$$');
    });

    it('should handle complex TeX expressions', () => {
      const tex = '\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u';
      expect(wrapLatex(tex, true)).toBe(`$\${${tex}}$$`);
    });
  });

  describe('Integration: Full LaTeX extraction workflow', () => {
    it('should extract and wrap KaTeX inline math', () => {
      const html = `
        <span class="katex">
          <math>
            <annotation encoding="application/x-tex">E = mc^2</annotation>
          </math>
        </span>
      `;
      const doc = createDOM(html);
      const element = doc.querySelector('.katex')!;
      const tex = extractLatex(element);
      const isDisplay = isDisplayMath(element);

      expect(tex).toBe('E = mc^2');
      expect(isDisplay).toBe(false);
      expect(wrapLatex(tex!, isDisplay)).toBe('${E = mc^2}$');
    });

    it('should extract and wrap KaTeX display math', () => {
      const html = `
        <span class="katex katex-display">
          <math>
            <annotation encoding="application/x-tex">\\int_0^\\infty e^{-x} dx = 1</annotation>
          </math>
        </span>
      `;
      const doc = createDOM(html);
      const element = doc.querySelector('.katex')!;
      const tex = extractLatex(element);
      const isDisplay = isDisplayMath(element);

      expect(tex).toBe('\\int_0^\\infty e^{-x} dx = 1');
      expect(isDisplay).toBe(true);
      expect(wrapLatex(tex!, isDisplay)).toBe('$${\\int_0^\\infty e^{-x} dx = 1}$$');
    });

    it('should extract and wrap MathJax inline math', () => {
      const html = `
        <mjx-container data-tex="\\alpha + \\beta"></mjx-container>
      `;
      const doc = createDOM(html);
      const element = doc.querySelector('mjx-container')!;
      const tex = extractLatex(element);
      const isDisplay = isDisplayMath(element);

      expect(tex).toBe('\\alpha + \\beta');
      expect(isDisplay).toBe(false);
      expect(wrapLatex(tex!, isDisplay)).toBe('${\\alpha + \\beta}$');
    });

    it('should extract and wrap MathJax display math', () => {
      const html = `
        <mjx-container class="mjx-container-display">
          <script type="math/tex; mode=display">\\sum_{i=1}^n i = \\frac{n(n+1)}{2}</script>
        </mjx-container>
      `;
      const doc = createDOM(html);
      const element = doc.querySelector('mjx-container')!;
      const tex = extractLatex(element);
      const isDisplay = isDisplayMath(element);

      expect(tex).toBe('\\sum_{i=1}^n i = \\frac{n(n+1)}{2}');
      expect(isDisplay).toBe(true);
      expect(wrapLatex(tex!, isDisplay)).toBe('$${\\sum_{i=1}^n i = \\frac{n(n+1)}{2}}$$');
    });
  });
});
