import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const report = resolve(
  root,
  "artifacts/test-reports/sprint-00/reporter-contract/junit.xml"
);
rmSync(report, { force: true });

const vitestBin = resolve(root, "node_modules/vitest/vitest.mjs");
const result = spawnSync(
  process.execPath,
  [vitestBin, "run", "--config", "vitest.failure.config.mjs"],
  { cwd: root, encoding: "utf8" }
);

if (result.status === 0) {
  throw new Error("Der absichtlich fehlschlagende Prüftest war unerwartet grün.");
}
if (!existsSync(report)) {
  throw new Error("Der JUnit-Bericht wurde beim Fehlschlag nicht erzeugt.");
}

const xml = readFileSync(report, "utf8");
if (!xml.includes("intentional reporter failure")) {
  throw new Error("Der JUnit-Bericht enthält den erwarteten Fehlerfall nicht.");
}

console.log("Reporter-Vertrag erfüllt: Fehlerstatus und JUnit-Bericht vorhanden.");

