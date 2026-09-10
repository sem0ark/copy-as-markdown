import type { CustomElementRule } from "./engine/custom-element-rules";

export const customElementRules: CustomElementRule[] = [
  {
    urlWildcard: "https://*.skills.*/*",
    cssSelector: "ql-variable",
    transform: (element) => {
      console.info("Copy as Markdown: matched ql-variable element", {
        outerHTML: element.outerHTML,
        innerHTML: element.innerHTML,
      });
      const placeholder = element.getAttribute("placeholder");
      return placeholder ? `\`${placeholder}\`` : "";
    },
  },
  {
    urlWildcard: "https://elearn.*/*",
    cssSelector: "span.dm2-hl-link",
    transform: (element) => {
      const textElement = element.querySelector("div.dm2-hl-text");
      const textContent = textElement ? textElement.textContent : "";

      const directContent = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join("").trim();

      return `${directContent} (\`${textContent}\`)`
    },
  },
];
