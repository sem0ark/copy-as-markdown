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
    element.classList.contains("katex") ||
    element.classList.contains("katex-mathml") ||
    element.classList.contains("katex-html")
  );
}

/**
 * Checks if an element is a MathJax-rendered math element.
 * MathJax v3 uses `mjx-container`, v2 uses `.MathJax`, `.MathJax_SVG`, `.MathJax_Display`.
 * Also checks for script tags with math/tex type.
 */
export function isMathJaxElement(element: Element): boolean {
  // Check for script tags with math/tex type (MathJax v2 source)
  if (element.tagName === "SCRIPT") {
    const type = element.getAttribute("type");
    return type === "math/tex" || type === "math/tex; mode=display";
  }

  // Check for MathJax container elements
  return (
    element.tagName === "MJX-CONTAINER" ||
    element.classList.contains("MathJax") ||
    element.classList.contains("mjx-container") ||
    element.classList.contains("MathJax_SVG") ||
    element.classList.contains("MathJax_Display")
  );
}

/**
 * Extracts raw TeX from a LaTeX element.
 * Returns null if extraction fails or element is not a LaTeX container.
 */
export function extractLatex(element: Element): string | null {
  // Case 1: The element itself is a script tag (MathJax v2)
  if (element.tagName === "SCRIPT") {
    const type = element.getAttribute("type");
    if (type === "math/tex" || type === "math/tex; mode=display") {
      return element.textContent?.trim() || null;
    }
  }

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
  const annotation = element.querySelector(
    'annotation[encoding="application/x-tex"]',
  );
  if (annotation?.textContent) {
    return annotation.textContent.trim();
  }

  const mathmlAnnotation = element.querySelector("math annotation");
  if (mathmlAnnotation?.textContent) {
    return mathmlAnnotation.textContent.trim();
  }

  return null;
}

/**
 * Extracts TeX from MathJax elements.
 * MathJax v3 stores TeX in <script type="math/tex"> or data attributes.
 * MathJax v2 stores TeX in sibling <script> tags.
 */
function extractMathJaxLatex(element: Element): string | null {
  // Case 1: Check for child script tags (MathJax v3)
  const script = element.querySelector('script[type="math/tex"]');
  if (script?.textContent) {
    return script.textContent.trim();
  }

  const scriptDisplay = element.querySelector(
    'script[type="math/tex; mode=display"]',
  );
  if (scriptDisplay?.textContent) {
    return scriptDisplay.textContent.trim();
  }

  // Case 2: MathJax v2 Sibling Pattern
  // The visual element has an ID like "MathJax-Element-24-Frame"
  // The script has ID "MathJax-Element-24"
  if (
    element.classList.contains("MathJax_SVG") ||
    element.classList.contains("MathJax_Display")
  ) {
    const id = element.id?.replace("-Frame", "");
    if (id) {
      const script = document.getElementById(id);
      if (script?.tagName === "SCRIPT") {
        return script.textContent?.trim() || null;
      }
    }

    // Fallback: Check next sibling
    let sibling = element.nextElementSibling;
    while (sibling) {
      if (sibling.tagName === "SCRIPT") {
        const type = sibling.getAttribute("type");
        if (type === "math/tex" || type === "math/tex; mode=display") {
          return sibling.textContent?.trim() || null;
        }
      }
      sibling = sibling.nextElementSibling;
    }

    // Fallback: Check previous sibling
    sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === "SCRIPT") {
        const type = sibling.getAttribute("type");
        if (type === "math/tex" || type === "math/tex; mode=display") {
          return sibling.textContent?.trim() || null;
        }
      }
      sibling = sibling.previousElementSibling;
    }
  }

  // Case 3: Check for data attributes
  const texAttr = element.getAttribute("data-tex");
  if (texAttr) {
    return texAttr.trim();
  }

  // Case 4: Check for annotation (MathJax v3/KaTeX fallback)
  const annotation = element.querySelector(
    'annotation[encoding="application/x-tex"]',
  );
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
  const displayClasses = [
    "katex-display",
    "mjx-container-display",
    "MathJax_Display",
  ];

  if (displayClasses.some((cls) => element.classList.contains(cls))) {
    return true;
  }

  const scriptDisplay = element.querySelector(
    'script[type="math/tex; mode=display"]',
  );
  if (scriptDisplay) {
    return true;
  }

  const display = element.getAttribute("display");
  if (display === "block" || display === "true") {
    return true;
  }

  return false;
}

/**
 * Wraps extracted TeX in Obsidian-compatible delimiters.
 * Inline: ${...}$
 * Display: $${...}$$
 *
 * Note: Forces inline mode if inside a table to prevent breaking Markdown table syntax.
 */
export function wrapLatex(
  tex: string,
  isDisplay: boolean,
  element?: Element,
): string {
  // Clean up redundant \displaystyle (MathJax often adds this)
  const cleanTex = tex.replace(/\\displaystyle\s*/g, "");

  // Force inline mode if inside a table (display math breaks Markdown tables)
  const isInTable = element ? element.closest("table") !== null : false;
  const finalDisplay = isInTable ? false : isDisplay;

  if (finalDisplay) {
    return `$\${${cleanTex}}$$`;
  }
  return `\${${cleanTex}}$`;
}
