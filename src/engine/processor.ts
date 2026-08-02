import type { ExportNode, SiteProfile } from '../shared/types';

/**
 * Core DOM processing engine
 * Traverses the DOM tree alongside the SiteProfile tree
 */

/**
 * Processes a DOM element according to the ExportNode rules
 */
export function processNode(
  element: Element,
  node: ExportNode
): string | null {
  // Match the selector
  if (!element.matches(node.selector)) {
    return null;
  }

  // Apply action
  switch (node.action) {
    case 'ignore':
      return null;

    case 'template':
      return applyTemplate(element, node.template || '{{content}}');

    case 'include':
    default:
      return processChildren(element, node.children);
  }
}

/**
 * Recursively processes child nodes
 */
function processChildren(
  element: Element,
  childRules: ExportNode[]
): string {
  let result = '';

  // If there are child rules, apply them recursively
  if (childRules.length > 0) {
    for (const child of element.children) {
      for (const rule of childRules) {
        const processed = processNode(child, rule);
        if (processed) {
          result += processed + '\n';
        }
      }
    }
  } else {
    // No child rules, just extract text content
    result = element.textContent || '';
  }

  return result.trim();
}

/**
 * Applies a template string with {{content}} placeholder
 */
function applyTemplate(element: Element, template: string): string {
  const content = element.textContent || '';
  return template.replace(/\{\{content\}\}/g, content.trim());
}

/**
 * Main entry point for processing a page
 */
export function processPage(profile: SiteProfile): string {
  const rootElement = document.querySelector(profile.root.selector);

  if (!rootElement) {
    throw new Error(`Root selector not found: ${profile.root.selector}`);
  }

  return processNode(rootElement, profile.root) || '';
}
