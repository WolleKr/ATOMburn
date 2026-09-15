const MAX_BYTES = 256 * 1024;
const SECRET = /(password|passwd|token|secret|cookie|authorization|private.?camera|camera.?data|data:image)[^=:\n]*[=:][^,;\n]*/gi;
const SECRET_KEY = /(password|passwd|token|secret|cookie|authorization|private.?camera|camera.?data)/i;
const MAX_ENTRY_CHARS = 2_048;

export interface DiagnosticFaultSummary { connection?: string; session?: string; job?: string; faults?: string[]; }
export interface DiagnosticExportInput {
  generatedAt: number;
  summary: DiagnosticFaultSummary;
  lines?: ReadonlyArray<{ direction: "rx" | "tx"; text: string }>;
  logs?: ReadonlyArray<string>;
  app?: { name: string; version: string; platform: string };
  recovery?: unknown;
}

export function redactDiagnostic(value: unknown): unknown {
  if (typeof value === "string") return value.replace(SECRET, "[REDACTED]").replace(/(?:Bearer|Basic)\s+\S+/gi, "[REDACTED]");
  if (Array.isArray(value)) return value.map(redactDiagnostic);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, SECRET_KEY.test(key) ? "[REDACTED]" : redactDiagnostic(child)]));
  }
  return value;
}

function redactLogLine(line: string): string {
  try { return JSON.stringify(redactDiagnostic(JSON.parse(line) as unknown)); }
  catch { return String(redactDiagnostic(line)); }
}

function clipped(value: string): { value: string; truncated: boolean } {
  if (value.length <= MAX_ENTRY_CHARS) return { value, truncated: false };
  return { value: `${value.slice(0, MAX_ENTRY_CHARS)}…[truncated]`, truncated: true };
}

export function serializeDiagnosticExport(input: DiagnosticExportInput): string {
  if (!Number.isFinite(input.generatedAt)) throw new Error("Diagnostic timestamp must be finite.");
  let truncated = false;
  const lines = (input.lines ?? []).slice(-1_000).map((line) => {
    const text = clipped(String(redactDiagnostic(line.text)));
    truncated ||= text.truncated;
    return { direction: line.direction, text: text.value };
  });
  const logs = (input.logs ?? []).slice(-1_000).map((line) => {
    const text = clipped(redactLogLine(line));
    truncated ||= text.truncated;
    return text.value;
  });
  truncated ||= (input.lines?.length ?? 0) > lines.length || (input.logs?.length ?? 0) > logs.length;
  const safe = redactDiagnostic({
    formatVersion: 1,
    generatedAt: input.generatedAt,
    ...(input.app ? { app: input.app } : {}),
    summary: input.summary,
    ...(input.recovery === undefined ? {} : { recovery: input.recovery })
  }) as Record<string, unknown>;
  const output = { ...safe, truncated, lines, logs };
  let text = JSON.stringify(output);
  while (new TextEncoder().encode(text).byteLength > MAX_BYTES && (lines.length > 1 || logs.length > 1)) {
    output.truncated = true;
    if (logs.length >= lines.length && logs.length > 1) logs.splice(0, Math.max(1, Math.ceil(logs.length / 4)));
    else if (lines.length > 1) lines.splice(0, Math.max(1, Math.ceil(lines.length / 4)));
    text = JSON.stringify(output);
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) throw new Error("Diagnostic summary exceeds the 256 KiB limit.");
  return text;
}

export const DIAGNOSTIC_EXPORT_MAX_BYTES = MAX_BYTES;
