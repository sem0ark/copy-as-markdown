import { customElementRules } from "../custom-element-rules";

export interface CustomElementRule {
  urlWildcard: string;
  cssSelector: string;
  transform: (element: HTMLElement) => string;
}

function wildcardToRegExp(wildcard: string): RegExp {
  const escaped = wildcard.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`, "i");
}

function matchesUrl(url: string, wildcard: string): boolean {
  try {
    return wildcardToRegExp(wildcard).test(url);
  } catch {
    return false;
  }
}

/** Returns custom element rules whose URL wildcard matches the given URL. */
export function getMatchingRules(currentUrl: string): CustomElementRule[] {
  return customElementRules.filter((rule) =>
    matchesUrl(currentUrl, rule.urlWildcard),
  );
}
