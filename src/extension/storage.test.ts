import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SiteProfile } from "../shared/types";
import {
  deleteProfile,
  getProfile,
  listProfiles,
  saveProfile,
} from "./storage";

/**
 * Unit tests for storage.ts
 * Tests CRUD operations and migration safety for SiteProfile persistence
 *
 * Stage 5: Extension Integration & Clipboard
 */

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};

global.chrome = {
  storage: {
    local: {
      get: vi.fn((key: string) => {
        return Promise.resolve({ [key]: mockStorage[key] || {} });
      }),
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage, data);
        return Promise.resolve();
      }),
    },
  },
} as any;

describe("storage", () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe("saveProfile", () => {
    it("should save a profile to storage", async () => {
      const profile: SiteProfile = {
        domain: "example.com",
        roots: [
          {
            id: "root",
            selector: "body",
            action: "include",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      await saveProfile(profile);

      const retrieved = await getProfile("example.com");
      expect(retrieved).toMatchObject({
        domain: "example.com",
        roots: profile.roots,
      });
      expect(retrieved?.updatedAt).toBeGreaterThan(0);
    });

    it("should update updatedAt timestamp on save", async () => {
      const profile: SiteProfile = {
        domain: "example.com",
        roots: [
          {
            id: "root",
            selector: "body",
            action: "include",
            children: [],
          },
        ],
        updatedAt: 1000,
      };

      await saveProfile(profile);
      const retrieved = await getProfile("example.com");

      // updatedAt should be updated to current time
      expect(retrieved?.updatedAt).toBeGreaterThan(profile.updatedAt);
    });

    it("should overwrite existing profile for the same domain", async () => {
      const profile1: SiteProfile = {
        domain: "example.com",
        roots: [
          {
            id: "root-1",
            selector: "body",
            action: "include",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      const profile2: SiteProfile = {
        domain: "example.com",
        roots: [
          {
            id: "root-2",
            selector: "article",
            action: "template",
            template: "# {{content}}",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      await saveProfile(profile1);
      await saveProfile(profile2);

      const retrieved = await getProfile("example.com");
      expect(retrieved?.roots[0].id).toBe("root-2");
      expect(retrieved?.roots[0].selector).toBe("article");
    });

    it("should support multiple roots", async () => {
      const profile: SiteProfile = {
        domain: "multi-root.com",
        roots: [
          {
            id: "root-1",
            selector: "article",
            action: "include",
            children: [],
          },
          {
            id: "root-2",
            selector: "aside.sidebar",
            action: "include",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      await saveProfile(profile);

      const retrieved = await getProfile("multi-root.com");
      expect(retrieved?.roots).toHaveLength(2);
      expect(retrieved?.roots[0].selector).toBe("article");
      expect(retrieved?.roots[1].selector).toBe("aside.sidebar");
    });
  });

  describe("getProfile", () => {
    it("should return null if profile does not exist", async () => {
      const profile = await getProfile("nonexistent.com");
      expect(profile).toBeNull();
    });

    it("should retrieve a saved profile", async () => {
      const profile: SiteProfile = {
        domain: "test.com",
        roots: [
          {
            id: "root",
            selector: "main",
            action: "include",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      await saveProfile(profile);
      const retrieved = await getProfile("test.com");

      expect(retrieved).toMatchObject({
        domain: "test.com",
        roots: profile.roots,
      });
    });
  });

  describe("deleteProfile", () => {
    it("should delete a profile from storage", async () => {
      const profile: SiteProfile = {
        domain: "delete-me.com",
        roots: [
          {
            id: "root",
            selector: "body",
            action: "include",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      await saveProfile(profile);
      await deleteProfile("delete-me.com");

      const retrieved = await getProfile("delete-me.com");
      expect(retrieved).toBeNull();
    });

    it("should not affect other domains when deleting", async () => {
      const profile1: SiteProfile = {
        domain: "keep-me.com",
        roots: [
          {
            id: "root-1",
            selector: "body",
            action: "include",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      const profile2: SiteProfile = {
        domain: "delete-me.com",
        roots: [
          {
            id: "root-2",
            selector: "article",
            action: "include",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      await saveProfile(profile1);
      await saveProfile(profile2);
      await deleteProfile("delete-me.com");

      const kept = await getProfile("keep-me.com");
      const deleted = await getProfile("delete-me.com");

      expect(kept).not.toBeNull();
      expect(kept?.domain).toBe("keep-me.com");
      expect(deleted).toBeNull();
    });

    it("should handle deleting non-existent profile gracefully", async () => {
      await expect(deleteProfile("nonexistent.com")).resolves.not.toThrow();
    });
  });

  describe("listProfiles", () => {
    it("should return empty array if no profiles exist", async () => {
      const profiles = await listProfiles();
      expect(profiles).toEqual([]);
    });

    it("should list all saved profiles", async () => {
      const profile1: SiteProfile = {
        domain: "site1.com",
        roots: [
          {
            id: "root-1",
            selector: "body",
            action: "include",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      const profile2: SiteProfile = {
        domain: "site2.com",
        roots: [
          {
            id: "root-2",
            selector: "article",
            action: "include",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      await saveProfile(profile1);
      await saveProfile(profile2);

      const profiles = await listProfiles();
      expect(profiles).toHaveLength(2);

      const domains = profiles.map((p) => p.domain);
      expect(domains).toContain("site1.com");
      expect(domains).toContain("site2.com");
    });
  });

  describe("Storage Migration Safety", () => {
    it("should not wipe existing rules when adding a new domain", async () => {
      // Simulate existing profiles
      const existingProfiles: Record<string, SiteProfile> = {
        "old-site.com": {
          domain: "old-site.com",
          roots: [
            {
              id: "old-root",
              selector: "body",
              action: "include",
              children: [],
            },
          ],
          updatedAt: Date.now(),
        },
      };

      mockStorage.profiles = existingProfiles;

      // Add a new profile for a different domain
      const newProfile: SiteProfile = {
        domain: "new-site.com",
        roots: [
          {
            id: "new-root",
            selector: "article",
            action: "include",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      await saveProfile(newProfile);

      // Verify both profiles exist
      const oldProfile = await getProfile("old-site.com");
      const retrievedNewProfile = await getProfile("new-site.com");

      expect(oldProfile).not.toBeNull();
      expect(oldProfile?.domain).toBe("old-site.com");
      expect(retrievedNewProfile).not.toBeNull();
      expect(retrievedNewProfile?.domain).toBe("new-site.com");

      // Verify we have exactly 2 profiles
      const allProfiles = await listProfiles();
      expect(allProfiles).toHaveLength(2);
    });

    it("should preserve all profiles when updating one", async () => {
      // Set up multiple profiles
      const profiles: SiteProfile[] = [
        {
          domain: "site-a.com",
          roots: [
            { id: "a", selector: "body", action: "include", children: [] },
          ],
          updatedAt: Date.now(),
        },
        {
          domain: "site-b.com",
          roots: [
            {
              id: "b",
              selector: "article",
              action: "include",
              children: [],
            },
          ],
          updatedAt: Date.now(),
        },
        {
          domain: "site-c.com",
          roots: [
            { id: "c", selector: "main", action: "include", children: [] },
          ],
          updatedAt: Date.now(),
        },
      ];

      for (const profile of profiles) {
        await saveProfile(profile);
      }

      // Update one profile
      const updatedProfile: SiteProfile = {
        domain: "site-b.com",
        roots: [
          {
            id: "b-updated",
            selector: "section",
            action: "template",
            template: "{{content}}",
            children: [],
          },
        ],
        updatedAt: Date.now(),
      };

      await saveProfile(updatedProfile);

      // Verify all profiles still exist
      const allProfiles = await listProfiles();
      expect(allProfiles).toHaveLength(3);

      // Verify the update was applied
      const updated = await getProfile("site-b.com");
      expect(updated?.roots[0].id).toBe("b-updated");
      expect(updated?.roots[0].selector).toBe("section");

      // Verify others remain unchanged
      const siteA = await getProfile("site-a.com");
      const siteC = await getProfile("site-c.com");
      expect(siteA?.roots[0].selector).toBe("body");
      expect(siteC?.roots[0].selector).toBe("main");
    });
  });
});
