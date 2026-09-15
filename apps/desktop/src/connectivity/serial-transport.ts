import type { ByteTransport, TransportState } from "../grbl/protocol.js";

export interface SerialPortInfo { path: string; manufacturer?: string; serialNumber?: string; vendorId?: string; productId?: string; }
export interface SerialConnection {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  onData(listener: (data: Uint8Array) => void): () => void;
  onClose(listener: (reason: string) => void): () => void;
}
export interface SerialAdapter { list(): Promise<SerialPortInfo[]>; open(path: string, baudRate: number): Promise<SerialConnection>; }

export class NativeSerialAdapter implements SerialAdapter {
  async list(): Promise<SerialPortInfo[]> {
    const { SerialPort } = await import("serialport");
    return (await SerialPort.list()).map(({ path, manufacturer, serialNumber, vendorId, productId }) => ({ path, manufacturer, serialNumber, vendorId, productId }));
  }

  async open(path: string, baudRate: number): Promise<SerialConnection> {
    const { SerialPort } = await import("serialport");
    const port = new SerialPort({ path, baudRate, autoOpen: false });
    await new Promise<void>((resolve, reject) => port.open((error) => error ? reject(error) : resolve()));
    const dataListeners = new Map<(data: Uint8Array) => void, (data: Buffer) => void>();
    const closeListeners = new Map<(reason: string) => void, () => void>();
    return {
      write: (data) => new Promise<void>((resolve, reject) => port.write(Buffer.from(data), (error) => error ? reject(error) : port.drain((drainError) => drainError ? reject(drainError) : resolve()))),
      close: () => new Promise<void>((resolve, reject) => port.isOpen ? port.close((error) => error ? reject(error) : resolve()) : resolve()),
      onData: (listener) => { const wrapped = (data: Buffer) => listener(new Uint8Array(data)); dataListeners.set(listener, wrapped); port.on("data", wrapped); return () => { const found = dataListeners.get(listener); if (found) port.off("data", found); }; },
      onClose: (listener) => { const wrapped = () => listener("Serial port disconnected."); closeListeners.set(listener, wrapped); port.on("close", wrapped); return () => { const found = closeListeners.get(listener); if (found) port.off("close", found); }; }
    };
  }
}

export class DirectSerialTransport implements ByteTransport {
  state: TransportState = "disconnected";
  private connection?: SerialConnection;
  private offData?: () => void;
  private offClose?: () => void;
  private readonly dataListeners = new Set<(data: Uint8Array) => void>();
  private readonly disconnectListeners = new Set<(reason: string) => void>();
  constructor(private readonly adapter: SerialAdapter, private readonly path: string, private readonly baudRate = 115_200) {}

  async connect(): Promise<void> {
    if (this.state !== "disconnected") throw new Error("Serial transport is already active.");
    this.state = "connecting";
    try {
      const connection = await this.adapter.open(this.path, this.baudRate);
      this.connection = connection;
      this.offData = connection.onData((data) => this.dataListeners.forEach((listener) => listener(data)));
      this.offClose = connection.onClose((reason) => this.finishDisconnect(reason));
      this.state = "connected";
    } catch (error) { this.state = "disconnected"; throw error; }
  }

  async disconnect(): Promise<void> {
    const connection = this.connection;
    this.offData?.(); this.offClose?.(); this.connection = undefined;
    if (connection) await connection.close();
    this.state = "disconnected";
  }
  async write(data: Uint8Array): Promise<void> { if (!this.connection || this.state !== "connected") throw new Error("Serial port is not connected."); await this.connection.write(data); }
  onData(listener: (data: Uint8Array) => void): () => void { this.dataListeners.add(listener); return () => this.dataListeners.delete(listener); }
  onDisconnect(listener: (reason: string) => void): () => void { this.disconnectListeners.add(listener); return () => this.disconnectListeners.delete(listener); }
  private finishDisconnect(reason: string): void { if (this.state === "disconnected") return; this.connection = undefined; this.state = "disconnected"; this.disconnectListeners.forEach((listener) => listener(reason)); }
}
