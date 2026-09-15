import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "THIRD_PARTY_NOTICES.md");
const raw = execSync("pnpm licenses list --prod --json", {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 8 * 1024 * 1024,
  shell: true
});
const byLicense = JSON.parse(raw);
const rows = [];
for (const [license, packages] of Object.entries(byLicense).sort(([a], [b]) => a.localeCompare(b))) {
  for (const pkg of packages.sort((a, b) => a.name.localeCompare(b.name))) {
    const versions = Array.isArray(pkg.versions) ? pkg.versions.join(", ") : "unknown";
    const homepage = pkg.homepage ?? pkg.repository ?? "";
    rows.push(`| ${pkg.name} | ${versions} | ${license} | ${homepage} |`);
  }
}
const table = [
  "| Package | Version(s) | License | Upstream |",
  "|---|---|---|---|",
  ...rows
].join("\n");
const current = readFileSync(outputPath, "utf8");
const start = "<!-- BEGIN GENERATED DEPENDENCY TABLE -->";
const end = "<!-- END GENERATED DEPENDENCY TABLE -->";
const startIndex = current.indexOf(start);
const endIndex = current.indexOf(end);
if (startIndex < 0 || endIndex < startIndex) throw new Error("Notice markers are missing.");
const replacement = `${start}\n\n${table}\n\n${end}`;
const next = `${current.slice(0, startIndex)}${replacement}${current.slice(endIndex + end.length)}`.replace(/\n{3,}/g, "\n\n");
writeFileSync(outputPath, next.endsWith("\n") ? next : `${next}\n`);
console.log(`Generated ${rows.length} production dependency notices.`);
