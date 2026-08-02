/**
 * Tests for DOM readiness utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitForContent, waitForSelector } from "./dom-ready";

describe("waitForContent", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should resolve immediately if content is already present", async () => {
    // Add meaningful content
    document.body.innerHTML = `
      <article>
        <h1>Title</h1>
        <p>This is a paragraph with substantial content that should be detected.</p>
        <p>Another paragraph to ensure we have enough text nodes.</p>
        <p>And one more for good measure.</p>
      </article>
    `;

    const promise = waitForContent({
      timeout: 1000,
      minTextNodes: 3,
      minTextLength: 50,
    });

    // Should resolve without needing to advance timers
    const result = await promise;
    expect(result).toBe(true);
  });

  it("should wait and poll for content to appear", async () => {
    // Start with empty body
    document.body.innerHTML = "<div></div>";

    const promise = waitForContent({
      timeout: 1000,
      minTextNodes: 3,
      minTextLength: 50,
      checkInterval: 100,
    });

    // Advance time and add content after 300ms
    vi.advanceTimersByTime(300);

    // Add content during the wait
    document.body.innerHTML = `
      <article>
        <h1>Title</h1>
        <p>Content appeared after delay!</p>
        <p>More content here.</p>
        <p>And even more content.</p>
      </article>
    `;

    // Advance to next check
    vi.advanceTimersByTime(100);

    // Should now resolve
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe(true);
  });

  it("should timeout if content never appears", async () => {
    document.body.innerHTML = "<div>Not enough content</div>";

    const promise = waitForContent({
      timeout: 500,
      minTextNodes: 10,
      minTextLength: 1000,
      checkInterval: 100,
    });

    // Fast-forward past timeout
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe(false);
  });
});

describe("waitForSelector", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should resolve immediately if selector exists", async () => {
    document.body.innerHTML = '<div class="target">Found</div>';

    const promise = waitForSelector(".target", { timeout: 1000 });
    const result = await promise;

    expect(result).not.toBeNull();
    expect(result?.textContent).toBe("Found");
  });

  it("should wait for selector to appear", async () => {
    document.body.innerHTML = "<div></div>";

    const promise = waitForSelector(".target", {
      timeout: 1000,
      checkInterval: 100,
    });

    // Add element after 200ms
    vi.advanceTimersByTime(200);
    document.body.innerHTML = '<div class="target">Appeared</div>';

    // Advance to next check
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).not.toBeNull();
    expect(result?.textContent).toBe("Appeared");
  });

  it("should timeout if selector never appears", async () => {
    document.body.innerHTML = "<div>No target here</div>";

    const promise = waitForSelector(".target", {
      timeout: 500,
      checkInterval: 100,
    });

    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeNull();
  });
});
