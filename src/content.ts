import { processElement } from "./engine/processor";
import { elementToMarkdown } from "./engine/turndown-service";
import { getCurrentDomain, getProfile } from "./extension/storage";
import type { ExtensionMessage } from "./shared/types";
import { Picker } from "./ui/picker";
import { showToast } from "./ui/toast";
import { waitForContent } from "./utils/dom-ready";
import { querySelectorDeep } from "./utils/dom-utils";
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
    } else if (message.type === "SELECT_INSPECTED_ELEMENT") {
      handleSelectInspectedElement();
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
function handleConfigureSite() {
  console.log("Activating picker mode");

  if (!picker) {
    picker = new Picker();
  }

  picker.activate({
    onNodeCreated: async (node, _element) => {
      // Save the configuration
      const domain = getCurrentDomain();
      const profile = {
        domain,
        root: node,
        updatedAt: Date.now(),
      };

      await chrome.storage.local.set({
        profiles: {
          ...(await chrome.storage.local.get("profiles")).profiles,
          [domain]: profile,
        },
      });

      showToast("Configuration saved!", { type: "success" });
    },
    onCancel: () => {
      showToast("Configuration cancelled", { type: "info" });
    },
  });

  showToast("Configuration mode activated. Click an element to start.", {
    type: "info",
  });
}

/**
 * Selects the currently inspected element in DevTools
 */
function handleSelectInspectedElement() {
  // Get the element from DevTools inspector
  // Chrome provides $0 in console, but we need to use a different approach in content script
  // We'll get the last inspected element using the chrome.devtools API equivalent

  // For now, show instructions to user
  showToast(
    "Right-click on the element in the page (not DevTools) and select 'Use as Export Root'",
    { type: "info" },
  );

  // Alternative: Use the current mouse position
  console.log(
    "[DevTools] To use an inspected element, right-click it on the page and select 'Use as Export Root'",
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

  // Find the root element using the root selector (supports iframe drilling with >>>)
  let rootElement = querySelectorDeep(profile.root.selector);

  if (!rootElement) {
    // Try waiting for the element (it might be loading in a React app)
    console.warn(
      `Root element not found immediately: ${profile.root.selector}, waiting...`,
    );

    await waitForContent({
      timeout: 5000,
      minTextNodes: 1,
      minTextLength: 10,
    });

    // Try again after waiting
    rootElement = querySelectorDeep(profile.root.selector);

    if (!rootElement) {
      throw new Error(
        `Root element not found: ${profile.root.selector}. The page structure may have changed. Please reconfigure the site.`,
      );
    }
  }

  // Process the element tree according to the profile
  return processElement(rootElement, profile.root);
}
