import { applyTransform, type Transform } from "../domain/project-geometry.js";
import type { ProjectDocument, ProjectObject } from "../domain/project.js";

export const CUT_SHAPES_TOLERANCE_MM = 0.01;

type Point = [number, number];
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

export interface CutShapesSnapshot {
  project: ProjectDocument;
  selectedIds: string[];
  selectionOrder?: string[];
}

export interface CutShapesValidation {
  valid: boolean;
  message?: string;
  cutterId?: string;
  targetIds?: string[];
}

export interface CutShapesResult {
  project: ProjectDocument;
  selectedIds: string[];
  selectionOrder: string[];
  insideGroupId: string;
  outsideGroupId: string;
}

class CutShapesGeometryError extends Error {}

const identity: Transform = [1, 0, 0, 1, 0, 0];

function distance(a: Point, b: Point): number { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function cross(a: Point, b: Point): number { return a[0] * b[1] - a[1] * b[0]; }
function subtract(a: Point, b: Point): Point { return [a[0] - b[0], a[1] - b[1]]; }
function add(a: Point, b: Point): Point { return [a[0] + b[0], a[1] + b[1]]; }
function scale(a: Point, amount: number): Point { return [a[0] * amount, a[1] * amount]; }
function samePoint(a: Point, b: Point): boolean { return distance(a, b) <= CUT_SHAPES_TOLERANCE_MM; }

function bounds(points: Point[]): Bounds {
  return {
    minX: Math.min(...points.map(([x]) => x)),
    maxX: Math.max(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxY: Math.max(...points.map(([, y]) => y))
  };
}

function boundsOverlap(left: Bounds, right: Bounds): boolean {
  return left.minX <= right.maxX + CUT_SHAPES_TOLERANCE_MM && left.maxX + CUT_SHAPES_TOLERANCE_MM >= right.minX
    && left.minY <= right.maxY + CUT_SHAPES_TOLERANCE_MM && left.maxY + CUT_SHAPES_TOLERANCE_MM >= right.minY;
}

function cleanPoints(points: Point[], closed: boolean): Point[] {
  const result: Point[] = [];
  for (const point of points) if (!result.length || !samePoint(result[result.length - 1]!, point)) result.push([point[0], point[1]]);
  if (closed && result.length > 1 && samePoint(result[0]!, result[result.length - 1]!)) result.pop();
  return result;
}

function ellipseSegments(object: Extract<ProjectObject, { type: "ellipse" }>): number {
  const [a, b, c, d] = object.transform;
  const radius = Math.max(object.radiusXMm * Math.hypot(a, b), object.radiusYMm * Math.hypot(c, d));
  if (!Number.isFinite(radius) || radius <= CUT_SHAPES_TOLERANCE_MM) return 32;
  const angle = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - CUT_SHAPES_TOLERANCE_MM / radius)));
  return Math.max(32, Math.min(4096, Math.ceil((Math.PI * 2) / Math.max(angle, 0.001))));
}

export function objectPolyline(object: ProjectObject): { points: Point[]; closed: boolean } | undefined {
  if (object.type === "path") {
    const points = cleanPoints(object.pointsMm.map((point) => applyTransform(object.transform, point)), object.closed);
    return points.length >= (object.closed ? 3 : 2) ? { points, closed: object.closed } : undefined;
  }
  if (object.type === "rectangle") {
    const local: Point[] = [[0, 0], [object.widthMm, 0], [object.widthMm, object.heightMm], [0, object.heightMm]];
    return { points: local.map((point) => applyTransform(object.transform, point)), closed: true };
  }
  if (object.type === "ellipse") {
    const segments = ellipseSegments(object);
    const points = Array.from({ length: segments }, (_, index) => {
      const angle = index / segments * Math.PI * 2;
      return applyTransform(object.transform, [Math.cos(angle) * object.radiusXMm, Math.sin(angle) * object.radiusYMm]);
    });
    return { points, closed: true };
  }
  return undefined;
}

