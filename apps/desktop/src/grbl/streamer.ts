import { encoder, GRBL_RX_CAPACITY, REALTIME, type ByteTransport, type GrblMessage } from "./protocol.js";

export type StreamState = "idle" | "running" | "held" | "completed" | "failed" | "aborted";

export class GrblStreamer {
  state: StreamState = "idle";
  fault?: string;
  readonly #pending: string[] = [];
  readonly #inflight: number[] = [];
  #occupied = 0;
  #pumping = false;
  #ackTimer?: ReturnType<typeof setTimeout>;

  constructor(readonly transport: ByteTransport, readonly capacity = GRBL_RX_CAPACITY, readonly acknowledgementTimeoutMs = 5_000) {}
  get occupiedBytes(): number { return this.#occupied; }
  get inflightCount(): number { return this.#inflight.length; }

  async start(lines: readonly string[]): Promise<void> {
    if (this.state === "running" || this.state === "held") throw new Error("Streamer is already active.");
    this.#clearTimeout(); this.#pending.length = 0; this.#inflight.length = 0; this.#occupied = 0; this.fault = undefined;
    for (const input of lines) {
      const line = input.replace(/\([^)]*\)|;.*$/g, "").trim();
      if (!line) continue;
      const length = encoder.encode(`${line}\n`).byteLength;
      if (length > this.capacity) throw new Error("G-code line exceeds GRBL receive capacity.");
      this.#pending.push(line);
    }
    this.state = "running";
    await this.#pump();
    if (this.state === "running" && this.#pending.length === 0 && this.#inflight.length === 0) this.state = "completed";
  }

  async receive(message: GrblMessage): Promise<void> {
    if (this.state !== "running" && this.state !== "held") return;
    if (message.type === "ok" || message.type === "error") {
      const length = this.#inflight.shift();
      if (length === undefined) return this.#fail("Unmatched controller acknowledgement.");
      this.#occupied -= length;
      this.#armTimeout();
      if (message.type === "error") return this.#fail(`Controller rejected line with error:${message.code}.`);
      await this.#pump();
      if (this.#pending.length === 0 && this.#inflight.length === 0) { this.#clearTimeout(); this.state = "completed"; }
    } else if (message.type === "alarm") this.#fail(`Controller entered ALARM:${message.code}.`);
    else if (message.type === "welcome") this.#fail("Controller reset during stream.");
  }

  async hold(): Promise<void> { if (this.state !== "running") throw new Error("No running stream."); await this.#realtime(REALTIME.hold); this.state = "held"; }
  async resume(): Promise<void> { if (this.state !== "held") throw new Error("Stream is not held."); await this.#realtime(REALTIME.resume); this.state = "running"; await this.#pump(); }
  async queryStatus(): Promise<void> { await this.#realtime(REALTIME.status); }
  async abort(): Promise<void> { if (this.state !== "running" && this.state !== "held") return; await this.#realtime(REALTIME.hold); await this.#realtime(REALTIME.reset); this.#clearTimeout(); this.#clear(); this.state = "aborted"; }
  transportLost(reason: string): void { if (this.state === "running" || this.state === "held") this.#fail(reason); }

  async #pump(): Promise<void> {
    if (this.#pumping || this.state !== "running") return;
    this.#pumping = true;
    try {
      while (this.#pending.length > 0) {
        const line = this.#pending[0];
        if (line === undefined) break;
        const bytes = encoder.encode(`${line}\n`);
        if (this.#occupied + bytes.byteLength > this.capacity) break;
        this.#pending.shift(); this.#inflight.push(bytes.byteLength); this.#occupied += bytes.byteLength;
        try { await this.transport.write(bytes); }
        catch (error) {
          const reserved = this.#inflight.pop();
          if (reserved !== undefined) this.#occupied -= reserved;
          throw error;
        }
        this.#armTimeout();
      }
    } catch (error) { this.#fail(error instanceof Error ? error.message : "Transport write failed."); }
    finally { this.#pumping = false; }
  }

  async #realtime(byte: number): Promise<void> { await this.transport.write(Uint8Array.of(byte)); }
  #clear(): void { this.#pending.length = 0; this.#inflight.length = 0; this.#occupied = 0; }
  #clearTimeout(): void { if (this.#ackTimer !== undefined) clearTimeout(this.#ackTimer); this.#ackTimer = undefined; }
  #armTimeout(): void {
    this.#clearTimeout();
    if (this.#inflight.length === 0 || (this.state !== "running" && this.state !== "held")) return;
    this.#ackTimer = setTimeout(() => this.#fail("Controller acknowledgement timed out."), this.acknowledgementTimeoutMs);
  }
  #fail(reason: string): void { this.#clearTimeout(); this.fault = reason; this.#clear(); this.state = "failed"; }
}
