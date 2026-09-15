import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const electron = resolve("node_modules/electron/dist/electron.exe");
const smokeProfile = resolve("artifacts/electron-smoke-profile");
if (!existsSync(electron)) throw new Error("Electron executable is missing. Run pnpm install.");
if (!existsSync(resolve("out/main/index.js"))) throw new Error("Electron build is missing. Run pnpm build first.");
mkdirSync(smokeProfile, { recursive: true });

// The smoke loads only the packaged local renderer. Nested Chromium sandboxing
// cannot start inside the managed test sandbox, so this harness disables it;
// the production BrowserWindow still declares sandbox/context isolation and is
// checked separately by the security boundary tests.
const child = spawn(electron, [".", "--smoke-test", `--user-data-dir=${smokeProfile}`, "--disable-gpu", "--disable-software-rasterizer", "--no-sandbox"], { cwd: process.cwd(), env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: "false" }, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });
const timer = setTimeout(() => child.kill(), 15_000);
const code = await new Promise((resolveCode) => child.on("exit", resolveCode));
clearTimeout(timer);
if (code !== 0 || !output.includes("ATOMburn smoke ready")) throw new Error(`Electron smoke failed (${code}).\n${output}`);
console.log("Electron smoke passed.");
