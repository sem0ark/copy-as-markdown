import type { ExportNode } from "../shared/types";
import { applyTemplate, type TemplateContext } from "./formatter";
import { elementToMarkdown } from "./turndown-service";

/**
 * Core DOM processing engine
 * Traverses the DOM tree alongside the SiteProfile tree
 *
 * Stage 3: Recursive DOM Processor
 * Implements the logic that walks the DOM tree and ExportNode tree simultaneously
 */

/**
 * Main entry point: Processes a DOM element according to ExportNode configuration
 *
 * Logic:
 * 1. If action === 'ignore', return empty string
 * 2. If action === 'template', extract text, apply template, return
 * 3. If action === 'include':
 *    - If children is empty, let Turndown handle the whole subtree
 *    - If children exists, iterate children, find matching DOM elements, recursively call processElement
 */
export function processElement(el: HTMLElement, config: ExportNode): string {
  // Step 1: Handle 'ignore' action
  if (config.action === "ignore") {
    return "";
  }

  // Step 2: Handle 'template' action
  if (config.action === "template") {
    const textContent = el.textContent || "";
    const template = config.template || "{{content}}";
    const context: TemplateContext = {
      content: textContent.trim(),
    };
    return applyTemplate(template, context);
  }

  // Step 3: Handle 'include' action
  if (config.action === "include") {
    // If no child rules, let Turndown handle the entire subtree
    if (config.children.length === 0) {
      // Check if this is an iframe that we should drill into
      if (el.tagName === "IFRAME") {
        const iframe = el as HTMLIFrameElement;
        try {
          const innerDoc = iframe.contentDocument;
          if (innerDoc?.body) {
            // Process the iframe's body content instead
            const clone = innerDoc.body.cloneNode(true) as HTMLElement;
            stripInvisibleTags(clone);
            return elementToMarkdown(clone);
          }
        } catch (e) {
          console.warn("Cross-origin iframe blocked access", e);
          return `[Embedded Content: ${iframe.src}]`;
        }
      }

      // Clone and strip scripts
      const clone = el.cloneNode(true) as HTMLElement;
      stripInvisibleTags(clone);
      return elementToMarkdown(clone);
    }

    // If child rules exist, process them recursively
    return processWithChildRules(el, config.children);
  }

  // Default fallback
  return "";
}

/**
 * Removes invisible tags and their content from a DOM element.
 * This prevents JavaScript code from appearing in the exported markdown.
 * IMPORTANT: Preserves <script type="math/tex"> tags (MathJax LaTeX source).
 */
function stripInvisibleTags(element: HTMLElement): void {
  const scripts = element.querySelectorAll("script, style, noscript");
  for (const script of scripts) {
    // Preserve MathJax LaTeX source scripts
    if (script.tagName === "SCRIPT") {
      const type = script.getAttribute("type");
      if (type === "math/tex" || type === "math/tex; mode=display") {
        continue; // Keep this script tag
      }
    }
    script.remove();
  }
}

/**
 * Resolves elements from a selector, drilling into iframes if needed
 * Supports iframe drilling syntax: "iframe#id >>> .target"
 *
 * For cloned contexts, we need to find the original iframe in the live DOM
 * to access its contentDocument
 */
function resolveElementsInContext(
  context: Element | Document,
  selector: string,
  originalContext?: Element,
): Element[] {
  const parts = selector.split(">>>").map((s) => s.trim());

  if (parts.length === 1) {
    // Simple selector
    return Array.from(context.querySelectorAll(selector));
  }

  // Iframe drilling - we need to work with the original context
  // because cloned iframes don't have contentDocument
  const searchContext = originalContext || context;
  const [iframeSelector, ...innerSelectors] = parts;
  const iframes = searchContext.querySelectorAll(iframeSelector);
  const results: Element[] = [];

  for (const iframe of iframes) {
    if (iframe.tagName !== "IFRAME") continue;

    try {
      const iframeEl = iframe as HTMLIFrameElement;
      const innerDoc = iframeEl.contentDocument;
      if (!innerDoc) continue;

      // Build the inner selector
      const innerSelector = innerSelectors.join(" >>> ").trim();
      const innerElements = innerDoc.querySelectorAll(innerSelector);

      results.push(...Array.from(innerElements));
    } catch (e) {
      console.warn("Cross-origin iframe blocked access", e);
    }
  }

  return results;
}

/**
 * Processes an element using child rules
 * Iterates through DOM children and applies matching ExportNode rules
 */
function processWithChildRules(
  parentElement: HTMLElement,
  childRules: ExportNode[],
): string {
  const results: string[] = [];

  // Clone the element to avoid mutating the live DOM
  const clone = parentElement.cloneNode(true) as HTMLElement;

  // Remove all script tags and their content
  stripInvisibleTags(clone);

  // Process each child rule
  for (const rule of childRules) {
    // Use resolveElementsInContext to support iframe drilling
    // Pass original element for iframe content access
    const matchingElements = resolveElementsInContext(
      clone,
      rule.selector,
      parentElement,
    );

    for (const matchedEl of matchingElements) {
      // Recursively process this matched element
      const result = processElement(matchedEl as HTMLElement, rule);

      if (result) {
        results.push(result);
      }

      // For iframe drilling, we need to remove the iframe from the clone
      // not the matched element from inside the iframe
      if (rule.selector.includes(">>>")) {
        const [iframeSelector] = rule.selector
          .split(">>>")
          .map((s) => s.trim());
        const iframesToRemove = clone.querySelectorAll(iframeSelector);
        for (const iframe of iframesToRemove) {
          iframe.remove();
        }
      } else {
        // For normal selectors, find and remove from clone
        const toRemove = clone.querySelector(rule.selector);
        if (toRemove) {
          toRemove.remove();
        }
      }
    }
  }

  // Convert remaining content (not covered by any rule) to markdown
  const remainingMarkdown = elementToMarkdown(clone);

  // Add remaining content if it exists
  if (remainingMarkdown.trim()) {
    results.push(remainingMarkdown);
  }

  return results.join("\n\n");
}
