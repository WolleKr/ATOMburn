import { projectiveFromCalibration, reprojectProjective, type CalibrationPoint, type Point } from "./camera-calibration.js";

export const CAMERA_TARGET = Object.freeze({
  id: "atomburn-acircles-4x11-18mm" as const,
  pageWidthMm: 210,
  pageHeightMm: 297,
  columns: 4,
  rows: 11,
  spacingMm: 18,
  fiducialsMm: [{ x: 18, y: 25 }, { x: 192, y: 25 }, { x: 192, y: 279 }, { x: 18, y: 279 }]
});

export interface GrayImage { width: number; height: number; data: Uint8Array; }
export interface DetectedCalibrationTarget { imageSize: { width: number; height: number }; imagePoints: [number, number][]; fiducials: Point[]; meanRefinementPx: number; }

export function cameraTargetObjectPoints(): [number, number, number][] {
  const points: [number, number, number][] = [];
  for (let row = 0; row < CAMERA_TARGET.rows; row += 1) {
    for (let column = 0; column < CAMERA_TARGET.columns; column += 1) points.push([(2 * column + row % 2) * CAMERA_TARGET.spacingMm, row * CAMERA_TARGET.spacingMm, 0]);
  }
  return points;
}

function otsuThreshold(image: GrayImage): number {
  const histogram = new Uint32Array(256);
  for (const value of image.data) histogram[value] = (histogram[value] ?? 0) + 1;
  const total = image.data.length;
  let sum = 0;
  for (let value = 0; value < 256; value += 1) sum += value * histogram[value]!;
  let backgroundWeight = 0;
  let backgroundSum = 0;
  let bestVariance = -1;
  let bestThreshold = 127;
  for (let value = 0; value < 256; value += 1) {
    backgroundWeight += histogram[value]!;
    if (backgroundWeight === 0) continue;
    const foregroundWeight = total - backgroundWeight;
    if (foregroundWeight === 0) break;
    backgroundSum += value * histogram[value]!;
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
    if (variance > bestVariance) { bestVariance = variance; bestThreshold = value; }
  }
  return Math.max(35, Math.min(205, bestThreshold));
}

interface Component { area: number; minX: number; minY: number; maxX: number; maxY: number; x: number; y: number; fill: number; }

function darkComponents(image: GrayImage, threshold: number): Component[] {
  const { width, height, data } = image;
  const visited = new Uint8Array(data.length);
  const queue = new Int32Array(data.length);
  const components: Component[] = [];
  for (let start = 0; start < data.length; start += 1) {
    if (visited[start] || data[start]! > threshold) continue;
    let head = 0;
    let tail = 1;
    queue[0] = start;
    visited[start] = 1;
    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    while (head < tail) {
      const index = queue[head++]!;
      const x = index % width;
      const y = Math.floor(index / width);
      area += 1; sumX += x; sumY += y;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= data.length || visited[neighbor]) continue;
        const neighborX = neighbor % width;
        if (Math.abs(neighborX - x) > 1 || data[neighbor]! > threshold) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
    if (area < 16) continue;
    const boxArea = (maxX - minX + 1) * (maxY - minY + 1);
    components.push({ area, minX, minY, maxX, maxY, x: sumX / area, y: sumY / area, fill: area / boxArea });
  }
  return components;
}

function orderedFiducials(components: Component[], width: number, height: number): Point[] {
  const squareCandidates = components.filter((component) => {
    const boxWidth = component.maxX - component.minX + 1;
    const boxHeight = component.maxY - component.minY + 1;
    const aspect = boxWidth / boxHeight;
    return component.fill >= 0.72 && aspect >= 0.68 && aspect <= 1.47;
  }).sort((a, b) => b.area - a.area).slice(0, 12);
  if (squareCandidates.length < 4) throw new Error("The four square target fiducials were not found.");
  let best: Component[] | undefined;
  let bestScore = -1;
  for (let a = 0; a < squareCandidates.length - 3; a += 1) for (let b = a + 1; b < squareCandidates.length - 2; b += 1) for (let c = b + 1; c < squareCandidates.length - 1; c += 1) for (let d = c + 1; d < squareCandidates.length; d += 1) {
    const group = [squareCandidates[a]!, squareCandidates[b]!, squareCandidates[c]!, squareCandidates[d]!];
    const areas = group.map((item) => item.area);
    if (Math.max(...areas) / Math.min(...areas) > 2.2) continue;
    const spanX = Math.max(...group.map((item) => item.x)) - Math.min(...group.map((item) => item.x));
    const spanY = Math.max(...group.map((item) => item.y)) - Math.min(...group.map((item) => item.y));
    const score = spanX * spanY * Math.min(...areas);
    if (spanX > width * 0.18 && spanY > height * 0.18 && score > bestScore) { best = group; bestScore = score; }
  }
  if (!best) throw new Error("The target fiducials do not form a stable page rectangle.");
  const byY = [...best].sort((a, b) => a.y - b.y);
  const top = byY.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = byY.slice(2).sort((a, b) => a.x - b.x);
  return [top[0]!, top[1]!, bottom[1]!, bottom[0]!].map(({ x, y }) => ({ x, y }));
}

