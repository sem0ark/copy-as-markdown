/**
 * DOM readiness utilities for handling dynamically rendered content (React, Vue, etc.)
 */

/**
 * Waits for the DOM to have meaningful content, not just an empty shell
 * Useful for React/Vue/Angular apps that render asynchronously
 */
export async function waitForContent(
  options: {
    /** Maximum time to wait in milliseconds (default: 5000) */
    timeout?: number;
    /** Minimum number of text nodes to consider content ready (default: 3) */
    minTextNodes?: number;
    /** Minimum total text length to consider content ready (default: 100) */
    minTextLength?: number;
    /** Check interval in milliseconds (default: 100) */
    checkInterval?: number;
  } = {},
): Promise<boolean> {
  const {
    timeout = 5000,
    minTextNodes = 3,
    minTextLength = 100,
    checkInterval = 100,
  } = options;

  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkContent = () => {
      // Check if we have meaningful content
      if (hasContent(minTextNodes, minTextLength)) {
        resolve(true);
        return;
      }

      // Check timeout
      if (Date.now() - startTime >= timeout) {
        console.warn(
          "[DOM Ready] Timeout waiting for content, proceeding anyway",
        );
        resolve(false);
        return;
      }

      // Check again after interval
      setTimeout(checkContent, checkInterval);
    };

    // Start checking
    if (document.readyState === "loading") {
      // DOM not ready yet, wait for it
      document.addEventListener("DOMContentLoaded", checkContent);
    } else {
      // DOM ready, start checking for content
      checkContent();
    }
  });
}

/**
 * Checks if the document has meaningful content
 */
function hasContent(minTextNodes: number, minTextLength: number): boolean {
  const body = document.body;
  if (!body) return false;

  // Count text nodes with actual content
  let textNodeCount = 0;
  let totalTextLength = 0;

  const walker = document.createTreeWalker(
    body,
    NodeFilter.SHOW_TEXT,
    (node) => {
      // Skip whitespace-only nodes
      const text = node.textContent?.trim() || "";
      if (text.length > 0) {
        textNodeCount++;
        totalTextLength += text.length;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  );

  // Walk the tree (just to count, we don't need the nodes)
  while (walker.nextNode()) {
    // The filter above already counted
  }

  return textNodeCount >= minTextNodes && totalTextLength >= minTextLength;
}

/**
 * Waits for a specific selector to appear in the DOM
 * Useful for waiting for React components to mount
 */
export async function waitForSelector(
  selector: string,
  options: {
    /** Maximum time to wait in milliseconds (default: 5000) */
    timeout?: number;
    /** Check interval in milliseconds (default: 100) */
    checkInterval?: number;
  } = {},
): Promise<Element | null> {
  const { timeout = 5000, checkInterval = 100 } = options;

  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkSelector = () => {
      const element = document.querySelector(selector);

      if (element) {
        resolve(element);
        return;
      }

      // Check timeout
      if (Date.now() - startTime >= timeout) {
        console.warn(`[DOM Ready] Timeout waiting for selector "${selector}"`);
        resolve(null);
        return;
      }

      // Check again after interval
      setTimeout(checkSelector, checkInterval);
    };

    checkSelector();
  });
}

/**
 * Observes DOM mutations and resolves when meaningful content appears
 * More efficient than polling for SPA navigation
 */
export function observeContentReady(
  callback: () => void,
  options: {
    /** Minimum number of mutations before checking (default: 5) */
    minMutations?: number;
    /** Debounce delay in milliseconds (default: 500) */
    debounce?: number;
  } = {},
): () => void {
  const { minMutations = 5, debounce = 500 } = options;

  let mutationCount = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver(() => {
    mutationCount++;

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Only trigger callback after enough mutations and debounce period
    if (mutationCount >= minMutations) {
      debounceTimer = setTimeout(() => {
        callback();
        mutationCount = 0; // Reset counter
      }, debounce);
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Return cleanup function
  return () => {
    observer.disconnect();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  };
}
