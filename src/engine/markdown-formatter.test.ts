import { describe, expect, it } from "vitest";
import {
  escapeDollar,
  escapeGenerics,
  escapeLeadingWhitespace,
  escapeNewLine,
  removeEmoji,
  replaceMarkdownElements,
  replaceUnicode,
  restoreText,
  trimLines,
} from "./markdown-formatter";

describe("escapeLeadingWhitespace", () => {
  it("should wrap leading whitespace in <pre> tags when both whitespace and text are > 1 char", () => {
    // 3 spaces (length 3) and "hello" (length 5)
    const input = "   hello";
    const expected = "<pre>   </pre>hello";
    expect(escapeLeadingWhitespace(input)).toBe(expected);
  });

  it("should trim entirely if leading whitespace is only 1 character", () => {
    // 1 space and "hello"
    const input = " hello";
    const expected = "hello";
    expect(escapeLeadingWhitespace(input)).toBe(expected);
  });

  it("should trim entirely if the text content is only 1 character", () => {
    // 3 spaces but only 1 character of text "a"
    const input = "   a";
    const expected = "a";
    expect(escapeLeadingWhitespace(input)).toBe(expected);
  });

  it("should handle multiple lines with mixed rules", () => {
    const input = [
      "    long line", // Should wrap (4 spaces, 9 chars)
      "  x", // Should trim (2 spaces, 1 char)
      " short", // Should trim (1 space, 5 chars)
      "just text", // Should trim (0 space)
    ].join("\n");

    const expected = [
      "<pre>    </pre>long line",
      "x",
      "short",
      "just text",
    ].join("\n");

    expect(escapeLeadingWhitespace(input)).toBe(expected);
  });

  it("should trim trailing whitespace even when escaping leading whitespace", () => {
    const input = "    hello    ";
    const expected = "<pre>    </pre>hello";
    expect(escapeLeadingWhitespace(input)).toBe(expected);
  });

  it("should return an empty string for empty input", () => {
    expect(escapeLeadingWhitespace("")).toBe("");
  });

  it("should handle lines with only whitespace by returning an empty string", () => {
    // Since trimmedText.length will be 0, it hits the final return trimmedText.trim()
    const input = "     ";
    expect(escapeLeadingWhitespace(input)).toBe("");
  });
});

describe("trimLines", () => {
  it("should trim trailing spaces from multiple lines", () => {
    const input = "line one   \nline two  \nline three ";
    const expected = "line one\nline two\nline three";
    expect(trimLines(input)).toBe(expected);
  });

  it("should not affect leading whitespace", () => {
    const input = "  indented line\n    more indentation  ";
    const expected = "  indented line\n    more indentation";
    expect(trimLines(input)).toBe(expected);
  });

  it("should handle tabs as trailing whitespace", () => {
    const input = "line with tab\t\nnext line";
    const expected = "line with tab\nnext line";
    expect(trimLines(input)).toBe(expected);
  });

  it("should return an empty string when input is empty", () => {
    expect(trimLines("")).toBe("");
  });

  it("should preserve empty lines", () => {
    const input = "line one\n\nline three  ";
    const expected = "line one\n\nline three";
    expect(trimLines(input)).toBe(expected);
  });

  it("should handle strings with only whitespace", () => {
    const input = "   \n   ";
    const expected = "\n";
    expect(trimLines(input)).toBe(expected);
  });

  it("should handle a single line with no newline character", () => {
    const input = "no newline   ";
    const expected = "no newline";
    expect(trimLines(input)).toBe(expected);
  });
});

