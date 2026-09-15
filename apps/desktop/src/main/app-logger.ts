import { mkdir, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { app } from "electron";
import { shouldWriteLog, validateLogEntry, type LogEntry, type LogLevel } from "../shared/logging.js";

const development = !app.isPackaged;
let writeQueue = Promise.resolve();

export function appLogPath(): string {
  return join(app.getPath("userData"), "logs", "atomburn.log");
}

export function writeAppLog(entry: LogEntry): void {
  const valid = validateLogEntry(entry);
  if (!shouldWriteLog(valid.level, development)) return;
  const line = `${JSON.stringify({ timestamp: new Date().toISOString(), ...valid })}\n`;
  const output = valid.level === "error" ? console.error : valid.level === "warn" ? console.warn : valid.level === "info" ? console.info : console.debug;
  output(`[${valid.level}] ${valid.scope}: ${valid.message}`, valid.details ?? "");
  const path = appLogPath();
  writeQueue = writeQueue.then(async () => { await mkdir(dirname(path), { recursive: true }); await appendFile(path, line, "utf8"); }).catch((error) => { console.error("ATOMburn log write failed", error); });
}

export const log = (level: LogLevel, scope: string, message: string, details?: Record<string, unknown>) => writeAppLog({ level, scope, message, ...(details ? { details } : {}) });
