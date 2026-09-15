import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function normalized(path) { return path.split(sep).join("/"); }

function collect(root, current = root) {
  return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(current, entry.name);
    const path = normalized(relative(root, absolute));
    if (entry.isSymbolicLink()) return [{ path, type: "link", target: normalized(readlinkSync(absolute)) }];
    if (entry.isDirectory()) return collect(root, absolute);
    const details = lstatSync(absolute);
    return [{ path, type: "file", bytes: details.size, sha256: sha256(readFileSync(absolute)) }];
  });
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectPackage = JSON.parse(readFileSync(resolve(repositoryRoot, "package.json"), "utf8"));
const root = resolve(repositoryRoot, process.argv[2] ?? `output/ATOMburn-${projectPackage.version}-win-x64`);
const output = resolve(process.argv[3] ?? `${root}.manifest.json`);
const pkg = JSON.parse(readFileSync(resolve(root, "resources", "app", "package.json"), "utf8"));
const files = collect(root).sort((left, right) => left.path.localeCompare(right.path));
const manifest = {
  schema: 1,
  product: "ATOMburn",
  version: pkg.version,
  platform: "windows",
  architecture: "x64",
  directory: basename(root),
  totalBytes: files.reduce((total, file) => total + (file.type === "file" ? file.bytes : 0), 0),
  files
};
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Portable manifest written: ${output} (${files.length} entries, ${manifest.totalBytes} bytes)`);
