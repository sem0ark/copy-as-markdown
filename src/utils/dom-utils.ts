/**
 * DOM utility functions for deep element selection across iframe boundaries
 */

/**
 * Resolves a "deep selector" that may cross iframe boundaries (same-origin).
 *
 * Supports the >>> syntax to drill into iframes:
 * - Simple selector: ".main-content" → queries document normally
 * - Iframe drilling: "iframe#unit-iframe >>> #main-content" → finds iframe, then queries inside its contentDocument
 *
 * @param selector - CSS selector, optionally with >>> for iframe drilling
 * @param root - Root element or document to start search from (defaults to document)
 * @returns The matched element or null if not found
 *
 * @example
 * // Simple selector
 * querySelectorDeep(".article")
 *
 * // Iframe drilling
 * querySelectorDeep("iframe#content >>> article.post")
 *
 * // Nested iframes
 * querySelectorDeep("iframe#outer >>> iframe#inner >>> .deep-content")
 */
export function querySelectorDeep(
  selector: string,
  root: Document | HTMLElement = document,
): HTMLElement | null {
  // If no iframe drilling syntax, use standard querySelector
  if (!selector.includes(">>>")) {
    return root.querySelector(selector) as HTMLElement;
  }

  // Split by >>> and trim each part
  const parts = selector.split(">>>").map((s) => s.trim());

  // Start with the root context
  let currentContext: Document | HTMLElement = root;

  // Process each part of the selector path
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;

    // Query within current context
    const found = currentContext.querySelector(part) as HTMLElement;

    if (!found) {
      console.warn(
        `[querySelectorDeep] Element not found at part ${i}: "${part}"`,
      );
      return null;
    }

    // If this is the last part, we found our target
    if (isLastPart) {
      return found;
    }

    // Otherwise, this should be an iframe we need to drill into
    if (found.tagName !== "IFRAME") {
      console.warn(
        `[querySelectorDeep] Expected iframe at part ${i}, got ${found.tagName}`,
      );
      return null;
    }

    const iframe = found as HTMLIFrameElement;

    try {
      // Same-origin check: access the iframe's internal document
      const innerDoc = iframe.contentDocument;

      if (!innerDoc) {
        console.warn(
          `[querySelectorDeep] Cannot access contentDocument of iframe: ${part}`,
        );
        return null;
      }

      // Switch context to iframe's document for next iteration
      currentContext = innerDoc;
    } catch (e) {
      console.error(
        `[querySelectorDeep] Cross-origin security error accessing iframe:`,
        iframe.src,
        e,
      );
      return null;
    }
  }

  return null;
}

/**
 * Checks if a selector uses iframe drilling syntax (contains >>>)
 */
export function isDeepSelector(selector: string): boolean {
  return selector.includes(">>>");
}

/**
 * Extracts the iframe selector from a deep selector
 * @example
 * getIframeSelector("iframe#content >>> article") // "iframe#content"
 */
export function getIframeSelector(deepSelector: string): string | null {
  if (!isDeepSelector(deepSelector)) {
    return null;
  }

  const parts = deepSelector.split(">>>").map((s) => s.trim());
  return parts[0];
}

/**
 * Extracts the inner selector from a deep selector
 * @example
 * getInnerSelector("iframe#content >>> article") // "article"
 */
export function getInnerSelector(deepSelector: string): string | null {
  if (!isDeepSelector(deepSelector)) {
    return null;
  }

  const parts = deepSelector.split(">>>").map((s) => s.trim());
  return parts.slice(1).join(" >>> ");
}

/**
 * Resolves all elements matching a selector, including iframe drilling
 * Similar to querySelectorDeep but returns all matches instead of just the first
 *
 * @param selector - CSS selector, optionally with >>> for iframe drilling
 * @param root - Root element or document to start search from (defaults to document)
 * @returns Array of all matched elements
 *
 * @example
 * // Find all paragraphs in an iframe
 * querySelectorAllDeep("iframe#content >>> p")
 */
export function querySelectorAllDeep(
  selector: string,
  root: Document | HTMLElement = document,
): Element[] {
  // If no iframe drilling syntax, use standard querySelectorAll
  if (!selector.includes(">>>")) {
    return Array.from(root.querySelectorAll(selector));
  }

  // Split by >>> and trim each part
  const parts = selector.split(">>>").map((s) => s.trim());

  // For iframe drilling, we need to handle differently
  // Get all iframes matching the first part
  const [iframeSelector, ...innerParts] = parts;
  const iframes = root.querySelectorAll(iframeSelector);
  const results: Element[] = [];

  for (const iframe of iframes) {
    if (iframe.tagName !== "IFRAME") continue;

    try {
      const iframeEl = iframe as HTMLIFrameElement;
      const innerDoc = iframeEl.contentDocument;
      if (!innerDoc) continue;

      // Build the inner selector
      const innerSelector = innerParts.join(" >>> ").trim();

      // Recursively handle nested iframes
      const innerElements = querySelectorAllDeep(innerSelector, innerDoc);
      results.push(...innerElements);
    } catch (e) {
      console.warn(
        "[querySelectorAllDeep] Cross-origin iframe blocked access",
        e,
      );
    }
  }

  return results;
}
