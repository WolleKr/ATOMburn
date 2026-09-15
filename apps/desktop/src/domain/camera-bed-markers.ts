import { calibrationControlError, projectiveFromCalibration, reprojectProjective, type Calibration, type Point } from "./camera-calibration.js";
import { undistortPixel, validateLensCalibration, type LensCalibration } from "./camera-lens-calibration.js";
import type { GrayImage } from "./camera-calibration-target.js";

export type BedMarkerId = 0 | 1 | 2 | 3 | 4;

export const BED_MARKER_FAMILY = "atomburn-binary-4x4-v1" as const;
export const BED_MARKER_MACHINE_POINTS = Object.freeze([
  { id: 0 as const, machine: { x: 40, y: 40 } },
  { id: 1 as const, machine: { x: 360, y: 40 } },
  { id: 2 as const, machine: { x: 360, y: 360 } },
  { id: 3 as const, machine: { x: 40, y: 360 } },
  { id: 4 as const, machine: { x: 200, y: 200 } }
]);

export const BED_MARKER_PAYLOADS: Readonly<Record<BedMarkerId, number>> = Object.freeze({
  0: 0x8ca1,
  1: 0x8b42,
  2: 0x8e34,
  3: 0x89d0,
  4: 0x8d68
});
const CODE_TO_ID = new Map(Object.entries(BED_MARKER_PAYLOADS).map(([id, code]) => [code, Number(id) as BedMarkerId]));
const MAX_IMAGE_PIXELS = 16_000_000;

export interface BedMarkerDetectionContext {
  snapshotId: string;
  cameraId: string;
  lensCalibration: LensCalibration;
  detectedAt?: number;
}

export interface DetectedBedMarker {
  id: BedMarkerId;
  imageCenter: Point;
  corners: readonly [Point, Point, Point, Point];
  bitMargin: number;
  contourResidualPx: number;
}

export interface BedMarkerDetectionProvenance {
  snapshotId: string;
  cameraId: string;
  lensCalibrationId: string;
  imageSize: { width: number; height: number };
  algorithm: typeof BED_MARKER_FAMILY;
  algorithmVersion: 1;
  detectedAt: number;
}

export interface BedMarkerQuality {
  rmsPx: number;
  maxPx: number;
  centreControlMm: number | null;
  quadrilateralAreaPx2: number | null;
}

export type BedMarkerDetectionResult = {
  status: "complete" | "partial" | "rejected";
  markers: readonly DetectedBedMarker[];
  missingIds: readonly BedMarkerId[];
  diagnostics: readonly string[];
  quality: BedMarkerQuality;
  provenance: BedMarkerDetectionProvenance;
};

export function bedMarkerCells(id: BedMarkerId): readonly (readonly boolean[])[] {
  const payload = BED_MARKER_PAYLOADS[id];
  if (payload === undefined) throw new Error("Unsupported ATOMburn bed-marker ID.");
  return Array.from({ length: 6 }, (_, row) => Array.from({ length: 6 }, (_, column) => {
    if (row === 0 || row === 5 || column === 0 || column === 5) return true;
    const bit = (row - 1) * 4 + column - 1;
    return Boolean(payload & (1 << (15 - bit)));
  }));
}

function lensId(lens: LensCalibration): string {
  return `${lens.cameraId}:${lens.capturedAt}:${lens.imageSize.width}x${lens.imageSize.height}`;
}

function otsu(image: GrayImage): number {
  const histogram = new Uint32Array(256);
  for (const value of image.data) histogram[value] = histogram[value]! + 1;
  let totalSum = 0;
  for (let value = 0; value < 256; value += 1) totalSum += value * histogram[value]!;
  let backgroundCount = 0, backgroundSum = 0, best = -1, threshold = 127;
  for (let value = 0; value < 256; value += 1) {
    backgroundCount += histogram[value]!;
    backgroundSum += value * histogram[value]!;
    const foregroundCount = image.data.length - backgroundCount;
    if (!backgroundCount || !foregroundCount) continue;
    const difference = backgroundSum / backgroundCount - (totalSum - backgroundSum) / foregroundCount;
    const variance = backgroundCount * foregroundCount * difference * difference;
    if (variance > best) { best = variance; threshold = value; }
  }
  return Math.max(20, Math.min(220, threshold));
}

