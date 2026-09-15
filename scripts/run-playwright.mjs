import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { createServer } from "vite";

const root = resolve(import.meta.dirname, "..");
const server = await createServer({
  configFile: resolve(root, "vite.renderer.config.ts"),
  server: { host: "127.0.0.1", port: 4173, strictPort: true }
});

try {
  await server.listen();
  const child = spawn(process.execPath, [resolve(root, "node_modules/playwright/cli.js"), "test", ...process.argv.slice(2)], {
    cwd: root,
    env: { ...process.env, ATOMBURN_EXTERNAL_E2E_SERVER: "1" },
    stdio: "inherit",
    windowsHide: true
  });
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveExit(code ?? (signal ? 1 : 0)));
  });
  process.exitCode = exitCode;
} finally {
  await server.close();
}
