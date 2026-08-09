/**
 * Represents a node in the SiteProfile tree structure.
 * Each node defines how a specific DOM element should be processed during export.
 */
export interface ExportNode {
  /** Unique identifier for this rule node */
  id: string;

  /** CSS selector to target the element */
  selector: string;

  /** Action to take on the matched element */
  action: "include" | "ignore" | "template";

  /** Optional Markdown template string using {{content}} placeholder */
  template?: string;

  /** Child rules that apply within this node's scope */
  children: ExportNode[];
}

/**
 * Site-specific configuration stored per domain.
 */
export interface SiteProfile {
  /** Domain pattern (e.g., "example.com" or "*.example.com") */
  domain: string;

  /** Root nodes of the export tree (supports multiple independent roots) */
  roots: ExportNode[];

  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Message types for communication between background and content scripts.
 */
export type ExtensionMessage =
  | { type: "EXPORT_PAGE" }
  | { type: "CONFIGURE_SITE" }
  | { type: "EXPORT_COMPLETE"; markdown: string }
  | { type: "SHOW_TOAST"; message: string };

/**
 * Storage schema for chrome.storage.local
 */
export interface StorageSchema {
  profiles: Record<string, SiteProfile>;
}
