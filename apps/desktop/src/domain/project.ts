import { z } from "zod";
import { ProjectFormatError } from "./project-geometry.js";

export { applyTransform, ProjectFormatError, type Transform } from "./project-geometry.js";

export const CURRENT_PROJECT_VERSION = 3 as const;
export const MAX_PROJECT_BYTES = 64 * 1024 * 1024;
export const ATOMSTACK_X30_PRO_PROFILE = Object.freeze({
  id: "atomstack-x30-pro",
  name: "ATOMSTACK X30 Pro",
  widthMm: 400,
  heightMm: 400
} as const);
export const CONNECTION_PROFILE_KINDS = ["lasercam-tcp", "serial-usb"] as const;

const finite = z.number().finite();
const positive = finite.positive();
const identifier = z.string().min(1).max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const transformSchema = z.tuple([finite, finite, finite, finite, finite, finite]);
const baseObject = {
  id: identifier,
  name: z.string().min(1).max(160),
  layerId: identifier,
  transform: transformSchema,
  groupId: identifier.optional(),
  locked: z.boolean().optional()
};

const rectangleSchema = z.object({ ...baseObject, type: z.literal("rectangle"), widthMm: positive, heightMm: positive, cornerRadiusMm: finite.nonnegative() }).strict();
const ellipseSchema = z.object({ ...baseObject, type: z.literal("ellipse"), radiusXMm: positive, radiusYMm: positive }).strict();
const pathSchema = z.object({ ...baseObject, type: z.literal("path"), closed: z.boolean(), pointsMm: z.array(z.tuple([finite, finite])).min(2).max(100_000) }).strict();
const textSchema = z.object({ ...baseObject, type: z.literal("text"), text: z.string().min(1).max(2_000), fontFamily: z.string().min(1).max(120), fontSizeMm: positive, alignment: z.enum(["left", "center", "right"]), curveRadiusMm: finite.nonnegative().optional() }).strict();
const rasterSchema = z.object({ ...baseObject, type: z.literal("raster"), widthMm: positive, heightMm: positive, mimeType: z.enum(["image/png", "image/jpeg", "image/bmp"]), dataBase64: z.string().min(4).max(10_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/), rasterMode: z.enum(["threshold", "grayscale", "floyd-steinberg"]).optional(), dpi: positive.optional() }).strict();
const objectSchema = z.discriminatedUnion("type", [rectangleSchema, ellipseSchema, pathSchema, textSchema, rasterSchema]);

