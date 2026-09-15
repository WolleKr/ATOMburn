import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 15_000,
  outputDir: "artifacts/playwright",
  reporter: [["line"]],
  projects: [
    { name: "scale-100", use: { deviceScaleFactor: 1 } },
    { name: "scale-150", use: { deviceScaleFactor: 1.5 } },
    { name: "scale-200", use: { deviceScaleFactor: 2 } }
  ],
  use: {
    baseURL: process.env.ATOMBURN_E2E_BASE_URL ?? "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  },
  webServer: process.env.ATOMBURN_EXTERNAL_E2E_SERVER ? undefined : {
    command: "node node_modules/vite/bin/vite.js --config vite.renderer.config.ts --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/?skipSplash=1",
    reuseExistingServer: true,
    timeout: 60_000
  }
});