function pathSegments(points: Point[], closed: boolean): Array<[Point, Point]> {
  const result: Array<[Point, Point]> = [];
  for (let index = 0; index < points.length - 1; index++) result.push([points[index]!, points[index + 1]!]);
  if (closed) result.push([points[points.length - 1]!, points[0]!]);
  return result;
}

function segmentIntersection(a: Point, b: Point, c: Point, d: Point): Point[] | "overlap" {
  const r = subtract(b, a), s = subtract(d, c), denominator = cross(r, s), qMinusP = subtract(c, a);
  if (Math.abs(denominator) <= CUT_SHAPES_TOLERANCE_MM * CUT_SHAPES_TOLERANCE_MM) {
    if (Math.abs(cross(qMinusP, r)) <= CUT_SHAPES_TOLERANCE_MM * Math.max(1, distance(a, b))) {
      const lengthSquared = r[0] * r[0] + r[1] * r[1];
      if (lengthSquared <= CUT_SHAPES_TOLERANCE_MM * CUT_SHAPES_TOLERANCE_MM) return [];
      const first = (c[0] - a[0]) * r[0] + (c[1] - a[1]) * r[1];
      const second = (d[0] - a[0]) * r[0] + (d[1] - a[1]) * r[1];
      const overlapStart = Math.max(0, Math.min(first, second));
      const overlapEnd = Math.min(lengthSquared, Math.max(first, second));
      if (overlapEnd >= overlapStart - CUT_SHAPES_TOLERANCE_MM) {
        if (overlapEnd - overlapStart > CUT_SHAPES_TOLERANCE_MM) return "overlap";
        return [add(a, scale(r, Math.max(0, Math.min(1, (overlapStart + overlapEnd) / 2 / lengthSquared))))];
      }
    }
    return [];
  }
  const t = cross(qMinusP, s) / denominator, u = cross(qMinusP, r) / denominator;
  if (t < -CUT_SHAPES_TOLERANCE_MM || t > 1 + CUT_SHAPES_TOLERANCE_MM || u < -CUT_SHAPES_TOLERANCE_MM || u > 1 + CUT_SHAPES_TOLERANCE_MM) return [];
  return [add(a, scale(r, Math.max(0, Math.min(1, t))))];
}

function isSelfIntersecting(points: Point[], closed: boolean): boolean {
  const segments = pathSegments(points, closed);
  for (let left = 0; left < segments.length; left++) for (let right = left + 1; right < segments.length; right++) {
    if (right === left + 1 || (closed && left === 0 && right === segments.length - 1)) continue;
    const intersection = segmentIntersection(segments[left]![0], segments[left]![1], segments[right]![0], segments[right]![1]);
    if (intersection === "overlap" || intersection.length > 0) return true;
  }
  return false;
}

function selectionOrder(snapshot: CutShapesSnapshot): string[] {
  const selected = new Set(snapshot.selectedIds);
  const ordered = (snapshot.selectionOrder ?? []).filter((id, index, values) => selected.has(id) && values.indexOf(id) === index);
  return [...ordered, ...snapshot.selectedIds.filter((id) => selected.has(id) && !ordered.includes(id))];
}

function vectorObject(object: ProjectObject | undefined): object is Exclude<ProjectObject, { type: "raster" | "text" }> {
  return Boolean(object && (object.type === "path" || object.type === "rectangle" || object.type === "ellipse"));
}

