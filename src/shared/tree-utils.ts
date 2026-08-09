import type { ExportNode, SiteProfile } from "./types";

/**
 * Finds a node in the ExportNode tree by its unique ID.
 * @param root - The root node to start searching from
 * @param id - The unique identifier to search for
 * @returns The matching ExportNode or undefined if not found
 */
export function findNodeById(
  root: ExportNode,
  id: string,
): ExportNode | undefined {
  if (root.id === id) {
    return root;
  }

  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) {
      return found;
    }
  }

  return undefined;
}

/**
 * Generates a unique ID for a new ExportNode.
 * Uses a simple timestamp-based approach combined with a random suffix.
 * @returns A unique string identifier
 */
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validates a SiteProfile for correctness.
 * @param profile - The profile to validate
 * @returns An array of error messages, empty if valid
 */
export function validateSiteProfile(profile: SiteProfile): string[] {
  const errors: string[] = [];

  if (!profile.domain || typeof profile.domain !== "string") {
    errors.push("Domain must be a non-empty string");
  }

  if (!Array.isArray(profile.roots)) {
    errors.push("roots must be an array of ExportNodes");
  } else if (profile.roots.length === 0) {
    errors.push("At least one root ExportNode is required");
  } else {
    const seenIds = new Set<string>();
    for (const root of profile.roots) {
      errors.push(...validateExportNode(root, seenIds));
    }
  }

  if (typeof profile.updatedAt !== "number" || profile.updatedAt <= 0) {
    errors.push("updatedAt must be a positive number");
  }

  return errors;
}

/**
 * Validates an ExportNode and its descendants recursively.
 * @param node - The node to validate
 * @param seenIds - Set of IDs already encountered (to detect duplicates)
 * @returns An array of error messages
 */
function validateExportNode(node: ExportNode, seenIds: Set<string>): string[] {
  const errors: string[] = [];

  if (!node.id || typeof node.id !== "string") {
    errors.push("ExportNode ID must be a non-empty string");
  } else if (seenIds.has(node.id)) {
    errors.push(`Duplicate node ID found: ${node.id}`);
  } else {
    seenIds.add(node.id);
  }

  if (!node.selector || typeof node.selector !== "string") {
    errors.push(`Node ${node.id || "unknown"} must have a non-empty selector`);
  }

  if (!["include", "ignore", "template"].includes(node.action)) {
    errors.push(
      `Node ${node.id || "unknown"} has invalid action: ${node.action}`,
    );
  }

  if (
    node.action === "template" &&
    (!node.template || typeof node.template !== "string")
  ) {
    errors.push(
      `Node ${node.id || "unknown"} with action 'template' must have a template string`,
    );
  }

  if (!Array.isArray(node.children)) {
    errors.push(`Node ${node.id || "unknown"} children must be an array`);
  } else {
    for (const child of node.children) {
      errors.push(...validateExportNode(child, seenIds));
    }
  }

  return errors;
}

/**
 * Inserts a new ExportNode into the tree at the appropriate location.
 * Determines the correct parent based on DOM hierarchy.
 * @param root - The root node of the tree
 * @param newNode - The new node to insert
 * @param targetElement - The DOM element the new node represents
 * @returns true if inserted successfully, false if the location wasn't found
 */
export function insertNodeInTree(
  root: ExportNode,
  newNode: ExportNode,
  targetElement: Element,
): boolean {
  // Find the closest ancestor in the tree that matches a DOM parent
  const parent = findClosestParentNode(root, targetElement);

  if (parent) {
    parent.children.push(newNode);
    return true;
  }

  return false;
}

/**
 * Finds the closest ancestor ExportNode that matches a parent of the target element.
 * @param node - Current node being checked
 * @param targetElement - The DOM element to find a parent for
 * @returns The closest parent ExportNode or null
 */
function findClosestParentNode(
  node: ExportNode,
  targetElement: Element,
): ExportNode | null {
  // Check if the current node's selector matches an ancestor of targetElement
  const matchedElement = findMatchingAncestor(targetElement, node.selector);

  if (matchedElement) {
    // Try to find a more specific child node that's also an ancestor
    for (const child of node.children) {
      const childMatch = findClosestParentNode(child, targetElement);
      if (childMatch) {
        return childMatch;
      }
    }

    // This node is the closest ancestor
    return node;
  }

  return null;
}

/**
 * Finds an ancestor of the element that matches the given selector.
 * @param element - The element to start from
 * @param selector - The CSS selector to match
 * @returns The matching ancestor element or null
 */
function findMatchingAncestor(
  element: Element,
  selector: string,
): Element | null {
  let current: Element | null = element.parentElement;

  while (current) {
    try {
      if (current.matches(selector)) {
        return current;
      }
    } catch {
      // Invalid selector, skip
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * Creates a new ExportNode with default values.
 * @param selector - CSS selector for the node
 * @param action - Action type for the node
 * @param template - Optional template string
 * @returns A new ExportNode
 */
export function createExportNode(
  selector: string,
  action: "include" | "ignore" | "template",
  template?: string,
): ExportNode {
  return {
    id: generateNodeId(),
    selector,
    action,
    template,
    children: [],
  };
}
