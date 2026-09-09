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
];