export function validateCutShapes(snapshot: CutShapesSnapshot): CutShapesValidation {
  const objects = new Map(snapshot.project.objects.map((object) => [object.id, object]));
  const selectedIds = [...new Set(snapshot.selectedIds)].filter((id) => objects.has(id));
  if (selectedIds.length < 2) {
    const only = selectedIds.length === 1 ? objects.get(selectedIds[0]!) : undefined;
    return {
      valid: false,
      message: only && vectorObject(only) && objectPolyline(only)?.closed
        ? "Select one or more target vectors, then select this closed cutter last."
        : "Cut Shapes requires a closed vector cutter selected last, plus at least one target vector."
    };
  }
  const ordered = selectionOrder({ ...snapshot, selectedIds });
  const cutterId = ordered.at(-1);
  const cutter = cutterId ? objects.get(cutterId) : undefined;
  const layers = new Map(snapshot.project.layers.map((layer) => [layer.id, layer]));
  if (!cutter || !vectorObject(cutter) || cutter.groupId || cutter.locked || !layers.get(cutter.layerId)?.visible || layers.get(cutter.layerId)?.locked) {
    return { valid: false, message: "Cut Shapes requires a single closed, ungrouped vector selected last." };
  }
  const cutterPath = objectPolyline(cutter);
  if (!cutterPath?.closed || cutterPath.points.length < 3 || isSelfIntersecting(cutterPath.points, true)) {
    return { valid: false, message: "Cut Shapes requires a single closed, continuous cutter path." };
  }
  const targetIds = ordered.slice(0, -1);
  if (targetIds.some((id) => objects.get(id)?.type === "raster")) return { valid: false, message: "Cut Shapes only operates on vector objects; raster selections are not supported." };
  if (targetIds.some((id) => !vectorObject(objects.get(id)))) return { valid: false, message: "Cut Shapes only operates on supported vector paths." };
  if (targetIds.some((id) => { const object = objects.get(id); return Boolean(object?.locked || !layers.get(object?.layerId ?? "")?.visible || layers.get(object?.layerId ?? "")?.locked); })) {
    return { valid: false, message: "Cut Shapes cannot modify locked or hidden vector objects." };
  }
  return targetIds.length ? { valid: true, cutterId, targetIds } : { valid: false, message: "Cut Shapes requires at least one vector target." };
}

type LocatedPoint = { u: number; point: Point };

function locateOnPath(points: Point[], closed: boolean): { vertices: number[]; lengths: number[]; total: number; pointAt: (u: number) => Point } {
  const segments = pathSegments(points, closed);
  const lengths = segments.map(([a, b]) => distance(a, b));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const vertices = [0];
  for (const length of lengths) vertices.push(vertices[vertices.length - 1]! + length);
  const pointAt = (u: number): Point => {
    if (total <= CUT_SHAPES_TOLERANCE_MM) return points[0]!;
    const normalized = closed ? ((u % total) + total) % total : Math.max(0, Math.min(total, u));
    const index = Math.min(segments.length - 1, Math.max(0, vertices.findIndex((value, position) => position > 0 && normalized <= value) - 1));
    const segmentStart = vertices[index] ?? 0, length = lengths[index] ?? 0, ratio = length ? (normalized - segmentStart) / length : 0;
    return add(segments[index]![0], scale(subtract(segments[index]![1], segments[index]![0]), Math.max(0, Math.min(1, ratio))));
  };
  return { vertices, lengths, total, pointAt };
}

function dedupeLocated(points: LocatedPoint[]): LocatedPoint[] {
  const result: LocatedPoint[] = [];
  for (const candidate of points.sort((a, b) => a.u - b.u)) {
    if (!result.length || Math.abs(result[result.length - 1]!.u - candidate.u) > CUT_SHAPES_TOLERANCE_MM || !samePoint(result[result.length - 1]!.point, candidate.point)) result.push(candidate);
  }
  return result;
}

function fragmentPoints(start: number, end: number, path: ReturnType<typeof locateOnPath>, closed: boolean, sourcePoints: Point[]): Point[] {
  const result: Point[] = [path.pointAt(start)];
  if (path.total > CUT_SHAPES_TOLERANCE_MM) {
    for (let cycle = -2; cycle <= 2; cycle++) for (const vertex of path.vertices.slice(0, -1)) {
      const candidate = vertex + cycle * path.total;
      if (candidate > start + CUT_SHAPES_TOLERANCE_MM && candidate < end - CUT_SHAPES_TOLERANCE_MM) result.push(path.pointAt(candidate));
    }
  }
  result.push(path.pointAt(end));
  const cleaned = cleanPoints(result, false);
  return cleaned.length >= 2 && cleaned.some((point) => !samePoint(point, cleaned[0]!)) ? cleaned : sourcePoints.slice(0, 2);
}

