import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { wasmDataUrlPlugin } from "./scripts/vite-wasm-data-url.mjs";

export default defineConfig({
  root: resolve("apps/desktop/src/renderer"),
  plugins: [wasmDataUrlPlugin(), react()],
  build: {
    outDir: resolve("out/renderer")
  }
});