describe("escapeDollar", () => {
  it("should wrap single dollar matches in <pre> tags", () => {
    const input = "Check a$code$ here";
    const expected = "Check a<pre>$code$</pre> here";
    expect(escapeDollar(input)).toBe(expected);
  });

  it("should wrap double dollar matches in <pre> tags", () => {
    const input = "$$math content$$";
    const expected = "<pre>$$math content$$</pre>";
    expect(escapeDollar(input)).toBe(expected);
  });

  it("should handle multiple lines independently", () => {
    const input = "a$first$\n$$second$$";
    const expected = "a<pre>$first$</pre>\n<pre>$$second$$</pre>";
    expect(escapeDollar(input)).toBe(expected);
  });

  it("should preserve content inside the dollar signs", () => {
    const input = "Value is x$100$";
    const expected = "Value is x<pre>$100$</pre>";
    expect(escapeDollar(input)).toBe(expected);
  });

  it("should not match if there are no closing dollar signs", () => {
    const input = "This is just $a test";
    expect(escapeDollar(input)).toBe(input);
  });

  it("should not match if there are no closing dollar signs without whitespace", () => {
    const input = "We expect $10000 return on $129 investment";
    expect(escapeDollar(input)).toBe(input);
  });

  it("should handle mixed single and double dollars", () => {
    const input = "a$single$ and $$double$$";
    const expected = "a<pre>$single$</pre> and <pre>$$double$$</pre>";
    expect(escapeDollar(input)).toBe(expected);
  });

  it("should wrap single dollars without eating preceding characters", () => {
    const input = "apple $fruit$";
    const expected = "apple <pre>$fruit$</pre>";
    expect(escapeDollar(input)).toBe(expected);
  });

  it("should work at the very start of a string", () => {
    const input = "$start$ text";
    const expected = "<pre>$start$</pre> text";
    expect(escapeDollar(input)).toBe(expected);
  });

  it("should wrap double dollars correctly", () => {
    const input = "math $$a^2 + b^2 = c^2$$";
    const expected = "math <pre>$$a^2 + b^2 = c^2$$</pre>";
    expect(escapeDollar(input)).toBe(expected);
  });

  it("should ignore triple dollars or more (boundary safety)", () => {
    const input = "$$$too many$$$";
    expect(escapeDollar(input)).toBe("$$$too many$$$");
  });

  it("should handle multiple occurrences on one line", () => {
    const input = "$one$ and $two$";
    const expected = "<pre>$one$</pre> and <pre>$two$</pre>";
    expect(escapeDollar(input)).toBe(expected);
  });

  it("should be multiline aware", () => {
    const input = "$line1$\n$line2$";
    const expected = "<pre>$line1$</pre>\n<pre>$line2$</pre>";
    expect(escapeDollar(input)).toBe(expected);
  });
});

describe("escapeNewLine", () => {
  it("should replace all occurrences of newlines with <br>", () => {
    const input = "Line 1\nLine 2\nLine 3";
    const expected = "Line 1<br>Line 2<br>Line 3";
    expect(escapeNewLine(input)).toBe(expected);
  });

  it("should handle strings with no newlines", () => {
    const input = "Hello World";
    expect(escapeNewLine(input)).toBe("Hello World");
  });

  it("should handle empty strings", () => {
    expect(escapeNewLine("")).toBe("");
  });

  it("should handle consecutive newlines", () => {
    const input = "Line 1\n\nLine 2";
    const expected = "Line 1<br><br>Line 2";
    expect(escapeNewLine(input)).toBe(expected);
  });
});

describe("escapeGenerics", () => {
  it("should pad < and > with spaces for standard TypeScript generics", () => {
    const input = "List<string>";
    const expected = "List < string > ";
    expect(escapeGenerics(input)).toBe(expected);
  });

  it("should not pad < if it is followed by a space (negative lookahead)", () => {
    const input = "if (x < 10)";
    expect(escapeGenerics(input)).toBe(input);
  });

  it("should not pad > if it is preceded by a space (negative lookbehind)", () => {
    const input = "if (x > 10)";
    expect(escapeGenerics(input)).toBe(input);
  });

  it("should handle nested generics", () => {
    const input = "Map<string, List<number>>";
    const expected = "Map < string, List < number >  > ";
    expect(escapeGenerics(input)).toBe(expected);
  });

  it("should handle complex type definitions", () => {
    const input = "Array<Promise<void>>";
    const expected = "Array < Promise < void >  > ";
    expect(escapeGenerics(input)).toBe(expected);
  });

  it("should handle empty strings", () => {
    expect(escapeGenerics("")).toBe("");
  });
});

