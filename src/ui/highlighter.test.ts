/**
 * Tests for highlighter module - visual overlay functionality
 */

import { beforeEach, describe, expect, it } from "vitest";
import { Highlighter } from "./highlighter";

describe("Highlighter", () => {
  let highlighter: Highlighter;

  beforeEach(() => {
    document.body.innerHTML = "";
    highlighter = new Highlighter();
  });

  it("should activate and create overlay", () => {
    highlighter.activate();

    expect(highlighter.active).toBe(true);
    const overlay = document.querySelector(".md-saver-highlight");
    expect(overlay).not.toBeNull();
  });

  it("should deactivate and remove overlay", () => {
    highlighter.activate();
    highlighter.deactivate();

    expect(highlighter.active).toBe(false);
    const overlay = document.querySelector(".md-saver-highlight");
    expect(overlay).toBeNull();
  });

  it("should highlight an element", () => {
    document.body.innerHTML = '<div id="target">Content</div>';
    const target = document.getElementById("target") as HTMLElement;

    highlighter.activate();
    highlighter.highlight(target);

    const overlay = document.querySelector(
      ".md-saver-highlight",
    ) as HTMLElement;
    expect(overlay.style.display).toBe("block");
  });

  it("should hide overlay", () => {
    document.body.innerHTML = '<div id="target">Content</div>';
    const target = document.getElementById("target") as HTMLElement;

    highlighter.activate();
    highlighter.highlight(target);
    highlighter.hide();

    const overlay = document.querySelector(
      ".md-saver-highlight",
    ) as HTMLElement;
    expect(overlay.style.display).toBe("none");
  });

  it("should use custom options", () => {
    highlighter = new Highlighter({
      borderColor: "#FF0000",
      borderWidth: 3,
    });

    highlighter.activate();

    const overlay = document.querySelector(
      ".md-saver-highlight",
    ) as HTMLElement;
    expect(overlay.style.borderColor).toContain("255, 0, 0"); // RGB for red
    expect(overlay.style.borderWidth).toBe("3px");
  });
});
