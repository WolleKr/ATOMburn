import type { ProjectDocument } from "../domain/project.js";
import type { ImportedDocument } from "../domain/import.js";
import type { Calibration } from "../domain/camera-calibration.js";
import type { LensCalibration } from "../domain/camera-lens-calibration.js";
import type { LensCalibrationCaptureSet } from "../domain/camera-lens-capture.js";
import type { MaterialLibrary } from "../domain/material-library.js";
import type { MachineAction, MachineSnapshot } from "../machine/machine-controller.js";
import type { LogEntry } from "./logging.js";

export interface AppInfo {
  name: "ATOMburn";
  version: string;
  platform: string;
  architecture?: string;
  sprint: number;
}

export interface ErrorIssueDraft { title: string; body: string; }
export type IssueHandoffResult = { status: "opened" | "copied" };

export interface DeviceStatus { camera: "offline" | "streaming" | "error"; bridge: "disconnected" | "connected" | "error"; grbl: "unknown" | "responding" | "error"; detail: string; }
export interface SafetyAcknowledgement { physicallyPresent: boolean; workAreaClear: boolean; emergencyStopReady: boolean; otherControllersClosed: boolean; }
export interface MotionSafetyAcknowledgement extends SafetyAcknowledgement { motionApproved: boolean; laserOffConfirmed: boolean; }
export type DiagnosticTarget = { kind: "tcp"; host: string; port: number } | { kind: "serial"; path: string };
export interface DiagnosticResult { status: DeviceStatus; transcript: { direction: "rx" | "tx"; text: string }[]; }
export interface DiagnosticExportRequest { status: DeviceStatus; transcript: { direction: "rx" | "tx"; text: string }[]; }
export interface SerialPortSummary { path: string; manufacturer?: string; serialNumber?: string; vendorId?: string; productId?: string; }
export interface CameraRequest { host: string; username?: string; password?: string; }
export interface LocalDeviceProfile { host: string; tcpPort: number; cameraPath: "/images/snapshot0.jpg"; serialPath?: string; }
export type CameraResult = { status: "ok"; dataUrl: string } | { status: "error"; message: string };

export type ProjectActionResult =
  | { status: "cancelled" }
  | { status: "error"; message: string }
  | { status: "ok"; project: ProjectDocument; fileName?: string; recoveredFrom?: "primary" | "recovery" | "backup" };
export type ImportActionResult = { status: "cancelled" } | { status: "error"; message: string } | { status: "ok"; imported: ImportedDocument; fileName: string };
export type ExportActionResult = { status: "cancelled" } | { status: "error"; message: string } | { status: "ok"; fileName: string };
export type MaterialLibraryActionResult = { status: "cancelled" } | { status: "error"; message: string } | { status: "ok"; library: MaterialLibrary; fileName: string };
export interface FirstMarkSummary {hash:string;totalLines:number;maxPowerPercent:20;speedMmPerMin:600;start:[30,35];end:[40,35];maxPower:number;laserMode:true;}
export interface GateCApproval {testId:"H-LASER-02";phrase:string;physicallyPresent:boolean;workAreaClear:boolean;emergencyStopReady:boolean;otherControllersClosed:boolean;focused:boolean;materialConfirmed:boolean;ventilationOn:boolean;airAssistOn:boolean;targetFrameConfirmed:boolean;}
export interface CameraMarkSettings { speedMmPerMin: number; powerPercent: number; }
export interface CameraMarkApproval {testId:"H-CAM-MARK-01";supervisedReady:boolean;targetFrameConfirmed:boolean;}
export interface CameraMarkSummary {testId:"H-CAM-MARK-01";hash:string;totalLines:number;bounds:{minX:38;minY:38;maxX:362;maxY:362};markCount:5;powerPercent:number;speedMmPerMin:number;maxPower:1000;laserMode:true;}
export type SupervisedFillTestId="H-FILL-01"|"H-PASS-01";
export interface SupervisedFillSummary {testId:SupervisedFillTestId;hash:string;totalLines:number;bounds:{minX:number;minY:number;maxX:number;maxY:number};estimatedSeconds:number;powerPercent:15;speedMmPerMin:600;passes:1|2;lineSpacingMm:number;maxPower:number;laserMode:boolean;workspaceWidth:number;workspaceHeight:number;}
export interface SupervisedFillApproval {testId:SupervisedFillTestId;supervisedReady:boolean;}
export interface SupervisedRasterSummary {testId:"H-RASTER-BW-01";hash:string;totalLines:number;bounds:{minX:number;minY:number;maxX:number;maxY:number};estimatedSeconds:number;powerPercent:15;speedMmPerMin:600;passes:1;intervalMm:0.5;rasterMode:"threshold";maxPower:number;laserMode:boolean;workspaceWidth:number;workspaceHeight:number;}
export interface SupervisedRasterApproval {testId:"H-RASTER-BW-01";supervisedReady:boolean;}
export interface MaterialTestSettings { material:"Wood"|"Stone"|"Acrylic"|"Plywood"|"Leather"|"Custom"; customMaterial?:string; thicknessMm:number; speedStartMmPerMin:number; speedEndMmPerMin:number; powerStartPercent:number; powerEndPercent:number; columns:number; rows:number; cellSizeMm:number; gapMm:number; passes:number; lineSpacingMm:number; originXmm:number; originYmm:number; }
export interface MaterialTestSummary {testId:"H-MATERIAL-01";hash:string;totalLines:number;bounds:{minX:number;minY:number;maxX:number;maxY:number};estimatedSeconds:number;material:string;thicknessMm:number;cellCount:number;maxPower:number;laserMode:boolean;workspaceWidth:number;workspaceHeight:number;}
export interface MaterialTestApproval {testId:"H-MATERIAL-01";supervisedReady:boolean;targetFrameConfirmed:boolean;}

