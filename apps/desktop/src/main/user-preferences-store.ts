import { access, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface UserPreferences {
  version: 1;
  lastProjectDirectory?: string;
  lastImportDirectory?: string;
  lastExportDirectory?: string;
  lastMaterialLibraryDirectory?: string;
}

export const EMPTY_USER_PREFERENCES: UserPreferences = { version: 1 };
const keys = ["lastProjectDirectory", "lastImportDirectory", "lastExportDirectory", "lastMaterialLibraryDirectory"] as const;

export async function loadUserPreferences(path: string): Promise<UserPreferences> {
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!value || typeof value !== "object" || (value as { version?: unknown }).version !== 1) return { ...EMPTY_USER_PREFERENCES };
    const result: UserPreferences = { version: 1 };
    for (const key of keys) { const candidate = (value as Record<string, unknown>)[key]; if (typeof candidate === "string" && candidate.length <= 1_024) result[key] = resolve(candidate); }
    return result;
  } catch { return { ...EMPTY_USER_PREFERENCES }; }
}

export async function saveUserPreferences(path: string, preferences: UserPreferences): Promise<void> {
  await writeFile(path, `${JSON.stringify(preferences, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

export async function existingDirectory(path: string | undefined, fallback: string): Promise<string> {
  if (path) try { await access(path); if ((await stat(path)).isDirectory()) return resolve(path); } catch { /* fall through */ }
  return resolve(fallback);
}

export function selectedDirectory(path: string): string { return dirname(resolve(path)); }
