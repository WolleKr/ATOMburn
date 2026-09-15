export type TransportState = "disconnected" | "connecting" | "connected";

export interface ByteTransport {
  readonly state: TransportState;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  onData(listener: (data: Uint8Array) => void): () => void;
  onDisconnect(listener: (reason: string) => void): () => void;
}

export type GrblState = "Idle" | "Run" | "Hold" | "Jog" | "Alarm" | "Door" | "Check" | "Home" | "Sleep" | "Unknown";

export interface GrblStatus {
  state: GrblState;
  substate?: number;
  machinePosition?: [number, number, number];
  workPosition?: [number, number, number];
  workCoordinateOffset?: [number, number, number];
  feed?: number;
  spindle?: number;
  overrides?: [number, number, number];
  pins?: string;
  buffer?: [number, number];
  unknown: Record<string, string>;
}

export type GrblMessage =
  | { type: "ok" }
  | { type: "error"; code: number }
  | { type: "alarm"; code: number }
  | { type: "welcome"; version: string; raw: string }
  | { type: "status"; status: GrblStatus }
  | { type: "feedback"; text: string }
  | { type: "setting"; key: number; value: string }
  | { type: "unknown"; raw: string };

export const REALTIME = Object.freeze({ status: 0x3f, hold: 0x21, resume: 0x7e, reset: 0x18 } as const);
export const GRBL_RX_CAPACITY = 127;
export const encoder = new TextEncoder();
