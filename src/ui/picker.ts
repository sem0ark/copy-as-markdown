/**
 * Element picker orchestrator
 * Uses text input for CSS selectors with visual highlighting
 */

import { createExportNode } from "../shared/tree-utils";
import type { ExportNode } from "../shared/types";
import { querySelectorAllDeep } from "../utils/dom-utils";
import { Highlighter } from "./highlighter";
import { type MenuAction, PickerMenu } from "./picker-menu";

export interface PickerCallbacks {
  onNodeCreated: (node: ExportNode, element: Element) => void;
  onNodeRemoved?: (index: number) => void;
  onCancel: () => void;
  onComplete?: () => void;
}

export interface PickerOptions {
  existingRoots?: ExportNode[];
}

/**
 * Main picker class that provides a text input UI for CSS selectors
 */
export class Picker {
  private highlighter: Highlighter;
  private menu: PickerMenu;
  private panel: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private isActive = false;
  private callbacks: PickerCallbacks | null = null;
  private currentElements: Element[] = [];
  private roots: ExportNode[] = [];
  private rootsContainer: HTMLDivElement | null = null;

  constructor() {
    this.highlighter = new Highlighter();
    this.menu = new PickerMenu();
  }

  /**
   * Activates the picker UI
   */
  activate(callbacks: PickerCallbacks, options: PickerOptions = {}): void {
    if (this.isActive) return;

    this.isActive = true;
    this.callbacks = callbacks;
    this.roots = options.existingRoots || [];
    this.createPanel();
    this.highlighter.activate();
  }

