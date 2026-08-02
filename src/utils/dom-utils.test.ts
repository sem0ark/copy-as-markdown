import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getIframeSelector,
  getInnerSelector,
  isDeepSelector,
  querySelectorAllDeep,
  querySelectorDeep,
} from "./dom-utils";

describe("dom-utils", () => {
  let document: Document;

  beforeEach(() => {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    global.document = document as any;
  });

  describe("querySelectorDeep", () => {
    it("should work with simple selectors", () => {
      document.body.innerHTML = `
        <div class="container">
          <p class="target">Content</p>
        </div>
      `;

      const element = querySelectorDeep(".target");

      expect(element).not.toBeNull();
      expect(element?.textContent).toBe("Content");
    });

    it("should drill into iframe with >>> syntax", () => {
      document.body.innerHTML = `
        <div>
          <iframe id="content-frame"></iframe>
        </div>
      `;

      const iframe = document.querySelector("iframe") as HTMLIFrameElement;
      const iframeDoc = new JSDOM(
        "<!DOCTYPE html><html><body><article class='post'>Post content</article></body></html>",
      ).window.document;
      Object.defineProperty(iframe, "contentDocument", {
        value: iframeDoc,
        writable: false,
      });

      const element = querySelectorDeep("iframe#content-frame >>> .post");

      expect(element).not.toBeNull();
      expect(element?.textContent).toBe("Post content");
    });

    it("should handle nested iframes", () => {
      document.body.innerHTML = '<iframe id="outer"></iframe>';

      const outerIframe = document.querySelector("iframe") as HTMLIFrameElement;
      const outerDoc = new JSDOM(
        "<!DOCTYPE html><html><body><iframe id='inner'></iframe></body></html>",
      ).window.document;
      Object.defineProperty(outerIframe, "contentDocument", {
        value: outerDoc,
        writable: false,
      });

      const innerIframe = outerDoc.querySelector("iframe") as HTMLIFrameElement;
      const innerDoc = new JSDOM(
        "<!DOCTYPE html><html><body><p class='deep'>Deep content</p></body></html>",
      ).window.document;
      Object.defineProperty(innerIframe, "contentDocument", {
        value: innerDoc,
        writable: false,
      });

      const element = querySelectorDeep(
        "iframe#outer >>> iframe#inner >>> .deep",
      );

      expect(element).not.toBeNull();
      expect(element?.textContent).toBe("Deep content");
    });

    it("should return null if element not found", () => {
      document.body.innerHTML = "<div></div>";

      const element = querySelectorDeep(".nonexistent");

      expect(element).toBeNull();
    });

    it("should return null if iframe selector not found", () => {
      document.body.innerHTML = "<div></div>";

      const element = querySelectorDeep("iframe#missing >>> .target");

      expect(element).toBeNull();
    });

    it("should return null if inner selector not found", () => {
      document.body.innerHTML = '<iframe id="frame"></iframe>';

      const iframe = document.querySelector("iframe") as HTMLIFrameElement;
      const iframeDoc = new JSDOM(
        "<!DOCTYPE html><html><body><p>Content</p></body></html>",
      ).window.document;
      Object.defineProperty(iframe, "contentDocument", {
        value: iframeDoc,
        writable: false,
      });

      const element = querySelectorDeep("iframe#frame >>> .missing");

      expect(element).toBeNull();
    });

    it("should return null if selector before >>> is not an iframe", () => {
      document.body.innerHTML = '<div id="not-iframe"><p>Content</p></div>';

      const element = querySelectorDeep("div#not-iframe >>> p");

      expect(element).toBeNull();
    });

    it("should handle cross-origin iframes gracefully", () => {
      document.body.innerHTML = '<iframe id="blocked"></iframe>';

      const iframe = document.querySelector("iframe") as HTMLIFrameElement;
      Object.defineProperty(iframe, "contentDocument", {
        get() {
          throw new Error("Cross-origin blocked");
        },
      });

      const element = querySelectorDeep("iframe#blocked >>> .target");

      expect(element).toBeNull();
    });

    it("should handle null contentDocument", () => {
      document.body.innerHTML = '<iframe id="empty"></iframe>';

      const iframe = document.querySelector("iframe") as HTMLIFrameElement;
      Object.defineProperty(iframe, "contentDocument", {
        value: null,
        writable: false,
      });

      const element = querySelectorDeep("iframe#empty >>> .target");

      expect(element).toBeNull();
    });
  });

  describe("isDeepSelector", () => {
    it("should return true for deep selectors", () => {
      expect(isDeepSelector("iframe >>> .target")).toBe(true);
      expect(isDeepSelector("iframe#id >>> article >>> p")).toBe(true);
    });

    it("should return false for simple selectors", () => {
      expect(isDeepSelector(".target")).toBe(false);
      expect(isDeepSelector("div > p")).toBe(false);
    });
  });

  describe("getIframeSelector", () => {
    it("should extract iframe selector", () => {
      expect(getIframeSelector("iframe#content >>> .article")).toBe(
        "iframe#content",
      );
      expect(getIframeSelector("iframe.frame >>> p")).toBe("iframe.frame");
    });

    it("should return null for simple selectors", () => {
      expect(getIframeSelector(".article")).toBeNull();
    });
  });

  describe("getInnerSelector", () => {
    it("should extract inner selector", () => {
      expect(getInnerSelector("iframe#content >>> .article")).toBe(".article");
      expect(getInnerSelector("iframe >>> div > p")).toBe("div > p");
    });

    it("should handle nested iframes", () => {
      expect(getInnerSelector("iframe#outer >>> iframe#inner >>> .deep")).toBe(
        "iframe#inner >>> .deep",
      );
    });

    it("should return null for simple selectors", () => {
      expect(getInnerSelector(".article")).toBeNull();
    });
  });

  describe("querySelectorAllDeep", () => {
    it("should return all matching elements with simple selector", () => {
      document.body.innerHTML = `
        <div>
          <p class="target">First</p>
          <p class="target">Second</p>
        </div>
      `;

      const elements = querySelectorAllDeep(".target");

      expect(elements).toHaveLength(2);
      expect(elements[0].textContent).toBe("First");
      expect(elements[1].textContent).toBe("Second");
    });

    it("should return all elements inside iframe", () => {
      document.body.innerHTML = '<iframe id="frame"></iframe>';

      const iframe = document.querySelector("iframe") as HTMLIFrameElement;
      const iframeDoc = new JSDOM(
        "<!DOCTYPE html><html><body><p class='item'>A</p><p class='item'>B</p></body></html>",
      ).window.document;
      Object.defineProperty(iframe, "contentDocument", {
        value: iframeDoc,
        writable: false,
      });

      const elements = querySelectorAllDeep("iframe#frame >>> .item");

      expect(elements).toHaveLength(2);
      expect(elements[0].textContent).toBe("A");
      expect(elements[1].textContent).toBe("B");
    });

    it("should return elements from multiple iframes", () => {
      document.body.innerHTML = `
        <iframe class="frame"></iframe>
        <iframe class="frame"></iframe>
      `;

      const iframes = document.querySelectorAll("iframe");
      for (const iframe of iframes) {
        const iframeDoc = new JSDOM(
          "<!DOCTYPE html><html><body><p class='inner'>Content</p></body></html>",
        ).window.document;
        Object.defineProperty(iframe, "contentDocument", {
          value: iframeDoc,
          writable: false,
        });
      }

      const elements = querySelectorAllDeep("iframe.frame >>> .inner");

      expect(elements).toHaveLength(2);
    });

    it("should return empty array if no matches", () => {
      document.body.innerHTML = "<div></div>";

      const elements = querySelectorAllDeep(".nonexistent");

      expect(elements).toHaveLength(0);
    });

    it("should handle cross-origin iframes gracefully", () => {
      document.body.innerHTML = '<iframe id="blocked"></iframe>';

      const iframe = document.querySelector("iframe") as HTMLIFrameElement;
      Object.defineProperty(iframe, "contentDocument", {
        get() {
          throw new Error("Cross-origin blocked");
        },
      });

      const elements = querySelectorAllDeep("iframe#blocked >>> .target");

      expect(elements).toHaveLength(0);
    });
  });
});
