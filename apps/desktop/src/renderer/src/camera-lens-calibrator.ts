import { CALIBRATION_FLAGS, initCalibrator } from "@deluksic/opencv-calibration-wasm";
import CALIBRATE_WASM_PATH from "@deluksic/opencv-calibration-wasm/wasm/calibrate.wasm?wasm-data-url";
import { cameraTargetObjectPoints, type DetectedCalibrationTarget } from "../../domain/camera-calibration-target";
import { MIN_LENS_CALIBRATION_VIEWS, validateLensCalibration, type LensCalibration } from "../../domain/camera-lens-calibration";
import { withEmbeddedWasmFetch } from "./embedded-wasm";

let calibratorPromise: ReturnType<typeof initCalibrator> | undefined;

function loadCalibrator(): ReturnType<typeof initCalibrator> {
  if (calibratorPromise) return calibratorPromise;
  calibratorPromise = withEmbeddedWasmFetch(CALIBRATE_WASM_PATH, (wasmPath) => initCalibrator({ wasmPath }))
    .catch((error: unknown) => {
      calibratorPromise = undefined;
      throw error;
    });
  return calibratorPromise;
}

export async function calibrateLens(cameraId: string, views: readonly DetectedCalibrationTarget[]): Promise<LensCalibration> {
  if (views.length < MIN_LENS_CALIBRATION_VIEWS) throw new Error(`Capture at least ${MIN_LENS_CALIBRATION_VIEWS} valid target views.`);
  const imageSize = views[0]!.imageSize;
  if (views.some((view) => view.imageSize.width !== imageSize.width || view.imageSize.height !== imageSize.height)) throw new Error("All lens calibration frames must use the same camera resolution.");
  const calibrator = await loadCalibrator();
  const objectPoints = cameraTargetObjectPoints();
  const result = calibrator.calibrateCameraRO({
    objectPoints: views.map(() => objectPoints),
    imagePoints: views.map((view) => view.imagePoints),
    imageSize,
    iFixedPoint: -1,
    flags: CALIBRATION_FLAGS.CALIB_RATIONAL_MODEL,
    criteria: { type: 3, maxCount: 100, epsilon: 1e-8 },
    maxDistCoeffs: 8
  });
  const [[fx, , cx], [, fy, cy]] = result.cameraMatrix;
  if (fx <= 0 || fy <= 0 || cx < -imageSize.width || cx > imageSize.width * 2 || cy < -imageSize.height || cy > imageSize.height * 2) throw new Error("Calculated lens parameters are implausible. Capture the target in more varied positions and angles.");
  return validateLensCalibration({
    version: 1,
    cameraId,
    capturedAt: Date.now(),
    imageSize,
    cameraMatrix: result.cameraMatrix,
    distortionCoefficients: result.distortionCoefficients,
    reprojectionErrorPx: result.reprojectionErrorPx,
    viewCount: result.viewCount,
    targetId: "atomburn-acircles-4x11-18mm"
  });
}
