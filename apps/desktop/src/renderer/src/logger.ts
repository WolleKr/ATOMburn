import type { LogLevel } from "../../shared/logging";
import { getBridge } from "./platform";

function send(level: LogLevel, scope: string, message: string, details?: Record<string, unknown>): void {
  void getBridge().writeLog({ level, scope, message, ...(details ? { details } : {}) });
}

export const logger = {
  debug: (scope: string, message: string, details?: Record<string, unknown>) => send("debug", scope, message, details),
  info: (scope: string, message: string, details?: Record<string, unknown>) => send("info", scope, message, details),
  warn: (scope: string, message: string, details?: Record<string, unknown>) => send("warn", scope, message, details),
  error: (scope: string, message: string, details?: Record<string, unknown>) => send("error", scope, message, details)
};
