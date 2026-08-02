import type { SiteProfile } from "../shared/types";

/**
 * Typed wrapper for chrome.storage.local
 * Manages SiteProfile persistence
 */

const STORAGE_KEY = "profiles";

/**
 * Retrieves the SiteProfile for a given domain
 */
export async function getProfile(domain: string): Promise<SiteProfile | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const profiles: Record<string, SiteProfile> = result[STORAGE_KEY] || {};
  return profiles[domain] || null;
}

/**
 * Saves a SiteProfile for a given domain
 */
export async function saveProfile(profile: SiteProfile): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const profiles: Record<string, SiteProfile> = result[STORAGE_KEY] || {};

  profiles[profile.domain] = {
    ...profile,
    updatedAt: Date.now(),
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: profiles });
}

/**
 * Deletes a SiteProfile for a given domain
 */
export async function deleteProfile(domain: string): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const profiles: Record<string, SiteProfile> = result[STORAGE_KEY] || {};

  delete profiles[domain];

  await chrome.storage.local.set({ [STORAGE_KEY]: profiles });
}

/**
 * Lists all stored profiles
 */
export async function listProfiles(): Promise<SiteProfile[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const profiles: Record<string, SiteProfile> = result[STORAGE_KEY] || {};
  return Object.values(profiles);
}

/**
 * Extracts domain from current URL
 */
export function getCurrentDomain(): string {
  const url = new URL(window.location.href);
  return url.hostname;
}
