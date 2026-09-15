import type { AppInfo, ErrorIssueDraft } from "../../shared/contracts";

export interface AppErrorReport { operation: string; message: string; details: string; count: number; }

const SECRET = /((?:token|password|authorization|api[-_ ]?key)\s*[:=])\s*[^\s,;]+/gi;
const WINDOWS_PATH = /[A-Za-z]:\\(?:[^\s\\/:*?"<>|]+\\)*[^\s\\/:*?"<>|]*/g;

export function sanitizeErrorDetails(value: string): string {
  return value.replace(SECRET, "$1[REDACTED]").replace(WINDOWS_PATH, "[LOCAL PATH]").slice(0, 6_000);
}

export function createErrorReport(operation: string, error: unknown, previous?: AppErrorReport): AppErrorReport {
  const raw = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
  const message = error instanceof Error ? error.message : "The operation failed unexpectedly.";
  const same = previous?.operation === operation && previous.message === message;
  return { operation, message, details: sanitizeErrorDetails(raw), count: same ? previous.count + 1 : 1 };
}

export function buildIssueDraft(report: AppErrorReport, info: AppInfo, now = new Date()): ErrorIssueDraft {
  const platform = `${info.platform} · ${info.architecture}`;
  const repetition = report.count > 1 ? `\nOccurrences: ${report.count}` : "";
  return {
    title: `[${report.operation}] ${report.message}`.slice(0, 180),
    body: sanitizeErrorDetails(`ATOMburn ${info.version}\n${platform}\nTime: ${now.toISOString()}\nOperation: ${report.operation}${repetition}\n\nDetails:\n${report.details}`).slice(0, 7_500)
  };
}
