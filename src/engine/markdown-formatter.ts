export function escapeLeadingWhitespace(text: string): string {
  // Trim, but ensure we have escaped leading whitespace.
  return text
    .split("\n")
    .map((line) => {
      const leadingWhitespaceMatch = line.match(/^(\s*)/);
      const leadingWhitespace = leadingWhitespaceMatch
        ? leadingWhitespaceMatch[1]
        : "";
      const trimmedText = line.trimStart();

      if (leadingWhitespace.length > 1 && trimmedText.length > 1) {
        return `<pre>${leadingWhitespace}</pre>${trimmedText.trimEnd()}`;
      }

      return trimmedText.trim();
    })
    .join("\n");
}

export function trimLines(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

export function escapeDollar(text: string): string {
  const replacer = (
    _match: string,
    dollarSigns: string,
    content: string,
  ): string => {
    return `<pre>${dollarSigns}${content}${dollarSigns}</pre>`;
  };

  /**
   * Refined Regex:
   * 1. (?<!\$)       - No dollar sign before
   * 2. (\${1,2})     - Capture 1 or 2 dollars
   * 3. ([^\s$])      - The 1st char must NOT be whitespace/dollar (We don't want to escape currency)
   * 4. ([^$]*?)      - Lazy match middle content
   * 5. ([^\s$])      - The last char must NOT be whitespace/dollar
   * 6. \2            - Match the same number of dollars
   * 7. (?!\$)        - No dollar sign after
   */
  return text.replace(
    /(?<!\$)(\${1,2})([^\s$](?:[^$]*?[^\s$])?)\1(?!\$)/g,
    replacer,
  );
}

export function escapeNewLine(text: string): string {
  return text.replace(/\n/g, "<br>");
}

export function escapeGenerics(text: string): string {
  return text.replace(/<(?! )/g, " < ").replace(/(?<! )>/g, " > ");
}

export function replaceUnicode(text: string): string {
  return text
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000\uFEFF]/gu, " ") // Normalize whitespace characters
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/gu, "'") // Norm. single quotes/apostrophes
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036\u00AB\u00BB]/gu, '"') // Norm. double quotes
    .replace(/[\u2012-\u2015\u2212]/gu, "-")
    .replace(/[\u2022\u2023\u25E6\u2043\u2219][\s\u2000-\u200A]*/gu, "- ") // Norm. bullets
    .replace(/[\u007F-\u009F\u2028\u2029]/gu, "") // Remove non-printable/control chars
    .trim();
}

export function removeEmoji(text: string): string {
  return text.replace(/\p{Extended_Pictographic}/gu, "");
}

export function joinFunctions(
  ...functions: ((text: string) => string)[]
): (text: string) => string {
  return (initial_text: string) =>
    functions.reduce((text, f) => f(text), initial_text);
}

export function splitIntoChunks(text: string): string[] {
  return text.split("\n");
}

export function restoreText(text: string): string {
  if (!text) return "";

  const entityMap: Record<string, string> = {
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&ndash;": "–",
    "&mdash;": "—",
    "&bull;": "•",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&deg;": "°",
    "&plusmn;": "±",
  };

  let restored = text;

  restored = restored.replace(/<br\s*\/?>/gi, "\n");
  restored = restored.replace(/<div[^>]*>/gi, "");
  restored = restored.replace(/<\/div>/gi, "\n");
  restored = restored.replace(/<\/?pre>/gi, "");

  const entityRegex = new RegExp(Object.keys(entityMap).join("|"), "g");
  restored = restored.replace(entityRegex, (matched) => entityMap[matched]);

  restored = restored.replace(/&amp;/g, "&");
  return restored
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

export function replaceMarkdownElements(text: string): string {
  return (
    text
      // 1. Convert various bullet points (* to -) with different indentation levels
      // - Start of line or newline
      .replace(/(^|\n)\* +/g, "$1- ")
      // - 2 spaces
      .replace(/\n {2}\* +/g, "\n- ")
      .replace(/\n {2}(\d+\.) +/g, "\n$1 ")
      // - 3 spaces or tab
      .replace(/( {4}|\t)\* +/g, "    - ")

      // Normalize remaining tabs/4-space blocks to exactly 4 spaces
      .replace(/( {4}|\t)/g, "    ")

      // Normalize numbered lists (ensure exactly one space after the dot)
      // Matches "1.   item" -> "1. item"
      .replace(/^(\s*)(\d+\.) +/gm, "$1$2 ")
      // Matches "-   item" -> "- item"
      .replace(/^(\s*)(-) +/gm, "$1$2 ")

      // Remove Horizontal Rules (--- or ***) that occupy a whole line
      .replace(/^-{3,}$/gm, "")
      .replace(/^\*{3,}$/gm, "")
  );
}
