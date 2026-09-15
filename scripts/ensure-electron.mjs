import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const packageDirectory = dirname(require.resolve("electron/package.json"));
const pathFile = join(packageDirectory, "path.txt");
const executable = process.platform === "win32" ? "electron.exe" : process.platform === "darwin" ? "Electron.app/Contents/MacOS/Electron" : "electron";
const executablePath = join(packageDirectory, "dist", executable);

if (existsSync(pathFile) && existsSync(executablePath)) {
  console.log(`Electron binary ready: ${executablePath}`);
  process.exit(0);
}

if (process.env.ELECTRON_SKIP_BINARY_DOWNLOAD === "1" || process.env.ELECTRON_SKIP_BINARY_DOWNLOAD === "true") {
  throw new Error("Electron binary is missing and ELECTRON_SKIP_BINARY_DOWNLOAD is enabled. Unset it and rerun pnpm ensure:electron.");
}

console.log("Electron binary missing; running Electron's official installer…");
const result = spawnSync(process.execPath, [join(packageDirectory, "install.js")], { stdio: "inherit", env: process.env });
if (result.status !== 0) throw new Error("Electron binary installation failed. Check network access and Windows Defender quarantine history.");
if (!existsSync(pathFile) || !existsSync(executablePath)) throw new Error(`Electron installer completed without creating ${pathFile} and ${executablePath}.`);
console.log(`Electron binary ready: ${executablePath}`);