  /**
   * Deactivates the picker UI
   */
  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.highlighter.deactivate();
    this.menu.hide();
    this.removePanel();
    this.callbacks = null;
  }

  /**
   * Creates the selector input panel
   */
  private createPanel(): void {
    this.panel = document.createElement("div");
    this.panel.className = "md-saver-picker-panel";

    Object.assign(this.panel.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "2147483647",
      backgroundColor: "#fff",
      border: "2px solid #4A90E2",
      borderRadius: "8px",
      padding: "16px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      minWidth: "450px",
      maxWidth: "600px",
      maxHeight: "80vh",
      overflow: "auto",
    });

    // Title
    const title = document.createElement("div");
    title.textContent = "Configure Export Roots";
    Object.assign(title.style, {
      fontSize: "14px",
      fontWeight: "600",
      marginBottom: "12px",
      color: "#333",
    });
    this.panel.appendChild(title);

    // Roots container
    this.rootsContainer = document.createElement("div");
    this.rootsContainer.className = "md-saver-roots-container";
    Object.assign(this.rootsContainer.style, {
      marginBottom: "12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    });
    this.panel.appendChild(this.rootsContainer);
    this.updateRootsDisplay();

    // Separator
    const separator = document.createElement("div");
    Object.assign(separator.style, {
      borderTop: "1px solid #e0e0e0",
      margin: "12px 0",
    });
    this.panel.appendChild(separator);

    // Subtitle for new root
    const subtitle = document.createElement("div");
    subtitle.textContent = "Add New Root";
    Object.assign(subtitle.style, {
      fontSize: "13px",
      fontWeight: "500",
      marginBottom: "8px",
      color: "#555",
    });
    this.panel.appendChild(subtitle);

    // Input field
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.placeholder = "e.g., .main-content or iframe#doc >>> article";
    Object.assign(this.input.style, {
      width: "100%",
      padding: "8px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      fontSize: "13px",
      fontFamily: "monospace",
      boxSizing: "border-box",
    });
    this.input.addEventListener("input", this.onInputChange);
    this.input.addEventListener("keydown", this.onInputKeydown);
    this.panel.appendChild(this.input);

    // Status line
    const status = document.createElement("div");
    status.className = "md-saver-status";
    Object.assign(status.style, {
      fontSize: "12px",
      marginTop: "8px",
      color: "#666",
      minHeight: "16px",
    });
    this.panel.appendChild(status);

    // Button row
    const buttonRow = document.createElement("div");
    Object.assign(buttonRow.style, {
      display: "flex",
      gap: "8px",
      marginTop: "12px",
    });

    const createButton = (
      text: string,
      action: () => void,
      primary = false,
    ) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      Object.assign(btn.style, {
        padding: "6px 12px",
        border: primary ? "none" : "1px solid #ddd",
        borderRadius: "4px",
        fontSize: "13px",
        cursor: "pointer",
        backgroundColor: primary ? "#4A90E2" : "#fff",
        color: primary ? "#fff" : "#333",
      });
      btn.addEventListener("click", action);
      return btn;
    };

    buttonRow.appendChild(
      createButton("Include", () => this.handleAction("include"), true),
    );
    buttonRow.appendChild(
      createButton("Ignore", () => this.handleAction("ignore")),
    );

    this.panel.appendChild(buttonRow);

    // Done/Cancel buttons
    const controlRow = document.createElement("div");
    Object.assign(controlRow.style, {
      display: "flex",
      gap: "8px",
      marginTop: "12px",
      paddingTop: "12px",
      borderTop: "1px solid #e0e0e0",
    });

    controlRow.appendChild(
      createButton("Done", () => this.handleComplete(), true),
    );
    controlRow.appendChild(createButton("Cancel", () => this.handleCancel()));

    this.panel.appendChild(controlRow);
    document.body.appendChild(this.panel);

    // Focus input
    this.input.focus();
  }

  /**
   * Removes the selector input panel
   */
  private removePanel(): void {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
      this.input = null;
      this.rootsContainer = null;
    }
  }

  /**
   * Updates the display of existing roots
   */
  private updateRootsDisplay(): void {
    if (!this.rootsContainer) return;

    this.rootsContainer.innerHTML = "";

    if (this.roots.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.textContent = "No roots configured yet";
      Object.assign(emptyMessage.style, {
        fontSize: "12px",
        color: "#999",
        fontStyle: "italic",
        padding: "8px",
      });
      this.rootsContainer.appendChild(emptyMessage);
      return;
    }

    for (let i = 0; i < this.roots.length; i++) {
      const root = this.roots[i];
      const rootBox = this.createRootBox(root, i);
      this.rootsContainer.appendChild(rootBox);
    }
  }

  /**
   * Creates a visual box for an existing root
   */
  private createRootBox(root: ExportNode, index: number): HTMLDivElement {
    const box = document.createElement("div");
    box.className = "md-saver-root-box";
    Object.assign(box.style, {
      border: "1px solid #ddd",
      borderRadius: "4px",
      padding: "10px",
      backgroundColor: "#f9f9f9",
      cursor: "pointer",
      transition: "all 0.2s",
      fontSize: "12px",
    });

    // Hover effect
    box.addEventListener("mouseenter", () => {
      Object.assign(box.style, {
        backgroundColor: "#f0f7ff",
        borderColor: "#4A90E2",
      });
      this.highlightRoot(root);
    });

    box.addEventListener("mouseleave", () => {
      Object.assign(box.style, {
        backgroundColor: "#f9f9f9",
        borderColor: "#ddd",
      });
      this.highlighter.hide();
    });

    // Click to highlight
    box.addEventListener("click", () => {
      this.highlightRoot(root);
    });

    // Root info
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "4px",
    });

    const label = document.createElement("div");
    label.textContent = `Root ${index + 1}`;
    Object.assign(label.style, {
      fontWeight: "600",
      color: "#333",
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "×";
    deleteBtn.title = "Remove this root";
    Object.assign(deleteBtn.style, {
      border: "none",
      background: "none",
      color: "#999",
      fontSize: "20px",
      cursor: "pointer",
      padding: "0",
      width: "20px",
      height: "20px",
      lineHeight: "20px",
      textAlign: "center",
    });
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.removeRoot(index);
    });
    deleteBtn.addEventListener("mouseenter", () => {
      deleteBtn.style.color = "#e74c3c";
    });
    deleteBtn.addEventListener("mouseleave", () => {
      deleteBtn.style.color = "#999";
    });

    header.appendChild(label);
    header.appendChild(deleteBtn);

    const selector = document.createElement("div");
    selector.textContent = root.selector;
    Object.assign(selector.style, {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#666",
      wordBreak: "break-all",
      marginBottom: "4px",
    });

    const action = document.createElement("div");
    action.textContent = `Action: ${root.action}`;
    Object.assign(action.style, {
      fontSize: "11px",
      color: "#999",
    });

    box.appendChild(header);
    box.appendChild(selector);
    box.appendChild(action);

    return box;
  }

  /**
   * Highlights elements matching a root's selector
   */
  private highlightRoot(root: ExportNode): void {
    try {
      const elements = querySelectorAllDeep(root.selector);
      if (elements.length > 0) {
        this.highlighter.highlight(elements[0]);
      }
    } catch (error) {
      console.warn("Failed to highlight root:", error);
      this.highlighter.hide();
    }
  }

  /**
   * Removes a root from the list
   */
  private removeRoot(index: number): void {
    this.roots.splice(index, 1);
    this.updateRootsDisplay();
    this.highlighter.hide();

    // Notify callback
    if (this.callbacks?.onNodeRemoved) {
      this.callbacks.onNodeRemoved(index);
    }
  }

  /**
   * Handles input change
   */
  private onInputChange = (): void => {
    const selector = this.input?.value.trim() || "";

    if (!selector) {
      this.highlighter.hide();
      this.currentElements = [];
      this.updateStatus("");
      return;
    }

    try {
      this.currentElements = querySelectorAllDeep(selector);

      if (this.currentElements.length === 0) {
        this.highlighter.hide();
        this.updateStatus("⚠️ No elements found");
      } else if (this.currentElements.length === 1) {
        this.highlighter.highlight(this.currentElements[0]);
        this.updateStatus("✓ 1 element found");
      } else {
        // Highlight first element
        this.highlighter.highlight(this.currentElements[0]);
        this.updateStatus(
          `⚠️ ${this.currentElements.length} elements found (first highlighted)`,
        );
      }
    } catch (error) {
      this.highlighter.hide();
      this.currentElements = [];
      this.updateStatus(`❌ Invalid selector: ${(error as Error).message}`);
    }
  };

  /**
   * Updates the status line
   */
  private updateStatus(text: string): void {
    const status = this.panel?.querySelector(".md-saver-status");
    if (status) {
      status.textContent = text;
    }
  }

  /**
   * Handles keydown in input
   */
  private onInputKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      this.handleAction("include");
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.handleCancel();
    }
  };

  /**
   * Handles action button clicks
   */
  private handleAction(action: MenuAction): void {
    const selector = this.input?.value.trim() || "";

    if (!selector) {
      alert("Please enter a CSS selector");
      return;
    }

    if (this.currentElements.length === 0) {
      alert("No elements found for this selector");
      return;
    }

    // Use first element for processing
    const element = this.currentElements[0];

    switch (action) {
      case "include":
        this.handleInclude(selector, element);
        break;
      case "ignore":
        this.handleIgnore(selector, element);
        break;
    }
  }

  /**
   * Handles "Include" action
   */
  private handleInclude(selector: string, element: Element): void {
    const node = createExportNode(selector, "include");

    console.log(`[Picker] Include: ${selector}`);

    this.roots.push(node);
    this.updateRootsDisplay();

    if (this.callbacks) {
      this.callbacks.onNodeCreated(node, element);
    }

    // Clear input and hide highlight
    if (this.input) {
      this.input.value = "";
      this.updateStatus("");
    }
    this.highlighter.hide();
    this.currentElements = [];
  }

  /**
   * Handles "Ignore" action
   */
  private handleIgnore(selector: string, element: Element): void {
    const node = createExportNode(selector, "ignore");

    console.log(`[Picker] Ignore: ${selector}`);

    this.roots.push(node);
    this.updateRootsDisplay();

    if (this.callbacks) {
      this.callbacks.onNodeCreated(node, element);
    }

    // Clear input and hide highlight
    if (this.input) {
      this.input.value = "";
      this.updateStatus("");
    }
    this.highlighter.hide();
    this.currentElements = [];
  }

  /**
   * Handles cancel action
   */
  private handleCancel(): void {
    console.log("[Picker] Cancelled");

    if (this.callbacks) {
      this.callbacks.onCancel();
    }

    this.deactivate();
  }

  /**
   * Handles completion of configuration
   */
  private handleComplete(): void {
    console.log("[Picker] Configuration complete");

    if (this.callbacks?.onComplete) {
      this.callbacks.onComplete();
    }

    this.deactivate();
  }
}
