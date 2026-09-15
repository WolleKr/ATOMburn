import { defineConfig } from "vitest/config";
import { wasmDataUrlPlugin } from "./scripts/vite-wasm-data-url.mjs";

export default defineConfig({
  plugins: [wasmDataUrlPlugin()],
  test: {
    include: ["tests/**/*.test.{mjs,ts,tsx}"],
    exclude: ["tests/fixtures/**", "third_party/**"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: "artifacts/test-reports/sprint-16/current/junit.xml"
    },
    environment: "node",
    environmentMatchGlobs: [["tests/ui/**", "jsdom"]],
    testTimeout: 10_000
  }
});
