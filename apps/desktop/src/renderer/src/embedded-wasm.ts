export function decodeEmbeddedWasm(dataUrl: string): Uint8Array<ArrayBuffer> {
  const marker = ";base64,";
  const markerIndex = dataUrl.indexOf(marker);
  if (!dataUrl.startsWith("data:application/wasm") || markerIndex < 0) throw new Error("The embedded lens-calibration WASM is invalid.");
  const binary = globalThis.atob(dataUrl.slice(markerIndex + marker.length));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function withEmbeddedWasmFetch<T>(dataUrl: string, initialize: (wasmPath: string) => Promise<T>): Promise<T> {
  const bytes = decodeEmbeddedWasm(dataUrl);
  const wasmPath = "https://atomburn.invalid/embedded/calibrate.wasm";
  const originalFetch = globalThis.fetch;
  const embeddedFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === wasmPath) return new Response(bytes.slice().buffer, { status: 200, headers: { "Content-Type": "application/wasm" } });
    return originalFetch(input, init);
  };
  globalThis.fetch = embeddedFetch;
  try { return await initialize(wasmPath); }
  finally { if (globalThis.fetch === embeddedFetch) globalThis.fetch = originalFetch; }
}