export interface AtomBurnBridge {
  getAppInfo: () => Promise<AppInfo>;
  openRepository?: () => Promise<void>;
  copyRepositoryLink?: () => Promise<void>;
  openIssueDraft?: (draft: ErrorIssueDraft) => Promise<IssueHandoffResult>;
  copyErrorDetails?: (details: string) => Promise<void>;
  writeLog: (entry: LogEntry) => Promise<void>;
  createProject: (name?: string) => Promise<ProjectDocument>;
  openProject: () => Promise<ProjectActionResult>;
  saveProject: (project: ProjectDocument) => Promise<ProjectActionResult>;
  saveProjectAs: (project: ProjectDocument) => Promise<ProjectActionResult>;
  importDocument: () => Promise<ImportActionResult>;
  openMaterialLibrary: () => Promise<MaterialLibraryActionResult>;
  saveMaterialLibrary: (library: MaterialLibrary, saveAs: boolean) => Promise<MaterialLibraryActionResult>;
  exportGcode: (code: string, suggestedName: string) => Promise<ExportActionResult>;
  prepareFirstMark: () => Promise<FirstMarkSummary>;
  startFirstMark: (approval:GateCApproval) => Promise<MachineSnapshot>;
  frameFirstMark: () => Promise<MachineSnapshot>;
  prepareCameraMark: (settings: CameraMarkSettings) => Promise<CameraMarkSummary>;
  frameCameraMark: () => Promise<MachineSnapshot>;
  startCameraMark: (approval: CameraMarkApproval) => Promise<MachineSnapshot>;
  homeSupervisedFill: () => Promise<MachineSnapshot>;
  prepareSupervisedFill: (project:ProjectDocument) => Promise<SupervisedFillSummary>;
  checkSupervisedFill: () => Promise<MachineSnapshot>;
  frameSupervisedFill: () => Promise<MachineSnapshot>;
  startSupervisedFill: (approval:SupervisedFillApproval) => Promise<MachineSnapshot>;
  homeSupervisedRaster: () => Promise<MachineSnapshot>;
  prepareSupervisedRaster: (project:ProjectDocument) => Promise<SupervisedRasterSummary>;
  checkSupervisedRaster: () => Promise<MachineSnapshot>;
  frameSupervisedRaster: () => Promise<MachineSnapshot>;
  startSupervisedRaster: (approval:SupervisedRasterApproval) => Promise<MachineSnapshot>;
  homeMaterialTest: () => Promise<MachineSnapshot>;
  prepareMaterialTest: (settings:MaterialTestSettings) => Promise<MaterialTestSummary>;
  checkMaterialTest: () => Promise<MachineSnapshot>;
  frameMaterialTest: () => Promise<MachineSnapshot>;
  startMaterialTest: (approval:MaterialTestApproval) => Promise<MachineSnapshot>;
  listSerialPorts: () => Promise<SerialPortSummary[]>;
  runReadOnlyDiagnostics: (target: DiagnosticTarget, acknowledgement: SafetyAcknowledgement) => Promise<DiagnosticResult>;
  exportDiagnostics?: (request: DiagnosticExportRequest) => Promise<ExportActionResult>;
  getCameraFrame: (request: CameraRequest) => Promise<CameraResult>;
  getDeviceProfile: () => Promise<LocalDeviceProfile>;
  saveDeviceProfile: (profile: LocalDeviceProfile) => Promise<LocalDeviceProfile>;
  getCameraCalibration: () => Promise<Calibration | undefined>;
  saveCameraCalibration: (calibration: Calibration) => Promise<Calibration>;
  clearCameraCalibration: () => Promise<void>;
  getCameraLensCalibration: () => Promise<LensCalibration | undefined>;
  saveCameraLensCalibration: (calibration: LensCalibration) => Promise<LensCalibration>;
  clearCameraLensCalibration: () => Promise<void>;
  getCameraLensCaptures: () => Promise<LensCalibrationCaptureSet | undefined>;
  saveCameraLensCaptures: (captures: LensCalibrationCaptureSet) => Promise<LensCalibrationCaptureSet>;
  clearCameraLensCaptures: () => Promise<void>;
  exportCameraCalibrationTarget: () => Promise<ExportActionResult>;
  exportCameraBedAlignmentTarget: () => Promise<ExportActionResult>;
  connectMachine: (target: DiagnosticTarget, acknowledgement: MotionSafetyAcknowledgement) => Promise<MachineSnapshot>;
  machineAction: (action: MachineAction) => Promise<MachineSnapshot>;
  getMachineSnapshot: () => Promise<MachineSnapshot>;
  disconnectMachine: () => Promise<void>;
  reportNetworkChange?: (online: boolean) => void;
  rendererReady: () => void;
  listSystemFonts: () => Promise<string[]>;
}
