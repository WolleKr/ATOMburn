import { applyTransform, type ProjectObject, type ProjectDocument } from "../domain/project.js";

export type TrimPoint = [number, number];
export type TrimSegment = { objectId: string; segmentIndex: number; a: TrimPoint; b: TrimPoint };

function pointsOf(object: ProjectObject): TrimPoint[] | undefined {
  if (object.type === "path") return object.pointsMm.map(point => applyTransform(object.transform, point));
  if (object.type === "rectangle") {
    const points: TrimPoint[] = [[0, 0], [object.widthMm, 0], [object.widthMm, object.heightMm], [0, object.heightMm]];
    return points.map(([x, y]) => applyTransform(object.transform, [x, y]));
  }
  return undefined;
}

function cross(a: TrimPoint, b: TrimPoint, c: TrimPoint): number { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function between(value: number, a: number, b: number): boolean { return value >= Math.min(a, b) - 1e-7 && value <= Math.max(a, b) + 1e-7; }
function segmentsIntersect(a: TrimPoint, b: TrimPoint, c: TrimPoint, d: TrimPoint): boolean {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  if (Math.abs(abC) < 1e-7 && between(c[0], a[0], b[0]) && between(c[1], a[1], b[1])) return true;
  if (Math.abs(abD) < 1e-7 && between(d[0], a[0], b[0]) && between(d[1], a[1], b[1])) return true;
  if (Math.abs(cdA) < 1e-7 && between(a[0], c[0], d[0]) && between(a[1], c[1], d[1])) return true;
  if (Math.abs(cdB) < 1e-7 && between(b[0], c[0], d[0]) && between(b[1], c[1], d[1])) return true;
  return (abC > 0) !== (abD > 0) && (cdA > 0) !== (cdB > 0);
}

function distanceToSegment(point: TrimPoint, a: TrimPoint, b: TrimPoint): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared)) : 0;
  return Math.hypot(point[0] - (a[0] + ratio * dx), point[1] - (a[1] + ratio * dy));
}

function hasOtherIntersection(project: ProjectDocument, objectId: string, a: TrimPoint, b: TrimPoint, visibleLayers: Set<string>, lockedLayers: Set<string>): boolean {
  return project.objects.some(other => {
    if (other.id === objectId || other.groupId || lockedLayers.has(other.layerId) || !visibleLayers.has(other.layerId)) return false;
    const points = pointsOf(other);
    if (!points || points.length < 2) return false;
    const closed = other.type === "rectangle" || (other.type === "path" && other.closed);
    const count = closed ? points.length : points.length - 1;
    return Array.from({ length: count }, (_, index) => segmentsIntersect(a, b, points[index]!, points[(index + 1) % points.length]!)).some(Boolean);
  });
}

export function findTrimSegment(project: ProjectDocument, point: TrimPoint, visibleLayers: Set<string>, lockedLayers: Set<string>, toleranceMm = 8): TrimSegment | undefined {
  let best: TrimSegment | undefined;
  let bestDistance = toleranceMm;
  for (const object of project.objects) {
    if (object.groupId || object.locked || lockedLayers.has(object.layerId) || !visibleLayers.has(object.layerId)) continue;
    const points = pointsOf(object);
    if (!points || points.length < 2) continue;
    const closed = object.type === "rectangle" || (object.type === "path" && object.closed);
    const count = closed ? points.length : points.length - 1;
    for (let index = 0; index < count; index++) {
      const a = points[index]!, b = points[(index + 1) % points.length]!, distance = distanceToSegment(point, a, b);
      if (distance < bestDistance && hasOtherIntersection(project, object.id, a, b, visibleLayers, lockedLayers)) {
        bestDistance = distance;
        best = { objectId: object.id, segmentIndex: index, a, b };
      }
    }
  }
  return best;
}
