import { processElement } from "./engine/processor";
import { elementToMarkdown } from "./engine/turndown-service";
import { getCurrentDomain, getProfile } from "./extension/storage";
import type { ExtensionMessage } from "./shared/types";
import { Picker } from "./ui/picker";
import { showToast } from "./ui/toast";
import { waitForContent } from "./utils/dom-ready";
import { querySelectorAllDeep as querySelectorDeepAll } from "./utils/dom-utils";
import { SPAMonitor, waitForContentWithRetry } from "./utils/spa-monitor";

/**
 * Content Script
 * Runs in the context of web pages and handles:
 * - Picker UI for site configuration
 * - Markdown export execution
 * - Toast notifications
 */

console.log("Markdown Precision Saver content script loaded");

// Wait for content to be ready (handles React/SPA apps)
let isContentReady = false;
waitForContent({ timeout: 5000, minTextNodes: 3, minTextLength: 100 }).then(
  (ready) => {
    isContentReady = ready;
    if (ready) {
      console.log("Content ready for export");
    } else {
      console.warn("Content readiness check timed out");
    }
  },
);

// Monitor for SPA navigation (React Router, Vue Router, etc.)
const spaMonitor = new SPAMonitor({
  onNavigationDetected: () => {
    console.log("SPA navigation detected, re-checking content readiness");
    isContentReady = false;
    waitForContent({ timeout: 3000, minTextNodes: 3, minTextLength: 100 }).then(
      (ready) => {
        isContentReady = ready;
      },
    );
  },
});
spaMonitor.start();

// Global picker instance
let picker: Picker | null = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, _sendResponse) => {
    if (message.type === "EXPORT_PAGE") {
      handleExportPage();
    } else if (message.type === "CONFIGURE_SITE") {
      handleConfigureSite();
    }

    return false;
  },
);

/**
 * Handles the page export flow (Scenario A)
 */
async function handleExportPage() {
  try {
    // Wait for content if not ready yet (React/SPA apps)
    if (!isContentReady) {
      showToast("Waiting for page content...", { type: "info" });
      const ready = await waitForContentWithRetry({
        timeout: 10000,
        stabilityWindow: 500,
      });
      if (!ready) {
        showToast("Page content may not be fully loaded. Exporting anyway...", {
          type: "warning",
        });
      } else {
        isContentReady = true;
      }
    }

    const markdown = await generateMarkdown();

    // Copy to clipboard
    await navigator.clipboard.writeText(markdown);

    // Show success toast
    showToast("Markdown Copied!");

    // Notify background script
    const message: ExtensionMessage = {
      type: "EXPORT_COMPLETE",
      markdown,
    };
    chrome.runtime.sendMessage(message);
  } catch (error) {
    console.error("Export failed:", error);
    showToast("Export failed. See console for details.", { type: "error" });
  }
}

/**
 * Activates the picker UI for site configuration (Scenario B)
 */
async function handleConfigureSite() {
  console.log("Activating picker mode");

  if (!picker) {
    picker = new Picker();
  }

  // Get existing profile for this domain
  const domain = getCurrentDomain();
  const existingProfile = await getProfile(domain);
  const currentRoots = existingProfile?.roots || [];

  // Track roots being configured in this session
  const sessionRoots = [...currentRoots];

  picker.activate(
    {
      onNodeCreated: async (node, _element) => {
        // Add to session roots
        sessionRoots.push(node);

        // Save profile with all roots
        const profile = {
          domain,
          roots: sessionRoots,
          updatedAt: Date.now(),
        };

        await chrome.storage.local.set({
          profiles: {
            ...(await chrome.storage.local.get("profiles")).profiles,
            [domain]: profile,
          },
        });

        console.log(`Root added. Total roots: ${sessionRoots.length}`);
      },
      onNodeRemoved: async (index: number) => {
        // Remove from session roots
        sessionRoots.splice(index, 1);

        // Save profile with updated roots
        const profile = {
          domain,
          roots: sessionRoots,
          updatedAt: Date.now(),
        };

        await chrome.storage.local.set({
          profiles: {
            ...(await chrome.storage.local.get("profiles")).profiles,
            [domain]: profile,
          },
        });

        console.log(`Root removed. Total roots: ${sessionRoots.length}`);
      },
      onCancel: () => {
        showToast("Configuration cancelled", { type: "info" });
      },
      onComplete: async () => {
        // Save final profile
        const profile = {
          domain,
          roots: sessionRoots,
          updatedAt: Date.now(),
        };

        await chrome.storage.local.set({
          profiles: {
            ...(await chrome.storage.local.get("profiles")).profiles,
            [domain]: profile,
          },
        });

        const rootCount = sessionRoots.length;
        showToast(
          `Configuration saved! (${rootCount} root${rootCount > 1 ? "s" : ""})`,
          { type: "success" },
        );
      },
    },
    {
      existingRoots: currentRoots,
    },
  );

  showToast(
    currentRoots.length > 0
      ? `Configuration mode activated. ${currentRoots.length} existing root${currentRoots.length > 1 ? "s" : ""}.`
      : "Configuration mode activated. Add your first root.",
    { type: "info" },
  );
}

/**
 * Generates markdown using the stored SiteProfile for current domain
 * Falls back to full-page export if no profile exists
 */
async function generateMarkdown(): Promise<string> {
  const domain = getCurrentDomain();
  const profile = await getProfile(domain);

  if (!profile) {
    // No profile configured: export full page body as markdown
    console.log(`No profile found for ${domain}, exporting full page`);
    return elementToMarkdown(document.body);
  }

  // Use the configured profile to process the page
  console.log(`Using profile for ${domain}:`, profile);

  const results: string[] = [];

  // Process each root in the profile
  for (const root of profile.roots) {
    // Find all elements matching this root selector (supports iframe drilling with >>>)
    let rootElements = querySelectorDeepAll(root.selector);

    if (rootElements.length === 0) {
      // Try waiting for the elements (they might be loading in a React app)
      console.warn(
        `Root elements not found immediately: ${root.selector}, waiting...`,
      );

      await waitForContent({
        timeout: 5000,
        minTextNodes: 1,
        minTextLength: 10,
      });

      // Try again after waiting
      rootElements = querySelectorDeepAll(root.selector);

      if (rootElements.length === 0) {
        console.warn(
          `Root element not found: ${root.selector}. Skipping this root.`,
        );
        continue;
      }
    }

    console.log(
      `Processing ${rootElements.length} element(s) for selector: ${root.selector}`,
    );

    // Process all matching elements for this root
    for (const rootElement of rootElements) {
      const result = processElement(rootElement, root);
      if (result.trim()) {
        results.push(result);
      }
    }
  }

  if (results.length === 0) {
    throw new Error(
      "No content was exported. The page structure may have changed. Please reconfigure the site.",
    );
  }

  // Join all results with double newline separator
  return results.join("\n\n");
}
