import sharp from "sharp";
import { buildRasterCam, generateGrbl, type CamControllerProfile, type CamResult } from "../cam/line-cam.js";
import { parseProject, type ProjectDocument } from "../domain/project.js";

export const H_RASTER_BW_01_DATA_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAIAAAAmzuBxAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAHUlEQVQYlWNgoDv4DwM4pdFI7AYgM0g3g7A7aAkA8GQv0dqmjK8AAAAASUVORK5CYII=";

export interface SupervisedRasterMachineProfile extends CamControllerProfile { widthMm: number; heightMm: number; }
export interface PreparedSupervisedRaster { testId: "H-RASTER-BW-01"; project: ProjectDocument; result: CamResult; code: string; }

export async function prepareSupervisedRaster(input: ProjectDocument, controller: SupervisedRasterMachineProfile): Promise<PreparedSupervisedRaster> {
  const project = parseProject(input);
  if (!Number.isFinite(controller.maxPower) || controller.maxPower <= 0) throw new Error("Supervised Raster requires valid controller $30.");
  if (!controller.laserMode) throw new Error("Supervised Raster requires controller $32=1.");
  if (![controller.widthMm, controller.heightMm].every((value) => Number.isFinite(value) && value > 0)) throw new Error("Supervised Raster requires a verified live workspace.");
  const enabled = project.operations.filter((operation) => operation.enabled);
  if (enabled.length !== 1 || enabled[0]?.kind !== "image") throw new Error("Supervised Raster requires exactly one enabled Image operation.");
  const operation = enabled[0];
  if (operation.powerPercent !== 15 || operation.speedMmPerMin !== 600 || operation.passes !== 1 || operation.intervalMm !== 0.5 || operation.rasterMode !== "threshold") throw new Error("H-RASTER-BW-01 requires threshold mode, 15% power, 600 mm/min, one pass and 0.5 mm interval.");
  if (operation.objectIds.length !== 1) throw new Error("H-RASTER-BW-01 requires exactly one raster object.");
  const object = project.objects.find((candidate) => candidate.id === operation.objectIds[0]);
  if (!object || object.type !== "raster" || object.mimeType !== "image/png") throw new Error("H-RASTER-BW-01 requires the approved PNG raster object.");
  if (object.dataBase64 !== H_RASTER_BW_01_DATA_BASE64 || object.widthMm !== 5 || object.heightMm !== 5 || object.transform.join(",") !== "1,0,0,1,30,30") throw new Error("H-RASTER-BW-01 image or placement differs from the approved 5 mm reference card.");
  const decoded = await sharp(Buffer.from(object.dataBase64, "base64"), { limitInputPixels: 121 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  if (decoded.info.width !== 11 || decoded.info.height !== 11 || decoded.info.channels !== 1) throw new Error("H-RASTER-BW-01 must decode to the approved 11 × 11 grayscale source.");
  const result = buildRasterCam(project, controller, new Map([[object.id, { width: 11, height: 11, pixels: Array.from(decoded.data) }]]));
  const width = result.bounds.maxX - result.bounds.minX, height = result.bounds.maxY - result.bounds.minY;
  if (width !== 5 || height !== 5 || result.bounds.minX !== 30 || result.bounds.minY !== 30) throw new Error("H-RASTER-BW-01 CAM bounds changed.");
  if (result.bounds.maxX > controller.widthMm || result.bounds.maxY > controller.heightMm || result.estimatedSeconds > 180) throw new Error("H-RASTER-BW-01 exceeds the live workspace or duration limit.");
  const code = generateGrbl(result);
  if (code.trim().split(/\r?\n/).length > 5_000) throw new Error("H-RASTER-BW-01 exceeds the G-code line limit.");
  return { testId: "H-RASTER-BW-01", project, result, code };
}
