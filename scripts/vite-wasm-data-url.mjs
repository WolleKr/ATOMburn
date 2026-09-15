import { readFile } from "node:fs/promises";

const QUERY = "?wasm-data-url";

export function wasmDataUrlPlugin() {
  return {
    name: "atomburn-wasm-data-url",
    enforce: "pre",
    async load(id) {
      if (!id.endsWith(QUERY)) return null;
      const file = id.slice(0, -QUERY.length);
      if (!file.endsWith(".wasm")) return null;
      const bytes = await readFile(file);
      const url = `data:application/wasm;base64,${bytes.toString("base64")}`;
      return `export default ${JSON.stringify(url)};`;
    }
  };
}
