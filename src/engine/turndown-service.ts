import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { extractLatex, isDisplayMath, wrapLatex } from "./latex-parser";
import {
  joinFunctions,
  removeEmoji,
  replaceMarkdownElements,
  replaceUnicode,
  trimLines,
} from "./markdown-formatter";

const formatMarkdown = joinFunctions(
  replaceUnicode,
  removeEmoji,
  trimLines,
  replaceMarkdownElements,
);

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
  service.escape = (text) => text;
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

/** Unwraps Microsoft Office namespace elements such as <o:p>. */
function stripOfficeMarkup(root: HTMLElement): void {
  const walker = root.ownerDocument.createTreeWalker(root, 1);
  const elements: Element[] = [];
  let node = walker.nextNode();

  while (node) {
    if ((node as Element).tagName.includes(":")) {
      elements.push(node as Element);
    }
    node = walker.nextNode();
  }

  for (const element of elements.reverse()) {
    element.replaceWith(...Array.from(element.childNodes));
  }
}

/** Promotes bold first-row cells so the GFM table rule recognizes headers. */
function promoteTableHeaders(root: HTMLElement): void {
  for (const table of root.querySelectorAll("table")) {
    if (table.querySelector("thead")) continue;

    const row = table.querySelector("tr");
    if (!row) continue;

    const cells = Array.from(row.querySelectorAll<HTMLElement>("td, th"));
    if (
      cells.length === 0 ||
      cells.every((cell) => cell.tagName === "TH") ||
      !cells.every((cell) => cell.querySelector("b, strong"))
    ) {
      continue;
    }

    for (const cell of cells) {
      if (cell.tagName !== "TD") continue;
      const header = root.ownerDocument.createElement("th");
      for (const attribute of Array.from(cell.attributes)) {
        header.setAttribute(attribute.name, attribute.value);
      }
      header.innerHTML = cell.innerHTML;
      cell.replaceWith(header);
    }
  }
}

/**
 * Flattens block-level elements inside table cells so Turndown processes them
 * as inline content within a single row.
 */
function flattenTableCells(root: HTMLElement): void {
  const cells = root.querySelectorAll("td, th");

  for (const cell of cells) {
    const blocks = cell.querySelectorAll("p, div");

    for (const block of blocks) {
      if (block.previousElementSibling) {
        block.before(" ");
      }
      block.replaceWith(...Array.from(block.childNodes));
    }
  }
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
  const template = document.createElement("template");
  template.innerHTML = html;
  const root = document.createElement("div");
  root.append(template.content.cloneNode(true));

  stripOfficeMarkup(root);
  promoteTableHeaders(root);
  flattenTableCells(root);

  const service = getTurndownService();
  return service.turndown(root.innerHTML);
}

/**
 * Converts a DOM element to Markdown
 */
export function elementToMarkdown(element: Element): string {
  const clone = element.cloneNode(true) as HTMLElement;
  stripOfficeMarkup(clone);
  promoteTableHeaders(clone);
  flattenTableCells(clone);
  const markdown = getTurndownService().turndown(clone.outerHTML);
  return formatMarkdown(markdown);
}
