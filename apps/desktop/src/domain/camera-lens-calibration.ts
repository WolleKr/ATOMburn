export type CameraMatrix = [[number, number, number], [number, number, number], [number, number, number]];

export interface LensCalibration {
  version: 1;
  cameraId: string;
  capturedAt: number;
  imageSize: { width: number; height: number };
  cameraMatrix: CameraMatrix;
  distortionCoefficients: number[];
  reprojectionErrorPx: number;
  viewCount: number;
  targetId: "atomburn-acircles-4x11-18mm";
}

export const MIN_LENS_CALIBRATION_VIEWS = 8;
export const MAX_LENS_REPROJECTION_ERROR_PX = 1.5;

const finite = (value: number): boolean => Number.isFinite(value);

export function validateLensCalibration(value: unknown): LensCalibration {
  if (!value || typeof value !== "object") throw new Error("Lens calibration must be an object.");
  const calibration = value as LensCalibration;
  const matrix = calibration.cameraMatrix;
  if (calibration.version !== 1 || typeof calibration.cameraId !== "string" || !calibration.cameraId) throw new Error("Lens calibration identity is invalid.");
  if (!finite(calibration.capturedAt) || !Number.isInteger(calibration.viewCount) || calibration.viewCount < MIN_LENS_CALIBRATION_VIEWS) throw new Error("Lens calibration capture metadata is invalid.");
  if (!finite(calibration.imageSize?.width) || !finite(calibration.imageSize?.height) || calibration.imageSize.width <= 0 || calibration.imageSize.height <= 0) throw new Error("Lens calibration image size is invalid.");
  if (!Array.isArray(matrix) || matrix.length !== 3 || matrix.some((row) => !Array.isArray(row) || row.length !== 3 || row.some((entry) => !finite(entry)))) throw new Error("Lens camera matrix is invalid.");
  if (!Array.isArray(calibration.distortionCoefficients) || calibration.distortionCoefficients.length < 4 || calibration.distortionCoefficients.length > 14 || calibration.distortionCoefficients.some((entry) => !finite(entry))) throw new Error("Lens distortion coefficients are invalid.");
  if (!finite(calibration.reprojectionErrorPx) || calibration.reprojectionErrorPx < 0 || calibration.reprojectionErrorPx > MAX_LENS_REPROJECTION_ERROR_PX) throw new Error(`Lens reprojection error exceeds ${MAX_LENS_REPROJECTION_ERROR_PX.toFixed(1)} px.`);
  if (calibration.targetId !== "atomburn-acircles-4x11-18mm") throw new Error("Lens calibration target is incompatible.");
  return {
    version: 1,
    cameraId: calibration.cameraId,
    capturedAt: calibration.capturedAt,
    imageSize: { ...calibration.imageSize },
    cameraMatrix: matrix.map((row) => [...row]) as CameraMatrix,
    distortionCoefficients: [...calibration.distortionCoefficients],
    reprojectionErrorPx: calibration.reprojectionErrorPx,
    viewCount: calibration.viewCount,
    targetId: calibration.targetId
  };
}

export function undistortPixel(point: { x: number; y: number }, calibration: LensCalibration): { x: number; y: number } {
  const lens = validateLensCalibration(calibration);
  const [[fx, skew, cx], [, fy, cy]] = lens.cameraMatrix;
  if (Math.abs(fx) < 1e-9 || Math.abs(fy) < 1e-9) throw new Error("Lens focal length is invalid.");
  const distortedY = (point.y - cy) / fy;
  const distortedX = (point.x - cx - skew * distortedY) / fx;
  const [k1 = 0, k2 = 0, p1 = 0, p2 = 0, k3 = 0, k4 = 0, k5 = 0, k6 = 0] = lens.distortionCoefficients;
  let x = distortedX;
  let y = distortedY;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const r2 = x * x + y * y;
    const numerator = 1 + k1 * r2 + k2 * r2 * r2 + k3 * r2 * r2 * r2;
    const denominator = 1 + k4 * r2 + k5 * r2 * r2 + k6 * r2 * r2 * r2;
    const radial = Math.abs(denominator) < 1e-12 ? numerator : numerator / denominator;
    const deltaX = 2 * p1 * x * y + p2 * (r2 + 2 * x * x);
    const deltaY = p1 * (r2 + 2 * y * y) + 2 * p2 * x * y;
    if (Math.abs(radial) < 1e-12) break;
    x = (distortedX - deltaX) / radial;
    y = (distortedY - deltaY) / radial;
  }
  return { x: fx * x + skew * y + cx, y: fy * y + cy };
}
