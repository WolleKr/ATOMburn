import { Socket } from "node:net";
import type { ByteTransport, TransportState } from "../grbl/protocol.js";
import {TelnetFilter} from "./telnet-filter.js";

export interface TcpProfile { host: string; port: number; connectTimeoutMs?: number; idleTimeoutMs?: number; }

export class LaserCamTcpTransport implements ByteTransport {
  state: TransportState = "disconnected";
  private socket?: Socket;
  private readonly dataListeners = new Set<(data: Uint8Array) => void>();
  private readonly disconnectListeners = new Set<(reason: string) => void>();

  constructor(private readonly profile: TcpProfile) {}

  async connect(): Promise<void> {
    if (this.state !== "disconnected") throw new Error("TCP transport is already active.");
    if (!this.profile.host.trim() || !Number.isInteger(this.profile.port) || this.profile.port < 1 || this.profile.port > 65535) throw new Error("Invalid TCP profile.");
    this.state = "connecting";
    const socket = new Socket();
    const telnetFilter=new TelnetFilter();
    this.socket = socket;
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 5_000);
    if (this.profile.idleTimeoutMs) socket.setTimeout(this.profile.idleTimeoutMs);
    socket.on("data", (chunk) => {
      try {const data=telnetFilter.push(new Uint8Array(chunk));if(data.length)this.dataListeners.forEach((listener) => listener(data));}
      catch { socket.destroy(new Error("TCP received invalid controller data.")); }
    });
    socket.on("timeout", () => socket.destroy(new Error("TCP idle timeout.")));
    socket.on("close", () => this.finishDisconnect("TCP bridge disconnected."));
    socket.on("error", (error) => this.finishDisconnect(`TCP bridge error: ${error.message}`));

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("TCP connection timed out.")), this.profile.connectTimeoutMs ?? 3_000);
        socket.once("error", reject);
        socket.connect(this.profile.port, this.profile.host, () => { clearTimeout(timeout); socket.removeListener("error", reject); resolve(); });
      });
      this.state = "connected";
    } catch (error) {
      socket.destroy();
      this.state = "disconnected";
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const socket = this.socket;
    if (!socket) { this.state = "disconnected"; return; }
    this.socket = undefined;
    await new Promise<void>((resolve) => { socket.once("close", resolve); socket.end(); setTimeout(() => { socket.destroy(); resolve(); }, 250); });
    this.state = "disconnected";
  }

  async write(data: Uint8Array): Promise<void> {
    if (this.state !== "connected" || !this.socket) throw new Error("TCP bridge is not connected.");
    await new Promise<void>((resolve, reject) => this.socket!.write(data, (error) => error ? reject(error) : resolve()));
  }

  onData(listener: (data: Uint8Array) => void): () => void { this.dataListeners.add(listener); return () => this.dataListeners.delete(listener); }
  onDisconnect(listener: (reason: string) => void): () => void { this.disconnectListeners.add(listener); return () => this.disconnectListeners.delete(listener); }

  private finishDisconnect(reason: string): void {
    if (this.state === "disconnected") return;
    this.socket = undefined;
    this.state = "disconnected";
    this.disconnectListeners.forEach((listener) => listener(reason));
  }
}
