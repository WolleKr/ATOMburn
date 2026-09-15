import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const excluded = new Set([".git", ".pnpm-store", "artifacts", "coverage", "dist", "node_modules", "out", "output", "third_party", "tmp"]);

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (excluded.has(entry.name)) return [];
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(absolute);
    return extname(entry.name).toLowerCase() === ".md" ? [absolute] : [];
  });
}

const failures = [];
for (const file of markdownFiles(root)) {
  const contents = readFileSync(file, "utf8");
  for (const match of contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "");
    if (/^(https?:|mailto:|#)/i.test(target)) continue;
    const withoutAnchor = decodeURIComponent(target.split("#", 1)[0]);
    if (!withoutAnchor) continue;
    if (!existsSync(resolve(dirname(file), withoutAnchor))) {
      failures.push(`${file}: ${target}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Ungültige lokale Markdown-Links:\n${failures.join("\n")}`);
}
console.log("Lokale Markdown-Links geprüft.");
