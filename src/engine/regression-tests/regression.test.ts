import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import type { ExportNode } from "../../shared/types";
import { processElement } from "../processor";

interface RegressionCase {
  id: string;
  description: string;
  config: Omit<ExportNode, "id">;
  rawHtml: string;
  expectedFragments: string[];
}

const casesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "cases",
);
const caseFiles = fs
  .readdirSync(casesDir)
  .filter((file) => file.endsWith(".json"));
const cases: RegressionCase[] = caseFiles.map((file) =>
  JSON.parse(fs.readFileSync(path.join(casesDir, file), "utf-8")),
);

describe("Regression Tests", () => {
  test.each(cases)("$id - $description", (testCase) => {
    const dom = new JSDOM(testCase.rawHtml);
    const root = dom.window.document.querySelector(testCase.config.selector);

    expect(
      root,
      `Selector "${testCase.config.selector}" not found in HTML`,
    ).not.toBeNull();

    const config: ExportNode = {
      ...testCase.config,
      id: testCase.id,
      children: testCase.config.children ?? [],
    };

    const output = processElement(root as HTMLElement, config);

    for (const fragment of testCase.expectedFragments) {
      expect(output).toContain(fragment);
    }
  });
});
