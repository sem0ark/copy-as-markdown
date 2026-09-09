/**
 * Floating action menu for the element picker
 * Provides [Set Main], [Ignore] actions
 */

export type MenuAction = "include" | "ignore" | "cancel";

export interface MenuButton {
  label: string;
  action: MenuAction;
  description?: string;
}

export interface PickerMenuOptions {
  /** Buttons to display (default: all actions) */
  buttons?: MenuButton[];
  /** Z-index for the menu (default: 2147483646) */
  zIndex?: number;
  /** Offset from click position in pixels */
  offset?: { x: number; y: number };
}

/**
 * Manages the floating action menu
 */
export class PickerMenu {
  private menu: HTMLDivElement | null = null;
  private options: Required<PickerMenuOptions>;
  private onActionCallback: ((action: MenuAction) => void) | null = null;

  constructor(options: PickerMenuOptions = {}) {
    this.options = {
      buttons: options.buttons ?? [
        { label: "Set as Main Frame", action: "include" },
        { label: "Ignore Region", action: "ignore" },
        { label: "Cancel", action: "cancel" },
      ],
      zIndex: options.zIndex ?? 2147483646,
      offset: options.offset ?? { x: 10, y: 10 },
    };
  }

  /**
   * Shows the menu at the specified position
   */
  show(x: number, y: number, onAction: (action: MenuAction) => void): void {
    this.hide();

    this.onActionCallback = onAction;
    this.menu = document.createElement("div");
    this.menu.className = "md-saver-menu";

    // Apply container styles
    Object.assign(this.menu.style, {
      position: "absolute",
      top: `${y + window.scrollY + this.options.offset.y}px`,
      left: `${x + window.scrollX + this.options.offset.x}px`,
      zIndex: String(this.options.zIndex),
      backgroundColor: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      padding: "4px",
      minWidth: "180px",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: "14px",
    });

    // Create buttons
    for (const btn of this.options.buttons) {
      const button = this.createButton(btn);
      this.menu.appendChild(button);
    }

    // Ensure menu stays within viewport
    document.body.appendChild(this.menu);
    this.adjustPosition();
  }

  /**
   * Hides and removes the menu
   */
  hide(): void {
    if (this.menu) {
      this.menu.remove();
      this.menu = null;
    }
    this.onActionCallback = null;
  }

  /**
   * Creates a menu button
   */
  private createButton(config: MenuButton): HTMLButtonElement {
    const button = document.createElement("button");
    button.textContent = config.label;
    button.className = "md-saver-menu-button";

    // Apply button styles
    Object.assign(button.style, {
      display: "block",
      width: "100%",
      padding: "8px 12px",
      border: "none",
      borderRadius: "4px",
      backgroundColor: "transparent",
      color: "#374151",
      textAlign: "left",
      cursor: "pointer",
      fontSize: "14px",
      transition: "background-color 0.15s ease",
    });

    // Hover effect
    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = "#f3f4f6";
    });

    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = "transparent";
    });

    // Click handler
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.onActionCallback) {
        this.onActionCallback(config.action);
      }
    });

    return button;
  }

  /**
   * Adjusts menu position to keep it within viewport
   */
  private adjustPosition(): void {
    if (!this.menu) return;

    const rect = this.menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position
    if (rect.right > viewportWidth) {
      const left = Math.max(
        10,
        Number.parseFloat(this.menu.style.left) -
          (rect.right - viewportWidth) -
          10,
      );
      this.menu.style.left = `${left}px`;
    }

    // Adjust vertical position
    if (rect.bottom > viewportHeight) {
      const top = Math.max(
        10,
        Number.parseFloat(this.menu.style.top) -
          (rect.bottom - viewportHeight) -
          10,
      );
      this.menu.style.top = `${top}px`;
    }
  }

  /**
   * Checks if the menu is currently visible
   */
  get visible(): boolean {
    return this.menu !== null;
  }
}
