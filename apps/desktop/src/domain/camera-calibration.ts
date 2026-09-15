/** Pure camera geometry. Camera data never authorizes motion or laser emission. */
import { undistortPixel, validateLensCalibration, type LensCalibration } from "./camera-lens-calibration.js";

export type Point = { x: number; y: number };
export interface CalibrationPointOrigin { source: "automatic" | "manual"; markerId?: 0|1|2|3|4; detectedImage?: Point; quality?: { bitMargin: number; contourResidualPx: number }; modifiedAt?: number; }
export type CalibrationPoint = { machine: Point; image: Point; origin?: CalibrationPointOrigin };
export interface CalibrationProvenance { snapshotId: string; cameraId: string; lensCalibrationId: string; imageSize: { width: number; height: number }; algorithm: string; algorithmVersion: number; detectedAt: number; manualChanges: ReadonlyArray<{ markerId: 0|1|2|3|4; from: Point; to: Point; changedAt: number }>; }
export interface Calibration {
  version?: 1 | 2;
  points: ReadonlyArray<CalibrationPoint>;
  capturedAt: number;
  cameraId: string;
  uncertaintyMm: number;
  distortion?: { k1: number; k2: number };
  lens?: LensCalibration;
  provenance?: CalibrationProvenance;
}
export type CalibrationState = "missing" | "invalid" | "old" | "incompatible" | "ready";
export interface CalibrationStatus { state: CalibrationState; ageDays?: number; reason: string; }
export interface CalibrationErrorSummary { controlCount: number; rmsMm: number; maxMm: number; }
export interface TransformMetadata { rotation: 0|90|180|270; mirrorX: boolean; mirrorY: boolean; scale: number; offset: Point; calibrationId: string; }
export type Affine = [number,number,number,number,number,number];
export type Projective = [number,number,number,number,number,number,number,number,number];
export const MAX_CALIBRATION_CONTROL_ERROR_MM = 5;
const ageLimit = 30 * 86400000;
const finitePoint=(p: Point)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
export function validateCalibration(value: unknown): Calibration {
  if (!value || typeof value !== "object") throw new Error("Calibration must be an object.");
  const c=value as Calibration;
  if (c.version !== undefined && c.version !== 1 && c.version !== 2) throw new Error("Unsupported calibration version.");
  if (!Array.isArray(c.points) || c.points.length < 3) throw new Error("At least three calibration points are required.");
  if (!Number.isFinite(c.capturedAt) || typeof c.cameraId !== "string" || !c.cameraId || !Number.isFinite(c.uncertaintyMm) || c.uncertaintyMm < 0 || c.points.some(p=>!finitePoint(p.machine)||!finitePoint(p.image))) throw new Error("Calibration contains invalid values.");
  if (c.distortion && (!Number.isFinite(c.distortion.k1)||!Number.isFinite(c.distortion.k2))) throw new Error("Distortion contains invalid values.");
  const validateOrigin=(origin:CalibrationPointOrigin|undefined):CalibrationPointOrigin|undefined=>{if(!origin)return undefined;if(!["automatic","manual"].includes(origin.source)||origin.markerId!==undefined&&![0,1,2,3,4].includes(origin.markerId)||origin.detectedImage&&!finitePoint(origin.detectedImage)||origin.modifiedAt!==undefined&&!Number.isFinite(origin.modifiedAt)||origin.quality&&(!Number.isFinite(origin.quality.bitMargin)||!Number.isFinite(origin.quality.contourResidualPx)))throw new Error("Calibration point provenance is invalid.");return{...origin,...(origin.detectedImage?{detectedImage:{...origin.detectedImage}}:{}),...(origin.quality?{quality:{...origin.quality}}:{})};};
  let provenance:CalibrationProvenance|undefined;
  if(c.provenance){const p=c.provenance;if(!p.snapshotId||!p.cameraId||p.cameraId!==c.cameraId||!p.lensCalibrationId||!Number.isFinite(p.imageSize?.width)||p.imageSize.width<=0||!Number.isFinite(p.imageSize?.height)||p.imageSize.height<=0||!p.algorithm||!Number.isInteger(p.algorithmVersion)||p.algorithmVersion<1||!Number.isFinite(p.detectedAt)||!Array.isArray(p.manualChanges)||p.manualChanges.some(change=>![0,1,2,3,4].includes(change.markerId)||!finitePoint(change.from)||!finitePoint(change.to)||!Number.isFinite(change.changedAt)))throw new Error("Calibration detection provenance is invalid.");provenance={...p,imageSize:{...p.imageSize},manualChanges:p.manualChanges.map(change=>({...change,from:{...change.from},to:{...change.to}}))};}
  const version=c.version===2||provenance?2:1;
  return {version, capturedAt:c.capturedAt, cameraId:c.cameraId, uncertaintyMm:c.uncertaintyMm, points:c.points.map(p=>({machine:{...p.machine},image:{...p.image},...(p.origin?{origin:validateOrigin(p.origin)}:{})})), ...(c.distortion?{distortion:{...c.distortion}}:{}), ...(c.lens ? { lens: validateLensCalibration(c.lens) } : {}),...(provenance?{provenance}:{})};
}
export function serializeCalibration(c: Calibration): string { const valid=validateCalibration(c); return JSON.stringify({version:valid.version,cameraId:valid.cameraId,capturedAt:valid.capturedAt,uncertaintyMm:valid.uncertaintyMm,points:valid.points.map(({image,machine,origin})=>({image:{...image},machine:{...machine},...(origin?{origin}:{})})),...(valid.distortion ? {distortion:{...valid.distortion}} : {}), ...(valid.lens ? {lens:valid.lens} : {}),...(valid.provenance?{provenance:valid.provenance}:{})}); }
export function parseCalibration(text: string): Calibration { try { return validateCalibration(JSON.parse(text)); } catch(e) { throw new Error(e instanceof Error ? e.message : "Invalid calibration.", {cause:e}); } }
export function calibrationStatus(c: Calibration|undefined, now:number, cameraId:string): CalibrationStatus { if(!c)return {state:"missing",reason:"No calibration captured"}; try { validateCalibration(c); } catch(e) { return {state:"invalid",reason:e instanceof Error?e.message:"Invalid calibration"}; } if(c.cameraId!==cameraId)return {state:"incompatible",reason:"Calibration belongs to another camera"}; const age=Math.max(0,now-c.capturedAt),days=age/86400000; return age>ageLimit?{state:"old",ageDays:days,reason:"Calibration is older than 30 days"}:{state:"ready",ageDays:days,reason:"Calibration is current"}; }
export function affineFromCalibration(c: Calibration): Affine { validateCalibration(c); const [p0,p1,p2]=c.points as [CalibrationPoint,CalibrationPoint,CalibrationPoint]; const det=p0.image.x*(p1.image.y-p2.image.y)+p1.image.x*(p2.image.y-p0.image.y)+p2.image.x*(p0.image.y-p1.image.y); if(Math.abs(det)<1e-9)throw new Error("Calibration points are collinear"); const solve=(a:"x"|"y"):[number,number,number]=>{const q:[number,number,number]=[p0.machine[a],p1.machine[a],p2.machine[a]];return [(q[0]*(p1.image.y-p2.image.y)+q[1]*(p2.image.y-p0.image.y)+q[2]*(p0.image.y-p1.image.y))/det,(q[0]*(p2.image.x-p1.image.x)+q[1]*(p0.image.x-p2.image.x)+q[2]*(p1.image.x-p0.image.x))/det,(q[0]*(p1.image.x*p2.image.y-p2.image.x*p1.image.y)+q[1]*(p2.image.x*p0.image.y-p0.image.x*p2.image.y)+q[2]*(p0.image.x*p1.image.y-p1.image.x*p0.image.y))/det]}; const x=solve("x"),y=solve("y");return [...x,...y] as Affine; }
export function reproject(p:Point,a:Affine,d?:Calibration["distortion"]):Point { let {x,y}=p;if(!finitePoint(p))throw new Error("Point must be finite.");if(d){const r2=x*x+y*y,s=1+d.k1*r2+d.k2*r2*r2;x*=s;y*=s;}return {x:a[0]*x+a[1]*y+a[2],y:a[3]*x+a[4]*y+a[5]}; }
export function projectiveFromCalibration(c: Calibration): Projective {
  const valid = validateCalibration(c);
  if (valid.points.length < 4) throw new Error("At least four calibration points are required for perspective correction.");
  const rows: number[][] = [];
  for (const point of valid.points.slice(0, 4)) {
    const { x, y } = valid.lens ? undistortPixel(point.image, valid.lens) : point.image;
    const { x: machineX, y: machineY } = point.machine;
    rows.push([x, y, 1, 0, 0, 0, -machineX * x, -machineX * y, machineX]);
    rows.push([0, 0, 0, x, y, 1, -machineY * x, -machineY * y, machineY]);
  }
  for (let column = 0; column < 8; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 8; row += 1) if (Math.abs(rows[row]![column]!) > Math.abs(rows[pivot]![column]!)) pivot = row;
    if (Math.abs(rows[pivot]![column]!) < 1e-9) throw new Error("Calibration points do not define a stable perspective transform.");
    [rows[column], rows[pivot]] = [rows[pivot]!, rows[column]!];
    const divisor = rows[column]![column]!;
    for (let index = column; index < 9; index += 1) rows[column]![index] = rows[column]![index]! / divisor;
    for (let row = 0; row < 8; row += 1) {
      if (row === column) continue;
      const factor = rows[row]![column]!;
      for (let index = column; index < 9; index += 1) rows[row]![index] = rows[row]![index]! - factor * rows[column]![index]!;
    }
  }
  return [...rows.map((row) => row[8]!), 1] as Projective;
}
export function reprojectProjective(p: Point, transform: Projective): Point {
  if (!finitePoint(p)) throw new Error("Point must be finite.");
  const denominator = transform[6] * p.x + transform[7] * p.y + transform[8];
  if (Math.abs(denominator) < 1e-9) throw new Error("Point is outside the stable perspective transform.");
  return {
    x: (transform[0] * p.x + transform[1] * p.y + transform[2]) / denominator,
    y: (transform[3] * p.x + transform[4] * p.y + transform[5]) / denominator
  };
}
export function calibrationControlError(c: Calibration): CalibrationErrorSummary | null {
  const valid = validateCalibration(c);
  const usePerspective = valid.points.length >= 5;
  const control = valid.points.slice(usePerspective ? 4 : 3);
  if (!control.length) return null;
  const project = usePerspective
    ? (point: Point) => reprojectProjective(valid.lens ? undistortPixel(point, valid.lens) : point, projectiveFromCalibration(valid))
    : (point: Point) => reproject(point, affineFromCalibration(valid), valid.distortion);
  const errors = control.map((point) => {
    const predicted = project(point.image);
    return Math.hypot(predicted.x - point.machine.x, predicted.y - point.machine.y);
  });
  return { controlCount: errors.length, rmsMm: Math.sqrt(errors.reduce((sum, error) => sum + error * error, 0) / errors.length), maxMm: Math.max(...errors) };
}
export function transformMetadata(rotation:0|90|180|270,mirrorX:boolean,mirrorY:boolean,scale:number,offset:Point,calibrationId:string):TransformMetadata {if(![0,90,180,270].includes(rotation)||!Number.isFinite(scale)||scale<=0||!finitePoint(offset)||!calibrationId)throw new Error("Invalid transform metadata.");return Object.freeze({rotation,mirrorX,mirrorY,scale,offset:{...offset},calibrationId});}
export function transformPoint(p:Point,m:TransformMetadata):Point {let{x,y}=p;if(!finitePoint(p))throw new Error("Point must be finite.");if(m.mirrorX)x=-x;if(m.mirrorY)y=-y;if(m.rotation===90)[x,y]=[-y,x];else if(m.rotation===180)[x,y]=[-x,-y];else if(m.rotation===270)[x,y]=[y,-x];return{x:x*m.scale+m.offset.x,y:y*m.scale+m.offset.y};}
