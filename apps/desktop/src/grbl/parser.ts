import type { GrblMessage, GrblState, GrblStatus } from "./protocol.js";

const knownStates = new Set<GrblState>(["Idle", "Run", "Hold", "Jog", "Alarm", "Door", "Check", "Home", "Sleep"]);

function finiteTuple(value: string, length: 2 | 3): number[] | undefined {
  const values = value.split(",").map(Number);
  return values.length === length && values.every(Number.isFinite) ? values : undefined;
}

function parseStatus(line: string): GrblStatus | undefined {
  if (!line.startsWith("<") || !line.endsWith(">")) return undefined;
  const fields = line.slice(1, -1).split("|");
  const [stateName = "Unknown", substateText] = (fields.shift() ?? "Unknown").split(":");
  const status: GrblStatus = { state: knownStates.has(stateName as GrblState) ? stateName as GrblState : "Unknown", unknown: {} };
  if (substateText !== undefined && Number.isInteger(Number(substateText))) status.substate = Number(substateText);
  for (const field of fields) {
    const separator = field.indexOf(":");
    if (separator < 1) { status.unknown[field] = ""; continue; }
    const key = field.slice(0, separator);
    const value = field.slice(separator + 1);
    const triple = finiteTuple(value, 3);
    if (key === "MPos" && triple) status.machinePosition = triple as [number, number, number];
    else if (key === "WPos" && triple) status.workPosition = triple as [number, number, number];
    else if (key === "WCO" && triple) status.workCoordinateOffset = triple as [number, number, number];
    else if (key === "FS") { const pair = finiteTuple(value, 2); if (pair) [status.feed, status.spindle] = pair; else status.unknown[key] = value; }
    else if (key === "Ov" && triple) status.overrides = triple as [number, number, number];
    else if (key === "Bf") { const pair = finiteTuple(value, 2); if (pair) status.buffer = pair as [number, number]; else status.unknown[key] = value; }
    else if (key === "Pn") status.pins = value;
    else status.unknown[key] = value;
  }
  return status;
}

export function parseGrblLine(line: string): GrblMessage {
  const value = line.trim();
  if (value === "ok") return { type: "ok" };
  const error = /^error:(\d+)$/.exec(value);
  if (error) return { type: "error", code: Number(error[1]) };
  const alarm = /^ALARM:(\d+)$/.exec(value);
  if (alarm) return { type: "alarm", code: Number(alarm[1]) };
  const welcome = /^Grbl\s+([^\s]+).*$/i.exec(value);
  if (welcome) return { type: "welcome", version: welcome[1] ?? "unknown", raw: value };
  const status = parseStatus(value);
  if (status) return { type: "status", status };
  const feedback = /^\[MSG:(.*)]$/.exec(value);
  if (feedback) return { type: "feedback", text: feedback[1] ?? "" };
  const setting = /^\$(\d+)=(.*)$/.exec(value);
  if (setting) return { type: "setting", key: Number(setting[1]), value: setting[2] ?? "" };
  return { type: "unknown", raw: value };
}