interface Component { count: number; minX: number; minY: number; maxX: number; maxY: number; corners: [Point, Point, Point, Point]; }
function components(image: GrayImage, threshold: number): Component[] {
  const visited = new Uint8Array(image.data.length);
  const queue = new Int32Array(image.data.length);
  const result: Component[] = [];
  for (let start = 0; start < image.data.length; start += 1) {
    if (visited[start] || image.data[start]! > threshold) continue;
    let head = 0, tail = 1;
    queue[0] = start; visited[start] = 1;
    let minX = image.width, minY = image.height, maxX = 0, maxY = 0;
    let count = 0;
    let topLeft = { x: image.width, y: image.height }, topRight = { x: 0, y: image.height };
    let bottomRight = { x: 0, y: 0 }, bottomLeft = { x: image.width, y: 0 };
    while (head < tail) {
      const index = queue[head++]!;
      const x = index % image.width, y = Math.floor(index / image.width);
      count += 1;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      if (x + y < topLeft.x + topLeft.y) topLeft = { x, y };
      if (x - y > topRight.x - topRight.y) topRight = { x, y };
      if (x + y > bottomRight.x + bottomRight.y) bottomRight = { x, y };
      if (x - y < bottomLeft.x - bottomLeft.y) bottomLeft = { x, y };
      for (const next of [index - 1, index + 1, index - image.width, index + image.width]) {
        if (next < 0 || next >= image.data.length || visited[next]) continue;
        const nextX = next % image.width;
        if (Math.abs(nextX - x) > 1 || image.data[next]! > threshold) continue;
        visited[next] = 1; queue[tail++] = next;
      }
    }
    if (count >= 40) result.push({ count, minX, minY, maxX, maxY, corners: [topLeft, topRight, bottomRight, bottomLeft] });
  }
  return result;
}

function rotateCode(code: number): number {
  let rotated = 0;
  for (let row = 0; row < 4; row += 1) for (let column = 0; column < 4; column += 1) {
    const sourceBit = 15 - (row * 4 + column);
    const targetBit = 15 - (column * 4 + (3 - row));
    if (code & (1 << sourceBit)) rotated |= 1 << targetBit;
  }
  return rotated;
}

function mirrorCode(code: number): number {
  let mirrored = 0;
  for (let row = 0; row < 4; row += 1) for (let column = 0; column < 4; column += 1) {
    const sourceBit = 15 - (row * 4 + column);
    const targetBit = 15 - (row * 4 + (3 - column));
    if (code & (1 << sourceBit)) mirrored |= 1 << targetBit;
  }
  return mirrored;
}

function decodeCode(sampled: number): BedMarkerId | undefined {
  const matches = new Set<BedMarkerId>();
  for (const reflected of [false, true]) {
    let code = reflected ? mirrorCode(sampled) : sampled;
    for (let rotation = 0; rotation < 4; rotation += 1) { const id = CODE_TO_ID.get(code); if (id !== undefined) matches.add(id); code = rotateCode(code); }
  }
  return matches.size === 1 ? [...matches][0] : undefined;
}

function sample(image: GrayImage, transform: ReturnType<typeof projectiveFromCalibration>, x: number, y: number): number {
  const point = reprojectProjective({ x, y }, transform);
  const radius = Math.max(1, Math.floor(Math.min(
    Math.hypot(transform[0], transform[3]), Math.hypot(transform[1], transform[4])
  ) * 0.12));
  let sum = 0, count = 0;
  for (let py = Math.round(point.y) - radius; py <= Math.round(point.y) + radius; py += 1) for (let px = Math.round(point.x) - radius; px <= Math.round(point.x) + radius; px += 1) {
    if (px >= 0 && py >= 0 && px < image.width && py < image.height) { sum += image.data[py * image.width + px]!; count += 1; }
  }
  return count ? sum / count : 255;
}