describe("removeEmoji", () => {
  it("should remove simple emojis", () => {
    const input = "Hello World 🚀";
    expect(removeEmoji(input)).toBe("Hello World ");
  });

  it("should remove multiple emojis", () => {
    const input = "Stay 🔥 hydrated 💧";
    expect(removeEmoji(input)).toBe("Stay  hydrated ");
  });

  it("should NOT remove standard numbers or punctuation", () => {
    const input = "Item #1 costs $100!";
    expect(removeEmoji(input)).toBe("Item #1 costs $100!");
  });

  it("should handle strings with only emojis", () => {
    const input = "✨✨✨";
    expect(removeEmoji(input)).toBe("");
  });

  it("should NOT remove em dashes (—)", () => {
    const input = "Step one — then step two 🚀";
    const expected = "Step one — then step two ";
    expect(removeEmoji(input)).toBe(expected);
  });

  it("should NOT remove standard bullet points (•)", () => {
    const input = "• First item 🍎\n• Second item 🍌";
    const expected = "• First item \n• Second item ";
    expect(removeEmoji(input)).toBe(expected);
  });

  it("should NOT remove mathematical operators", () => {
    const input = "10 ± 2 = 12 or 8 ✨";
    const expected = "10 ± 2 = 12 or 8 ";
    expect(removeEmoji(input)).toBe(expected);
  });
});

describe("replaceUnicode", () => {
  it("should replace various Unicode spaces with standard ASCII space", () => {
    // Contains: En Quad (\u2000), Hair Space (\u200A), Narrow No-Break Space (\u202F), and Ideographic Space (\u3000)
    const input = "Word\u2000one\u200Atwo\u202Fthree\u3000four";
    const expected = "Word one two three four";
    expect(replaceUnicode(input)).toBe(expected);
  });

  it("should replace various dashes and minus signs with a standard hyphen", () => {
    // Contains: Figure Dash (\u2012), En Dash (\u2013), Em Dash (\u2014), and Minus Sign (\u2212)
    const input = "2023\u20122024; Page 1\u20135; long\u2014dash; 10\u22125";
    const expected = "2023-2024; Page 1-5; long-dash; 10-5";
    expect(replaceUnicode(input)).toBe(expected);
  });

  it('should convert various bullet points into Markdown-ready list items ("- ")', () => {
    // Contains: Bullet (\u2022), Triangular Bullet (\u2023), White Bullet (\u25E6), Hyphen Bullet (\u2043)
    const bullet = "\u2022 Item 1";
    const tri = "\u2023 Item 2";
    const white = "\u25E6 Item 3";
    const hyphen = "\u2043 Item 4";

    expect(replaceUnicode(bullet)).toBe("- Item 1");
    expect(replaceUnicode(tri)).toBe("- Item 2");
    expect(replaceUnicode(white)).toBe("- Item 3");
    expect(replaceUnicode(hyphen)).toBe("- Item 4");
  });

  it("should remove invisible control characters and line separators", () => {
    // Contains: Delete (\u007F), Line Separator (\u2028), and Paragraph Separator (\u2029)
    const input = "First\u2028Line\u007FSecond\u2029Line";
    const expected = "FirstLineSecondLine";
    expect(replaceUnicode(input)).toBe(expected);
  });

  it("should handle the Byte Order Mark (BOM)", () => {
    const input = "\uFEFFText with BOM";
    expect(replaceUnicode(input)).toBe("Text with BOM");
  });

  it("should trim leading and trailing whitespace after replacements", () => {
    const input = "  \u2014 Content \u2022  ";
    const expected = "- Content -";
    // Logic check: \u2014 becomes "-", \u2022 becomes "- ", then trim() removes outer spaces.
    expect(replaceUnicode(input)).toBe(expected);
  });
});

