/**
 * Visual highlighter overlay for element selection
 * Provides real-time feedback as the user hovers over elements
 */

export interface HighlighterOptions {
  /** Z-index for the overlay (default: 2147483647) */
  zIndex?: number;
  /** Border color (default: #4A90E2) */
  borderColor?: string;
  /** Border width in pixels (default: 2) */
  borderWidth?: number;
  /** Background color with alpha (default: rgba(74, 144, 226, 0.1)) */
  backgroundColor?: string;
}

/**
 * Manages the visual overlay for element highlighting
 */
export class Highlighter {
  private overlay: HTMLDivElement | null = null;
  private options: Required<HighlighterOptions>;
  private isActive = false;

  constructor(options: HighlighterOptions = {}) {
    this.options = {
      zIndex: options.zIndex ?? 2147483647,
      borderColor: options.borderColor ?? "#4A90E2",
      borderWidth: options.borderWidth ?? 2,
      backgroundColor: options.backgroundColor ?? "rgba(74, 144, 226, 0.1)",
    };
  }

  /**
   * Creates and injects the overlay element
   */
  activate(): void {
    if (this.isActive || this.overlay) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "md-saver-highlight";

    // Apply styles
    Object.assign(this.overlay.style, {
      position: "absolute",
      pointerEvents: "none",
      transition: "all 0.1s ease-out",
      border: `${this.options.borderWidth}px solid ${this.options.borderColor}`,
      backgroundColor: this.options.backgroundColor,
      zIndex: String(this.options.zIndex),
      borderRadius: "2px",
      boxSizing: "border-box",
    });

    document.body.appendChild(this.overlay);
    this.isActive = true;
  }

  /**
   * Removes the overlay element
   */
  deactivate(): void {
    if (!this.isActive) return;

    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    this.isActive = false;
  }

  /**
   * Updates the overlay to highlight the given element
   */
  highlight(element: Element): void {
    if (!this.overlay || !this.isActive) return;

    const rect = element.getBoundingClientRect();

    // Update position and size
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;
    this.overlay.style.top = `${rect.top + window.scrollY}px`;
    this.overlay.style.left = `${rect.left + window.scrollX}px`;
    this.overlay.style.display = "block";
  }

  /**
   * Hides the overlay without removing it
   */
  hide(): void {
    if (this.overlay) {
      this.overlay.style.display = "none";
    }
  }

  /**
   * Checks if the highlighter is currently active
   */
  get active(): boolean {
    return this.isActive;
  }
}
