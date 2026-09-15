import { createProject, type ProjectDocument } from "./project.js";
import { buildLineCam, generateGrbl, type CamControllerProfile, type CamResult } from "../cam/line-cam.js";

export const MATERIAL_TEST_MATERIALS = ["Wood", "Stone", "Acrylic", "Plywood", "Leather", "Custom"] as const;
export type MaterialTestMaterial = (typeof MATERIAL_TEST_MATERIALS)[number];

export interface MaterialTestSettings {
  material: MaterialTestMaterial;
  customMaterial?: string;
  thicknessMm: number;
  speedStartMmPerMin: number;
  speedEndMmPerMin: number;
  powerStartPercent: number;
  powerEndPercent: number;
  columns: number;
  rows: number;
  cellSizeMm: number;
  gapMm: number;
  passes: number;
  lineSpacingMm: number;
  originXmm: number;
  originYmm: number;
}

export interface MaterialTestCell {
  id: string;
  row: number;
  column: number;
  xMm: number;
  yMm: number;
  speedMmPerMin: number;
  powerPercent: number;
}

export interface MaterialTestPlan {
  material: string;
  thicknessMm: number;
  cells: MaterialTestCell[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface PreparedMaterialTest {
  project: ProjectDocument;
  plan: MaterialTestPlan;
  result: CamResult;
  code: string;
}

const finite = (value: number, label: string): number => {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
};

const integerInRange = (value: number, min: number, max: number, label: string): number => {
  finite(value, label);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} must be an integer between ${min} and ${max}.`);
  return value;
};

const numberInRange = (value: number, min: number, max: number, label: string): number => {
  finite(value, label);
  if (value < min || value > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return value;
};

export function validateMaterialTestSettings(input: MaterialTestSettings): MaterialTestSettings {
  if (!MATERIAL_TEST_MATERIALS.includes(input.material)) throw new Error("Choose a supported material.");
  const customMaterial = input.customMaterial?.trim().slice(0, 80);
  if (input.material === "Custom" && !customMaterial) throw new Error("Enter a name for the custom material.");
  const thicknessMm = numberInRange(input.thicknessMm, 0, 100, "Thickness");
  const speedStartMmPerMin = numberInRange(input.speedStartMmPerMin, 100, 3_000, "Starting speed");
  const speedEndMmPerMin = numberInRange(input.speedEndMmPerMin, 100, 3_000, "Ending speed");
  const powerStartPercent = numberInRange(input.powerStartPercent, 1, 100, "Starting power");
  const powerEndPercent = numberInRange(input.powerEndPercent, 1, 100, "Ending power");
  const columns = integerInRange(input.columns, 2, 10, "Columns");
  const rows = integerInRange(input.rows, 2, 10, "Rows");
  const cellSizeMm = numberInRange(input.cellSizeMm, 2, 20, "Cell size");
  const gapMm = numberInRange(input.gapMm, 0, 10, "Gap");
  const passes = integerInRange(input.passes, 1, 5, "Passes");
  const lineSpacingMm = numberInRange(input.lineSpacingMm, 0.05, 1, "Line spacing");
  const originXmm = numberInRange(input.originXmm, 1, 380, "Origin X");
  const originYmm = numberInRange(input.originYmm, 1, 380, "Origin Y");
  const width = columns * cellSizeMm + (columns - 1) * gapMm;
  const height = rows * cellSizeMm + (rows - 1) * gapMm;
  if (originXmm + width > 399 || originYmm + height > 399) throw new Error("The material-test grid exceeds the 400 × 400 mm workspace.");
  return { ...input, customMaterial, thicknessMm, speedStartMmPerMin, speedEndMmPerMin, powerStartPercent, powerEndPercent, columns, rows, cellSizeMm, gapMm, passes, lineSpacingMm, originXmm, originYmm };
}

const interpolate = (start: number, end: number, index: number, count: number): number => count <= 1 ? start : Number((start + (end - start) * index / (count - 1)).toFixed(2));

export function buildMaterialTestPlan(input: MaterialTestSettings): MaterialTestPlan {
  const settings = validateMaterialTestSettings(input);
  const material = settings.material === "Custom" ? settings.customMaterial!.trim() : settings.material;
  const cells: MaterialTestCell[] = [];
  for (let row = 0; row < settings.rows; row += 1) {
    for (let column = 0; column < settings.columns; column += 1) {
      cells.push({
        id: `material-test-${row + 1}-${column + 1}`,
        row,
        column,
        xMm: Number((settings.originXmm + column * (settings.cellSizeMm + settings.gapMm)).toFixed(2)),
        yMm: Number((settings.originYmm + row * (settings.cellSizeMm + settings.gapMm)).toFixed(2)),
        speedMmPerMin: interpolate(settings.speedStartMmPerMin, settings.speedEndMmPerMin, column, settings.columns),
        powerPercent: interpolate(settings.powerStartPercent, settings.powerEndPercent, row, settings.rows)
      });
    }
  }
  return { material, thicknessMm: settings.thicknessMm, cells, bounds: { minX: settings.originXmm, minY: settings.originYmm, maxX: settings.originXmm + settings.columns * settings.cellSizeMm + (settings.columns - 1) * settings.gapMm, maxY: settings.originYmm + settings.rows * settings.cellSizeMm + (settings.rows - 1) * settings.gapMm } };
}

export function buildMaterialTestProject(input: MaterialTestSettings): { project: ProjectDocument; plan: MaterialTestPlan } {
  const settings = validateMaterialTestSettings(input);
  const plan = buildMaterialTestPlan(settings);
  const project = createProject(`Material test · ${plan.material}`);
  const layer = project.layers[0]!;
  project.objects = plan.cells.map((cell) => ({ id: cell.id, name: `${plan.material} ${cell.row + 1}/${cell.column + 1}`, layerId: layer.id, type: "rectangle" as const, widthMm: settings.cellSizeMm, heightMm: settings.cellSizeMm, cornerRadiusMm: 0, transform: [1, 0, 0, 1, cell.xMm, cell.yMm] as [number, number, number, number, number, number] }));
  project.operations = plan.cells.map((cell) => ({ id: `${cell.id}-fill`, name: `${cell.speedMmPerMin} mm/min · ${cell.powerPercent}%`, objectIds: [cell.id], enabled: true, kind: "fill" as const, speedMmPerMin: cell.speedMmPerMin, powerPercent: cell.powerPercent, passes: settings.passes, lineSpacingMm: settings.lineSpacingMm }));
  return { project, plan };
}

export function prepareMaterialTest(input: MaterialTestSettings, controller: CamControllerProfile & { widthMm: number; heightMm: number }): PreparedMaterialTest {
  if (!Number.isFinite(controller.maxPower) || controller.maxPower <= 0) throw new Error("Material Test requires a valid controller $30.");
  if (!controller.laserMode) throw new Error("Material Test requires controller $32=1.");
  if (!Number.isFinite(controller.widthMm) || !Number.isFinite(controller.heightMm) || controller.widthMm <= 0 || controller.heightMm <= 0) throw new Error("Material Test requires a verified live workspace.");
  const { project, plan } = buildMaterialTestProject(input);
  if (plan.cells.some((cell) => cell.speedMmPerMin > 1_000)) throw new Error("Supervised Material Test speed must not exceed 1000 mm/min.");
  const result = buildLineCam(project, controller);
  if (result.paths.length > 5_000) throw new Error("Material Test exceeds the safe path-count limit.");
  if (result.estimatedSeconds > 600) throw new Error("Material Test exceeds the ten-minute safety limit.");
  const code = generateGrbl(result);
  if (code.trim().split(/\r?\n/).length > 5_000) throw new Error("Material Test exceeds the G-code line limit.");
  return { project, plan, result, code };
}
