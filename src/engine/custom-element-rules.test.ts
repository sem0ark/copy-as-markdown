import { afterEach, describe, expect, it } from "vitest";
import { customElementRules } from "../custom-element-rules";
import { getMatchingRules } from "./custom-element-rules";

const builtInRuleCount = customElementRules.length;

afterEach(() => {
  customElementRules.splice(builtInRuleCount);
});

describe("custom-element-rules", () => {
  it("replaces ql-variable elements with their placeholder", () => {
    const [rule] = getMatchingRules("https://*.skills.*/document/d/123");
    const element = document.createElement("ql-variable");
    element.setAttribute("key", "project_0.startup_script.agent_name");
    element.setAttribute("placeholder", "Agent Name");

    expect(rule.transform(element)).toBe("`Agent Name`");
  });

  it("returns rules matching the current URL wildcard", () => {
    customElementRules.push({
      urlWildcard: "https://docs.example.com/*",
      cssSelector: "example-card",
      transform: () => "converted",
    });

    expect(getMatchingRules("https://docs.example.com/article/1")).toHaveLength(
      1,
    );
    expect(
      getMatchingRules("https://other.example.com/article/1"),
    ).toHaveLength(0);
  });

  it("transforms matching elements with inner and outer HTML", () => {
    let receivedInnerHTML = "";
    let receivedOuterHTML = "";
    customElementRules.push({
      urlWildcard: "https://example.com/*",
      cssSelector: "example-card",
      transform: (element) => {
        receivedInnerHTML = element.innerHTML;
        receivedOuterHTML = element.outerHTML;
        return "converted";
      },
    });

    const [rule] = getMatchingRules("https://example.com/page");
    const element = document.createElement("example-card");
    element.innerHTML = "<strong>Content</strong>";

    expect(rule.transform(element)).toBe("converted");
    expect(receivedInnerHTML).toBe("<strong>Content</strong>");
    expect(receivedOuterHTML).toBe(
      "<example-card><strong>Content</strong></example-card>",
    );
  });

  it("ignores invalid selectors without breaking rule evaluation", () => {
    customElementRules.push({
      urlWildcard: "*",
      cssSelector: "[invalid",
      transform: () => "converted",
    });

    const [rule] = getMatchingRules("https://example.com/page");
    expect(rule.cssSelector).toBe("[invalid");
  });
});
