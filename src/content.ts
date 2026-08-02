import type { ExtensionMessage } from "./shared/types";
import { Picker } from "./ui/picker";
import { showToast } from "./ui/toast";

/**
 * Content Script
 * Runs in the context of web pages and handles:
 * - Picker UI for site configuration
 * - Markdown export execution
 * - Toast notifications
 */

console.log("Markdown Precision Saver content script loaded");

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
    // TODO: Look up SiteProfile for current domain
    // TODO: Execute recursive tree-based parser
    // TODO: Generate markdown

    const markdown = generateMarkdown();

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
    showToast("Export failed. See console for details.");
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

  picker.activate();
  showToast("Configuration mode activated. Click an element to start.", {
    type: "info",
  });
}

/**
 * Placeholder markdown generator
 */
function generateMarkdown(): string {
  // TODO: Implement actual markdown conversion logic
  const title = document.title;
  const url = window.location.href;

  return `# ${title}\n\n**Source:** ${url}\n\n[Content will be extracted here based on SiteProfile]`;
}