function candidate(image: GrayImage, threshold: number, component: Component): DetectedBedMarker | undefined {
  const boxWidth = component.maxX - component.minX + 1, boxHeight = component.maxY - component.minY + 1;
  if (Math.min(boxWidth, boxHeight) < 12 || Math.max(boxWidth, boxHeight) > Math.min(image.width, image.height) * 0.35) return undefined;
  if (boxWidth / boxHeight < 0.55 || boxWidth / boxHeight > 1.8) return undefined;
  const corners = component.corners;
  let transform: ReturnType<typeof projectiveFromCalibration>;
  try {
    transform = projectiveFromCalibration({ cameraId: "marker", capturedAt: 0, uncertaintyMm: 0, points: corners.map((machine, index) => ({ image: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 6 }, { x: 0, y: 6 }][index]!, machine })) });
  } catch { return undefined; }
  const values = Array.from({ length: 6 }, (_, row) => Array.from({ length: 6 }, (_, column) => sample(image, transform, column + 0.5, row + 0.5)));
  const border = values.flatMap((row, y) => row.filter((_, x) => y === 0 || y === 5 || x === 0 || x === 5));
  if (border.some((value) => value > threshold)) return undefined;
  let code = 0;
  const payloadValues: number[] = [];
  for (let row = 1; row <= 4; row += 1) for (let column = 1; column <= 4; column += 1) {
    const value = values[row]![column]!; payloadValues.push(value); code = (code << 1) | (value <= threshold ? 1 : 0);
  }
  const id = decodeCode(code);
  if (id === undefined) return undefined;
  const imageCenter = corners.reduce((sum, point) => ({ x: sum.x + point.x / 4, y: sum.y + point.y / 4 }), { x: 0, y: 0 });
  const sideLengths = corners.map((point, index) => Math.hypot(point.x - corners[(index + 1) % 4]!.x, point.y - corners[(index + 1) % 4]!.y));
  const meanSide = sideLengths.reduce((sum, value) => sum + value, 0) / 4;
  return {
    id, imageCenter, corners,
    bitMargin: Math.min(...payloadValues.map((value) => Math.abs(value - threshold))) / 255,
    contourResidualPx: Math.sqrt(sideLengths.reduce((sum, value) => sum + (value - meanSide) ** 2, 0) / 4)
  };
}

