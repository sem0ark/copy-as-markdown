import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createExportNode,
  findNodeById,
  generateNodeId,
  insertNodeInTree,
  validateSiteProfile,
} from "./tree-utils";
import type { ExportNode, SiteProfile } from "./types";

describe("tree-utils", () => {
  describe("findNodeById", () => {
    let sampleTree: ExportNode;

    beforeEach(() => {
      sampleTree = {
        id: "root",
        selector: "body",
        action: "include",
        children: [
          {
            id: "header",
            selector: "header",
            action: "ignore",
            children: [],
          },
          {
            id: "main",
            selector: "main",
            action: "include",
            children: [
              {
                id: "article",
                selector: "article",
                action: "include",
                children: [],
              },
              {
                id: "aside",
                selector: "aside",
                action: "ignore",
                children: [],
              },
            ],
          },
          {
            id: "footer",
            selector: "footer",
            action: "include",
            children: [],
          },
        ],
      };
    });

    it("should find the root node", () => {
      const result = findNodeById(sampleTree, "root");
      expect(result).toBeDefined();
      expect(result?.id).toBe("root");
      expect(result?.selector).toBe("body");
    });

    it("should find a direct child node", () => {
      const result = findNodeById(sampleTree, "header");
      expect(result).toBeDefined();
      expect(result?.id).toBe("header");
      expect(result?.selector).toBe("header");
    });

    it("should find a deeply nested node", () => {
      const result = findNodeById(sampleTree, "article");
      expect(result).toBeDefined();
      expect(result?.id).toBe("article");
      expect(result?.selector).toBe("article");
    });

    it("should return undefined for non-existent ID", () => {
      const result = findNodeById(sampleTree, "nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("generateNodeId", () => {
    it("should generate a string ID", () => {
      const id = generateNodeId();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("should generate unique IDs", () => {
      const id1 = generateNodeId();
      const id2 = generateNodeId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "node_" prefix', () => {
      const id = generateNodeId();
      expect(id).toMatch(/^node_\d+_[a-z0-9]+$/);
    });

    it("should generate 100 unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateNodeId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("validateSiteProfile", () => {
    let validProfile: SiteProfile;

    beforeEach(() => {
      validProfile = {
        domain: "example.com",
        updatedAt: Date.now(),
        roots: [
          {
            id: "root",
            selector: "body",
            action: "include",
            children: [],
          },
        ],
      };
    });

    // Arrange - Act - Assert pattern

    it("should validate a correct profile", () => {
      // Arrange: validProfile is already set up in beforeEach

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it("should reject profile with empty domain", () => {
      // Arrange
      validProfile.domain = "";

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("Domain"))).toBe(true);
    });

    it("should reject profile with missing roots array", () => {
      // Arrange
      const invalidProfile = { ...validProfile, roots: undefined as any };

      // Act
      const errors = validateSiteProfile(invalidProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("roots"))).toBe(true);
    });

    it("should reject profile with empty roots array", () => {
      // Arrange
      validProfile.roots = [];

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("At least one root"))).toBe(true);
    });

    it("should reject profile with invalid updatedAt", () => {
      // Arrange
      validProfile.updatedAt = -1;

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("updatedAt"))).toBe(true);
    });

    it("should reject node with missing ID", () => {
      // Arrange
      validProfile.roots[0].id = "";

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("ID"))).toBe(true);
    });

    it("should reject node with missing selector", () => {
      // Arrange
      validProfile.roots[0].selector = "";

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("selector"))).toBe(true);
    });

    it("should reject node with invalid action", () => {
      // Arrange
      validProfile.roots[0].action = "invalid" as any;

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("invalid action"))).toBe(true);
    });

    it("should detect duplicate node IDs in tree", () => {
      // Arrange
      validProfile.roots[0].children = [
        {
          id: "child1",
          selector: ".class1",
          action: "include",
          children: [],
        },
        {
          id: "child1", // Duplicate ID
          selector: ".class2",
          action: "ignore",
          children: [],
        },
      ];

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("Duplicate"))).toBe(true);
    });

    it("should validate complex nested structure", () => {
      // Arrange
      validProfile.roots = [
        {
          id: "root",
          selector: "body",
          action: "include",
          children: [
            {
              id: "main",
              selector: "main",
              action: "include",
              children: [
                {
                  id: "article",
                  selector: "article",
                  action: "include",
                  children: [],
                },
              ],
            },
            {
              id: "footer",
              selector: "footer",
              action: "include",
              children: [],
            },
          ],
        },
      ];

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it("should validate multiple roots", () => {
      // Arrange
      validProfile.roots = [
        {
          id: "root-1",
          selector: "article",
          action: "include",
          children: [],
        },
        {
          id: "root-2",
          selector: "aside",
          action: "include",
          children: [],
        },
      ];

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it("should detect duplicate IDs across multiple roots", () => {
      // Arrange
      validProfile.roots = [
        {
          id: "duplicate",
          selector: "article",
          action: "include",
          children: [],
        },
        {
          id: "duplicate", // Duplicate ID in different root
          selector: "aside",
          action: "include",
          children: [],
        },
      ];

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("Duplicate"))).toBe(true);
    });
  });

  describe("createExportNode", () => {
    it("should create node with include action", () => {
      const node = createExportNode(".main", "include");

      expect(node.selector).toBe(".main");
      expect(node.action).toBe("include");
      expect(node.children).toEqual([]);
      expect(node.id).toMatch(/^node_/);
    });

    it("should create node with ignore action", () => {
      const node = createExportNode(".ads", "ignore");

      expect(node.selector).toBe(".ads");
      expect(node.action).toBe("ignore");
    });
  });

  describe("insertNodeInTree", () => {
    let dom: JSDOM;
    let document: Document;

    beforeEach(() => {
      dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
      document = dom.window.document;
      global.document = document;
    });

    it("should insert node as child of matching parent", () => {
      document.body.innerHTML = `
        <article class="main">
          <div class="content">
            <p class="target">Text</p>
          </div>
        </article>
      `;

      const root: ExportNode = {
        id: "root",
        selector: "article.main",
        action: "include",
        children: [],
      };

      const newNode = createExportNode(".target", "ignore");
      const targetElement = document.querySelector(".target")!;

      const success = insertNodeInTree(root, newNode, targetElement);

      expect(success).toBe(true);
      expect(root.children).toHaveLength(1);
      expect(root.children[0]).toBe(newNode);
    });

    it("should insert node under most specific parent", () => {
      document.body.innerHTML = `
        <article class="main">
          <div class="content">
            <p class="target">Text</p>
          </div>
        </article>
      `;

      const root: ExportNode = {
        id: "root",
        selector: "article.main",
        action: "include",
        children: [
          {
            id: "content",
            selector: ".content",
            action: "include",
            children: [],
          },
        ],
      };

      const newNode = createExportNode(".target", "ignore");
      const targetElement = document.querySelector(".target")!;

      const success = insertNodeInTree(root, newNode, targetElement);

      expect(success).toBe(true);
      expect(root.children[0].children).toHaveLength(1);
      expect(root.children[0].children[0]).toBe(newNode);
    });

    it("should return false when no matching parent found", () => {
      document.body.innerHTML = `
        <article class="main">
          <div class="content">
            <p class="target">Text</p>
          </div>
        </article>
      `;

      const root: ExportNode = {
        id: "root",
        selector: ".nonexistent",
        action: "include",
        children: [],
      };

      const newNode = createExportNode(".target", "ignore");
      const targetElement = document.querySelector(".target")!;

      const success = insertNodeInTree(root, newNode, targetElement);

      expect(success).toBe(false);
      expect(root.children).toHaveLength(0);
    });

    it("should handle complex nested hierarchies", () => {
      document.body.innerHTML = `
        <main>
          <article id="post">
            <header>
              <h1>Title</h1>
            </header>
            <section class="content">
              <div class="note">
                <span class="icon">!</span>
                <p class="text">Note text</p>
              </div>
            </section>
          </article>
        </main>
      `;

      const root: ExportNode = {
        id: "root",
        selector: "#post",
        action: "include",
        children: [
          {
            id: "content",
            selector: ".content",
            action: "include",
            children: [
              {
                id: "note",
                selector: ".note",
                action: "include",
                children: [],
              },
            ],
          },
        ],
      };

      const newNode = createExportNode(".icon", "ignore");
      const targetElement = document.querySelector(".icon")!;

      const success = insertNodeInTree(root, newNode, targetElement);

      expect(success).toBe(true);
      const noteNode = root.children[0].children[0];
      expect(noteNode.children).toHaveLength(1);
      expect(noteNode.children[0]).toBe(newNode);
    });

    it("should insert at root level when target is direct child", () => {
      document.body.innerHTML = `
        <article class="main">
          <div class="sidebar">Sidebar</div>
        </article>
      `;

      const root: ExportNode = {
        id: "root",
        selector: "article.main",
        action: "include",
        children: [],
      };

      const newNode = createExportNode(".sidebar", "ignore");
      const targetElement = document.querySelector(".sidebar")!;

      const success = insertNodeInTree(root, newNode, targetElement);

      expect(success).toBe(true);
      expect(root.children).toHaveLength(1);
      expect(root.children[0]).toBe(newNode);
    });
  });

  describe("SiteProfile JSON serialization", () => {
    it("should serialize and deserialize a SiteProfile", () => {
      // Arrange
      const profile: SiteProfile = {
        domain: "example.com",
        updatedAt: 1234567890,
        roots: [
          {
            id: "root",
            selector: "body",
            action: "include",
            children: [
              {
                id: "child",
                selector: ".content",
                action: "include",
                children: [],
              },
            ],
          },
        ],
      };

      // Act
      const json = JSON.stringify(profile);
      const deserialized: SiteProfile = JSON.parse(json);

      // Assert
      expect(deserialized).toEqual(profile);
      expect(deserialized.domain).toBe("example.com");
      expect(deserialized.roots[0].children).toHaveLength(1);
    });

    it("should handle empty children arrays", () => {
      // Arrange
      const profile: SiteProfile = {
        domain: "test.com",
        updatedAt: Date.now(),
        roots: [
          {
            id: "root",
            selector: "body",
            action: "include",
            children: [],
          },
        ],
      };

      // Act
      const json = JSON.stringify(profile);
      const deserialized: SiteProfile = JSON.parse(json);

      // Assert
      expect(deserialized.roots[0].children).toEqual([]);
    });

    it("should preserve all ExportNode fields through serialization", () => {
      // Arrange
      const node: ExportNode = {
        id: "test-id",
        selector: "div.test",
        action: "include",
        children: [
          {
            id: "nested",
            selector: "span",
            action: "ignore",
            children: [],
          },
        ],
      };

      // Act
      const json = JSON.stringify(node);
      const deserialized: ExportNode = JSON.parse(json);

      // Assert
      expect(deserialized.id).toBe("test-id");
      expect(deserialized.selector).toBe("div.test");
      expect(deserialized.action).toBe("include");
      expect(deserialized.children).toHaveLength(1);
      expect(deserialized.children[0].id).toBe("nested");
    });
  });
});
