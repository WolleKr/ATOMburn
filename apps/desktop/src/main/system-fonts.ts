import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { DEFAULT_FONT_FAMILIES } from "../shared/font-families.js";

const execFileAsync = promisify(execFile);
const WINDOWS_FONT_REGISTRY_KEYS = [
  "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts",
  "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts"
];
const FONT_STYLE_SUFFIX = /\s+\((?:TrueType|OpenType|Variable|Raster|PostScript)\)$/i;

function parseFontFamilies(output: string): string[] {
  const families = new Set<string>();
  for (const line of output.split(/\r?\n/)) {
    const match = /^\s{2,}(.+?)\s+REG_\w+\s+.+$/.exec(line);
    if (!match) continue;
    const family = match[1]!.replace(FONT_STYLE_SUFFIX, "").trim();
    if (family && !family.startsWith("@")) families.add(family);
  }
  return [...families].sort((left, right) => left.localeCompare(right));
}

export async function listSystemFonts(): Promise<string[]> {
  if (process.platform !== "win32") return [...DEFAULT_FONT_FAMILIES];
  const outputs = await Promise.all(WINDOWS_FONT_REGISTRY_KEYS.map(async (key) => {
    try {
      const result = await execFileAsync("reg.exe", ["query", key], { windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
      return result.stdout;
    } catch {
      return "";
    }
  }));
  const families = parseFontFamilies(outputs.join("\n"));
  return families.length ? families : [...DEFAULT_FONT_FAMILIES];
}