function midpoint(points: Point[]): Point {
  const lengths = points.slice(0, -1).map((point, index) => distance(point, points[index + 1]!));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  let remaining = total / 2;
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index]!;
    if (remaining <= length) return add(points[index]!, scale(subtract(points[index + 1]!, points[index]!), length ? remaining / length : 0.5));
    remaining -= length;
  }
  return points[Math.floor(points.length / 2)]!;
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index]!, b = polygon[previous]!;
    if (Math.abs(cross(subtract(b, a), subtract(point, a))) <= CUT_SHAPES_TOLERANCE_MM && point[0] >= Math.min(a[0], b[0]) - CUT_SHAPES_TOLERANCE_MM && point[0] <= Math.max(a[0], b[0]) + CUT_SHAPES_TOLERANCE_MM && point[1] >= Math.min(a[1], b[1]) - CUT_SHAPES_TOLERANCE_MM && point[1] <= Math.max(a[1], b[1]) + CUT_SHAPES_TOLERANCE_MM) return true;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function splitTarget(target: ProjectObject, cutter: Point[]): { points?: Point[]; inside: boolean }[] {
  const targetPath = objectPolyline(target);
  if (!targetPath) throw new CutShapesGeometryError(`Unsupported target geometry: ${target.name}`);
  const source = targetPath.points, path = locateOnPath(source, targetPath.closed), targetBounds = bounds(source), cutterBounds = bounds(cutter);
  if (!boundsOverlap(targetBounds, cutterBounds)) return [{ inside: pointInPolygon(midpoint(source), cutter) }];
  const cutterSegments = pathSegments(cutter, true), targetSegments = pathSegments(source, targetPath.closed), intersections: LocatedPoint[] = [];
  for (let index = 0; index < targetSegments.length; index++) {
    const [start, end] = targetSegments[index]!;
    for (const [cutterStart, cutterEnd] of cutterSegments) {
      const intersection = segmentIntersection(start, end, cutterStart, cutterEnd);
      if (intersection === "overlap") throw new CutShapesGeometryError("Cut Shapes cannot resolve overlapping target and cutter boundaries.");
      for (const point of intersection) {
        const length = distance(start, end);
        const t = length ? distance(start, point) / length : 0;
        const segmentOffset = path.vertices[index] ?? 0;
        intersections.push({ u: segmentOffset + Math.max(0, Math.min(1, t)) * (path.lengths[index] ?? 0), point });
      }
    }
  }
  const events = dedupeLocated(intersections);
  const meaningful = events.filter((event, index) => index === 0 || !samePoint(event.point, events[index - 1]!.point));
  if (!meaningful.length || (targetPath.closed && meaningful.length < 2)) return [{ inside: pointInPolygon(midpoint(source), cutter) }];
  if (!targetPath.closed && meaningful.length === 1 && pointInPolygon(source[0]!, cutter) === pointInPolygon(source.at(-1)!, cutter)) {
    return [{ inside: pointInPolygon(midpoint(source), cutter) }];
  }
  const fragments: { points: Point[]; inside: boolean }[] = [];
  const intervals: Array<[number, number]> = targetPath.closed
    ? meaningful.map((event, index) => [event.u, index === meaningful.length - 1 ? meaningful[0]!.u + path.total : meaningful[index + 1]!.u])
    : [[0, meaningful[0]!.u], ...meaningful.slice(0, -1).map((event, index) => [event.u, meaningful[index + 1]!.u] as [number, number]), [meaningful.at(-1)!.u, path.total]];
  for (const [start, end] of intervals) {
    if (end - start <= CUT_SHAPES_TOLERANCE_MM) continue;
    const points = fragmentPoints(start, end, path, targetPath.closed, source);
    if (points.length >= 2 && distance(points[0]!, points.at(-1)!) > CUT_SHAPES_TOLERANCE_MM) fragments.push({ points, inside: pointInPolygon(midpoint(points), cutter) });
  }
  return fragments.length ? fragments : [{ inside: pointInPolygon(midpoint(source), cutter) }];
}

