import { contextBridge, ipcRenderer } from "electron";
import type { ProjectDocument } from "../domain/project.js";
import type { Calibration } from "../domain/camera-calibration.js";
import type { LensCalibration } from "../domain/camera-lens-calibration.js";
import type { LensCalibrationCaptureSet } from "../domain/camera-lens-capture.js";
import type { MachineAction } from "../machine/machine-controller.js";
import type { AtomBurnBridge, CameraMarkApproval, CameraMarkSettings, CameraRequest, DiagnosticExportRequest, DiagnosticTarget, ErrorIssueDraft, GateCApproval, LocalDeviceProfile, MaterialTestApproval, MaterialTestSettings, MaterialLibraryActionResult, MotionSafetyAcknowledgement, SafetyAcknowledgement, SupervisedFillApproval, SupervisedRasterApproval } from "../shared/contracts.js";
import type { MaterialLibrary } from "../domain/material-library.js";
import type { LogEntry } from "../shared/logging.js";

const bridge: AtomBurnBridge = Object.freeze({
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),
  openRepository: () => ipcRenderer.invoke("app:open-repository"),
  copyRepositoryLink: () => ipcRenderer.invoke("app:copy-repository"),
  openIssueDraft: (draft: ErrorIssueDraft) => ipcRenderer.invoke("app:open-issue", draft),
  copyErrorDetails: (details: string) => ipcRenderer.invoke("app:copy-error-details", details),
  writeLog: (entry: LogEntry) => ipcRenderer.invoke("app:log", entry),
  createProject: (name?: string) => ipcRenderer.invoke("project:create", name),
  openProject: () => ipcRenderer.invoke("project:open"),
  saveProject: (project: ProjectDocument) => ipcRenderer.invoke("project:save", project),
  saveProjectAs: (project: ProjectDocument) => ipcRenderer.invoke("project:save-as", project),
  importDocument: () => ipcRenderer.invoke("project:import"),
  openMaterialLibrary: () => ipcRenderer.invoke("material-library:open") as Promise<MaterialLibraryActionResult>,
  saveMaterialLibrary: (library:MaterialLibrary,saveAs:boolean) => ipcRenderer.invoke("material-library:save",library,saveAs) as Promise<MaterialLibraryActionResult>,
  exportGcode: (code: string, suggestedName: string) => ipcRenderer.invoke("cam:export", code, suggestedName),
  prepareFirstMark: () => ipcRenderer.invoke("job:prepare-first-mark"),
  startFirstMark: (approval:GateCApproval) => ipcRenderer.invoke("job:start-first-mark",approval),
  frameFirstMark: () => ipcRenderer.invoke("job:frame-first-mark"),
  prepareCameraMark: (settings: CameraMarkSettings) => ipcRenderer.invoke("job:prepare-camera-mark", settings),
  frameCameraMark: () => ipcRenderer.invoke("job:frame-camera-mark"),
  startCameraMark: (approval: CameraMarkApproval) => ipcRenderer.invoke("job:start-camera-mark", approval),
  homeSupervisedFill: () => ipcRenderer.invoke("job:home-supervised-fill"),
  prepareSupervisedFill: (project:ProjectDocument) => ipcRenderer.invoke("job:prepare-supervised-fill",project),
  checkSupervisedFill: () => ipcRenderer.invoke("job:check-supervised-fill"),
  frameSupervisedFill: () => ipcRenderer.invoke("job:frame-supervised-fill"),
  startSupervisedFill: (approval:SupervisedFillApproval) => ipcRenderer.invoke("job:start-supervised-fill",approval),
  homeSupervisedRaster: () => ipcRenderer.invoke("job:home-supervised-raster"),
  prepareSupervisedRaster: (project:ProjectDocument) => ipcRenderer.invoke("job:prepare-supervised-raster",project),
  checkSupervisedRaster: () => ipcRenderer.invoke("job:check-supervised-raster"),
  frameSupervisedRaster: () => ipcRenderer.invoke("job:frame-supervised-raster"),
  startSupervisedRaster: (approval:SupervisedRasterApproval) => ipcRenderer.invoke("job:start-supervised-raster",approval),
  homeMaterialTest: () => ipcRenderer.invoke("job:home-material-test"),
  prepareMaterialTest: (settings:MaterialTestSettings) => ipcRenderer.invoke("job:prepare-material-test",settings),
  checkMaterialTest: () => ipcRenderer.invoke("job:check-material-test"),
  frameMaterialTest: () => ipcRenderer.invoke("job:frame-material-test"),
  startMaterialTest: (approval:MaterialTestApproval) => ipcRenderer.invoke("job:start-material-test",approval),
  listSerialPorts: () => ipcRenderer.invoke("connectivity:list-serial"),
  runReadOnlyDiagnostics: (target: DiagnosticTarget, acknowledgement: SafetyAcknowledgement) => ipcRenderer.invoke("connectivity:read-only-diagnostics", target, acknowledgement),
  exportDiagnostics: (request: DiagnosticExportRequest) => ipcRenderer.invoke("connectivity:export-diagnostics", request),
  getCameraFrame: (request: CameraRequest) => ipcRenderer.invoke("connectivity:camera-frame", request),
  getDeviceProfile: () => ipcRenderer.invoke("connectivity:get-profile"),
  saveDeviceProfile: (profile: LocalDeviceProfile) => ipcRenderer.invoke("connectivity:save-profile", profile),
  getCameraCalibration: () => ipcRenderer.invoke("camera-calibration:get"),
  saveCameraCalibration: (calibration: Calibration) => ipcRenderer.invoke("camera-calibration:save", calibration),
  clearCameraCalibration: () => ipcRenderer.invoke("camera-calibration:clear"),
  getCameraLensCalibration: () => ipcRenderer.invoke("camera-lens-calibration:get"),
  saveCameraLensCalibration: (calibration: LensCalibration) => ipcRenderer.invoke("camera-lens-calibration:save", calibration),
  clearCameraLensCalibration: () => ipcRenderer.invoke("camera-lens-calibration:clear"),
  getCameraLensCaptures: () => ipcRenderer.invoke("camera-lens-captures:get"),
  saveCameraLensCaptures: (captures: LensCalibrationCaptureSet) => ipcRenderer.invoke("camera-lens-captures:save", captures),
  clearCameraLensCaptures: () => ipcRenderer.invoke("camera-lens-captures:clear"),
  exportCameraCalibrationTarget: () => ipcRenderer.invoke("camera-lens-calibration:export-target"),
  exportCameraBedAlignmentTarget: () => ipcRenderer.invoke("camera-bed-alignment:export-target"),
  connectMachine: (target: DiagnosticTarget, acknowledgement: MotionSafetyAcknowledgement) => ipcRenderer.invoke("machine:connect", target, acknowledgement),
  machineAction: (action: MachineAction) => ipcRenderer.invoke("machine:action", action),
  getMachineSnapshot: () => ipcRenderer.invoke("machine:snapshot"),
  disconnectMachine: () => ipcRenderer.invoke("machine:disconnect"),
  reportNetworkChange: (online: boolean) => ipcRenderer.send("app:network-change", online),
  rendererReady: () => ipcRenderer.send("app:renderer-ready")
  ,listSystemFonts: () => ipcRenderer.invoke("app:list-system-fonts")
});

contextBridge.exposeInMainWorld("atomBurn", bridge);
