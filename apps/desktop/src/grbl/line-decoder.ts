export class LineDecoder {
  readonly #decoder = new TextDecoder("utf-8", { fatal: true });
  #pending = "";

  constructor(readonly maxLineLength = 4096) {}

  push(chunk: Uint8Array): string[] {
    this.#pending += this.#decoder.decode(chunk, { stream: true });
    if (this.#pending.length > this.maxLineLength && !/[\r\n]/.test(this.#pending)) throw new Error("GRBL line exceeds safety limit.");
    const parts = this.#pending.split(/\r\n|\n|\r/);
    this.#pending = parts.pop() ?? "";
    if (parts.some((line) => line.length > this.maxLineLength)) throw new Error("GRBL line exceeds safety limit.");
    return parts.filter((line) => line.length > 0);
  }

  reset(): void { this.#pending = ""; }
}