function uniqueId(used: Set<string>, prefix: string): string {
  let suffix = 1, id = `${prefix}-${suffix}`;
  while (used.has(id)) id = `${prefix}-${++suffix}`;
  used.add(id);
  return id;
}

function isFillTarget(project: ProjectDocument, objectId: string): boolean {
  return project.operations.some((operation) => operation.enabled && operation.kind === "fill" && operation.objectIds.includes(objectId));
}

export function applyCutShapes(snapshot: CutShapesSnapshot): CutShapesResult {
  const validation = validateCutShapes(snapshot);
  if (!validation.valid || !validation.cutterId || !validation.targetIds) throw new CutShapesGeometryError(validation.message ?? "Invalid Cut Shapes selection.");
  const objectsById = new Map(snapshot.project.objects.map((object) => [object.id, object]));
  const cutter = objectsById.get(validation.cutterId)!;
  const cutterPath = objectPolyline(cutter);
  if (!cutterPath) throw new CutShapesGeometryError("The cutter has no usable geometry.");
  const usedIds = new Set(snapshot.project.objects.map((object) => object.id));
  const usedGroupIds = new Set(snapshot.project.objects.flatMap((object) => object.groupId ? [object.groupId] : []));
  const insideGroupId = uniqueId(usedGroupIds, "cut-shapes-inside");
  const outsideGroupId = uniqueId(usedGroupIds, "cut-shapes-outside");
  const targetSet = new Set(validation.targetIds), replacements = new Map<string, string[]>(), generated: ProjectObject[] = [];
  const selectedIds: string[] = [];
  for (const object of snapshot.project.objects) {
    if (!targetSet.has(object.id)) continue;
    const fragments = splitTarget(object, cutterPath.points);
    const fill = isFillTarget(snapshot.project, object.id);
    const output: ProjectObject[] = [];
    if (fragments.length === 1 && !fragments[0]!.points) {
      const groupId = fragments[0]!.inside ? insideGroupId : outsideGroupId;
      output.push({ ...object, groupId });
    } else {
      fragments.forEach((fragment, index) => {
        const id = index === 0 ? object.id : uniqueId(usedIds, `${object.id}-cut`);
        const groupId = fragment.inside ? insideGroupId : outsideGroupId;
        output.push({ ...object, id, name: `${object.name} ${fragment.inside ? "inside" : "outside"} ${index + 1}`, type: "path", closed: fill ? true : false, pointsMm: fragment.points!, transform: identity, groupId });
      });
    }
    if (!output.length) throw new CutShapesGeometryError(`Cut Shapes produced no geometry for ${object.name}.`);
    replacements.set(object.id, output.map(({ id }) => id));
    generated.push(...output);
    selectedIds.push(...output.map(({ id }) => id));
  }
  if (!generated.length) throw new CutShapesGeometryError("Cut Shapes found no vector targets.");
  const objects = snapshot.project.objects.flatMap((object) => object.id === validation.cutterId ? [] : targetSet.has(object.id) ? replacements.get(object.id)!.map((id) => generated.find((item) => item.id === id)!) : [object]);
  const operations = snapshot.project.operations.map((operation) => ({ ...operation, objectIds: operation.objectIds.flatMap((id) => id === validation.cutterId ? [] : replacements.get(id) ?? [id]) }));
  return { project: { ...snapshot.project, objects, operations }, selectedIds, selectionOrder: selectedIds, insideGroupId, outsideGroupId };
}
