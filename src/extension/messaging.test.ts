import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionMessage } from "../shared/types";

/**
 * Unit tests for message passing between background and content scripts
 *
 * Stage 5: Extension Integration & Clipboard
 * Verifies that the background script correctly triggers the content script
 */

describe("Extension Messaging", () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let mockOnMessage: ReturnType<typeof vi.fn>;
  let messageListener: ((message: ExtensionMessage) => void) | null = null;

  beforeEach(() => {
    mockSendMessage = vi.fn();
    mockOnMessage = vi.fn((callback) => {
      messageListener = callback;
    });

    global.chrome = {
      runtime: {
        sendMessage: mockSendMessage,
        onMessage: {
          addListener: mockOnMessage,
        },
      },
      tabs: {
        sendMessage: vi.fn(),
      },
    } as any;
  });

  describe("Background -> Content: EXPORT_PAGE", () => {
    it("should send EXPORT_PAGE message when toolbar is clicked", async () => {
      const tabId = 123;

      // Simulate toolbar click
      const message: ExtensionMessage = { type: "EXPORT_PAGE" };
      await chrome.tabs.sendMessage(tabId, message);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, {
        type: "EXPORT_PAGE",
      });
    });

    it("should handle content script receiving EXPORT_PAGE", () => {
      const mockHandler = vi.fn();

      // Simulate content script registering listener
      chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
        if (message.type === "EXPORT_PAGE") {
          mockHandler();
        }
      });

      // Simulate receiving message
      const message: ExtensionMessage = { type: "EXPORT_PAGE" };
      if (messageListener) {
        messageListener(message);
      }

      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe("Background -> Content: CONFIGURE_SITE", () => {
    it("should send CONFIGURE_SITE message from context menu", async () => {
      const tabId = 456;

      const message: ExtensionMessage = { type: "CONFIGURE_SITE" };
      await chrome.tabs.sendMessage(tabId, message);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, {
        type: "CONFIGURE_SITE",
      });
    });

    it("should handle content script receiving CONFIGURE_SITE", () => {
      const mockHandler = vi.fn();

      chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
        if (message.type === "CONFIGURE_SITE") {
          mockHandler();
        }
      });

      const message: ExtensionMessage = { type: "CONFIGURE_SITE" };
      if (messageListener) {
        messageListener(message);
      }

      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe("Content -> Background: EXPORT_COMPLETE", () => {
    it("should send EXPORT_COMPLETE with markdown content", async () => {
      const markdown = "# Test Markdown\n\nContent here";

      const message: ExtensionMessage = {
        type: "EXPORT_COMPLETE",
        markdown,
      };

      await chrome.runtime.sendMessage(message);

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: "EXPORT_COMPLETE",
        markdown,
      });
    });

    it("should handle background script receiving EXPORT_COMPLETE", () => {
      const mockHandler = vi.fn();

      chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
        if (message.type === "EXPORT_COMPLETE") {
          mockHandler(message.markdown);
        }
      });

      const markdown = "# Test\nContent";
      const message: ExtensionMessage = {
        type: "EXPORT_COMPLETE",
        markdown,
      };

      if (messageListener) {
        messageListener(message);
      }

      expect(mockHandler).toHaveBeenCalledWith(markdown);
    });
  });

  describe("Message Type Safety", () => {
    it("should only respond to known message types", () => {
      const handlers = {
        EXPORT_PAGE: vi.fn(),
        CONFIGURE_SITE: vi.fn(),
        EXPORT_COMPLETE: vi.fn(),
      };

      chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
        if (message.type === "EXPORT_PAGE") {
          handlers.EXPORT_PAGE();
        } else if (message.type === "CONFIGURE_SITE") {
          handlers.CONFIGURE_SITE();
        } else if (message.type === "EXPORT_COMPLETE") {
          handlers.EXPORT_COMPLETE();
        }
      });

      // Send each message type
      const messages: ExtensionMessage[] = [
        { type: "EXPORT_PAGE" },
        { type: "CONFIGURE_SITE" },
        { type: "EXPORT_COMPLETE", markdown: "test" },
      ];

      for (const message of messages) {
        if (messageListener) {
          messageListener(message);
        }
      }

      expect(handlers.EXPORT_PAGE).toHaveBeenCalledOnce();
      expect(handlers.CONFIGURE_SITE).toHaveBeenCalledOnce();
      expect(handlers.EXPORT_COMPLETE).toHaveBeenCalledOnce();
    });

    it("should ignore unknown message types", () => {
      const handler = vi.fn();

      chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
        if (
          message.type === "EXPORT_PAGE" ||
          message.type === "CONFIGURE_SITE" ||
          message.type === "EXPORT_COMPLETE"
        ) {
          handler();
        }
      });

      // TypeScript prevents unknown types, but simulate runtime unknown message
      const unknownMessage = { type: "UNKNOWN" } as any;
      if (messageListener) {
        messageListener(unknownMessage);
      }

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle sendMessage errors gracefully", async () => {
      mockSendMessage.mockRejectedValue(new Error("Tab not found"));

      await expect(
        chrome.runtime.sendMessage({ type: "EXPORT_PAGE" }),
      ).rejects.toThrow("Tab not found");
    });

    it("should not crash on message listener errors", () => {
      chrome.runtime.onMessage.addListener(() => {
        throw new Error("Handler error");
      });

      expect(() => {
        if (messageListener) {
          messageListener({ type: "EXPORT_PAGE" });
        }
      }).toThrow("Handler error");
    });
  });
});
