/**
 * Advanced SPA Monitor for Markdown Extraction
 * Uses stability detection instead of mutation counting
 */

export interface SPAMonitorCallbacks {
  onNavigationDetected?: () => void;
  onContentReady?: () => void;
}

/**
 * Monitors for SPA navigation and content stability
 * Uses modern Navigation API with fallbacks and stability detection
 */
export class SPAMonitor {
  private observer: MutationObserver | null = null;
  private stabilityTimer: ReturnType<typeof setTimeout> | null = null;
  private lastUrl: string;
  private callbacks: SPAMonitorCallbacks;

  constructor(callbacks: SPAMonitorCallbacks = {}) {
    this.callbacks = callbacks;
    this.lastUrl = window.location.href;
  }

  /**
   * Starts monitoring for SPA navigation and stability
   */
  start(): void {
    this.observeNavigation();
    this.observeStability();
    console.log("[SPA Monitor] Started monitoring");
  }

  /**
   * Stops monitoring
   */
  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = null;
    }

    console.log("[SPA Monitor] Stopped monitoring");
  }

  /**
   * Detects navigation using the modern Navigation API (Chrome 102+)
   * with a fallback to popstate
   */
  private observeNavigation(): void {
    // Modern Navigation API (Chrome 102+, Edge 102+)
    if ("navigation" in window) {
      // biome-ignore lint/suspicious/noExplicitAny: Navigation API is not in TypeScript types yet
      (window as any).navigation.addEventListener("navigate", (event: any) => {
        // Only trigger for actual URL changes, not hash changes or downloads
        if (event.canIntercept && !event.hashChange && !event.downloadRequest) {
          this.handleUrlChange();
        }
      });
    } else {
      // Fallback: popstate for back/forward navigation
      window.addEventListener("popstate", () => this.handleUrlChange());

      // Also monitor pushState/replaceState for programmatic navigation
      // This is less invasive than full monkey-patching
      const originalPushState = history.pushState.bind(history);
      const originalReplaceState = history.replaceState.bind(history);

      history.pushState = (...args) => {
        originalPushState(...args);
        this.handleUrlChange();
      };

      history.replaceState = (...args) => {
        originalReplaceState(...args);
        this.handleUrlChange();
      };
    }
  }

  /**
   * Handles URL changes
   */
  private handleUrlChange(): void {
    const currentUrl = window.location.href;
    if (currentUrl !== this.lastUrl) {
      this.lastUrl = currentUrl;
      console.log("[SPA Monitor] Navigation detected:", currentUrl);
      this.callbacks.onNavigationDetected?.();
      this.observeStability(); // Re-trigger stability check
    }
  }

  /**
   * Stability Algorithm: Content is ready when the DOM stops changing
   * for a specific duration (500ms of silence)
   */
  private observeStability(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      const isSignificant = mutations.some((mutation) => {
        const target = mutation.target as Element;
        // Ignore our own UI, script/style tags, and head changes
        return (
          !target.closest?.(
            ".md-saver-highlight, .md-saver-menu, .md-saver-toast",
          ) && !["SCRIPT", "STYLE", "HEAD"].includes(target.nodeName)
        );
      });

      if (isSignificant) {
        this.resetStabilityTimer();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true, // Track React attribute changes (class, data-*)
      characterData: false,
    });

    this.resetStabilityTimer();
  }

  /**
   * Resets the stability timer
   * Content is considered "stable" after 500ms of no mutations
   */
  private resetStabilityTimer(): void {
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
    }

    // 500ms of silence = React/Vue finished hydration
    this.stabilityTimer = setTimeout(async () => {
      const ready = await this.isContentTrulyReady();
      if (ready) {
        console.log("[SPA Monitor] Content stable and ready");
        this.observer?.disconnect();
        this.callbacks.onContentReady?.();
      } else {
        // If heuristics fail, keep observing
        console.log(
          "[SPA Monitor] Content not ready yet, continuing to observe",
        );
        this.resetStabilityTimer();
      }
    }, 500);
  }

  /**
   * Heuristics specific to Markdown Export
   * Checks for text density, loading states, and LaTeX rendering
   */
  private async isContentTrulyReady(): Promise<boolean> {
    return new Promise((resolve) => {
      const check = () => {
        const body = document.body;

        // 1. Check for basic text density
        const textContent = body.innerText || "";
        if (textContent.length < 200) {
          console.log("[Content Check] Insufficient text content");
          return resolve(false);
        }

        // 2. Check for common SPA "Loading" states (case-insensitive)
        const loadingSelectors = [
          '[class*="loading" i]',
          '[class*="spinner" i]',
          '[class*="skeleton" i]',
          '[aria-busy="true"]',
          '[data-loading="true"]',
        ];

        for (const selector of loadingSelectors) {
          const loading = body.querySelector(selector);
          // Check if element is visible (has layout)
          if (loading && (loading as HTMLElement).offsetParent !== null) {
            console.log("[Content Check] Loading indicator still visible");
            return resolve(false);
          }
        }

        // 3. LaTeX Check: If KaTeX/MathJax is present, ensure it's rendered
        const mathContainers = body.querySelectorAll(".katex, mjx-container");
        if (mathContainers.length > 0) {
          // Check if math content has been processed
          const hasRenderedMath =
            body.querySelector(".katex-html, mjx-math") !== null;
          if (!hasRenderedMath) {
            console.log("[Content Check] Math not yet rendered");
            return resolve(false);
          }
        }

        // 4. Check for semantic content elements
        const semanticElements = body.querySelectorAll(
          "p, article, section, h1, h2, h3, h4, h5, h6, li",
        );
        if (semanticElements.length < 3) {
          console.log("[Content Check] Insufficient semantic elements");
          return resolve(false);
        }

        console.log("[Content Check] All heuristics passed");
        resolve(true);
      };

      // Run check when browser is idle to avoid competing with framework
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => check(), { timeout: 1000 });
      } else {
        setTimeout(check, 0);
      }
    });
  }
}

/**
 * Waits for content stability with retry logic
 * Uses the stability-based approach instead of simple polling
 */
export async function waitForContentWithRetry(
  options: {
    /** Maximum time to wait in milliseconds (default: 10000) */
    timeout?: number;
    /** Stability window in milliseconds (default: 500) */
    stabilityWindow?: number;
  } = {},
): Promise<boolean> {
  const { timeout = 10000 } = options;

  return new Promise((resolve) => {
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

    const monitor = new SPAMonitor({
      onContentReady: () => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        monitor.stop();
        resolve(true);
      },
    });

    // Set timeout
    timeoutTimer = setTimeout(() => {
      console.warn("[Content Ready] Timeout reached, proceeding anyway");
      monitor.stop();
      resolve(false);
    }, timeout);

    monitor.start();
  });
}
