import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  elementToMarkdown,
  getTurndownService,
  htmlToMarkdown,
} from "./turndown-service";

function createDOM(
  html: string,
  baseUrl = "https://example.com/page",
): Document {
  const dom = new JSDOM(html, { url: baseUrl });
  return dom.window.document;
}

describe("turndown-service", () => {
  beforeEach(() => {
    (getTurndownService as any).turndownInstance = null;
  });

  describe("LaTeX handling", () => {
    it("should convert KaTeX inline math to Obsidian format", () => {
      const html = `
        <p>The formula <span class="katex">
          <math>
            <annotation encoding="application/x-tex">E = mc^2</annotation>
          </math>
        </span> is famous.</p>
      `;
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("${E = mc^2}$");
    });

    it("should convert KaTeX display math to Obsidian format", () => {
      const html = `
        <div class="katex katex-display">
          <math>
            <annotation encoding="application/x-tex">\\int_0^\\infty e^{-x} dx = 1</annotation>
          </math>
        </div>
      `;
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("$${\\int_0^\\infty e^{-x} dx = 1}$$");
    });

    it("should convert MathJax inline math to Obsidian format", () => {
      const html = `
        <p>Consider <mjx-container class="mjx-container">
          <script type="math/tex">\\alpha + \\beta</script>
        </mjx-container> in the equation.</p>
      `;
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("${\\alpha + \\beta}$");
    });

    it("should convert MathJax display math to Obsidian format", () => {
      const html = `
        <mjx-container class="mjx-container-display">
          <script type="math/tex; mode=display">\\sum_{i=1}^n i = \\frac{n(n+1)}{2}</script>
        </mjx-container>
      `;
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("$${\\sum_{i=1}^n i = \\frac{n(n+1)}{2}}$$");
    });

    it("should handle multiple LaTeX expressions in one document", () => {
      const html = `
        <div>
          <span class="katex">
            <math><annotation encoding="application/x-tex">x^2</annotation></math>
          </span>
          <mjx-container class="mjx-container">
            <script type="math/tex">y^2</script>
          </mjx-container>
          <span class="katex katex-display">
            <math><annotation encoding="application/x-tex">z^2</annotation></math>
          </span>
        </div>
      `;
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("${x^2}$");
      expect(markdown).toContain("${y^2}$");
      expect(markdown).toContain("$${z^2}$$");
    });

    it("should fallback to content if LaTeX extraction fails", () => {
      const html = '<span class="katex">Fallback content</span>';
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("Fallback content");
    });
  });

  describe("Image handling", () => {
    it("should convert images with absolute URLs", () => {
      const html =
        '<img src="https://example.com/image.png" alt="Test image" />';
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toBe("![Test image](https://example.com/image.png)");
    });

    it("should convert relative URLs to absolute", () => {
      const html = '<img src="/images/photo.jpg" alt="Photo" />';
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("![Photo]");
      expect(markdown).toContain("/images/photo.jpg");
    });

    it("should handle images without alt text", () => {
      const html = '<img src="https://example.com/image.png" />';
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toBe("![](https://example.com/image.png)");
    });

    it("should handle protocol-relative URLs", () => {
      const html = '<img src="//cdn.example.com/image.png" alt="CDN image" />';
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toBe("![CDN image](//cdn.example.com/image.png)");
    });

    it("should handle relative image paths", () => {
      const html = '<img src="../images/photo.jpg" alt="Photo" />';
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toMatch(/!\[Photo\]\(.+photo\.jpg\)/);
    });
  });

  describe("GitHub Flavored Markdown", () => {
    it("should convert tables correctly", () => {
      const html = `
        <table>
          <thead>
            <tr><th>Name</th><th>Age</th></tr>
          </thead>
          <tbody>
            <tr><td>Alice</td><td>30</td></tr>
            <tr><td>Bob</td><td>25</td></tr>
          </tbody>
        </table>
      `;
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("| Name | Age |");
      expect(markdown).toContain("| --- | --- |");
      expect(markdown).toContain("| Alice | 30 |");
      expect(markdown).toContain("| Bob | 25 |");
    });

    it("should convert tables with newlines in cells", () => {
      const html = `
        <table>
          <thead>
            <tr>
              <th>\${i}$</th>
              <th>\${\\rm SA}\\![i]$</th>
              <th>\${[\\rm SA]\\![i] - 1}$</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
0

</td>
              <td>

6

</td>
              <td>

5

</td>
            </tr>
            <tr>
              <td>

1

</td>
              <td>

5

</td>
              <td>

4

</td>
            </tr>
          </tbody>
        </table>
      `;
      const markdown = htmlToMarkdown(html, {});

      // Verify that newlines are removed from cells
      expect(markdown).not.toMatch(/\|\s*\n\s*0\s*\n\s*\|/);
      expect(markdown).not.toMatch(/\|\s*\n\s*6\s*\n\s*\|/);

      // Verify cells contain values but on the same line
      expect(markdown).toContain("| 0 |");
      expect(markdown).toContain("| 6 |");
      expect(markdown).toContain("| 5 |");
    });

    it("should convert Word tables with bold td headers and Office markup", () => {
      const html = `
        <table>
          <tr>
            <td><b>Name</b><o:p></o:p></td>
            <td><strong>Age</strong><o:p> </o:p></td>
          </tr>
          <tr><td>Alice</td><td>30</td></tr>
        </table>
      `;
      const markdown = htmlToMarkdown(html, {});

      expect(markdown).toContain("| **Name** | **Age** |");
      expect(markdown).toContain("| --- | --- |");
      expect(markdown).toContain("| Alice | 30 |");
      expect(markdown).not.toContain("<o:p>");
    });

    it("should flatten block elements inside table cells", () => {
      const html = `
        <table>
          <thead><tr>
            <th><p><strong>Term</strong></p></th>
            <th><p>Notes</p> <p>More notes</p></th>
          </tr></thead>
        </table>
      `;

      const markdown = htmlToMarkdown(html, {});

      expect(markdown).toContain("| **Term** | Notes More notes |");
    });

    it("should NOT convert tables without thead or th elements", () => {
      const html = `
        <table>
          <tbody>
            <tr><td>1</td><td>2</td></tr>
            <tr><td>3</td><td>4</td></tr>
          </tbody>
        </table>
      `;
      const markdown = htmlToMarkdown(html, {});

      // Tables without thead/th stay as HTML (limitation of turndown-plugin-gfm)
      expect(markdown).toContain("<table>");
      expect(markdown).toContain("<td>");
    });

    it("should convert strikethrough text", () => {
      const html = "<p>This is <del>deleted</del> text.</p>";
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toMatch(/~+deleted~+/);
    });

    it("should handle task lists", () => {
      const html = `
        <ul>
          <li><input type="checkbox" checked /> Completed task</li>
          <li><input type="checkbox" /> Pending task</li>
        </ul>
      `;
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("[x]");
      expect(markdown).toContain("Completed task");
      expect(markdown).toContain("[ ]");
      expect(markdown).toContain("Pending task");
    });
  });

  describe("General Markdown conversion", () => {
    it("should convert headings", () => {
      const html = "<h1>Title</h1><h2>Subtitle</h2>";
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("# Title");
      expect(markdown).toContain("## Subtitle");
    });

    it("should convert bold and italic", () => {
      const html = "<p><strong>Bold</strong> and <em>italic</em> text</p>";
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("**Bold**");
      expect(markdown).toContain("*italic*");
    });

    it("should convert links", () => {
      const html = '<a href="https://example.com">Example</a>';
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toBe("[Example](https://example.com)");
    });

    it("should convert code blocks", () => {
      const html =
        '<pre><code class="language-javascript">const x = 5;</code></pre>';
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("```javascript");
      expect(markdown).toContain("const x = 5;");
      expect(markdown).toContain("```");
    });

    it("should convert inline code", () => {
      const html = "<p>Use <code>console.log()</code> for debugging.</p>";
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("`console.log()`");
    });

    it("should convert unordered lists", () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("Item 1");
      expect(markdown).toContain("Item 2");
      expect(markdown).toMatch(/-\s+Item 1/);
    });

    it("should convert ordered lists", () => {
      const html = "<ol><li>First</li><li>Second</li></ol>";
      const markdown = htmlToMarkdown(html, {});
      expect(markdown).toContain("First");
      expect(markdown).toContain("Second");
      expect(markdown).toMatch(/1\.\s+First/);
      expect(markdown).toMatch(/2\.\s+Second/);
    });
  });

  describe("Integration: Complex HTML to Markdown", () => {
    it("should handle mixed content with LaTeX and images", () => {
      const html = `
        <article>
          <h1>Physics Article</h1>
          <p>Einstein's famous equation is <span class="katex">
            <math><annotation encoding="application/x-tex">E = mc^2</annotation></math>
          </span>.</p>
          <img src="https://example.com/einstein.jpg" alt="Einstein" />
          <p>The wave equation:</p>
          <div class="katex katex-display">
            <math><annotation encoding="application/x-tex">\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u</annotation></math>
          </div>
        </article>
      `;
      const markdown = htmlToMarkdown(html, {});

      expect(markdown).toContain("# Physics Article");
      expect(markdown).toContain("${E = mc^2}$");
      expect(markdown).toContain(
        "![Einstein](https://example.com/einstein.jpg)",
      );
      expect(markdown).toContain(
        "$${\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u}$$",
      );
    });

    it("should handle nested structures", () => {
      const html = `
        <div>
          <h2>Section</h2>
          <ul>
            <li>Item with <strong>bold</strong> text</li>
            <li>Item with <span class="katex"><math><annotation encoding="application/x-tex">x + y</annotation></math></span></li>
          </ul>
        </div>
      `;
      const markdown = htmlToMarkdown(html, {});

      expect(markdown).toContain("## Section");
      expect(markdown).toContain("**bold**");
      expect(markdown).toContain("${x + y}$");
    });
  });

  describe("elementToMarkdown", () => {
    it("should convert DOM element to Markdown", () => {
      const doc = createDOM("<div><h1>Title</h1><p>Content</p></div>");
      const element = doc.querySelector("div")!;
      const markdown = elementToMarkdown(element, {});

      expect(markdown).toContain("# Title");
      expect(markdown).toContain("Content");
    });
  });
});