export function detectCameraCalibrationTarget(image: GrayImage): DetectedCalibrationTarget {
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width <= 0 || image.height <= 0 || image.data.length !== image.width * image.height) throw new Error("Calibration image dimensions are invalid.");
  const threshold = otsuThreshold(image);
  const fiducials = orderedFiducials(darkComponents(image, threshold), image.width, image.height);
  const attempts: Array<{ imagePoints: [number, number][]; meanRefinementPx: number }> = [];
  for (const mirrored of [false, true]) for (let rotation = 0; rotation < 4; rotation += 1) {
    const oriented = CAMERA_TARGET.fiducialsMm.map((_, index) => fiducials[(rotation + (mirrored ? -index : index) + 4) % 4]!);
    try { attempts.push(detectGridForOrientation(image, threshold, oriented)); } catch { /* Try the next physical target orientation. */ }
  }
  const best = attempts.sort((left, right) => left.meanRefinementPx - right.meanRefinementPx)[0];
  if (!best) throw new Error("The four corners were found, but the 4 × 11 circle grid was not. Keep the page flat and avoid reflections or shadows across the dots.");
  return { imageSize: { width: image.width, height: image.height }, imagePoints: best.imagePoints, fiducials, meanRefinementPx: best.meanRefinementPx };
}

function detectGridForOrientation(image: GrayImage, threshold: number, orientedFiducials: Point[]): { imagePoints: [number, number][]; meanRefinementPx: number } {
  const pageCorners = CAMERA_TARGET.fiducialsMm;
  const pageToImagePoints: CalibrationPoint[] = pageCorners.map((page, index) => ({ image: page, machine: orientedFiducials[index]! }));
  const pageToImage = projectiveFromCalibration({ cameraId: "target", capturedAt: 0, uncertaintyMm: 0, points: pageToImagePoints });
  const horizontalScale = Math.hypot(orientedFiducials[1]!.x - orientedFiducials[0]!.x, orientedFiducials[1]!.y - orientedFiducials[0]!.y) / 174;
  const verticalScale = Math.hypot(orientedFiducials[3]!.x - orientedFiducials[0]!.x, orientedFiducials[3]!.y - orientedFiducials[0]!.y) / 254;
  const pixelsPerMm = Math.max(0.5, (horizontalScale + verticalScale) / 2);
  const searchRadius = Math.max(5, Math.floor(pixelsPerMm * 10.5));
  const gridWidth = (2 * (CAMERA_TARGET.columns - 1) + 1) * CAMERA_TARGET.spacingMm;
  const gridHeight = (CAMERA_TARGET.rows - 1) * CAMERA_TARGET.spacingMm;
  const originX = (CAMERA_TARGET.pageWidthMm - gridWidth) / 2;
  const originY = (CAMERA_TARGET.pageHeightMm - gridHeight) / 2;
  const imagePoints: [number, number][] = [];
  let totalRefinement = 0;
  for (let row = 0; row < CAMERA_TARGET.rows; row += 1) {
    for (let column = 0; column < CAMERA_TARGET.columns; column += 1) {
      const page = { x: originX + (2 * column + row % 2) * CAMERA_TARGET.spacingMm, y: originY + row * CAMERA_TARGET.spacingMm };
      const predicted = reprojectProjective(page, pageToImage);
      let weight = 0;
      let weightedX = 0;
      let weightedY = 0;
      const minX = Math.max(0, Math.floor(predicted.x - searchRadius));
      const maxX = Math.min(image.width - 1, Math.ceil(predicted.x + searchRadius));
      const minY = Math.max(0, Math.floor(predicted.y - searchRadius));
      const maxY = Math.min(image.height - 1, Math.ceil(predicted.y + searchRadius));
      for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
        if ((x - predicted.x) ** 2 + (y - predicted.y) ** 2 > searchRadius ** 2) continue;
        const darkness = Math.max(0, threshold - image.data[y * image.width + x]!);
        if (darkness === 0) continue;
        weight += darkness; weightedX += x * darkness; weightedY += y * darkness;
      }
      if (weight < 200) throw new Error(`Circle ${imagePoints.length + 1} was not detected.`);
      const detected: [number, number] = [weightedX / weight, weightedY / weight];
      totalRefinement += Math.hypot(detected[0] - predicted.x, detected[1] - predicted.y);
      imagePoints.push(detected);
    }
  }
  const meanRefinementPx = totalRefinement / imagePoints.length;
  if (meanRefinementPx > pixelsPerMm * 6) throw new Error("Circle-grid detection is unstable.");
  return { imagePoints, meanRefinementPx };
}
