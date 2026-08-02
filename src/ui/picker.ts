/**
 * Element picker orchestrator
 * Coordinates highlighter, menu, and selector generation
 */

import { createExportNode, insertNodeInTree } from "../shared/tree-utils";
import type { ExportNode } from "../shared/types";
import { getElementFromPoint, Highlighter } from "./highlighter";
import { type MenuAction, PickerMenu, promptForTemplate } from "./picker-menu";
import { generateElementLabel, generateSelector } from "./selector-gen";

export interface PickerCallbacks {
  onNodeCreated: (node: ExportNode, element: Element) => void;
  onCancel: () => void;
}

/**
 * Main picker class that orchestrates the element selection UI
 */
export class Picker {
  private highlighter: Highlighter;
  private menu: PickerMenu;
  private currentTarget: Element | null = null;
  private isActive = false;
  private callbacks: PickerCallbacks | null = null;

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
    this.highlighter.activate();
    this.attachListeners();
  }

  /**
   * Deactivates the picker UI
   */
  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.highlighter.deactivate();
    this.menu.hide();
    this.detachListeners();
    this.callbacks = null;
  }

  /**
   * Handles mouse move events
   */
  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isActive || this.menu.visible) return;

    const target = getElementFromPoint(e.clientX, e.clientY);

    if (
      target &&
      target !== document.body &&
      target !== document.documentElement
    ) {
      this.currentTarget = target;
      this.highlighter.highlight(target);
    } else {
      this.highlighter.hide();
      this.currentTarget = null;
    }
  };

  /**
   * Handles click events
   */
  private onClick = (e: MouseEvent): void => {
    if (!this.isActive) return;

    // Don't intercept if menu is already open
    if (this.menu.visible) return;

    e.preventDefault();
    e.stopPropagation();

    if (this.currentTarget) {
      this.showMenu(this.currentTarget, e.clientX, e.clientY);
    }
  };

  /**
   * Handles keydown events (ESC to cancel)
   */
  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.isActive) return;

    if (e.key === "Escape") {
      e.preventDefault();
      this.handleCancel();
    }
  };

  /**
   * Shows the action menu for the selected element
   */
  private showMenu(element: Element, x: number, y: number): void {
    this.menu.show(x, y, (action) => {
      this.handleMenuAction(action, element);
    });
  }

  /**
   * Handles menu action selection
   */
  private handleMenuAction(action: MenuAction, element: Element): void {
    this.menu.hide();

    switch (action) {
      case "include":
        this.handleInclude(element);
        break;
      case "ignore":
        this.handleIgnore(element);
        break;
      case "template":
        this.handleTemplate(element);
        break;
      case "cancel":
        this.handleCancel();
        break;
    }
  }

  /**
   * Handles "Set as Main Frame" action
   */
  private handleInclude(element: Element): void {
    const selector = generateSelector(element);
    const node = createExportNode(selector, "include");

    console.log(
      `[Picker] Include: ${generateElementLabel(element)} → ${selector}`,
    );

    if (this.callbacks) {
      this.callbacks.onNodeCreated(node, element);
    }

    this.deactivate();
  }

  /**
   * Handles "Ignore Region" action
   */
  private handleIgnore(element: Element): void {
    const selector = generateSelector(element);
    const node = createExportNode(selector, "ignore");

    console.log(
      `[Picker] Ignore: ${generateElementLabel(element)} → ${selector}`,
    );

    if (this.callbacks) {
      this.callbacks.onNodeCreated(node, element);
    }

    this.deactivate();
  }

  /**
   * Handles "Create Template" action
   */
  private handleTemplate(element: Element): void {
    const template = promptForTemplate();

    if (!template) {
      // User cancelled the prompt, reactivate picker
      return;
    }

    const selector = generateSelector(element);
    const node = createExportNode(selector, "template", template);

    console.log(
      `[Picker] Template: ${generateElementLabel(element)} → ${selector}\nTemplate: ${template}`,
    );

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

  /**
   * Attaches event listeners
   */
  private attachListeners(): void {
    document.addEventListener("mousemove", this.onMouseMove, true);
    document.addEventListener("click", this.onClick, true);
    document.addEventListener("keydown", this.onKeyDown, true);
  }

  /**
   * Detaches event listeners
   */
  private detachListeners(): void {
    document.removeEventListener("mousemove", this.onMouseMove, true);
    document.removeEventListener("click", this.onClick, true);
    document.removeEventListener("keydown", this.onKeyDown, true);
  }
}
