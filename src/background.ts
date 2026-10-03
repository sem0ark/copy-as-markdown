import { populateMissingNodeIds } from "./shared/tree-utils";
import type { ExtensionMessage, SiteProfile } from "./shared/types";

/**
 * Background Service Worker
 * Handles toolbar clicks and context menu interactions.
 */

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "configure-export",
    title: "Configure Export",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "open-config",
    title: "Open Configuration Editor",
    contexts: ["action"],
  });

  console.log("Markdown Precision Saver installed");
});

// Handle toolbar icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // Send message to content script to trigger export
    const message: ExtensionMessage = { type: "EXPORT_PAGE" };
    await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    console.error("Failed to export page:", error);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === "configure-export") {
    try {
      // Send message to content script to activate picker UI
      const message: ExtensionMessage = { type: "CONFIGURE_SITE" };
      await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      console.error("Failed to activate configuration mode:", error);
    }
  } else if (info.menuItemId === "open-config") {
    // Open configuration editor in new tab
    chrome.tabs.create({ url: chrome.runtime.getURL("config.html") });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "SAVE_PROFILES") {
      const profiles = Object.fromEntries(
        Object.entries(message.profiles).map(([domain, profile]) => [
          domain,
          {
            ...populateMissingNodeIds(profile as SiteProfile),
            updatedAt: Date.now(),
          },
        ]),
      );
      chrome.storage.local
        .set({ profiles })
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "Save failed",
          }),
        );
      return true;
    }
    if (message.type === "EXPORT_COMPLETE") {
      console.log(
        "Export completed, markdown length:",
        message.markdown.length,
      );
    }

    return false;
  },
);
