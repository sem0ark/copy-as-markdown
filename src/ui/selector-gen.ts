/**
 * Generates stable CSS selectors for DOM elements
 * Priority: ID > Unique Class > nth-child path
 */

/**
 * Options for selector generation
 */
export interface SelectorOptions {
  /** Exclude classes matching this prefix (e.g., extension-injected classes) */
  excludeClassPrefix?: string;
  /** Maximum depth for nth-child traversal */
  maxDepth?: number;
  /** Root element to stop traversal at */
  root?: Element;
}

/**
 * Generates a CSS selector for the given element.
 * Prioritizes specificity and stability:
 * 1. ID (if present and unique)
 * 2. Unique class combination
 * 3. nth-child path from root
 */
export function generateSelector(
  element: Element,
  options: SelectorOptions = {},
): string {
  const {
    excludeClassPrefix = "md-saver-",
    maxDepth = 10,
    root = document.body,
  } = options;

  // Strategy 1: Try ID
  if (element.id) {
    const selector = `#${CSS.escape(element.id)}`;
    if (isUniqueSelector(selector)) {
      return selector;
    }
  }

  // Strategy 2: Try unique class combination
  const classSelector = generateClassSelector(element, excludeClassPrefix);
  if (classSelector && isUniqueSelector(classSelector)) {
    return classSelector;
  }

  // Strategy 3: Build nth-child path
  return generateNthChildPath(element, root, maxDepth);
}

/**
 * Generates a class-based selector for the element
 */
function generateClassSelector(
  element: Element,
  excludePrefix: string,
): string | null {
  if (!element.className || typeof element.className !== "string") {
    return null;
  }

  const classes = Array.from(element.classList)
    .filter((c) => c && !c.startsWith(excludePrefix))
    .map((c) => CSS.escape(c));

  if (classes.length === 0) {
    return null;
  }

  const tag = element.tagName.toLowerCase();
  return `${tag}.${classes.join(".")}`;
}

/**
 * Generates an nth-child path from root to element
 */
function generateNthChildPath(
  element: Element,
  root: Element,
  maxDepth: number,
): string {
  const path: string[] = [];
  let current: Element | null = element;
  let depth = 0;

  while (current && current !== root && depth < maxDepth) {
    const parent = current.parentElement;
    if (!parent) break;

    const tag = current.tagName.toLowerCase();
    const index = getElementIndex(current);

    // Use nth-of-type for better readability and stability
    path.unshift(`${tag}:nth-of-type(${index})`);

    current = parent;
    depth++;
  }

  // If we stopped at root or maxDepth, prepend root tag
  if (current === root) {
    path.unshift(root.tagName.toLowerCase());
  }

  return path.join(" > ");
}

/**
 * Gets the 1-based index of element among its siblings of the same type
 */
function getElementIndex(element: Element): number {
  const parent = element.parentElement;
  if (!parent) return 1;

  const siblings = Array.from(parent.children).filter(
    (child) => child.tagName === element.tagName,
  );

  return siblings.indexOf(element) + 1;
}

/**
 * Checks if a selector uniquely identifies an element
 */
function isUniqueSelector(selector: string): boolean {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1;
  } catch {
    return false;
  }
}

/**
 * Tests if a generated selector correctly targets the original element
 */
export function validateSelector(element: Element, selector: string): boolean {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch {
    return false;
  }
}

/**
 * Generates a human-readable label for an element
 */
export function generateElementLabel(element: Element): string {
  const tag = element.tagName.toLowerCase();

  if (element.id) {
    return `${tag}#${element.id}`;
  }

  const firstClass = Array.from(element.classList).find(
    (c) => !c.startsWith("md-saver-"),
  );

  if (firstClass) {
    return `${tag}.${firstClass}`;
  }

  const textContent = element.textContent?.trim();
  if (textContent) {
    const truncated = textContent.slice(0, 30);
    const suffix = textContent.length > 30 ? "..." : "";
    return `${tag} "${truncated}${suffix}"`;
  }

  return tag;
}