const cross = (a: Point, b: Point, c: Point): number => (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
function polygonArea(points: readonly Point[]): number { return Math.abs(points.reduce((sum, point, index) => { const next = points[(index + 1) % points.length]!; return sum + point.x * next.y - next.x * point.y; }, 0)) / 2; }
function insideConvex(point: Point, polygon: readonly Point[]): boolean {
  const signs = polygon.map((current, index) => cross(current, polygon[(index + 1) % polygon.length]!, point));
  return signs.every((value) => value > 1e-6) || signs.every((value) => value < -1e-6);
}

export function assessBedMarkerGeometry(markers: readonly DetectedBedMarker[], lens?: LensCalibration): { diagnostics: string[]; quality: BedMarkerQuality } {
  const diagnostics: string[] = [];
  const byId = new Map(markers.map((marker) => [marker.id, marker]));
  const markerAreas = markers.map((marker) => polygonArea(marker.corners));
  if (markerAreas.some((area) => area < 16) || markerAreas.length > 1 && Math.max(...markerAreas) / Math.min(...markerAreas) > 6) diagnostics.push("Marker sizes are inconsistent with a plausible perspective view.");
  if (markers.some((marker) => marker.bitMargin < 0.04)) diagnostics.push("One or more marker payloads have insufficient black/white contrast.");
  const corners = ([0, 1, 2, 3] as const).map((id) => byId.get(id));
  let centreControlMm: number | null = null, quadrilateralAreaPx2: number | null = null;
  if (corners.every((marker): marker is DetectedBedMarker => Boolean(marker))) {
    const geometryPoints = corners.map((marker) => lens ? undistortPixel(marker.imageCenter, lens) : marker.imageCenter);
    quadrilateralAreaPx2 = polygonArea(geometryPoints);
    const turns = geometryPoints.map((point, index) => cross(point, geometryPoints[(index + 1) % 4]!, geometryPoints[(index + 2) % 4]!));
    if (!(turns.every((value) => value > 1e-6) || turns.every((value) => value < -1e-6)) || quadrilateralAreaPx2 < 100) diagnostics.push("Corner marker IDs do not form a stable convex quadrilateral.");
    const bedEdges = geometryPoints.map((point, index) => Math.hypot(point.x - geometryPoints[(index + 1) % 4]!.x, point.y - geometryPoints[(index + 1) % 4]!.y));
    if (Math.min(...bedEdges) < 10 || Math.max(...bedEdges) / Math.min(...bedEdges) > 8) diagnostics.push("Corner-marker proportions indicate an extreme or degenerate perspective.");
    const centre = byId.get(4);
    if (centre) {
      const centrePoint = lens ? undistortPixel(centre.imageCenter, lens) : centre.imageCenter;
      if (!insideConvex(centrePoint, geometryPoints)) diagnostics.push("The centre marker lies outside the corner-marker quadrilateral.");
      try {
        const calibration: Calibration = { cameraId: "geometry", capturedAt: 0, uncertaintyMm: 0, points: BED_MARKER_MACHINE_POINTS.map(({ id, machine }) => ({ machine, image: byId.get(id)!.imageCenter })), ...(lens ? { lens } : {}) };
        centreControlMm = calibrationControlError(calibration)?.maxMm ?? null;
        if (centreControlMm === null || centreControlMm > 5) diagnostics.push("The independent centre control error exceeds 5 mm.");
      } catch { diagnostics.push("The marker geometry does not define a stable perspective transform."); }
    }
  }
  const residuals = markers.map((marker) => marker.contourResidualPx);
  return { diagnostics, quality: { rmsPx: residuals.length ? Math.sqrt(residuals.reduce((sum, value) => sum + value * value, 0) / residuals.length) : 0, maxPx: residuals.length ? Math.max(...residuals) : 0, centreControlMm, quadrilateralAreaPx2 } };
}

export function detectBedMarkers(image: GrayImage, context: BedMarkerDetectionContext): BedMarkerDetectionResult {
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width <= 0 || image.height <= 0 || image.width * image.height > MAX_IMAGE_PIXELS || image.data.length !== image.width * image.height) throw new Error("Bed-marker image dimensions are invalid or exceed the 16-megapixel limit.");
  if (!context.snapshotId.trim() || !context.cameraId.trim()) throw new Error("Bed-marker detection provenance is incomplete.");
  const lens = validateLensCalibration(context.lensCalibration);
  if (lens.cameraId !== context.cameraId) throw new Error("Lens calibration belongs to another camera.");
  if (lens.imageSize.width !== image.width || lens.imageSize.height !== image.height) throw new Error("Lens calibration resolution does not match the snapshot.");
  const threshold = otsu(image);
  const decoded = components(image, threshold).map((component) => candidate(image, threshold, component)).filter((marker): marker is DetectedBedMarker => Boolean(marker));
  const counts = new Map<BedMarkerId, number>();
  for (const marker of decoded) counts.set(marker.id, (counts.get(marker.id) ?? 0) + 1);
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([id]) => id);
  const markers = decoded.filter((marker) => counts.get(marker.id) === 1).sort((left, right) => left.id - right.id);
  const missingIds = BED_MARKER_MACHINE_POINTS.map(({ id }) => id).filter((id) => !markers.some((marker) => marker.id === id));
  const assessed = assessBedMarkerGeometry(markers, lens);
  const diagnostics = [...(duplicates.length ? [`Duplicate marker IDs: ${duplicates.join(", ")}.`] : []), ...assessed.diagnostics];
  const complete = decoded.length === 5 && markers.length === 5 && !diagnostics.length;
  return {
    status: complete ? "complete" : duplicates.length || assessed.diagnostics.length ? "rejected" : "partial",
    markers, missingIds, diagnostics, quality: assessed.quality,
    provenance: { snapshotId: context.snapshotId, cameraId: context.cameraId, lensCalibrationId: lensId(lens), imageSize: { width: image.width, height: image.height }, algorithm: BED_MARKER_FAMILY, algorithmVersion: 1, detectedAt: context.detectedAt ?? Date.now() }
  };
}
