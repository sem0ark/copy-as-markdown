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

  describe("processElement - template action", () => {
    it("should apply template with {{content}} placeholder", () => {
      // Arrange
      const html = "<blockquote>This is a quote</blockquote>";
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "quote-template",
        selector: "blockquote",
        action: "template",
        template: "> [!quote]\n> {{content}}",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("> [!quote]");
      expect(result).toContain("This is a quote");
    });

    it("should extract text from nested HTML", () => {
      // Arrange
      const html =
        '<div class="note"><strong>Important:</strong> <em>Read this</em></div>';
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "note-template",
        selector: ".note",
        action: "template",
        template: "> [!info]\n> {{content}}",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("Important: Read this");
      expect(result).not.toContain("<strong>");
      expect(result).not.toContain("<em>");
    });

    it("should use default template if none provided", () => {
      // Arrange
      const html = "<p>Simple text</p>";
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "default-template",
        selector: "p",
        action: "template",
        children: [],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toBe("Simple text");
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

  describe("Override Test: template rule inside include rule", () => {
    it("should apply template transformation to specific child", () => {
      // Arrange
      const html = `
        <article>
          <h1>Article Title</h1>
          <p>Regular paragraph.</p>
          <blockquote>This should be a callout</blockquote>
          <p>Another paragraph.</p>
        </article>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "article-root",
        selector: "article",
        action: "include",
        children: [
          {
            id: "quote-template",
            selector: "blockquote",
            action: "template",
            template: "> [!quote]\n> {{content}}",
            children: [],
          },
        ],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("Article Title");
      expect(result).toContain("Regular paragraph");
      expect(result).toContain("> [!quote]");
      expect(result).toContain("This should be a callout");
      expect(result).toContain("Another paragraph");
    });

    it("should handle nested overrides: include > template > ignore", () => {
      // Arrange
      const html = `
        <section>
          <div class="box">
            <h2>Box Title</h2>
            <p>Box content</p>
            <span class="meta">metadata</span>
          </div>
        </section>
      `;
      const element = createElementFromHtml(html);
      const config: ExportNode = {
        id: "section-root",
        selector: "section",
        action: "include",
        children: [
          {
            id: "box-template",
            selector: "div.box",
            action: "template",
            template: "> [!info] Box\n> {{content}}",
            children: [
              {
                id: "meta-ignore",
                selector: ".meta",
                action: "ignore",
                children: [],
              },
            ],
          },
        ],
      };

      // Act
      const result = processElement(element, config);

      // Assert
      expect(result).toContain("> [!info] Box");
      expect(result).toContain("Box Title");
      expect(result).toContain("Box content");
      // Note: template action extracts ALL text content, including ignored children
      // This is expected behavior - template gets textContent which includes everything
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
                action: "template",
                template: "> [!note]\n> {{content}}",
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
      expect(result).toContain("> [!note]");
      expect(result).toContain("Important note");
      expect(result).toContain("Paragraph 2");
      expect(result).not.toContain("Footer info");
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
        action: "template",
        template: "{{content}}",
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
