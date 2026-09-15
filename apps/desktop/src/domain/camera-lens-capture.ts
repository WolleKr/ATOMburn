import type { DetectedCalibrationTarget } from "./camera-calibration-target.js";

export type LensCalibrationCapturedView = { frameId: number; target: DetectedCalibrationTarget };
export interface LensCalibrationCaptureSet { version: 1; cameraId: string; savedAt: number; finalized: boolean; views: LensCalibrationCapturedView[]; }

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function validateLensCalibrationCaptureSet(value: unknown): LensCalibrationCaptureSet {
  if (!value || typeof value !== "object") throw new Error("Lens-calibration captures must be an object.");
  const candidate = value as Partial<LensCalibrationCaptureSet>;
  if (candidate.version !== 1 || typeof candidate.cameraId !== "string" || !candidate.cameraId.trim() || !finite(candidate.savedAt) || !Array.isArray(candidate.views)) throw new Error("Lens-calibration capture metadata is invalid.");
  const views = candidate.views.map((view, viewIndex) => {
    if (!view || typeof view !== "object" || !finite(view.frameId) || !view.target || typeof view.target !== "object") throw new Error(`Lens-calibration view ${viewIndex + 1} is invalid.`);
    const target = view.target;
    if (!Number.isInteger(target.imageSize?.width) || !Number.isInteger(target.imageSize?.height) || target.imageSize.width <= 0 || target.imageSize.height <= 0 || target.imagePoints?.length !== 44 || target.fiducials?.length !== 4 || !finite(target.meanRefinementPx)) throw new Error(`Lens-calibration target ${viewIndex + 1} is invalid.`);
    if (!target.imagePoints.every((point) => Array.isArray(point) && point.length === 2 && point.every(finite)) || !target.fiducials.every((point) => finite(point.x) && finite(point.y))) throw new Error(`Lens-calibration points ${viewIndex + 1} are invalid.`);
    return { frameId: view.frameId, target };
  });
  if (views.length > 8) views.length = 8;
  if (views.some((view) => view.target.imageSize.width !== views[0]?.target.imageSize.width || view.target.imageSize.height !== views[0]?.target.imageSize.height)) throw new Error("Stored lens-calibration views use different resolutions.");
  return { version: 1, cameraId: candidate.cameraId.trim(), savedAt: candidate.savedAt, finalized: candidate.finalized === true && views.length === 8, views };
}
