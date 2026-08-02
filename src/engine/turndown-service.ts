import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { extractLatex, isDisplayMath, wrapLatex } from "./latex-parser";

/**
 * Centralized Turndown.js configuration
 * Handles HTML to Markdown conversion with LaTeX and image support
 */

let turndownInstance: TurndownService | null = null;

/**
 * Gets or creates the singleton Turndown service with custom rules
 */
export function getTurndownService(): TurndownService {
  if (!turndownInstance) {
    turndownInstance = createTurndownService();
  }

  return turndownInstance;
}

/**
 * Creates a configured Turndown service instance with GFM support and LaTeX handling.
 */
function createTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
    linkReferenceStyle: "full",
  });

  service.use(gfm);

  // Keep custom elements so our rules can process them
  service.keep(["mjx-container"]);

  addLatexRule(service);
  addImageRule(service);

  return service;
}

/**
 * Adds a custom rule to handle LaTeX elements (KaTeX and MathJax).
 * Converts LaTeX containers to Obsidian-style $...$ or $$...$$ format.
 */
function addLatexRule(service: TurndownService): void {
  // Rule 1: Suppress visual MathJax/KaTeX previews and SVG elements
  // This prevents Turndown from trying to parse SVG paths or duplicate content
  service.addRule("latex-previews", {
    filter: (node) => {
      if (node.nodeType !== 1) return false;
      const element = node as Element;

      return (
        element.classList.contains("MathJax_Preview") ||
        element.classList.contains("MathJax_SVG") ||
        element.classList.contains("katex-html")
      );
    },
    replacement: () => "", // Remove these from output
  });

  // Rule 2: The actual LaTeX extraction
  service.addRule("latex-content", {
    filter: (node) => {
      if (node.nodeType !== 1) return false;
      const element = node as Element;
      const tagName = element.nodeName.toLowerCase();

      // Check for script tags with math/tex type (MathJax v2 source)
      if (tagName === "script") {
        const type = element.getAttribute("type");
        return type === "math/tex" || type === "math/tex; mode=display";
      }

      // Check for MathJax containers (v2 and v3)
      const isMathJax =
        tagName === "mjx-container" ||
        element.classList.contains("MathJax") ||
        element.classList.contains("mjx-container") ||
        element.classList.contains("MathJax_Display");

      // Check for KaTeX containers
      const isKatex =
        element.classList.contains("katex") ||
        element.classList.contains("katex-mathml");

      return isMathJax || isKatex;
    },

    replacement: (content, node) => {
      const element = node as HTMLElement;
      const tex = extractLatex(element);

      if (!tex) {
        return content;
      }

      const isDisplay = isDisplayMath(element);
      return wrapLatex(tex, isDisplay, element);
    },
  });
}

/**
 * Adds a custom rule to handle images with proper URL resolution.
 * Converts relative URLs to absolute URLs based on the document's base URL.
 */
function addImageRule(service: TurndownService): void {
  service.addRule("image", {
    filter: "img",
    replacement: (_content, node) => {
      const element = node as HTMLImageElement;
      const alt = element.getAttribute("alt") || "";
      let src = element.getAttribute("src") || "";

      if (src && !isAbsoluteUrl(src)) {
        const baseUrl =
          element.ownerDocument?.location?.href || element.baseURI;
        if (baseUrl) {
          src = resolveUrl(src, baseUrl);
        }
      }

      return `![${alt}](${src})`;
    },
  });
}

/**
 * Checks if a URL is absolute (has a protocol).
 */
function isAbsoluteUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return url.startsWith("//") || /^https?:\/\//i.test(url);
  }
}

/**
 * Resolves a relative URL against a base URL.
 */
function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
}

/**
 * Converts HTML string to Markdown
 */
export function htmlToMarkdown(html: string): string {
  const service = getTurndownService();
  return service.turndown(html);
}

/**
 * Converts a DOM element to Markdown
 */
export function elementToMarkdown(element: Element): string {
  return htmlToMarkdown(element.innerHTML);
}
