import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { validateLensCalibrationCaptureSet, type LensCalibrationCaptureSet } from "../domain/camera-lens-capture.js";

export async function loadCameraLensCaptures(path: string): Promise<LensCalibrationCaptureSet | undefined> {
  try { return validateLensCalibrationCaptureSet(JSON.parse(await readFile(path, "utf8")) as unknown); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw new Error("Saved lens-calibration views are invalid.", { cause: error }); }
}

export async function saveCameraLensCaptures(path: string, value: unknown): Promise<LensCalibrationCaptureSet> {
  const captures = validateLensCalibrationCaptureSet(value);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(captures)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
  return captures;
}

export async function clearCameraLensCaptures(path: string): Promise<void> {
  await Promise.all([rm(path, { force: true }), rm(`${path}.tmp`, { force: true })]);
}
