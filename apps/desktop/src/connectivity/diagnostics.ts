import { LineDecoder } from "../grbl/line-decoder.js";
import { parseGrblLine } from "../grbl/parser.js";
import type { ByteTransport, GrblMessage } from "../grbl/protocol.js";

export const READ_ONLY_DIAGNOSTIC_COMMANDS = Object.freeze(["$I", "$$", "$G", "?"] as const);
export type ReadOnlyDiagnosticCommand = typeof READ_ONLY_DIAGNOSTIC_COMMANDS[number];
export interface DiagnosticLine { direction: "rx" | "tx"; text: string; message?: GrblMessage; }

export function encodeReadOnlyDiagnostic(command: string, statusLineEnding = false): Uint8Array {
  if (!READ_ONLY_DIAGNOSTIC_COMMANDS.includes(command as ReadOnlyDiagnosticCommand)) throw new Error("Command blocked: diagnostic channel is read-only.");
  return new TextEncoder().encode(command === "?" && !statusLineEnding ? command : `${command}\n`);
}

export async function runReadOnlyDiagnostics(transport: ByteTransport, options: { settleMs?: number; responseMs?: number; statusLineEnding?: boolean } = {}): Promise<DiagnosticLine[]> {
  const transcript: DiagnosticLine[] = [];
  const decoder = new LineDecoder();
  let disconnected: string | undefined;
  const offData = transport.onData((chunk) => {
    for (const line of decoder.push(chunk)) transcript.push({ direction: "rx", text: line, message: parseGrblLine(line) });
  });
  const offDisconnect = transport.onDisconnect((reason) => { disconnected = reason; });
  try {
    await transport.connect();
    await delay(options.settleMs ?? 250);
    for (const command of READ_ONLY_DIAGNOSTIC_COMMANDS) {
      if (disconnected) throw new Error(disconnected);
      transcript.push({ direction: "tx", text: command });
      await transport.write(encodeReadOnlyDiagnostic(command, options.statusLineEnding));
      await delay(options.responseMs ?? 180);
    }
    if (disconnected) throw new Error(disconnected);
    return transcript;
  } finally {
    offData(); offDisconnect(); await transport.disconnect().catch(() => undefined);
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
