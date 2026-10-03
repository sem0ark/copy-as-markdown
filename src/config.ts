import {
  populateMissingNodeIds,
  removeInternalFields,
  validateSiteProfile,
} from "./shared/tree-utils";
import type { SiteProfile } from "./shared/types";

/**
 * Configuration Editor
 * Simple JSON editor for managing site profiles
 */

const editor = document.getElementById("editor") as HTMLTextAreaElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const reloadBtn = document.getElementById("reload") as HTMLButtonElement;
const exportBtn = document.getElementById("export") as HTMLButtonElement;
const importBtn = document.getElementById("import") as HTMLButtonElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;

// Load current configuration
async function loadConfig() {
  try {
    const data = await chrome.storage.local.get("profiles");
    const profiles = Object.fromEntries(
      Object.entries(data.profiles || {}).map(([domain, profile]) => [
        domain,
        removeInternalFields(profile as SiteProfile),
      ]),
    );
    const config = { profiles };
    editor.value = JSON.stringify(config, null, 2);
    showStatus("Configuration loaded", "success");
  } catch (error) {
    showStatus(`Failed to load: ${error}`, "error");
  }
}

// Save configuration
async function saveConfig() {
  try {
    const config = JSON.parse(editor.value);

    // Validate structure
    if (!config.profiles || typeof config.profiles !== "object") {
      throw new Error("Invalid format: must have 'profiles' object");
    }

    const profiles: Record<string, SiteProfile> = {};

    // Normalize and validate each profile, including nested child nodes.
    for (const [domain, value] of Object.entries(config.profiles)) {
      const profile = populateMissingNodeIds(value as SiteProfile);
      if (
        !profile.domain ||
        !Array.isArray(profile.roots) ||
        profile.roots.length === 0
      ) {
        throw new Error(
          `Invalid profile for ${domain}: missing domain or roots`,
        );
      }

      const errors = validateSiteProfile({
        ...profile,
        updatedAt: profile.updatedAt || Date.now(),
      });
      if (errors.length > 0) {
        throw new Error(`Invalid profile for ${domain}: ${errors.join("; ")}`);
      }

      profiles[domain] = profile;
    }

    const response = await chrome.runtime.sendMessage({
      type: "SAVE_PROFILES",
      profiles,
    });
    if (!response?.ok) {
      throw new Error(response?.error || "Background save failed");
    }
    showStatus("Configuration saved successfully", "success");
  } catch (error) {
    showStatus(`Failed to save: ${error}`, "error");
  }
}

// Export to file
function exportToFile() {
  const config = JSON.parse(editor.value);
  const profiles = Object.fromEntries(
    Object.entries(config.profiles || {}).map(([domain, profile]) => [
      domain,
      removeInternalFields(profile as SiteProfile),
    ]),
  );
  const blob = new Blob([JSON.stringify({ profiles }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `markdown-saver-config-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("Configuration exported to file", "success");
}

// Import from file
function importFromFile() {
  fileInput.click();
}

fileInput.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const config = JSON.parse(text);

    // Validate
    if (!config.profiles || typeof config.profiles !== "object") {
      throw new Error("Invalid file format");
    }

    const profiles = Object.fromEntries(
      Object.entries(config.profiles).map(([domain, profile]) => [
        domain,
        removeInternalFields(profile as SiteProfile),
      ]),
    );
    editor.value = JSON.stringify({ profiles }, null, 2);
    showStatus("File imported. Click 'Save' to apply changes.", "success");
  } catch (error) {
    showStatus(`Failed to import: ${error}`, "error");
  }

  // Reset input
  fileInput.value = "";
});

// Show status message
function showStatus(message: string, type: "success" | "error") {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  if (type === "success") {
    setTimeout(() => {
      statusDiv.className = "status";
    }, 3000);
  }
}

// Event listeners
saveBtn.addEventListener("click", saveConfig);
reloadBtn.addEventListener("click", loadConfig);
exportBtn.addEventListener("click", exportToFile);
importBtn.addEventListener("click", importFromFile);

// Initial load
loadConfig();
