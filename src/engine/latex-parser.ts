/**
 * LaTeX Parser for KaTeX and MathJax elements.
 * Extracts raw TeX from various math rendering libraries.
 */

/**
 * Identifies if an element is a LaTeX container (KaTeX or MathJax).
 */
export function isLatexElement(element: Element): boolean {
  return isKatexElement(element) || isMathJaxElement(element);
}

/**
 * Checks if an element is a KaTeX-rendered math element.
 * KaTeX typically uses `.katex` or `.katex-mathml` classes.
 */
export function isKatexElement(element: Element): boolean {
  return (
    element.classList.contains('katex') ||
    element.classList.contains('katex-mathml') ||
    element.classList.contains('katex-html')
  );
}

/**
 * Checks if an element is a MathJax-rendered math element.
 * MathJax v3 uses `mjx-container`, older versions use `.MathJax`.
 */
export function isMathJaxElement(element: Element): boolean {
  return (
    element.tagName === 'MJX-CONTAINER' ||
    element.classList.contains('MathJax') ||
    element.classList.contains('mjx-container')
  );
}

/**
 * Extracts raw TeX from a LaTeX element.
 * Returns null if extraction fails or element is not a LaTeX container.
 */
export function extractLatex(element: Element): string | null {
  if (isKatexElement(element)) {
    return extractKatexLatex(element);
  }

  if (isMathJaxElement(element)) {
    return extractMathJaxLatex(element);
  }

  return null;
}

/**
 * Extracts TeX from KaTeX elements.
 * Prioritizes <annotation encoding="application/x-tex"> tags for accuracy.
 */
function extractKatexLatex(element: Element): string | null {
  const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
  if (annotation?.textContent) {
    return annotation.textContent.trim();
  }

  const mathmlAnnotation = element.querySelector('math annotation');
  if (mathmlAnnotation?.textContent) {
    return mathmlAnnotation.textContent.trim();
  }

  return null;
}

/**
 * Extracts TeX from MathJax elements.
 * MathJax v3 stores TeX in <script type="math/tex"> or data attributes.
 */
function extractMathJaxLatex(element: Element): string | null {
  const script = element.querySelector('script[type="math/tex"]');
  if (script?.textContent) {
    return script.textContent.trim();
  }

  const scriptDisplay = element.querySelector('script[type="math/tex; mode=display"]');
  if (scriptDisplay?.textContent) {
    return scriptDisplay.textContent.trim();
  }

  const texAttr = element.getAttribute('data-tex');
  if (texAttr) {
    return texAttr.trim();
  }

  const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
  if (annotation?.textContent) {
    return annotation.textContent.trim();
  }

  return null;
}

/**
 * Determines if the LaTeX should be rendered as a display (block) or inline math.
 * Display math uses $$ delimiters, inline uses $.
 */
export function isDisplayMath(element: Element): boolean {
  const displayClasses = ['katex-display', 'mjx-container-display', 'MathJax_Display'];

  if (displayClasses.some(cls => element.classList.contains(cls))) {
    return true;
  }

  const scriptDisplay = element.querySelector('script[type="math/tex; mode=display"]');
  if (scriptDisplay) {
    return true;
  }

  const display = element.getAttribute('display');
  if (display === 'block' || display === 'true') {
    return true;
  }

  return false;
}

/**
 * Wraps extracted TeX in Obsidian-compatible delimiters.
 * Inline: ${...}$
 * Display: $${...}$$
 */
export function wrapLatex(tex: string, isDisplay: boolean): string {
  if (isDisplay) {
    return '$$' + '{' + tex + '}' + '$$';
  }
  return '$' + '{' + tex + '}' + '$';
}
