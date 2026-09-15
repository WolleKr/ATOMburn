import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const stage = resolve(root, "artifacts/package-probes/sprint-06");

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

for (const entry of packageJson.files) {
  const source = resolve(root, entry);
  if (!existsSync(source)) continue;
  cpSync(source, resolve(stage, entry), { recursive: true });
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [relative(stage, absolute)];
  });
}

const files = listFiles(stage).map((path) => path.split(sep).join("/"));
const forbidden = files.filter(
  (path) => path.startsWith("third_party/") || path.startsWith("docs/")
);
if (forbidden.length > 0) {
  throw new Error(`Referenzquellen im Probe-Paket: ${forbidden.join(", ")}`);
}

writeFileSync(
  resolve(stage, "package-manifest.json"),
  `${JSON.stringify({ name: packageJson.name, files }, null, 2)}\n`
);
console.log(`Probe-Paket geprüft: ${files.length} Datei(en), keine Upstream-Quellen.`);