const layerSchema = z.object({ id: identifier, name: z.string().min(1).max(160), visible: z.boolean(), locked: z.boolean(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }).strict();
const operationBase = {
  id: identifier,
  name: z.string().min(1).max(160),
  objectIds: z.array(identifier).max(100_000),
  enabled: z.boolean(),
  speedMmPerMin: positive,
  powerPercent: finite.min(0).max(100),
  passes: z.number().int().min(1).max(100)
};
const operationSchema = z.discriminatedUnion("kind", [
  z.object({ ...operationBase, kind: z.literal("line") }).strict(),
  z.object({ ...operationBase, kind: z.literal("fill"), lineSpacingMm: positive }).strict(),
  z.object({ ...operationBase, kind: z.literal("image"), rasterMode: z.enum(["threshold", "grayscale", "floyd-steinberg"]).optional(), intervalMm: positive.optional() }).strict()
]);
const legacyOperationSchema = z.object({ ...operationBase, kind: z.enum(["line", "fill", "image"]), lineSpacingMm: positive.optional() }).strict();
const machineSchema = z.object({ profileId: z.literal("atomstack-x30-pro"), widthMm: z.literal(400), heightMm: z.literal(400), verified: z.boolean() }).strict();
const legacyMachineSchema = z.object({ profileId: z.literal("atomstack-x30-pro"), widthMm: z.union([z.literal(400), z.literal(410)]), heightMm: z.literal(400), verified: z.boolean() }).strict();
const commonProject = {
  format: z.literal("ATOMburn-project"),
  name: z.string().min(1).max(160),
  units: z.literal("mm"),
  layers: z.array(layerSchema).min(1).max(10_000),
  objects: z.array(objectSchema).max(100_000)
};
const projectV3Schema = z.object({ ...commonProject, version: z.literal(CURRENT_PROJECT_VERSION), machine: machineSchema, connectionProfile: z.enum(CONNECTION_PROFILE_KINDS), operations: z.array(operationSchema).max(10_000) }).strict();
const projectV2Schema = z.object({ ...commonProject, version: z.literal(2), machine: legacyMachineSchema, connectionProfile: z.enum(CONNECTION_PROFILE_KINDS), operations: z.array(legacyOperationSchema).max(10_000) }).strict();
const projectV1Schema = z.object({ ...commonProject, version: z.literal(1), operations: z.array(legacyOperationSchema).max(10_000) }).strict();

export type ProjectDocument = z.infer<typeof projectV3Schema>;
export type ProjectObject = ProjectDocument["objects"][number];
export type ConnectionProfileKind = ProjectDocument["connectionProfile"];

export function createProject(name = "Untitled project"): ProjectDocument {
  return {
    format: "ATOMburn-project",
    version: CURRENT_PROJECT_VERSION,
    name,
    units: "mm",
    machine: { profileId: ATOMSTACK_X30_PRO_PROFILE.id, widthMm: 400, heightMm: 400, verified: true },
    connectionProfile: "lasercam-tcp",
    layers: [{ id: "layer-1", name: "Layer 1", visible: true, locked: false, color: "#68c5e8" }],
    objects: [],
    operations: []
  };
}

const unsafeKey = /(?:password|passwd|token|secret|cookie|api[_-]?key|credential)/i;
const absolutePath = /^(?:[a-zA-Z]:[\\/]|\\\\|\/|file:)/;

function assertSafeProjectValue(value: unknown, key = "root"): void {
  if (unsafeKey.test(key)) throw new ProjectFormatError(`Sensitive field is not allowed: ${key}`, "UNSAFE");
  if (typeof value === "string" && absolutePath.test(value)) throw new ProjectFormatError(`Absolute paths are not allowed: ${key}`, "UNSAFE");
  if (Array.isArray(value)) value.forEach((item, index) => assertSafeProjectValue(item, `${key}[${index}]`));
  else if (value && typeof value === "object") Object.entries(value).forEach(([childKey, child]) => assertSafeProjectValue(child, childKey));
}

function validateReferences(project: ProjectDocument): void {
  const layerIds = new Set(project.layers.map((layer) => layer.id));
  const objectIds = new Set(project.objects.map((object) => object.id));
  const operationIds = new Set(project.operations.map((operation) => operation.id));
  if (layerIds.size !== project.layers.length || objectIds.size !== project.objects.length || operationIds.size !== project.operations.length) throw new ProjectFormatError("Layer, object and operation IDs must be unique.", "INVALID");
  if (project.objects.some((object) => !layerIds.has(object.layerId))) throw new ProjectFormatError("An object references an unknown layer.", "INVALID");
  if (project.operations.some((operation) => operation.objectIds.some((id) => !objectIds.has(id)))) throw new ProjectFormatError("An operation references an unknown object.", "INVALID");
  if (project.operations.some((operation) => new Set(operation.objectIds).size!==operation.objectIds.length)) throw new ProjectFormatError("An operation must not reference the same object more than once.", "INVALID");
}

export function migrateProject(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const version = (input as { version?: unknown }).version;
  if (version === CURRENT_PROJECT_VERSION) {
    const current = input as { machine?: { profileId?: unknown; widthMm?: unknown; heightMm?: unknown; verified?: unknown } };
    if (current.machine?.profileId === "atomstack-x30-pro" && current.machine.widthMm === 410 && current.machine.heightMm === 400) {
      return { ...input, machine: { ...current.machine, widthMm: 400, verified: true } };
    }
    return input;
  }
  if (version !== 1 && version !== 2) throw new ProjectFormatError(`Unsupported project version: ${String(version)}`, "UNSUPPORTED_VERSION");
  const v2 = version === 1
    ? { ...projectV1Schema.parse(input), machine: { profileId: "atomstack-x30-pro" as const, widthMm: 400 as const, heightMm: 400 as const, verified: true }, connectionProfile: "lasercam-tcp" as const }
    : { ...projectV2Schema.parse(input), machine: { profileId: "atomstack-x30-pro" as const, widthMm: 400 as const, heightMm: 400 as const, verified: true } };
  return {...v2,machine:{...v2.machine,widthMm:400 as const,verified:true},version:CURRENT_PROJECT_VERSION,operations:v2.operations.map(operation=>operation.kind==="fill"?{...operation,lineSpacingMm:operation.lineSpacingMm??0.1}:Object.fromEntries(Object.entries(operation).filter(([key])=>key!=="lineSpacingMm")))};
}

export function parseProject(input: unknown): ProjectDocument {
  try {
    assertSafeProjectValue(input);
    const project = projectV3Schema.parse(migrateProject(input));
    validateReferences(project);
    return project;
  } catch (error) {
    if (error instanceof ProjectFormatError) throw error;
    throw new ProjectFormatError(error instanceof Error ? error.message : "Invalid project data.", "INVALID");
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonicalize(child)]));
  return value;
}

export function serializeProject(project: ProjectDocument): string {
  return `${JSON.stringify(canonicalize(parseProject(project)), null, 2)}\n`;
}

export function deserializeProject(text: string): ProjectDocument {
  if (new TextEncoder().encode(text).byteLength > MAX_PROJECT_BYTES) throw new ProjectFormatError("Project file exceeds the 64 MiB safety limit.", "TOO_LARGE");
  try {
    return parseProject(JSON.parse(text) as unknown);
  } catch (error) {
    if (error instanceof ProjectFormatError) throw error;
    throw new ProjectFormatError("Project file is not valid JSON.", "INVALID");
  }
}
