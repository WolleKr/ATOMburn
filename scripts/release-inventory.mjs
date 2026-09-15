import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function installedMetadata(root, name) {
  const manifestPath = resolve(root, "node_modules", ...name.split("/"), "package.json");
  if (!existsSync(manifestPath)) return { license: "unavailable (run pnpm install --frozen-lockfile)" };
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const license = typeof manifest.license === "string" ? manifest.license : Array.isArray(manifest.licenses) ? manifest.licenses.map((entry) => typeof entry === "string" ? entry : entry.type).filter(Boolean).join(" OR ") : "UNDECLARED";
  return { installedVersion: manifest.version ?? "unknown", license };
}

export function createInventory(root) {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const lock = readFileSync(resolve(root, "pnpm-lock.yaml"), "utf8");
  const dependencies = Object.entries({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }).sort(([left], [right]) => left.localeCompare(right)).map(([name, declaredVersion]) => ({
    name,
    declaredVersion,
    kind: Object.hasOwn(pkg.dependencies ?? {}, name) ? "runtime" : "development",
    ...installedMetadata(root, name)
  }));
  const references = [
    { name: "LaserWeb4", url: "https://github.com/LaserWeb/LaserWeb4", license: "AGPL-3.0", role: "reference only; not packaged" },
    { name: "MeerK40t", url: "https://github.com/meerk40t/meerk40t", license: "MIT", role: "reference only; not packaged" }
  ];
  return { schema: 2, package: pkg.name, version: pkg.version, lockfileBytes: Buffer.byteLength(lock), dependencies, references, secretPolicy: "No secret values are read or included; .env and credential files are excluded from release artifacts." };
}
if (process.argv[1]?.endsWith("release-inventory.mjs")) {
  const root = repositoryRoot;
  const output = resolve(root, process.argv[2] ?? "artifacts/release/sprint-16/inventory.json");
  mkdirSync(resolve(output, ".."), { recursive: true });
  writeFileSync(output, `${JSON.stringify(createInventory(root), null, 2)}\n`);
  console.log(`Release inventory written: ${output}`);
}
