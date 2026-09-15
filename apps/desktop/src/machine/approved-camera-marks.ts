export const CAMERA_MARK_CENTRES = Object.freeze([
  { x: 40, y: 40 },
  { x: 360, y: 40 },
  { x: 360, y: 360 },
  { x: 40, y: 360 },
  { x: 200, y: 200 }
] as const);

export interface CameraMarkSettings { speedMmPerMin: number; powerPercent: number; maxPower: number; }

export function buildCameraMarkCode(settings: CameraMarkSettings): string {
  if (!Number.isFinite(settings.speedMmPerMin) || settings.speedMmPerMin < 100 || settings.speedMmPerMin > 3_000) throw new Error("Calibration-mark speed must be between 100 and 3000 mm/min.");
  if (!Number.isFinite(settings.powerPercent) || settings.powerPercent < 1 || settings.powerPercent > 30) throw new Error("Calibration-mark power must be between 1 and 30 percent.");
  if (!Number.isFinite(settings.maxPower) || settings.maxPower <= 0) throw new Error("Calibration-mark maximum power is invalid.");
  const powerValue = Math.round(settings.powerPercent / 100 * settings.maxPower);
  const lines = ["M5", "S0", "G21", "G90", "M4 S0"];
  for (const centre of CAMERA_MARK_CENTRES) {
    lines.push(
      `G0 X${centre.x - 2} Y${centre.y - 2}`,
      `M4 S${powerValue}`,
      `G1 X${centre.x + 2} Y${centre.y + 2} F${settings.speedMmPerMin}`,
      "M5",
      `G0 X${centre.x + 2} Y${centre.y - 2}`,
      `M4 S${powerValue}`,
      `G1 X${centre.x - 2} Y${centre.y + 2} F${settings.speedMmPerMin}`,
      "M5"
    );
  }
  lines.push("S0", "M5", "S0");
  return `${lines.join("\n")}\n`;
}

export const H_CAM_MARK_01_CODE = buildCameraMarkCode({ speedMmPerMin: 800, powerPercent: 10, maxPower: 1000 });
export const H_CAM_MARK_01_BOUNDS = Object.freeze({ minX: 38, minY: 38, maxX: 362, maxY: 362 });

const segmentedJog = (axis: "X" | "Y", distance: number): string[] => {
  const sign = distance < 0 ? "-" : "";
  const absolute = Math.abs(distance);
  const full = Math.floor(absolute / 50);
  const remainder = absolute - full * 50;
  return [...Array.from({ length: full }, () => `$J=G91 G21 ${axis}${sign}50 F3000`), ...(remainder ? [`$J=G91 G21 ${axis}${sign}${remainder} F3000`] : [])];
};

export const H_CAM_MARK_01_FRAME_CODE = Object.freeze([
  "M5", "G21", "G90", "G0 X38 Y38",
  ...segmentedJog("X", 324), ...segmentedJog("Y", 324),
  ...segmentedJog("X", -324), ...segmentedJog("Y", -324)
]);
