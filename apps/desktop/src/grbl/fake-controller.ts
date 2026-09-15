import { encoder, REALTIME, type ByteTransport, type TransportState } from "./protocol.js";

export interface FakeControllerOptions {
  seed?: number;
  responseDelayMs?: number;
  responseDelayLine?: number;
  failLine?: number;
  alarmLine?: number;
  disconnectLine?: number;
  omitRealtimeAck?: boolean;
  checkExitReset?: boolean;
  immediateResponses?: boolean;
}

export class FakeGrblTransport implements ByteTransport {
  state: TransportState = "disconnected";
  readonly writes: Uint8Array[] = [];
  readonly #dataListeners = new Set<(data: Uint8Array) => void>();
  readonly #disconnectListeners = new Set<(reason: string) => void>();
  #lineNumber = 0;
  #checkMode = false;
  #alarm = false;
  #runtimeState: "Idle" | "Run" | "Hold" = "Idle";
  #seed: number;

  constructor(readonly options: FakeControllerOptions = {}) { this.#seed = options.seed ?? 1; }
  get listenerCounts(): { data: number; disconnect: number } { return { data: this.#dataListeners.size, disconnect: this.#disconnectListeners.size }; }
  onData(listener: (data: Uint8Array) => void): () => void { this.#dataListeners.add(listener); return () => this.#dataListeners.delete(listener); }
  onDisconnect(listener: (reason: string) => void): () => void { this.#disconnectListeners.add(listener); return () => this.#disconnectListeners.delete(listener); }

  async connect(): Promise<void> {
    this.state = "connected";
    this.emitLine("Grbl 1.1h ['$' for help]");
    this.emitLine("<Idle|MPos:1.000,1.000,0.000|FS:0,0>");
  }

  async disconnect(): Promise<void> { this.drop("Simulator disconnected."); }

  async write(data: Uint8Array): Promise<void> {
    if (this.state !== "connected") throw new Error("Fake transport is disconnected.");
    this.writes.push(data.slice());
    if (data.byteLength === 1 || (data.byteLength === 2 && data[1] === 0x0a && [REALTIME.status, REALTIME.hold, REALTIME.resume, REALTIME.reset].includes(data[0] as 24 | 33 | 63 | 126))) {
      const byte = data[0];
      if (byte === REALTIME.status) this.emitLine(`<${this.#checkMode?"Check":this.#alarm?"Alarm":this.#runtimeState}|MPos:1.000,1.000,0.000|FS:0,0>`);
      else if (byte === REALTIME.hold) { this.#runtimeState="Hold";this.emitLine("<Hold:0|MPos:1.000,1.000,0.000|FS:0,0>"); }
      else if (byte === REALTIME.resume) { this.#runtimeState="Run";this.emitLine("<Run|MPos:1.000,1.000,0.000|FS:0,0>"); }
      else if (byte === REALTIME.reset) this.emitLine("Grbl 1.1h ['$' for help]");
      if (data.byteLength === 2 && byte !== REALTIME.reset && !this.options.omitRealtimeAck) this.emitLine("ok");
      return;
    }
    this.#lineNumber += 1;
    const line=new TextDecoder().decode(data).trim();
    if(line==="$$"){this.emitLine("$30=1000");this.emitLine("$32=1");this.emitLine("$130=400");this.emitLine("$131=400");this.emitLine("ok");return;}
    if(line==="$C"){const leaving=this.#checkMode;this.#checkMode=!this.#checkMode;this.emitLine("ok");if(leaving&&this.options.checkExitReset!==false){this.#alarm=true;queueMicrotask(()=>this.emitLine("Grbl 1.1h ['$' for help]"));}return;}
    if(line==="$H"){this.#alarm=false;this.#runtimeState="Idle";this.emitLine("ok");return;}
    if(line==="M5")this.#runtimeState="Idle";
    const delay = this.options.responseDelayLine === undefined || this.options.responseDelayLine === this.#lineNumber ? this.options.responseDelayMs ?? 0 : 0;
    const respond = (callback: () => void) => this.options.immediateResponses ? callback() : setTimeout(callback, delay);
    if (this.options.disconnectLine === this.#lineNumber) { respond(() => this.drop("Injected cable loss.")); return; }
    if (this.options.alarmLine === this.#lineNumber) { respond(() => this.emitLine("ALARM:2")); return; }
    if (this.options.failLine === this.#lineNumber) { respond(() => this.emitLine("error:20")); return; }
    respond(() => this.emitLine("ok"));
  }

  emitLine(line: string): void {
    const bytes = encoder.encode(`${line}\r\n`);
    let offset = 0;
    while (offset < bytes.length) {
      this.#seed = (this.#seed * 1664525 + 1013904223) >>> 0;
      const size = Math.min(bytes.length - offset, 1 + (this.#seed % 7));
      const chunk = bytes.slice(offset, offset + size);
      this.#dataListeners.forEach((listener) => listener(chunk));
      offset += size;
    }
  }

  emitBytes(bytes:Uint8Array):void{this.#dataListeners.forEach((listener)=>listener(bytes));}

  drop(reason: string): void {
    if (this.state === "disconnected") return;
    this.state = "disconnected";
    this.#disconnectListeners.forEach((listener) => listener(reason));
  }
}
