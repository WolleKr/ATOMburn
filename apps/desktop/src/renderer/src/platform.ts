import type { AppInfo, AtomBurnBridge } from "../../shared/contracts";
import { DEFAULT_FONT_FAMILIES } from "../../shared/font-families";
import { validateCalibration, type Calibration } from "../../domain/camera-calibration";
import { validateLensCalibration, type LensCalibration } from "../../domain/camera-lens-calibration";
import { validateLensCalibrationCaptureSet, type LensCalibrationCaptureSet } from "../../domain/camera-lens-capture";
import type { MaterialLibrary } from "../../domain/material-library";

let browserCalibration: Calibration | undefined;
let browserLensCalibration: LensCalibration | undefined;
let browserLensCaptures: LensCalibrationCaptureSet | undefined;

const browserFallback: AtomBurnBridge = {
  getAppInfo: async (): Promise<AppInfo> => ({
    name: "ATOMburn",
    version: "0.16.7-dev",
    platform: "Browser preview",
    architecture: "web",
    sprint: 16
  }),
  openRepository: async () => undefined,
  copyRepositoryLink: async () => navigator.clipboard?.writeText("https://github.com/WolleKr/ATOMburn"),
  openIssueDraft: async () => ({ status: "copied" }),
  copyErrorDetails: async (details) => navigator.clipboard?.writeText(details),
  writeLog: async () => undefined,
  createProject: async (name) => (await import("../../domain/project")).createProject(name),
  openProject: async () => ({ status: "cancelled" }),
  saveProject: async (project) => ({ status: "ok", project, fileName: `${project.name}.atomburn`, recoveredFrom: "primary" }),
  saveProjectAs: async (project) => ({ status: "ok", project, fileName: `${project.name}.atomburn`, recoveredFrom: "primary" }),
  importDocument: async () => ({ status: "cancelled" }),
  openMaterialLibrary: async () => ({ status: "cancelled" }),
  saveMaterialLibrary: async (library:MaterialLibrary) => ({ status: "ok", library, fileName: `${library.name}.atomburn-materials` }),
  exportGcode: async (_code, suggestedName) => ({ status: "ok", fileName: `${suggestedName}.gc` }),
  prepareFirstMark: async()=>{throw new Error("Calibration marking is unavailable in browser preview.");},
  startFirstMark: async()=>{throw new Error("Calibration marking is unavailable in browser preview.");},
  frameFirstMark: async()=>{throw new Error("Calibration marking is unavailable in browser preview.");},
  prepareCameraMark: async()=>{throw new Error("Camera mark test is unavailable in browser preview.");},
  frameCameraMark: async()=>{throw new Error("Camera mark test is unavailable in browser preview.");},
  startCameraMark: async()=>{throw new Error("Camera mark test is unavailable in browser preview.");},
  homeSupervisedFill: async()=>{throw new Error("Supervised Fill is unavailable in browser preview.");},
  prepareSupervisedFill: async()=>{throw new Error("Supervised Fill is unavailable in browser preview.");},
  checkSupervisedFill: async()=>{throw new Error("Supervised Fill is unavailable in browser preview.");},
  frameSupervisedFill: async()=>{throw new Error("Supervised Fill is unavailable in browser preview.");},
  startSupervisedFill: async()=>{throw new Error("Supervised Fill is unavailable in browser preview.");},
  homeSupervisedRaster: async()=>{throw new Error("Supervised Raster is unavailable in browser preview.");},
  prepareSupervisedRaster: async()=>{throw new Error("Supervised Raster is unavailable in browser preview.");},
  checkSupervisedRaster: async()=>{throw new Error("Supervised Raster is unavailable in browser preview.");},
  frameSupervisedRaster: async()=>{throw new Error("Supervised Raster is unavailable in browser preview.");},
  startSupervisedRaster: async()=>{throw new Error("Supervised Raster is unavailable in browser preview.");},
  homeMaterialTest: async()=>{throw new Error("Material Test machine control is unavailable in browser preview.");},
  prepareMaterialTest: async()=>{throw new Error("Material Test machine control is unavailable in browser preview.");},
  checkMaterialTest: async()=>{throw new Error("Material Test machine control is unavailable in browser preview.");},
  frameMaterialTest: async()=>{throw new Error("Material Test machine control is unavailable in browser preview.");},
  startMaterialTest: async()=>{throw new Error("Material Test machine control is unavailable in browser preview.");},
  listSerialPorts: async () => [],
  runReadOnlyDiagnostics: async () => ({ status: { camera: "offline", bridge: "disconnected", grbl: "error", detail: "Hardware diagnostics are unavailable in browser preview." }, transcript: [] }),
  exportDiagnostics: async () => ({ status: "ok", fileName: "ATOMburn-diagnostics.json" }),
  getCameraFrame: async () => ({ status: "error", message: "Camera is unavailable in browser preview." }),
  getDeviceProfile: async () => ({ host: "192.168.178.71", tcpPort: 23, cameraPath: "/images/snapshot0.jpg" }),
  saveDeviceProfile: async (profile) => profile,
  getCameraCalibration: async () => browserCalibration,
  saveCameraCalibration: async (calibration) => { browserCalibration = validateCalibration(calibration); return browserCalibration; },
  clearCameraCalibration: async () => { browserCalibration = undefined; },
  getCameraLensCalibration: async () => browserLensCalibration,
  saveCameraLensCalibration: async (calibration) => { browserLensCalibration = validateLensCalibration(calibration); return browserLensCalibration; },
  clearCameraLensCalibration: async () => { browserLensCalibration = undefined; },
  getCameraLensCaptures: async () => browserLensCaptures,
  saveCameraLensCaptures: async (captures) => { browserLensCaptures = validateLensCalibrationCaptureSet(captures); return browserLensCaptures; },
  clearCameraLensCaptures: async () => { browserLensCaptures = undefined; },
  exportCameraCalibrationTarget: async () => ({ status: "ok", fileName: "ATOMburn-camera-calibration-target-4x11.pdf" }),
  exportCameraBedAlignmentTarget: async () => ({ status: "ok", fileName: "ATOMburn-camera-bed-alignment-target-400x400-tiled.pdf" }),
  connectMachine: async () => { throw new Error("Real machine control is unavailable in browser preview."); },
  machineAction: async () => { throw new Error("Real machine control is unavailable in browser preview."); },
  getMachineSnapshot: async () => ({ connected: false, state: "Unknown", transcript: [] }),
  disconnectMachine: async () => undefined,
  reportNetworkChange: () => undefined,
  rendererReady: () => undefined
  ,listSystemFonts: async () => [...DEFAULT_FONT_FAMILIES]
};

export function getBridge(): AtomBurnBridge {
  return window.atomBurn ?? browserFallback;
}
