import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const EXCLUDED = new Set([".git", ".pnpm-store", "node_modules", "artifacts", "third_party", "out", "output", "tmp", "coverage", "dist"]);
const SECRET_FILE = /(^|\/)(\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx))$/i;
const LOCAL_DIAGNOSTIC = /(^|\/)ATOMburn-diagnostics-.*\.json$/i;
const SECRET_CONTENT = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:ghp|github_pat|sk-proj)-[A-Za-z0-9_-]{16,}|\bAKIA[0-9A-Z]{16}\b/;

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function sha256Bytes(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
export function sha256File(path) { return sha256Bytes(readFileSync(path)); }
export function normalizedPath(path) { return path.split(sep).join("/"); }

function walk(root, current = root) {
  return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) return [];
    if (entry.isDirectory() && EXCLUDED.has(entry.name)) return [];
    const absolute = resolve(current, entry.name);
    return entry.isDirectory() ? walk(root, absolute) : [absolute];
  });
}

export function collectReleaseFiles(root) {
  return walk(root).filter((file) => {
    const rel = normalizedPath(relative(root, file));
    return !rel.startsWith(".git/") && !rel.startsWith("third_party/") && !rel.startsWith("artifacts/") && !rel.startsWith("out/") && !SECRET_FILE.test(rel) && !LOCAL_DIAGNOSTIC.test(rel);
  }).sort((left, right) => {
    const a = normalizedPath(relative(root, left));
    const b = normalizedPath(relative(root, right));
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

export function findPotentialSecrets(root) {
  const names = [];
  const contents = [];
  for (const file of walk(root)) {
    const rel = normalizedPath(relative(root, file));
    if (SECRET_FILE.test(rel)) {
      names.push(rel);
      continue;
    }
    if (statSync(file).size <= 2 * 1024 * 1024) {
      const content = readFileSync(file, "utf8");
      if (SECRET_CONTENT.test(content)) contents.push(rel);
    }
  }
  return { names: names.sort(), contents: contents.sort() };
}

function git(root, ...args) {
  try { return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return "unavailable"; }
}

export function createReleaseManifest(root) {
  const files = collectReleaseFiles(root).map((file) => ({ path: normalizedPath(relative(root, file)), sha256: sha256File(file), bytes: statSync(file).size }));
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  return { schema: 1, product: pkg.name, version: pkg.version, commit: git(root, "rev-parse", "HEAD"), files };
}

export function compareManifests(left, right) {
  const a = new Map(left.files.map((file) => [file.path, file.sha256]));
  const b = new Map(right.files.map((file) => [file.path, file.sha256]));
  const paths = [...new Set([...a.keys(), ...b.keys()])].sort();
  return paths.filter((path) => a.get(path) !== b.get(path)).map((path) => ({ path, left: a.get(path) ?? null, right: b.get(path) ?? null }));
}

export function checkSecurityInvariants(root) {
  const index = readFileSync(resolve(root, "apps/desktop/src/main/index.ts"), "utf8");
  const required = ["contextIsolation: true", "nodeIntegration: false", "sandbox: true", "webSecurity: true", "setWindowOpenHandler", "will-navigate", "will-attach-webview"];
  const missing = required.filter((text) => !index.includes(text));
  const potentialSecrets = findPotentialSecrets(root);
  return { ok: missing.length === 0 && potentialSecrets.names.length === 0 && potentialSecrets.contents.length === 0, missing, potentialSecrets };
}

if (process.argv[1] && basename(process.argv[1]) === "release-artifacts.mjs") {
  const root = repositoryRoot;
  const mode = process.argv[2] ?? "manifest";
  if (mode === "manifest") {
    const output = resolve(root, process.argv[3] ?? "artifacts/release/sprint-16/manifest.json");
    const manifest = createReleaseManifest(root);
    mkdirFor(output);
    writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Release manifest written: ${relative(root, output)} (${manifest.files.length} files)`);
  } else if (mode === "invariants") {
    const result = checkSecurityInvariants(root);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } else throw new Error(`Unknown mode: ${mode}`);
}
function mkdirFor(path) { mkdirSync(resolve(path, ".."), { recursive: true }); }
