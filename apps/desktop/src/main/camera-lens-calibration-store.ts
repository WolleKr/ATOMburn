import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { validateLensCalibration, type LensCalibration } from "../domain/camera-lens-calibration.js";

export async function loadCameraLensCalibration(path: string): Promise<LensCalibration | undefined> {
  try { return validateLensCalibration(JSON.parse(await readFile(path, "utf8")) as unknown); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw new Error("Saved lens calibration is invalid.", { cause: error }); }
}

export async function saveCameraLensCalibration(path: string, value: unknown): Promise<LensCalibration> {
  const calibration = validateLensCalibration(value);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(calibration)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
  return calibration;
}

export async function clearCameraLensCalibration(path: string): Promise<void> {
  await Promise.all([rm(path, { force: true }), rm(`${path}.tmp`, { force: true })]);
}
