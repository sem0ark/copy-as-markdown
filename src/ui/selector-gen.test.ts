import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  generateElementLabel,
  generateSelector,
  validateSelector,
} from "./selector-gen";

describe("selector-gen", () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    global.document = document;
    global.window = dom.window as unknown as Window & typeof globalThis;
    global.CSS = {
      escape: (str: string) =>
        str.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, "\\$&"),
    } as typeof CSS;
  });

  describe("generateSelector", () => {
    it("should prioritize ID selector when element has an ID", () => {
      document.body.innerHTML = '<div id="unique-id">Content</div>';
      const element = document.getElementById("unique-id")!;

      const selector = generateSelector(element);

      expect(selector).toBe("#unique-id");
      expect(validateSelector(element, selector)).toBe(true);
    });

    it("should use unique class combination when no ID", () => {
      document.body.innerHTML = `
        <div class="container">
          <article class="post featured">Content</article>
          <article class="post">Other</article>
        </div>
      `;
      const element = document.querySelector(".post.featured")!;

      const selector = generateSelector(element);

      expect(selector).toBe("article.post.featured");
      expect(validateSelector(element, selector)).toBe(true);
    });

    it("should exclude classes with specified prefix", () => {
      document.body.innerHTML = `
        <div class="md-saver-highlight real-class">Content</div>
      `;
      const element = document.querySelector("div")!;

      const selector = generateSelector(element, {
        excludeClassPrefix: "md-saver-",
      });

      expect(selector).toContain("real-class");
      expect(selector).not.toContain("md-saver-highlight");
    });

    it("should fallback to nth-of-type path when classes are not unique", () => {
      document.body.innerHTML = `
        <div class="container">
          <article class="post">First</article>
          <article class="post">Second</article>
          <article class="post">Third</article>
        </div>
      `;
      const element = document.querySelectorAll(".post")[1];

      const selector = generateSelector(element);

      expect(selector).toContain("nth-of-type");
      expect(selector).toMatch(/article:nth-of-type\(2\)/);
      expect(validateSelector(element, selector)).toBe(true);
    });

    it("should generate path for deeply nested elements", () => {
      document.body.innerHTML = `
        <div class="root">
          <section>
            <article>
              <div>
                <span>Target</span>
              </div>
            </article>
          </section>
        </div>
      `;
      const element = document.querySelector("span")!;

      const selector = generateSelector(element);

      expect(selector).toContain("span:nth-of-type(1)");
      expect(validateSelector(element, selector)).toBe(true);
    });

    it("should respect maxDepth option", () => {
      document.body.innerHTML = `
        <div>
          <section>
            <article>
              <div>
                <span>Deep</span>
              </div>
            </article>
          </section>
        </div>
      `;
      const element = document.querySelector("span")!;

      const selector = generateSelector(element, { maxDepth: 2 });

      const parts = selector.split(" > ");
      expect(parts.length).toBeLessThanOrEqual(2);
    });

    it("should handle elements with no classes or ID", () => {
      document.body.innerHTML = `
        <section>
          <article>
            <p>First paragraph</p>
            <p>Second paragraph</p>
          </article>
        </section>
      `;
      const element = document.querySelectorAll("p")[1];

      const selector = generateSelector(element);

      expect(selector).toMatch(/p:nth-of-type\(2\)/);
      expect(validateSelector(element, selector)).toBe(true);
    });

    it("should handle special characters in IDs", () => {
      document.body.innerHTML = '<div id="my-id:special.chars">Content</div>';
      const element = document.getElementById("my-id:special.chars")!;

      const selector = generateSelector(element);

      expect(selector).toContain("my-id");
      expect(validateSelector(element, selector)).toBe(true);
    });
  });

  describe("validateSelector", () => {
    it("should return true for valid unique selector", () => {
      document.body.innerHTML = '<div id="test">Content</div>';
      const element = document.getElementById("test")!;

      expect(validateSelector(element, "#test")).toBe(true);
    });

    it("should return false for non-unique selector", () => {
      document.body.innerHTML = `
        <div class="duplicate">One</div>
        <div class="duplicate">Two</div>
      `;
      const element = document.querySelector(".duplicate")!;

      expect(validateSelector(element, ".duplicate")).toBe(false);
    });

    it("should return false for invalid selector syntax", () => {
      document.body.innerHTML = '<div id="test">Content</div>';
      const element = document.getElementById("test")!;

      expect(validateSelector(element, "###invalid")).toBe(false);
    });

    it("should return false when selector matches different element", () => {
      document.body.innerHTML = `
        <div id="first">One</div>
        <div id="second">Two</div>
      `;
      const element = document.getElementById("first")!;

      expect(validateSelector(element, "#second")).toBe(false);
    });
  });

  describe("generateElementLabel", () => {
    it("should include ID in label", () => {
      document.body.innerHTML = '<div id="main">Content</div>';
      const element = document.getElementById("main")!;

      const label = generateElementLabel(element);

      expect(label).toBe("div#main");
    });

    it("should include first class when no ID", () => {
      document.body.innerHTML =
        '<article class="post featured">Content</article>';
      const element = document.querySelector("article")!;

      const label = generateElementLabel(element);

      expect(label).toBe("article.post");
    });

    it("should use text content when no ID or class", () => {
      document.body.innerHTML = "<span>Hello World</span>";
      const element = document.querySelector("span")!;

      const label = generateElementLabel(element);

      expect(label).toBe('span "Hello World"');
    });

    it("should truncate long text content", () => {
      const longText = "a".repeat(50);
      document.body.innerHTML = `<span>${longText}</span>`;
      const element = document.querySelector("span")!;

      const label = generateElementLabel(element);

      // The text is sliced to 30 chars, so 50 chars should be truncated
      if (longText.length > 30) {
        expect(label).toContain("...");
      }
      expect(label.length).toBeLessThan(longText.length + 20);
    });

    it("should exclude picker classes from label", () => {
      document.body.innerHTML =
        '<div class="md-saver-menu real-class">Content</div>';
      const element = document.querySelector("div")!;

      const label = generateElementLabel(element);

      expect(label).toBe("div.real-class");
    });

    it("should return just tag name when no identifying features", () => {
      document.body.innerHTML = "<p></p>";
      const element = document.querySelector("p")!;

      const label = generateElementLabel(element);

      expect(label).toBe("p");
    });
  });
});
