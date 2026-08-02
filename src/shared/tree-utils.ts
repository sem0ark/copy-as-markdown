import type { ExportNode, SiteProfile } from './types';

/**
 * Finds a node in the ExportNode tree by its unique ID.
 * @param root - The root node to start searching from
 * @param id - The unique identifier to search for
 * @returns The matching ExportNode or undefined if not found
 */
export function findNodeById(root: ExportNode, id: string): ExportNode | undefined {
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

  if (!profile.domain || typeof profile.domain !== 'string') {
    errors.push('Domain must be a non-empty string');
  }

  if (!profile.root) {
    errors.push('Root ExportNode is required');
  } else {
    errors.push(...validateExportNode(profile.root, new Set()));
  }

  if (typeof profile.updatedAt !== 'number' || profile.updatedAt <= 0) {
    errors.push('updatedAt must be a positive number');
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

  if (!node.id || typeof node.id !== 'string') {
    errors.push('ExportNode ID must be a non-empty string');
  } else if (seenIds.has(node.id)) {
    errors.push(`Duplicate node ID found: ${node.id}`);
  } else {
    seenIds.add(node.id);
  }

  if (!node.selector || typeof node.selector !== 'string') {
    errors.push(`Node ${node.id || 'unknown'} must have a non-empty selector`);
  }

  if (!['include', 'ignore', 'template'].includes(node.action)) {
    errors.push(`Node ${node.id || 'unknown'} has invalid action: ${node.action}`);
  }

  if (node.action === 'template' && (!node.template || typeof node.template !== 'string')) {
    errors.push(`Node ${node.id || 'unknown'} with action 'template' must have a template string`);
  }

  if (!Array.isArray(node.children)) {
    errors.push(`Node ${node.id || 'unknown'} children must be an array`);
  } else {
    for (const child of node.children) {
      errors.push(...validateExportNode(child, seenIds));
    }
  }

  return errors;
}
