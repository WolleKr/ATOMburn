/** Zod-free affine geometry shared by the editor and project schema boundary. */
export type Transform = [number, number, number, number, number, number];

/**
 * Raster pixels are addressed from top to bottom, while project coordinates
 * grow from bottom to top. Keep the raster's bounding box at (xMm, yMm) and
 * map its first pixel row to the top of that box.
 */
export function rasterTransform(xMm: number, yMm: number, heightMm: number): Transform {
  return [1, 0, 0, -1, xMm, yMm + heightMm];
}

export class ProjectFormatError extends Error {
  constructor(message: string, readonly code: "INVALID" | "TOO_LARGE" | "UNSAFE" | "UNSUPPORTED_VERSION") {
    super(message);
    this.name = "ProjectFormatError";
  }
}

export function applyTransform(transform: Transform, point: readonly [number, number]): [number, number] {
  const [a, b, c, d, e, f] = transform;
  const [x, y] = point;
  const result: [number, number] = [a * x + c * y + e, b * x + d * y + f];
  if (!result.every(Number.isFinite)) throw new ProjectFormatError("Transform produced a non-finite coordinate.", "INVALID");
  return result;
}
