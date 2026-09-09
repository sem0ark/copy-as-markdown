import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";
import type { ExportNode } from "../shared/types";
import { processElement } from "./processor";

/**
 * Stage 3 Tests: Recursive DOM Processor
 * Tests the core logic that walks DOM and ExportNode trees simultaneously
 */

describe("processor", () => {
  let document: Document;

  beforeEach(() => {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    global.document = document as any;
  });

  describe("script tag stripping", () => {
    it("should remove script tags and their content from include with no children", () => {
      // Arrange
      const html = `
        <div>
          <p>Before script</p>
          <script>alert('should be removed');</script>
          <p>After script</p>
        </div>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "div-include",
        selector: "div",
        action: "include",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("Before script");
      expect(result).toContain("After script");
      expect(result).not.toContain("alert");
      expect(result).not.toContain("should be removed");
    });

    it("should remove inline script tags", () => {
      // Arrange
      const html = `
        <article>
          <h1>Title</h1>
          <script type="text/javascript">console.log('test');</script>
          <p>Content</p>
        </article>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "article-include",
        selector: "article",
        action: "include",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("Title");
      expect(result).toContain("Content");
      expect(result).not.toContain("console.log");
      expect(result).not.toContain("<script");
    });

    it("should remove script tags when processing with child rules", () => {
      // Arrange
      const html = `
        <div>
          <h2>Section</h2>
          <script src="external.js"></script>
          <p class="content">Important text</p>
          <script>var x = 1;</script>
        </div>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "div-with-rules",
        selector: "div",
        action: "include",
        children: [
          {
            id: "content-para",
            selector: ".content",
            action: "include",
            children: [],
          },
        ],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("Section");
      expect(result).toContain("Important text");
      expect(result).not.toContain("external.js");
      expect(result).not.toContain("var x = 1");
      expect(result).not.toContain("<script");
    });

    it("should handle nested script tags", () => {
      // Arrange
      const html = `
        <div>
          <div>
            <script>nested();</script>
            <p>Text</p>
          </div>
        </div>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "outer-div",
        selector: "div",
        action: "include",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("Text");
      expect(result).not.toContain("nested");
      expect(result).not.toContain("<script");
    });
  });

  describe("processElement - ignore action", () => {
    it("should return empty string when action is ignore", () => {
      // Arrange
      const html = '<div class="ad">Advertisement</div>';
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "ad-ignore",
        selector: ".ad",
        action: "ignore",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toBe("");
    });
  });

  describe("processElement - include action without children", () => {
    it("should let Turndown handle entire subtree when children is empty", () => {
      // Arrange
      const html = `
        <article>
          <h1>Title</h1>
          <p>Paragraph with <strong>bold</strong> text.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </article>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "article-include",
        selector: "article",
        action: "include",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("# Title");
      expect(result).toContain("**bold**");
      // Turndown uses 3 spaces after list markers by default
      expect(result).toMatch(/[-*]\s+Item 1/);
      expect(result).toMatch(/[-*]\s+Item 2/);
    });
  });

  describe("processElement - include action with children", () => {
    it("should process child rules recursively", () => {
      // Arrange
      const html = `
        <main>
          <article>
            <h1>Main Content</h1>
            <p>This is important.</p>
          </article>
        </main>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "main-include",
        selector: "main",
        action: "include",
        children: [
          {
            id: "article-child",
            selector: "article",
            action: "include",
            children: [],
          },
        ],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("# Main Content");
      expect(result).toContain("This is important");
    });
  });

  describe("Nested Logic Test: parent included, child ignored", () => {
    it("should exclude ignored child from parent include", () => {
      // Arrange
      const html = `
        <article>
          <h1>Article Title</h1>
          <p>Good content here.</p>
          <div class="ad-box">
            <span>Advertisement</span>
            <img src="ad.png" alt="ad" />
          </div>
          <p>More good content.</p>
        </article>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "article-root",
        selector: "article",
        action: "include",
        children: [
          {
            id: "ad-ignore",
            selector: "div.ad-box",
            action: "ignore",
            children: [],
          },
        ],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("Article Title");
      expect(result).toContain("Good content here");
      expect(result).toContain("More good content");
      expect(result).not.toContain("Advertisement");
      expect(result).not.toContain("ad.png");
    });

    it("should handle multiple ignored children", () => {
      // Arrange
      const html = `
        <main>
          <h1>Page Title</h1>
          <aside class="sidebar">Sidebar content</aside>
          <div class="content">Main content</div>
          <footer class="footer">Footer text</footer>
        </main>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "main-root",
        selector: "main",
        action: "include",
        children: [
          {
            id: "sidebar-ignore",
            selector: "aside.sidebar",
            action: "ignore",
            children: [],
          },
          {
            id: "footer-ignore",
            selector: "footer.footer",
            action: "ignore",
            children: [],
          },
        ],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("Page Title");
      expect(result).toContain("Main content");
      expect(result).not.toContain("Sidebar content");
      expect(result).not.toContain("Footer text");
    });
  });

  describe("Complex nested structures", () => {
    it("should handle deeply nested include rules", () => {
      // Arrange
      const html = `
        <body>
          <main>
            <article>
              <section>
                <h1>Deep Title</h1>
                <p>Deep content</p>
              </section>
            </article>
          </main>
        </body>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "body-root",
        selector: "body",
        action: "include",
        children: [
          {
            id: "main-include",
            selector: "main",
            action: "include",
            children: [
              {
                id: "article-include",
                selector: "article",
                action: "include",
                children: [
                  {
                    id: "section-include",
                    selector: "section",
                    action: "include",
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("# Deep Title");
      expect(result).toContain("Deep content");
    });

    it("should handle mixed actions in complex tree", () => {
      // Arrange
      const html = `
        <article>
          <header>
            <h1>Title</h1>
            <div class="meta">Published: 2024</div>
          </header>
          <div class="content">
            <p>Paragraph 1</p>
            <aside class="note">Important note</aside>
            <p>Paragraph 2</p>
          </div>
          <footer>Footer info</footer>
        </article>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "article-root",
        selector: "article",
        action: "include",
        children: [
          {
            id: "header-include",
            selector: "header",
            action: "include",
            children: [
              {
                id: "meta-ignore",
                selector: ".meta",
                action: "ignore",
                children: [],
              },
            ],
          },
          {
            id: "content-include",
            selector: ".content",
            action: "include",
            children: [
              {
                id: "note-template",
                selector: "aside.note",
                action: "include",
                children: [],
              },
            ],
          },
          {
            id: "footer-ignore",
            selector: "footer",
            action: "ignore",
            children: [],
          },
        ],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("# Title");
      expect(result).not.toContain("Published: 2024");
      expect(result).toContain("Paragraph 1");
      expect(result).toContain("Important note");
      expect(result).toContain("Paragraph 2");
      expect(result).not.toContain("Footer info");
    });
  });

  describe("Iframe drilling", () => {
    it("should process iframe content when drilling with >>> syntax", () => {
      // Arrange
      const html = `
        <div>
          <iframe id="content-frame"></iframe>
        </div>
      `;
      const element = createElementFromHtml(html);
      const iframe = element.querySelector("iframe") as HTMLIFrameElement;

      // Mock iframe content
      const iframeDoc = new JSDOM(
        "<!DOCTYPE html><html><body><article><h1>Iframe Title</h1><p>Iframe content</p></article></body></html>",
      ).window.document;
      Object.defineProperty(iframe, "contentDocument", {
        value: iframeDoc,
        writable: false,
      });

      const config: ExportNode = {
        id: "div-root",
        selector: "div",
        action: "include",
        children: [
          {
            id: "iframe-content",
            selector: "iframe#content-frame >>> article",
            action: "include",
            children: [],
          },
        ],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("# Iframe Title");
      expect(result).toContain("Iframe content");
    });

    it("should process direct iframe element", () => {
      // Arrange
      const html = '<iframe id="main-frame"></iframe>';
      const element = createElementFromHtml(html);

      // Mock iframe content
      const iframeDoc = new JSDOM(
        "<!DOCTYPE html><html><body><h1>Frame Title</h1><p>Frame content</p></body></html>",
      ).window.document;
      Object.defineProperty(element, "contentDocument", {
        value: iframeDoc,
        writable: false,
      });

      const config: ExportNode = {
        id: "iframe-include",
        selector: "iframe",
        action: "include",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("# Frame Title");
      expect(result).toContain("Frame content");
    });

    it("should handle cross-origin iframe gracefully", () => {
      // Arrange
      const html = '<iframe id="blocked"></iframe>';
      const element = createElementFromHtml(html);

      // Mock cross-origin blocked access
      Object.defineProperty(element, "contentDocument", {
        get() {
          throw new Error("Cross-origin access blocked");
        },
      });

      const config: ExportNode = {
        id: "iframe-include",
        selector: "iframe",
        action: "include",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("[Embedded Content:");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty elements", () => {
      // Arrange
      const html = '<div class="empty"></div>';
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "empty-include",
        selector: "div",
        action: "include",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toBe("");
    });

    it("should handle elements with only whitespace", () => {
      // Arrange
      const html = "<div>   \n\n   </div>";
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "whitespace-template",
        selector: "div",
        action: "include",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toBe("");
    });

    it("should handle non-matching child selectors gracefully", () => {
      // Arrange
      const html = "<article><p>Content</p></article>";
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "article-root",
        selector: "article",
        action: "include",
        children: [
          {
            id: "nonexistent",
            selector: "div.does-not-exist",
            action: "ignore",
            children: [],
          },
        ],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("Content");
    });

    it("should handle malformed HTML gracefully", () => {
      // Arrange
      const html = "<div><p>Unclosed paragraph<div>nested</div></div>";
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "div-include",
        selector: "div",
        action: "include",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toBeTruthy();
    });
  });
});

/**
 * Helper function to create an HTMLElement from an HTML string
 */
function createElementFromHtml(html: string): HTMLElement {
  const template = document.createElement("div");
  template.innerHTML = html.trim();
  return template.firstElementChild as HTMLElement;
}
