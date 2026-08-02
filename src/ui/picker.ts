/**
 * Element picker orchestrator
 * Uses text input for CSS selectors with visual highlighting
 */

import { processElement } from "../engine/processor";
import { createExportNode } from "../shared/tree-utils";
import type { ExportNode } from "../shared/types";
import { querySelectorAllDeep } from "../utils/dom-utils";
import { Highlighter } from "./highlighter";
import { type MenuAction, PickerMenu, promptForTemplate } from "./picker-menu";

export interface PickerCallbacks {
  onNodeCreated: (node: ExportNode, element: Element) => void;
  onCancel: () => void;
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

  constructor() {
    this.highlighter = new Highlighter();
    this.menu = new PickerMenu();
  }

  /**
   * Activates the picker UI
   */
  activate(callbacks: PickerCallbacks): void {
    if (this.isActive) return;

    this.isActive = true;
    this.callbacks = callbacks;
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
      minWidth: "400px",
    });

    // Title
    const title = document.createElement("div");
    title.textContent = "Enter CSS Selector";
    Object.assign(title.style, {
      fontSize: "14px",
      fontWeight: "600",
      marginBottom: "8px",
      color: "#333",
    });
    this.panel.appendChild(title);

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
    buttonRow.appendChild(
      createButton("Template", () => this.handleAction("template")),
    );
    buttonRow.appendChild(createButton("Cancel", () => this.handleCancel()));

    this.panel.appendChild(buttonRow);
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
      case "template":
        this.handleTemplate(selector, element);
        break;
    }
  }

  /**
   * Handles "Include" action
   */
  private handleInclude(selector: string, element: Element): void {
    const node = createExportNode(selector, "include");

    console.log(`[Picker] Include: ${selector}`);

    if (this.callbacks) {
      this.callbacks.onNodeCreated(node, element);
    }

    this.deactivate();
  }

  /**
   * Handles "Ignore" action
   */
  private handleIgnore(selector: string, element: Element): void {
    const node = createExportNode(selector, "ignore");

    console.log(`[Picker] Ignore: ${selector}`);

    if (this.callbacks) {
      this.callbacks.onNodeCreated(node, element);
    }

    this.deactivate();
  }

  /**
   * Handles "Template" action
   */
  private handleTemplate(selector: string, element: Element): void {
    const template = promptForTemplate();

    if (!template) {
      return;
    }

    const node = createExportNode(selector, "template", template);

    console.log(`[Picker] Template: ${selector}\nTemplate: ${template}`);

    if (this.callbacks) {
      this.callbacks.onNodeCreated(node, element);
    }

    this.deactivate();
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
}
