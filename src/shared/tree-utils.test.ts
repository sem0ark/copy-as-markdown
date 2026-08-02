import { beforeEach, describe, expect, it } from "vitest";
import {
  findNodeById,
  generateNodeId,
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
            action: "template",
            template: "> [!info] {{content}}",
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

    it("should find a node with template action", () => {
      const result = findNodeById(sampleTree, "footer");
      expect(result).toBeDefined();
      expect(result?.action).toBe("template");
      expect(result?.template).toBe("> [!info] {{content}}");
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
        root: {
          id: "root",
          selector: "body",
          action: "include",
          children: [],
        },
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

    it("should reject profile with missing root", () => {
      // Arrange
      const invalidProfile = { ...validProfile, root: undefined as any };

      // Act
      const errors = validateSiteProfile(invalidProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("Root"))).toBe(true);
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
      validProfile.root.id = "";

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("ID"))).toBe(true);
    });

    it("should reject node with missing selector", () => {
      // Arrange
      validProfile.root.selector = "";

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("selector"))).toBe(true);
    });

    it("should reject node with invalid action", () => {
      // Arrange
      validProfile.root.action = "invalid" as any;

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("invalid action"))).toBe(true);
    });

    it("should reject template action without template string", () => {
      // Arrange
      validProfile.root.action = "template";
      validProfile.root.template = undefined;

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("template"))).toBe(true);
    });

    it("should detect duplicate node IDs in tree", () => {
      // Arrange
      validProfile.root.children = [
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
      validProfile.root = {
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
            action: "template",
            template: "> {{content}}",
            children: [],
          },
        ],
      };

      // Act
      const errors = validateSiteProfile(validProfile);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });

  describe("SiteProfile JSON serialization", () => {
    it("should serialize and deserialize a SiteProfile", () => {
      // Arrange
      const profile: SiteProfile = {
        domain: "example.com",
        updatedAt: 1234567890,
        root: {
          id: "root",
          selector: "body",
          action: "include",
          children: [
            {
              id: "child",
              selector: ".content",
              action: "template",
              template: "# {{content}}",
              children: [],
            },
          ],
        },
      };

      // Act
      const json = JSON.stringify(profile);
      const deserialized: SiteProfile = JSON.parse(json);

      // Assert
      expect(deserialized).toEqual(profile);
      expect(deserialized.domain).toBe("example.com");
      expect(deserialized.root.children).toHaveLength(1);
      expect(deserialized.root.children[0].template).toBe("# {{content}}");
    });

    it("should handle empty children arrays", () => {
      // Arrange
      const profile: SiteProfile = {
        domain: "test.com",
        updatedAt: Date.now(),
        root: {
          id: "root",
          selector: "body",
          action: "include",
          children: [],
        },
      };

      // Act
      const json = JSON.stringify(profile);
      const deserialized: SiteProfile = JSON.parse(json);

      // Assert
      expect(deserialized.root.children).toEqual([]);
    });

    it("should preserve all ExportNode fields through serialization", () => {
      // Arrange
      const node: ExportNode = {
        id: "test-id",
        selector: "div.test",
        action: "template",
        template: "**{{content}}**",
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
      expect(deserialized.action).toBe("template");
      expect(deserialized.template).toBe("**{{content}}**");
      expect(deserialized.children).toHaveLength(1);
      expect(deserialized.children[0].id).toBe("nested");
    });
  });
});
