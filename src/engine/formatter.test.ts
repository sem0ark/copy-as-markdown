import { describe, expect, it } from "vitest";
import {
  applyTemplate,
  type TemplateContext,
  validateTemplate,
} from "./formatter";

describe("formatter", () => {
  describe("applyTemplate", () => {
    it("should replace {{content}} with provided content", () => {
      const template = "> [!quote]\n> {{content}}";
      const context: TemplateContext = { content: "Hello World" };
      const result = applyTemplate(template, context);
      expect(result).toBe("> [!quote]\n> Hello World");
    });

    it("should handle multiple occurrences of the same placeholder", () => {
      const template = "{{content}} - {{content}}";
      const context: TemplateContext = { content: "Echo" };
      const result = applyTemplate(template, context);
      expect(result).toBe("Echo - Echo");
    });

    it("should replace multiple different placeholders", () => {
      const template = "**{{title}}**: {{content}} ({{author}})";
      const context: TemplateContext = {
        content: "This is the body",
        title: "Article Title",
        author: "John Doe",
      };
      const result = applyTemplate(template, context);
      expect(result).toBe("**Article Title**: This is the body (John Doe)");
    });

    it("should handle empty content", () => {
      const template = "> [!note]\n> {{content}}";
      const context: TemplateContext = { content: "" };
      const result = applyTemplate(template, context);
      expect(result).toBe("> [!note]\n> ");
    });

    it("should leave unmatched placeholders unchanged", () => {
      const template = "{{content}} {{unknown}}";
      const context: TemplateContext = { content: "Hello" };
      const result = applyTemplate(template, context);
      expect(result).toBe("Hello {{unknown}}");
    });

    it("should handle templates without placeholders", () => {
      const template = "Static text";
      const context: TemplateContext = { content: "Ignored" };
      const result = applyTemplate(template, context);
      expect(result).toBe("Static text");
    });

    it("should handle complex Obsidian callout template", () => {
      const template =
        "> [!info] {{title}}\n> {{content}}\n> \n> Source: {{source}}";
      const context: TemplateContext = {
        content: "This is important information.",
        title: "Note Title",
        source: "https://example.com",
      };
      const result = applyTemplate(template, context);
      expect(result).toBe(
        "> [!info] Note Title\n> This is important information.\n> \n> Source: https://example.com",
      );
    });

    it("should handle multiline content", () => {
      const template = "> [!quote]\n> {{content}}";
      const context: TemplateContext = { content: "Line 1\nLine 2\nLine 3" };
      const result = applyTemplate(template, context);
      expect(result).toBe("> [!quote]\n> Line 1\nLine 2\nLine 3");
    });

    it("should handle special characters in content", () => {
      const template = "{{content}}";
      const context: TemplateContext = { content: "$100 * 2 = $200" };
      const result = applyTemplate(template, context);
      expect(result).toBe("$100 * 2 = $200");
    });

    it("should handle LaTeX in content", () => {
      const template = "> [!math]\n> {{content}}";
      const context: TemplateContext = { content: "$$E = mc^2$$" };
      const result = applyTemplate(template, context);
      expect(result).toContain("E = mc^2");
      expect(result).toContain("> [!math]");
    });

    it("should handle HTML entities in content", () => {
      const template = "{{content}}";
      const context: TemplateContext = {
        content: "&lt;div&gt; &amp; &quot;test&quot;",
      };
      const result = applyTemplate(template, context);
      expect(result).toBe("&lt;div&gt; &amp; &quot;test&quot;");
    });
  });

  describe("validateTemplate", () => {
    it("should validate template with single placeholder", () => {
      const result = validateTemplate("> {{content}}");
      expect(result.valid).toBe(true);
      expect(result.placeholders).toEqual(["content"]);
      expect(result.errors).toEqual([]);
    });

    it("should validate template with multiple placeholders", () => {
      const result = validateTemplate("{{title}}: {{content}} by {{author}}");
      expect(result.valid).toBe(true);
      expect(result.placeholders).toEqual(["title", "content", "author"]);
      expect(result.errors).toEqual([]);
    });

    it("should detect duplicate placeholders", () => {
      const result = validateTemplate("{{content}} and {{content}}");
      expect(result.valid).toBe(true);
      expect(result.placeholders).toEqual(["content"]);
    });

    it("should detect empty placeholder", () => {
      const result = validateTemplate("Hello {{}} World");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Empty placeholder found: {{}}");
    });

    it("should detect unclosed braces", () => {
      const result = validateTemplate("{{content");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Unmatched braces in template");
    });

    it("should detect unopened braces", () => {
      const result = validateTemplate("content}}");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Unmatched braces in template");
    });

    it("should validate template without placeholders", () => {
      const result = validateTemplate("Static text");
      expect(result.valid).toBe(true);
      expect(result.placeholders).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("should handle whitespace in placeholders", () => {
      const result = validateTemplate("{{ content }} and {{ title }}");
      expect(result.valid).toBe(true);
      expect(result.placeholders).toEqual(["content", "title"]);
    });

    it("should detect multiple errors", () => {
      const result = validateTemplate("{{}} {{content");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain("Empty placeholder found: {{}}");
      expect(result.errors).toContain("Unmatched braces in template");
    });

    it("should validate complex Obsidian template", () => {
      const template =
        "> [!info] {{title}}\n> {{content}}\n> \n> Tags: {{tags}}";
      const result = validateTemplate(template);
      expect(result.valid).toBe(true);
      expect(result.placeholders).toEqual(["title", "content", "tags"]);
    });
  });

  describe("Integration: Template with HTML to Markdown", () => {
    it("should apply template to converted HTML content", () => {
      const template = "> [!quote]\n> {{content}}";
      const htmlContent = "<div>Hello</div>";
      const context: TemplateContext = { content: htmlContent };
      const result = applyTemplate(template, context);
      expect(result).toBe("> [!quote]\n> <div>Hello</div>");
    });

    it("should handle Obsidian info callout template", () => {
      const template = "> [!info] {{title}}\n> {{content}}";
      const context: TemplateContext = {
        content: "This is the content.",
        title: "Important Note",
      };
      const result = applyTemplate(template, context);
      expect(result).toBe("> [!info] Important Note\n> This is the content.");
    });

    it("should handle Obsidian warning callout template", () => {
      const template = "> [!warning]\n> {{content}}";
      const context: TemplateContext = { content: "Be careful with this!" };
      const result = applyTemplate(template, context);
      expect(result).toBe("> [!warning]\n> Be careful with this!");
    });

    it("should handle custom wrapper template", () => {
      const template = "---\n{{content}}\n---";
      const context: TemplateContext = { content: "Wrapped content" };
      const result = applyTemplate(template, context);
      expect(result).toBe("---\nWrapped content\n---");
    });

    it("should handle template with metadata", () => {
      const template =
        "---\ntitle: {{title}}\nauthor: {{author}}\n---\n\n{{content}}";
      const context: TemplateContext = {
        content: "Article body",
        title: "My Article",
        author: "Jane Doe",
      };
      const result = applyTemplate(template, context);
      expect(result).toBe(
        "---\ntitle: My Article\nauthor: Jane Doe\n---\n\nArticle body",
      );
    });
  });
});
