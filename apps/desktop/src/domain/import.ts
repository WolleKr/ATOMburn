import type { ProjectDocument, ProjectObject } from "./project.js";

export type ImportFormat = "svg" | "dxf" | "lightburn" | "raster";
export interface ImportDiagnostic { severity: "warning" | "error"; code: string; message: string; count?: number; }
export interface ImportedDocument { format: ImportFormat; layers: ProjectDocument["layers"]; objects: ProjectObject[]; diagnostics: ImportDiagnostic[]; sourceName: string; }
