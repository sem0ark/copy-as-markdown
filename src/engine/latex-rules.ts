import type TurndownService from 'turndown';

/**
 * Custom Turndown rules for LaTeX/KaTeX/MathJax extraction
 * Converts math elements to ${...}$ and $${...}$$ syntax
 */

/**
 * Adds LaTeX extraction rules to a Turndown service
 */
export function addLatexRules(service: TurndownService): void {
  // Inline math (KaTeX)
  service.addRule('katex-inline', {
    filter: (node) => {
      return (
        node.nodeName === 'SPAN' &&
        (node.classList.contains('katex') ||
          node.classList.contains('katex-mathml'))
      );
    },
    replacement: (content, node) => {
      // Try to extract from annotation element
      const annotation = (node as Element).querySelector('annotation[encoding="application/x-tex"]');
      if (annotation) {
        return `$${annotation.textContent}$`;
      }
      return content;
    },
  });

  // Display math (KaTeX)
  service.addRule('katex-display', {
    filter: (node) => {
      return (
        node.nodeName === 'SPAN' &&
        node.classList.contains('katex-display')
      );
    },
    replacement: (content, node) => {
      const annotation = (node as Element).querySelector('annotation[encoding="application/x-tex"]');
      if (annotation) {
        return `\n$$${annotation.textContent}$$\n`;
      }
      return content;
    },
  });

  // MathJax v2/v3 inline
  service.addRule('mathjax-inline', {
    filter: (node) => {
      return (
        (node.nodeName === 'SPAN' || node.nodeName === 'SCRIPT') &&
        (node.classList.contains('math-inline') ||
          (node as Element).getAttribute('type') === 'math/tex')
      );
    },
    replacement: (content, node) => {
      const text = (node as Element).textContent || content;
      return `$${text}$`;
    },
  });

  // MathJax display
  service.addRule('mathjax-display', {
    filter: (node) => {
      return (
        (node.nodeName === 'SPAN' || node.nodeName === 'SCRIPT') &&
        (node.classList.contains('math-display') ||
          (node as Element).getAttribute('type') === 'math/tex; mode=display')
      );
    },
    replacement: (content, node) => {
      const text = (node as Element).textContent || content;
      return `\n$$${text}$$\n`;
    },
  });
}