describe("restoreText (Original Implementation)", () => {
  it("should replace the five standard HTML entities", () => {
    const input = "&lt;hello&gt; &amp; &quot;world&quot; &#39;test&#39;";
    const expected = "<hello> & \"world\" 'test'";
    expect(restoreText(input)).toBe(expected);
  });

  it("should convert <br> tags to newlines", () => {
    const input = "Line 1<br>Line 2";
    const expected = "Line 1\nLine 2";
    expect(restoreText(input)).toBe(expected);
  });

  it("should strip <pre> and </pre> tags completely", () => {
    const input = "<pre>const x = 10;</pre>";
    const expected = "const x = 10;";
    expect(restoreText(input)).toBe(expected);
  });

  it("should trim trailing whitespace from every line", () => {
    const input = "First line   \nSecond line  ";
    const expected = "First line\nSecond line";
    expect(restoreText(input)).toBe(expected);
  });

  it("should handle complex mixed content", () => {
    const input = "<pre>&lt;div&gt;   </pre><br>New line &amp; more";
    const expected = "<div>\nNew line & more";
    expect(restoreText(input)).toBe(expected);
  });

  it("should be sensitive to case in tags", () => {
    const input = "Text<BR>More Text";
    expect(restoreText(input)).toBe("Text\nMore Text");
  });

  it("should demonstrate the ampersand order", () => {
    const input = "&amp;lt;";
    const expected = "&lt;";
    expect(restoreText(input)).toBe(expected);
  });
});

describe("replaceMarkdownElements", () => {
  it("should convert asterisk bullets to hyphen bullets at the start of lines", () => {
    const input = "* Item 1\n* Item 2";
    const expected = "- Item 1\n- Item 2";
    expect(replaceMarkdownElements(input)).toBe(expected);
  });

  it("should handle nested bullets (2 spaces and 4 spaces)", () => {
    const input = "* Top\n  * Nested\n    * Deeper";
    const expected = "- Top\n- Nested\n    - Deeper";
    expect(replaceMarkdownElements(input)).toBe(expected);
  });

  it("should handle nested bullets (2 spaces and 3 spaces)", () => {
    const input = "* Top\n  * Nested\n    * Deeper";
    const expected = "- Top\n- Nested\n    - Deeper";
    expect(replaceMarkdownElements(input)).toBe(expected);
  });

  it("should convert tabs to 4 spaces", () => {
    const input = "\t* Tabbed item";
    const expected = "    - Tabbed item";
    expect(replaceMarkdownElements(input)).toBe(expected);
  });

  it("should normalize spacing in numbered lists", () => {
    const input = "1.    First\n  2.   Second";
    const expected = "1. First\n2. Second";
    expect(replaceMarkdownElements(input)).toBe(expected);
  });

  it("should normalize spacing in unordered lists", () => {
    const input = "-    First\n-   Second";
    const expected = "- First\n- Second";
    expect(replaceMarkdownElements(input)).toBe(expected);
  });

  it("should remove horizontal rules (dashes or asterisks)", () => {
    const input = "Section Above\n---\nSection Below\n***\nEnd";
    const expected = "Section Above\n\nSection Below\n\nEnd";
    expect(replaceMarkdownElements(input)).toBe(expected);
  });

  it("should handle multiple spaces after a bullet", () => {
    const input = "* Lots of space";
    const expected = "- Lots of space";
    expect(replaceMarkdownElements(input)).toBe(expected);
  });

  it("should not remove dashes that are part of words", () => {
    const input = "This is a-hyphenated-word";
    expect(replaceMarkdownElements(input)).toBe(input);
  });
});
