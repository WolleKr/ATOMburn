import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseCalibration, serializeCalibration, type Calibration } from "../domain/camera-calibration.js";

export async function loadCameraCalibration(path: string): Promise<Calibration | undefined> {
  try { return parseCalibration(await readFile(path, "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw new Error("Saved camera calibration is invalid.", { cause: error }); }
}

export async function saveCameraCalibration(path: string, value: unknown): Promise<Calibration> {
  const calibration = parseCalibration(typeof value === "string" ? value : JSON.stringify(value));
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${serializeCalibration(calibration)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
  return calibration;
}

export async function clearCameraCalibration(path: string): Promise<void> {
  await Promise.all([rm(path, { force: true }), rm(`${path}.tmp`, { force: true })]);
}
