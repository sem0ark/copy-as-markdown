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
      return elementToMarkdown(el);
    }

    // If child rules exist, process them recursively
    return processWithChildRules(el, config.children);
  }

  // Default fallback
  return "";
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

  // Process each child rule
  for (const rule of childRules) {
    // Find all matching elements within this parent
    const matchingElements = Array.from(clone.querySelectorAll(rule.selector));

    for (const matchedEl of matchingElements) {
      // Recursively process this matched element
      const result = processElement(matchedEl as HTMLElement, rule);

      if (result) {
        results.push(result);
      }

      // Remove from clone regardless of action to prevent duplicate processing
      // This ensures each element is only processed once
      matchedEl.remove();
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
