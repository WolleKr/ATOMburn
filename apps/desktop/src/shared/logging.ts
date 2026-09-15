export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = typeof LOG_LEVELS[number];

export interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  details?: Record<string, unknown>;
}

export function shouldWriteLog(level: LogLevel, development: boolean): boolean {
  return development || level === "warn" || level === "error";
}

const secretKey = /password|secret|token|credential|authorization|dataurl/i;

export function redactLogDetails(details: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!details) return undefined;
  return Object.fromEntries(Object.entries(details).map(([key, value]) => [key, secretKey.test(key) ? "[redacted]" : value]));
}

export function validateLogEntry(value: unknown): LogEntry {
  if (!value || typeof value !== "object") throw new Error("Invalid log entry.");
  const candidate = value as Partial<LogEntry>;
  if (!LOG_LEVELS.includes(candidate.level as LogLevel) || typeof candidate.scope !== "string" || typeof candidate.message !== "string") throw new Error("Invalid log entry.");
  const scope = candidate.scope.trim().slice(0, 80);
  const message = candidate.message.trim().slice(0, 2_000);
  if (!scope || !message) throw new Error("Invalid log entry.");
  return { level: candidate.level as LogLevel, scope, message, ...(candidate.details && typeof candidate.details === "object" ? { details: redactLogDetails(candidate.details) } : {}) };
}
