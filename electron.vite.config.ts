import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { wasmDataUrlPlugin } from "./scripts/vite-wasm-data-url.mjs";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      rollupOptions: {
        input: resolve("apps/desktop/src/main/index.ts"),
        // Keep parser/native runtime dependencies out of the main-process bundle.
        // In particular, svg-path-parser and dxf-parser are CommonJS packages;
        // externalizing them avoids Rollup CommonJS shim corruption and lets the
        // packaged Node runtime load the exact locked versions.
        external: ["dxf-parser", "fast-xml-parser", "sharp", "svg-path-parser"]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: resolve("apps/desktop/src/preload/index.ts"),
        output: {
          format: "cjs",
          entryFileNames: "index.cjs"
        }
      }
    }
  },
  renderer: {
    root: resolve("apps/desktop/src/renderer"),
    plugins: [wasmDataUrlPlugin(), react()],
    build: {
      outDir: resolve("out/renderer"),
      rollupOptions: {
        input: resolve("apps/desktop/src/renderer/index.html")
      }
    }
  }
});
