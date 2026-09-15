import { basename, dirname, join } from "node:path";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, clipboard, dialog, ipcMain, powerMonitor, shell } from "electron";
import { ConnectionCoordinator } from "../connectivity/connection-coordinator.js";
import { serializeDiagnosticExport } from "../connectivity/diagnostic-export.js";
import { fetchMjpegFrame } from "../connectivity/camera-client.js";
import { runReadOnlyDiagnostics } from "../connectivity/diagnostics.js";
import { DirectSerialTransport, NativeSerialAdapter } from "../connectivity/serial-transport.js";
import { LaserCamTcpTransport } from "../connectivity/tcp-transport.js";
import { createProject, parseProject, type ProjectDocument } from "../domain/project.js";
import { MAX_MATERIAL_LIBRARY_BYTES, normalizeMaterialLibrary, parseLightBurnMaterialLibrary, parseMaterialLibraryDocument, type MaterialLibrary } from "../domain/material-library.js";
import type { Calibration } from "../domain/camera-calibration.js";
import type { LensCalibration } from "../domain/camera-lens-calibration.js";
import type { LensCalibrationCaptureSet } from "../domain/camera-lens-capture.js";
import { SessionRecoveryPolicy, type RecoveryFault } from "../domain/session-recovery.js";
import { importDocument } from "../importers/import-document.js";
import { parseGeneratedGrbl } from "../cam/line-cam.js";
import { JobGuard,type JobInputs,type JobTicket } from "../job/job-guard.js";
import { FIRST_MARK_CODE } from "../job/first-mark-program.js";
import { buildCameraMarkCode, H_CAM_MARK_01_BOUNDS, type CameraMarkSettings as ApprovedCameraMarkSettings } from "../machine/approved-camera-marks.js";
import { prepareSupervisedFill as buildSupervisedFill, type PreparedSupervisedFill } from "../job/supervised-fill.js";
import { prepareSupervisedRaster as buildSupervisedRaster, type PreparedSupervisedRaster } from "../job/supervised-raster.js";
import { prepareMaterialTest as buildMaterialTest, type PreparedMaterialTest } from "../domain/material-test.js";
import { MachineController, type MachineAction } from "../machine/machine-controller.js";
import type { AppInfo, CameraMarkApproval, CameraMarkSettings, CameraMarkSummary, CameraRequest, CameraResult, DiagnosticExportRequest, DiagnosticResult, DiagnosticTarget, ErrorIssueDraft, ExportActionResult, FirstMarkSummary, GateCApproval, ImportActionResult, IssueHandoffResult, LocalDeviceProfile, MaterialLibraryActionResult, MaterialTestApproval, MaterialTestSettings, MaterialTestSummary, MotionSafetyAcknowledgement, ProjectActionResult, SafetyAcknowledgement, SupervisedFillApproval, SupervisedFillSummary, SupervisedRasterApproval, SupervisedRasterSummary } from "../shared/contracts.js";
import { loadDeviceProfile, saveDeviceProfile } from "./device-profile-store.js";
import { clearCameraCalibration, loadCameraCalibration, saveCameraCalibration } from "./camera-calibration-store.js";
import { clearCameraLensCalibration, loadCameraLensCalibration, saveCameraLensCalibration } from "./camera-lens-calibration-store.js";
import { clearCameraLensCaptures, loadCameraLensCaptures, saveCameraLensCaptures } from "./camera-lens-capture-store.js";
import { loadProjectFile, saveProjectFile } from "./project-store.js";
import { saveMaterialLibraryFile } from "./material-library-store.js";
import { appLogPath, log, writeAppLog } from "./app-logger.js";
import type { LogEntry } from "../shared/logging.js";
import { existingDirectory, loadUserPreferences, saveUserPreferences, selectedDirectory, type UserPreferences } from "./user-preferences-store.js";
import { listSystemFonts } from "./system-fonts.js";

const isSmokeTest = process.argv.includes("--smoke-test");
let mainWindow: BrowserWindow | null = null;
let firstMarkGuard:JobGuard|undefined,firstMarkTicket:JobTicket|undefined,firstMarkInputs:JobInputs|undefined,machineConnectionId="",firstMarkFramed=false;
const moduleDirectory = dirname(fileURLToPath(import.meta.url));
let readyTimeout: NodeJS.Timeout | undefined;
let activeProjectPath: string | undefined;
let activeMaterialLibraryPath: string | undefined;
const serialAdapter = new NativeSerialAdapter();
const connectionCoordinator = new ConnectionCoordinator();
const deviceProfilePath = () => join(app.getPath("userData"), "device-profile.json");
const cameraCalibrationPath = () => join(app.getPath("userData"), "camera-calibration.json");
const cameraLensCalibrationPath = () => join(app.getPath("userData"), "camera-lens-calibration.json");
const cameraLensCapturesPath = () => join(app.getPath("userData"), "camera-lens-captures.json");
const userPreferencesPath = () => join(app.getPath("userData"), "preferences.json");
let userPreferences: UserPreferences | undefined;
async function preferences(): Promise<UserPreferences> { return userPreferences ??= await loadUserPreferences(userPreferencesPath()); }
async function rememberDirectory(key: "lastProjectDirectory" | "lastImportDirectory" | "lastExportDirectory" | "lastMaterialLibraryDirectory", path: string): Promise<void> { const current = await preferences(); userPreferences = { ...current, [key]: selectedDirectory(path) }; await saveUserPreferences(userPreferencesPath(), userPreferences); }
let machineController: MachineController | undefined;
let releaseMachineConnection: (() => void) | undefined;
let disconnectPromise:Promise<void>|undefined,quitAfterDisconnect=false;
let firstMarkPreparePromise:Promise<FirstMarkSummary>|undefined;
let supervisedFillGuard:JobGuard|undefined,supervisedFillTicket:JobTicket|undefined,supervisedFillInputs:JobInputs|undefined,supervisedFillPrepared:PreparedSupervisedFill|undefined,supervisedFillFramed=false,supervisedFillHomed=false,supervisedFillCheckPassed=false,supervisedFillPreparePromise:Promise<SupervisedFillSummary>|undefined;
let supervisedRasterGuard:JobGuard|undefined,supervisedRasterTicket:JobTicket|undefined,supervisedRasterInputs:JobInputs|undefined,supervisedRasterPrepared:PreparedSupervisedRaster|undefined,supervisedRasterFramed=false,supervisedRasterHomed=false,supervisedRasterCheckPassed=false,supervisedRasterPreparePromise:Promise<SupervisedRasterSummary>|undefined;
let materialTestGuard:JobGuard|undefined,materialTestTicket:JobTicket|undefined,materialTestInputs:JobInputs|undefined,materialTestPrepared:PreparedMaterialTest|undefined,materialTestSettings:MaterialTestSettings|undefined,materialTestFramed=false,materialTestHomed=false,materialTestCheckPassed=false,materialTestPreparePromise:Promise<MaterialTestSummary>|undefined;
let cameraMarkGuard:JobGuard|undefined,cameraMarkTicket:JobTicket|undefined,cameraMarkInputs:JobInputs|undefined,cameraMarkFramed=false,cameraMarkPreparePromise:Promise<CameraMarkSummary>|undefined;
let cameraMarkSettings:ApprovedCameraMarkSettings|undefined;
const recoveryPolicy = new SessionRecoveryPolicy();
let recoveryClock = Date.now();
function nextRecoveryTimestamp(): number { recoveryClock = Math.max(Date.now(), recoveryClock + 1); return recoveryClock; }
function recordRecoveryFault(fault: RecoveryFault, detail: string): void {
  recoveryPolicy.recordFault(fault, nextRecoveryTimestamp(), detail);
  log("warn", "machine.recovery", "Machine session requires a fresh synchronized Idle state.", { fault, detail });
}
function interruptMachineSession(fault: RecoveryFault, detail: string): void {
  recordRecoveryFault(fault, detail);
  void disconnectMachineSession();
}
function synchronizeRecoveryIfIdle(snapshot: { connected: boolean; state: string }): void {
  if (snapshot.connected && snapshot.state === "Idle") recoveryPolicy.synchronizedIdle(nextRecoveryTimestamp());
}
function recordMachineFailure(error: unknown): void {
  const detail = error instanceof Error ? error.message : "Machine operation failed.";
  if (/alarm/i.test(detail)) recordRecoveryFault("alarm", detail);
  else if (/timed out|timeout/i.test(detail)) interruptMachineSession("timeout", detail);
  else if (/disconnect|connection|cable|reset|non-utf/i.test(detail)) interruptMachineSession("connection-loss", detail);
}
recoveryPolicy.recordFault("app-restart", nextRecoveryTimestamp(), "Application process started; no previous job may resume.");
function clearSupervisedFill(resetHoming=true):void{supervisedFillGuard=undefined;supervisedFillTicket=undefined;supervisedFillInputs=undefined;supervisedFillPrepared=undefined;supervisedFillFramed=false;supervisedFillCheckPassed=false;supervisedFillPreparePromise=undefined;if(resetHoming)supervisedFillHomed=false;}
function clearSupervisedRaster(resetHoming=true):void{supervisedRasterGuard=undefined;supervisedRasterTicket=undefined;supervisedRasterInputs=undefined;supervisedRasterPrepared=undefined;supervisedRasterFramed=false;supervisedRasterCheckPassed=false;supervisedRasterPreparePromise=undefined;if(resetHoming)supervisedRasterHomed=false;}
function clearMaterialTest(resetHoming=true):void{materialTestGuard=undefined;materialTestTicket=undefined;materialTestInputs=undefined;materialTestPrepared=undefined;materialTestSettings=undefined;materialTestFramed=false;materialTestCheckPassed=false;materialTestPreparePromise=undefined;if(resetHoming)materialTestHomed=false;}
function clearCameraMark():void{cameraMarkGuard=undefined;cameraMarkTicket=undefined;cameraMarkInputs=undefined;cameraMarkFramed=false;cameraMarkPreparePromise=undefined;cameraMarkSettings=undefined;}

function disconnectMachineSession():Promise<void>{
  if(disconnectPromise)return disconnectPromise;
  const controller=machineController;machineController=undefined;machineConnectionId="";firstMarkGuard=undefined;firstMarkTicket=undefined;firstMarkInputs=undefined;firstMarkFramed=false;firstMarkPreparePromise=undefined;clearSupervisedFill();clearSupervisedRaster();clearMaterialTest();clearCameraMark();
  const release=releaseMachineConnection;releaseMachineConnection=undefined;
  disconnectPromise=(async()=>{try{await controller?.disconnect();}catch{/* Closing must continue after a best-effort transport disconnect. */}finally{release?.();disconnectPromise=undefined;}})();
  return disconnectPromise;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: "#090e13",
    title: "ATOMburn",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#11171d",
      symbolColor: "#e7edf2",
      height: 56
    },
    webPreferences: {
      preload: join(moduleDirectory, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL();
    if (currentUrl && url !== currentUrl) event.preventDefault();
  });
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    interruptMachineSession("renderer-crash", `Renderer process ended: ${details.reason}.`);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(moduleDirectory, "../renderer/index.html"));
  }

  readyTimeout = setTimeout(() => {
    mainWindow?.show();
  }, 5_000);

  mainWindow.on("closed", () => {
    mainWindow = null;
    void disconnectMachineSession();
  });
}

ipcMain.handle("app:get-info", (): AppInfo => ({
  name: "ATOMburn",
  version: app.getVersion(),
  platform: process.platform === "win32" ? "Windows" : process.platform,
  architecture: process.arch,
  sprint: 16
}));
ipcMain.handle("app:list-system-fonts", (event): Promise<string[]> => { assertTrustedSender(event.sender.id); return listSystemFonts(); });
const repositoryUrl = "https://github.com/WolleKr/ATOMburn";
ipcMain.handle("app:open-repository", async (event): Promise<void> => { assertTrustedSender(event.sender.id); await shell.openExternal(repositoryUrl); });
ipcMain.handle("app:copy-repository", (event): void => { assertTrustedSender(event.sender.id); clipboard.writeText(repositoryUrl); });
ipcMain.handle("app:copy-error-details", (event, details: unknown): void => { assertTrustedSender(event.sender.id); if (typeof details !== "string") throw new Error("Invalid error details."); clipboard.writeText(details.slice(0, 8_000)); });
ipcMain.handle("app:open-issue", async (event, draft: ErrorIssueDraft): Promise<IssueHandoffResult> => {
  assertTrustedSender(event.sender.id);
  if (!draft || typeof draft.title !== "string" || typeof draft.body !== "string") throw new Error("Invalid issue draft.");
  const title = draft.title.slice(0, 180), body = draft.body.slice(0, 7_500);
  const url = `https://github.com/WolleKr/ATOMburn/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  if (url.length > 8_000) { clipboard.writeText(`${title}\n\n${body}`); return { status: "copied" }; }
  try { await shell.openExternal(url); return { status: "opened" }; } catch { clipboard.writeText(`${title}\n\n${body}`); return { status: "copied" }; }
});
ipcMain.handle("app:log", (event, entry: LogEntry): void => { assertTrustedSender(event.sender.id); writeAppLog(entry); });
ipcMain.on("app:network-change", (event, online: unknown) => {
  assertTrustedSender(event.sender.id);
  if (typeof online !== "boolean") throw new Error("Invalid network state.");
  interruptMachineSession("network-change", online ? "Network became available; reconnect explicitly." : "Network connection was lost.");
});

function isMainRenderer(senderId: number): boolean {
  return mainWindow !== null && senderId === mainWindow.webContents.id;
}

function safeError(error: unknown): ProjectActionResult {
  return { status: "error", message: error instanceof Error ? error.message : "The project action failed." };
}

ipcMain.handle("project:create", (event, name?: unknown): ProjectDocument => {
  if (!isMainRenderer(event.sender.id)) throw new Error("Untrusted IPC sender.");
  activeProjectPath = undefined;
  return createProject(typeof name === "string" ? name : undefined);
});

ipcMain.handle("project:open", async (event): Promise<ProjectActionResult> => {
  if (!isMainRenderer(event.sender.id) || !mainWindow) throw new Error("Untrusted IPC sender.");
  const saved = await preferences();
  const selection = await dialog.showOpenDialog(mainWindow, { defaultPath: await existingDirectory(saved.lastProjectDirectory, app.getPath("documents")), properties: ["openFile"], filters: [{ name: "ATOMburn project", extensions: ["atomburn"] }] });
  if (selection.canceled || !selection.filePaths[0]) return { status: "cancelled" };
  try {
    const loaded = await loadProjectFile(selection.filePaths[0]);
    activeProjectPath = selection.filePaths[0];
    await rememberDirectory("lastProjectDirectory", activeProjectPath);
    return { status: "ok", project: loaded.project, fileName: basename(activeProjectPath), recoveredFrom: loaded.recoveredFrom };
  } catch (error) { return safeError(error); }
});

async function chooseSavePath(project: ProjectDocument): Promise<string | undefined> {
  if (!mainWindow) return undefined;
  const safeName = project.name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, "_").trim() || "project";
  const saved = await preferences();
  const directory = await existingDirectory(saved.lastProjectDirectory, app.getPath("documents"));
  const selection = await dialog.showSaveDialog(mainWindow, { defaultPath: join(directory, `${safeName}.atomburn`), filters: [{ name: "ATOMburn project", extensions: ["atomburn"] }] });
  return selection.canceled ? undefined : selection.filePath;
}

async function saveFromRenderer(senderId: number, input: unknown, saveAs: boolean): Promise<ProjectActionResult> {
  if (!isMainRenderer(senderId)) throw new Error("Untrusted IPC sender.");
  try {
    const project = parseProject(input);
    const path = saveAs || !activeProjectPath ? await chooseSavePath(project) : activeProjectPath;
    if (!path) return { status: "cancelled" };
    await saveProjectFile(path, project);
    activeProjectPath = path;
    await rememberDirectory("lastProjectDirectory", path);
    return { status: "ok", project, fileName: basename(path), recoveredFrom: "primary" };
  } catch (error) { return safeError(error); }
}

ipcMain.handle("project:save", (event, project: unknown) => saveFromRenderer(event.sender.id, project, false));
ipcMain.handle("project:save-as", (event, project: unknown) => saveFromRenderer(event.sender.id, project, true));
ipcMain.handle("project:import", async (event): Promise<ImportActionResult> => {
  if (!isMainRenderer(event.sender.id) || !mainWindow) throw new Error("Untrusted IPC sender.");
  const saved = await preferences();
  const selection = await dialog.showOpenDialog(mainWindow, { defaultPath: await existingDirectory(saved.lastImportDirectory, app.getPath("documents")), properties: ["openFile"], filters: [
    { name: "Supported artwork", extensions: ["svg", "svgz", "dxf", "lbrn", "lbrn2", "png", "jpg", "jpeg", "bmp"] },
    { name: "Vector artwork", extensions: ["svg", "svgz", "dxf", "lbrn", "lbrn2"] },
    { name: "Raster images", extensions: ["png", "jpg", "jpeg", "bmp"] }
  ] });
  if (selection.canceled || !selection.filePaths[0]) return { status: "cancelled" };
  try {
    const path = selection.filePaths[0];
    const imported = await importDocument(basename(path), await readFile(path));
    await rememberDirectory("lastImportDirectory", path);
    return { status: "ok", imported, fileName: basename(path) };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Import failed." }; }
});

function materialLibraryName(name:string):string{return name.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g,"_").trim().slice(0,100)||"material-library";}
function materialLibraryPath(path:string):string{return /\.atomburn-materials$/i.test(path)?path:`${path}.atomburn-materials`;}
async function chooseMaterialLibrarySavePath(library:MaterialLibrary):Promise<string|undefined>{
  if(!mainWindow)return undefined;
  const saved=await preferences(),directory=await existingDirectory(saved.lastMaterialLibraryDirectory,app.getPath("documents"));
  const selection=await dialog.showSaveDialog(mainWindow,{title:"Save ATOMburn material library",defaultPath:join(directory,`${materialLibraryName(library.name)}.atomburn-materials`),filters:[{name:"ATOMburn material library",extensions:["atomburn-materials"]}]});
  return selection.canceled||!selection.filePath?undefined:materialLibraryPath(selection.filePath);
}
ipcMain.handle("material-library:open",async(event):Promise<MaterialLibraryActionResult>=>{
  if(!isMainRenderer(event.sender.id)||!mainWindow)throw new Error("Untrusted IPC sender.");
  const saved=await preferences();
  const selection=await dialog.showOpenDialog(mainWindow,{title:"Open material library",defaultPath:await existingDirectory(saved.lastMaterialLibraryDirectory,app.getPath("documents")),properties:["openFile"],filters:[
    {name:"Material libraries",extensions:["clb","atomburn-materials","json"]},
    {name:"LightBurn material library",extensions:["clb"]},
    {name:"ATOMburn material library",extensions:["atomburn-materials","json"]}
  ]});
  if(selection.canceled||!selection.filePaths[0])return{status:"cancelled"};
  try{
    const path=selection.filePaths[0],bytes=await readFile(path);
    if(bytes.byteLength>MAX_MATERIAL_LIBRARY_BYTES)throw new Error("Material library exceeds 8 MiB.");
    const text=bytes.toString("utf8"),library=/\.clb$/i.test(path)||text.trimStart().startsWith("<")?parseLightBurnMaterialLibrary(text,basename(path)):parseMaterialLibraryDocument(text);
    activeMaterialLibraryPath=path;
    await rememberDirectory("lastMaterialLibraryDirectory",path);
    return{status:"ok",library,fileName:basename(path)};
  }catch(error){return{status:"error",message:error instanceof Error?error.message:"Material library import failed."};}
});
ipcMain.handle("material-library:save",async(event,input:unknown,saveAs:unknown):Promise<MaterialLibraryActionResult>=>{
  if(!isMainRenderer(event.sender.id)||!mainWindow)throw new Error("Untrusted IPC sender.");
  try{
    const library=normalizeMaterialLibrary(input as MaterialLibrary),path=saveAs===true||!activeMaterialLibraryPath||!/.atomburn-materials$/i.test(activeMaterialLibraryPath)?await chooseMaterialLibrarySavePath(library):activeMaterialLibraryPath;
    if(!path)return{status:"cancelled"};
    const target=materialLibraryPath(path);
    await saveMaterialLibraryFile(target,library);
    activeMaterialLibraryPath=target;
    await rememberDirectory("lastMaterialLibraryDirectory",target);
    return{status:"ok",library,fileName:basename(target)};
  }catch(error){return{status:"error",message:error instanceof Error?error.message:"Material library save failed."};}
});
ipcMain.handle("cam:export", async (event, code:unknown, suggestedName:unknown):Promise<ExportActionResult>=>{
  if(!isMainRenderer(event.sender.id)||!mainWindow)throw new Error("Untrusted IPC sender.");
  if(typeof code!=="string"||Buffer.byteLength(code)>16*1024*1024||typeof suggestedName!=="string")return{status:"error",message:"Invalid G-code export payload."};
  try{parseGeneratedGrbl(code);const safeName=basename(suggestedName).replace(/[^a-zA-Z0-9._-]/g,"-").slice(0,100)||"atomburn-job";const saved=await preferences();const directory=await existingDirectory(saved.lastExportDirectory,app.getPath("documents"));const selection=await dialog.showSaveDialog(mainWindow,{defaultPath:join(directory,`${safeName}.gc`),filters:[{name:"GRBL G-code",extensions:["gc","nc"]}]});if(selection.canceled||!selection.filePath)return{status:"cancelled"};await writeFile(selection.filePath,code,"utf8");await rememberDirectory("lastExportDirectory",selection.filePath);return{status:"ok",fileName:basename(selection.filePath)};}catch(error){return{status:"error",message:error instanceof Error?error.message:"G-code export failed."};}
});

function assertTrustedSender(senderId: number): void { if (!isMainRenderer(senderId)) throw new Error("Untrusted IPC sender."); }
function hasGateBApproval(value: SafetyAcknowledgement): boolean { return value?.physicallyPresent === true && value.workAreaClear === true && value.emergencyStopReady === true && value.otherControllersClosed === true; }
function hasMotionApproval(value: MotionSafetyAcknowledgement): boolean { return hasGateBApproval(value) && value?.motionApproved === true && value.laserOffConfirmed === true; }

ipcMain.handle("connectivity:list-serial", async (event) => { assertTrustedSender(event.sender.id); return serialAdapter.list(); });
ipcMain.handle("connectivity:get-profile", async (event) => { assertTrustedSender(event.sender.id); return loadDeviceProfile(deviceProfilePath()); });
ipcMain.handle("connectivity:save-profile", async (event, profile: LocalDeviceProfile) => { assertTrustedSender(event.sender.id); return saveDeviceProfile(deviceProfilePath(), profile); });
ipcMain.handle("camera-calibration:get", async (event): Promise<Calibration | undefined> => { assertTrustedSender(event.sender.id); return loadCameraCalibration(cameraCalibrationPath()); });
ipcMain.handle("camera-calibration:save", async (event, calibration: Calibration): Promise<Calibration> => { assertTrustedSender(event.sender.id); return saveCameraCalibration(cameraCalibrationPath(), calibration); });
ipcMain.handle("camera-calibration:clear", async (event): Promise<void> => { assertTrustedSender(event.sender.id); await clearCameraCalibration(cameraCalibrationPath()); });
ipcMain.handle("camera-lens-calibration:get", async (event): Promise<LensCalibration | undefined> => { assertTrustedSender(event.sender.id); return loadCameraLensCalibration(cameraLensCalibrationPath()); });
ipcMain.handle("camera-lens-calibration:save", async (event, calibration: LensCalibration): Promise<LensCalibration> => { assertTrustedSender(event.sender.id); return saveCameraLensCalibration(cameraLensCalibrationPath(), calibration); });
ipcMain.handle("camera-lens-calibration:clear", async (event): Promise<void> => { assertTrustedSender(event.sender.id); await clearCameraLensCalibration(cameraLensCalibrationPath()); });
ipcMain.handle("camera-lens-captures:get", async (event): Promise<LensCalibrationCaptureSet | undefined> => { assertTrustedSender(event.sender.id); return loadCameraLensCaptures(cameraLensCapturesPath()); });
ipcMain.handle("camera-lens-captures:save", async (event, captures: LensCalibrationCaptureSet): Promise<LensCalibrationCaptureSet> => { assertTrustedSender(event.sender.id); return saveCameraLensCaptures(cameraLensCapturesPath(), captures); });
ipcMain.handle("camera-lens-captures:clear", async (event): Promise<void> => { assertTrustedSender(event.sender.id); await clearCameraLensCaptures(cameraLensCapturesPath()); });
ipcMain.handle("camera-lens-calibration:export-target", async (event): Promise<ExportActionResult> => {
  assertTrustedSender(event.sender.id);
  const suggestedName = "ATOMburn-camera-calibration-target-4x11.pdf";
  const selected = await dialog.showSaveDialog(mainWindow!, { title: "Save camera calibration target", defaultPath: suggestedName, filters: [{ name: "PDF", extensions: ["pdf"] }] });
  if (selected.canceled || !selected.filePath) return { status: "cancelled" };
  try {
    await copyFile(join(app.getAppPath(), "output", "pdf", suggestedName), selected.filePath);
    return { status: "ok", fileName: basename(selected.filePath) };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Calibration target export failed." }; }
});
ipcMain.handle("camera-bed-alignment:export-target", async (event): Promise<ExportActionResult> => {
  assertTrustedSender(event.sender.id);
  const suggestedName = "ATOMburn-camera-bed-alignment-target-400x400-tiled.pdf";
  const selected = await dialog.showSaveDialog(mainWindow!, { title: "Save 400 × 400 mm bed alignment target", defaultPath: suggestedName, filters: [{ name: "PDF", extensions: ["pdf"] }] });
  if (selected.canceled || !selected.filePath) return { status: "cancelled" };
  try {
    await copyFile(join(app.getAppPath(), "output", "pdf", suggestedName), selected.filePath);
    return { status: "ok", fileName: basename(selected.filePath) };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Bed alignment target export failed." }; }
});
ipcMain.handle("connectivity:camera-frame", async (event, input: CameraRequest): Promise<CameraResult> => {
  assertTrustedSender(event.sender.id);
  try {
    const frame = await fetchMjpegFrame({ host: String(input?.host ?? ""), path: "/images/snapshot0.jpg", username: typeof input?.username === "string" ? input.username : undefined, password: typeof input?.password === "string" ? input.password : undefined });
    return { status: "ok", dataUrl: `data:${frame.contentType};base64,${Buffer.from(frame.bytes).toString("base64")}` };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Camera failed." }; }
});

ipcMain.handle("connectivity:read-only-diagnostics", async (event, target: DiagnosticTarget, acknowledgement: SafetyAcknowledgement): Promise<DiagnosticResult> => {
  assertTrustedSender(event.sender.id);
  if (!hasGateBApproval(acknowledgement)) throw new Error("Gate B is incomplete. Confirm all four safety checks at the machine.");
  if (target?.kind !== "tcp" && target?.kind !== "serial") throw new Error("Invalid diagnostic target.");
  const release = connectionCoordinator.acquire(target.kind);
  try {
    const transport = target.kind === "tcp"
      ? new LaserCamTcpTransport({ host: String(target.host ?? ""), port: Number(target.port), connectTimeoutMs: 3_000, idleTimeoutMs: 5_000 })
      : new DirectSerialTransport(serialAdapter, String(target.path ?? ""));
    const transcript = await runReadOnlyDiagnostics(transport, { statusLineEnding: target.kind === "tcp" });
    const responding = transcript.some((line) => line.direction === "rx" && (line.message?.type === "welcome" || line.message?.type === "status" || line.message?.type === "setting"));
    return { status: { camera: "offline", bridge: "disconnected", grbl: responding ? "responding" : "error", detail: responding ? "Read-only diagnostics completed and disconnected." : "No recognized GRBL response." }, transcript: transcript.map(({ direction, text }) => ({ direction, text })) };
  } finally { release(); }
});

ipcMain.handle("connectivity:export-diagnostics", async (event, request: DiagnosticExportRequest): Promise<ExportActionResult> => {
  assertTrustedSender(event.sender.id);
  if (!mainWindow || !request || typeof request !== "object") throw new Error("Invalid diagnostic export request.");
  const rawStatus = request.status && typeof request.status === "object" ? request.status : undefined;
  const status = {
    camera: rawStatus?.camera === "streaming" || rawStatus?.camera === "error" ? rawStatus.camera : "offline" as const,
    bridge: rawStatus?.bridge === "connected" || rawStatus?.bridge === "error" ? rawStatus.bridge : "disconnected" as const,
    grbl: rawStatus?.grbl === "responding" || rawStatus?.grbl === "error" ? rawStatus.grbl : "unknown" as const,
    detail: typeof rawStatus?.detail === "string" ? rawStatus.detail.slice(0, 1_000) : "No UI status supplied."
  };
  const transcript = Array.isArray(request.transcript) ? request.transcript.slice(-300).flatMap((line) => {
    if (!line || (line.direction !== "rx" && line.direction !== "tx") || typeof line.text !== "string") return [];
    return [{ direction: line.direction, text: line.text.slice(0, 4_096) }];
  }) : [];
  const generatedAt = Date.now();
  const date = new Date(generatedAt).toISOString().slice(0, 10);
  const selection = await dialog.showSaveDialog(mainWindow, { defaultPath: `ATOMburn-diagnostics-${date}.json`, filters: [{ name: "ATOMburn diagnostic package", extensions: ["json"] }] });
  if (selection.canceled || !selection.filePath) return { status: "cancelled" };
  try {
    const logText = await readFile(appLogPath(), "utf8").catch(() => "");
    const recovery = recoveryPolicy.snapshot();
    const text = serializeDiagnosticExport({
      generatedAt,
      app: { name: "ATOMburn", version: app.getVersion(), platform: process.platform },
      summary: {
        connection: `${status.bridge}/${status.grbl}`,
        session: recovery.state,
        job: machineController?.snapshot().job?.state,
        faults: recovery.records.map(({ fault, detail }) => `${fault}: ${detail ?? "no detail"}`)
      },
      lines: transcript,
      logs: logText.split(/\r?\n/).filter(Boolean),
      recovery
    });
    await writeFile(selection.filePath, `${text}\n`, "utf8");
    return { status: "ok", fileName: basename(selection.filePath) };
  } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Diagnostic export failed." }; }
});

ipcMain.handle("machine:connect", async (event, target: DiagnosticTarget, acknowledgement: MotionSafetyAcknowledgement) => {
  assertTrustedSender(event.sender.id);
  if (!hasMotionApproval(acknowledgement)) throw new Error("Motion Gate B is incomplete. Confirm all six checks at the machine.");
  if (target?.kind !== "tcp" && target?.kind !== "serial") throw new Error("Invalid machine target.");
  const requestedConnectionId=target.kind==="tcp"?`tcp:${target.host}:${target.port}`:`serial:${target.path}`;
  if(machineController){if(requestedConnectionId===machineConnectionId)return machineController.snapshot();throw new Error("A different machine session is already active.");}
  const release = connectionCoordinator.acquire(target.kind);
  const transport = target.kind === "tcp" ? new LaserCamTcpTransport({ host: String(target.host ?? ""), port: Number(target.port), connectTimeoutMs: 3_000 }) : new DirectSerialTransport(serialAdapter, String(target.path ?? ""));
  const controller = new MachineController(transport, target.kind === "tcp");
  log("info", "machine.connect", "Connecting machine session.", { transport: target.kind });
  try { const snapshot = await controller.connect(); machineController = controller;machineConnectionId=requestedConnectionId;firstMarkGuard=undefined;firstMarkTicket=undefined;firstMarkInputs=undefined;firstMarkFramed=false;clearSupervisedFill();clearSupervisedRaster();clearMaterialTest();clearCameraMark(); releaseMachineConnection = release;synchronizeRecoveryIfIdle(snapshot); log("info", "machine.connect", "Machine session connected.", { transport: target.kind, state: snapshot.state }); return snapshot; }
  catch (error) { const message=error instanceof Error?error.message:"Machine connection failed.";log("error", "machine.connect", message, { transport: target.kind });await controller.disconnect().catch(() => undefined); release(); throw error; }
});
ipcMain.handle("machine:action", async (event, action: MachineAction) => { assertTrustedSender(event.sender.id); if (!machineController) { const error = new Error("No machine session."); recordMachineFailure(error); throw error; } try { const snapshot=await machineController.execute(action);if(action.type==="abort"){recordRecoveryFault("connection-loss", "Motion was aborted; reconnect and re-home explicitly.");clearSupervisedFill();clearSupervisedRaster();clearMaterialTest();clearCameraMark();}else synchronizeRecoveryIfIdle(snapshot);return snapshot; } catch(error) { recordMachineFailure(error); throw error; } });
ipcMain.handle("machine:snapshot", (event) => { assertTrustedSender(event.sender.id); const snapshot=machineController?.snapshot() ?? { connected: false, state: "Unknown" as const, transcript: [] };if(machineController&&!snapshot.connected){recordMachineFailure(snapshot.fault ?? "Machine connection was lost.");}return snapshot; });
ipcMain.handle("machine:disconnect", async (event) => { assertTrustedSender(event.sender.id);await disconnectMachineSession(); });
ipcMain.handle("job:prepare-first-mark",async(event):Promise<FirstMarkSummary>=>{assertTrustedSender(event.sender.id);if(firstMarkPreparePromise)return firstMarkPreparePromise;if(!machineController)throw new Error("Connect the supervised machine session first.");if(!firstMarkFramed)throw new Error("Run and visually confirm the laserless target frame first.");const controller=machineController;firstMarkPreparePromise=(async()=>{const settings=await controller.readLaserSettings();const snapshot=controller.snapshot();const inputs:JobInputs={gcode:FIRST_MARK_CODE,profileId:"atomstack-x30-pro",connectionId:machineConnectionId,maxPower:settings.maxPower,laserMode:settings.laserMode,maxPowerPercent:20,machineState:snapshot.state==="Idle"?"Idle":"Unknown"};const guard=new JobGuard(),ticket=guard.prepare(inputs);firstMarkGuard=guard;firstMarkTicket=ticket;firstMarkInputs=inputs;return{hash:ticket.hash,totalLines:ticket.totalLines,maxPowerPercent:20,speedMmPerMin:600,start:[30,35],end:[40,35],maxPower:settings.maxPower,laserMode:true};})();try{return await firstMarkPreparePromise;}finally{firstMarkPreparePromise=undefined;}});
ipcMain.handle("job:frame-first-mark",async(event)=>{assertTrustedSender(event.sender.id);if(!machineController)throw new Error("Connect the supervised machine session first.");clearSupervisedFill();clearSupervisedRaster();firstMarkGuard=undefined;firstMarkTicket=undefined;firstMarkInputs=undefined;firstMarkFramed=false;const snapshot=await machineController.frameFirstMarkTarget();firstMarkFramed=true;return snapshot;});
ipcMain.handle("job:start-first-mark",async(event,approval:GateCApproval)=>{assertTrustedSender(event.sender.id);recoveryPolicy.requireFreshIdle();if(!machineController||!firstMarkGuard||!firstMarkTicket||!firstMarkInputs||!firstMarkFramed)throw new Error("A fresh calibration preflight and target frame are required.");const approved=approval?.testId==="H-LASER-02"&&approval.phrase==="H-LASER-02 STARTEN"&&approval.physicallyPresent&&approval.workAreaClear&&approval.emergencyStopReady&&approval.otherControllersClosed&&approval.focused&&approval.materialConfirmed&&approval.ventilationOn&&approval.airAssistOn&&approval.targetFrameConfirmed;if(!approved)throw new Error("Gate C is incomplete or the confirmation phrase is incorrect.");const settings=await machineController.readLaserSettings();const inputs={...firstMarkInputs,maxPower:settings.maxPower,laserMode:settings.laserMode,machineState:machineController.snapshot().state==="Idle"?"Idle" as const:"Unknown" as const};firstMarkGuard.start(firstMarkTicket,inputs);try{return await machineController.runApprovedFirstMark(FIRST_MARK_CODE);}catch(error){recordMachineFailure(error);throw error;}finally{firstMarkTicket=undefined;firstMarkInputs=undefined;firstMarkFramed=false;}});
ipcMain.handle("job:frame-camera-mark",async(event)=>{assertTrustedSender(event.sender.id);if(!machineController)throw new Error("Connect the supervised machine session first.");firstMarkGuard=undefined;firstMarkTicket=undefined;firstMarkInputs=undefined;firstMarkFramed=false;clearSupervisedFill();clearSupervisedRaster();clearMaterialTest();clearCameraMark();const snapshot=await machineController.frameCameraMarkTarget();cameraMarkFramed=true;return snapshot;});
ipcMain.handle("job:prepare-camera-mark",async(event,settings:CameraMarkSettings):Promise<CameraMarkSummary>=>{assertTrustedSender(event.sender.id);if(cameraMarkPreparePromise)return cameraMarkPreparePromise;if(!machineController)throw new Error("Connect the supervised machine session first.");if(!cameraMarkFramed)throw new Error("Run and visually confirm the full laserless camera-mark frame first.");const controller=machineController;cameraMarkPreparePromise=(async()=>{const profile=await controller.readSupervisedMachineProfile();if(profile.maxPower!==1000||!profile.laserMode||profile.widthMm!==400||profile.heightMm!==400)throw new Error("H-CAM-MARK-01 requires verified $30=1000, $32=1, $130=400 and $131=400.");const approvedSettings:ApprovedCameraMarkSettings={speedMmPerMin:Number(settings?.speedMmPerMin),powerPercent:Number(settings?.powerPercent),maxPower:profile.maxPower};const code=buildCameraMarkCode(approvedSettings);const inputs:JobInputs={gcode:code,profileId:"atomstack-x30-pro",connectionId:machineConnectionId,maxPower:profile.maxPower,laserMode:profile.laserMode,maxPowerPercent:approvedSettings.powerPercent,machineState:controller.snapshot().state==="Idle"?"Idle":"Unknown",workspaceWidth:profile.widthMm,workspaceHeight:profile.heightMm};const guard=new JobGuard(),ticket=guard.prepare(inputs);cameraMarkGuard=guard;cameraMarkTicket=ticket;cameraMarkInputs=inputs;cameraMarkSettings=approvedSettings;return{testId:"H-CAM-MARK-01",hash:ticket.hash,totalLines:ticket.totalLines,bounds:H_CAM_MARK_01_BOUNDS,markCount:5,powerPercent:approvedSettings.powerPercent,speedMmPerMin:approvedSettings.speedMmPerMin,maxPower:1000,laserMode:true};})();try{return await cameraMarkPreparePromise;}finally{cameraMarkPreparePromise=undefined;}});
ipcMain.handle("job:start-camera-mark",async(event,approval:CameraMarkApproval)=>{assertTrustedSender(event.sender.id);recoveryPolicy.requireFreshIdle();const controller=machineController,guard=cameraMarkGuard,ticket=cameraMarkTicket,previous=cameraMarkInputs,settings=cameraMarkSettings;if(!controller||!guard||!ticket||!previous||!settings||!cameraMarkFramed)throw new Error("A fresh H-CAM-MARK-01 preflight and laserless frame are required.");const approved=approval?.testId==="H-CAM-MARK-01"&&approval.supervisedReady===true&&approval.targetFrameConfirmed===true;if(!approved)throw new Error("Confirm supervision and the laserless frame before starting.");const profile=await controller.readSupervisedMachineProfile();const inputs={...previous,maxPower:profile.maxPower,laserMode:profile.laserMode,machineState:controller.snapshot().state==="Idle"?"Idle" as const:"Unknown" as const,workspaceWidth:profile.widthMm,workspaceHeight:profile.heightMm};guard.start(ticket,inputs);try{const snapshot=await controller.runApprovedCameraMarks(previous.gcode,settings,()=>guard.acknowledge());await clearCameraCalibration(cameraCalibrationPath());return snapshot;}catch(error){guard.fail(error instanceof Error?error.message:"Camera-mark job failed.");recordMachineFailure(error);throw error;}finally{clearCameraMark();}});
ipcMain.handle("job:home-supervised-fill",async(event)=>{assertTrustedSender(event.sender.id);if(!machineController)throw new Error("Connect the supervised machine session first.");firstMarkGuard=undefined;firstMarkTicket=undefined;firstMarkInputs=undefined;firstMarkFramed=false;clearSupervisedRaster();const preserveCheckedPreflight=Boolean(supervisedFillPrepared&&supervisedFillCheckPassed);if(!preserveCheckedPreflight)clearSupervisedFill();const snapshot=await machineController.execute({type:"home"});supervisedFillHomed=true;supervisedFillFramed=false;return snapshot;});
ipcMain.handle("job:prepare-supervised-fill",async(event,project:ProjectDocument):Promise<SupervisedFillSummary>=>{assertTrustedSender(event.sender.id);if(supervisedFillPreparePromise)return supervisedFillPreparePromise;if(!machineController||!supervisedFillHomed)throw new Error("Connect and home the machine from this dialog first.");const controller=machineController;supervisedFillPreparePromise=(async()=>{const profile=await controller.readSupervisedMachineProfile();const prepared=buildSupervisedFill(project,profile),snapshot=controller.snapshot();const inputs:JobInputs={gcode:prepared.code,profileId:"atomstack-x30-pro",connectionId:machineConnectionId,maxPower:profile.maxPower,laserMode:profile.laserMode,maxPowerPercent:15,machineState:snapshot.state==="Idle"?"Idle":"Unknown",workspaceWidth:profile.widthMm,workspaceHeight:profile.heightMm};const guard=new JobGuard(),ticket=guard.prepare(inputs);supervisedFillGuard=guard;supervisedFillTicket=ticket;supervisedFillInputs=inputs;supervisedFillPrepared=prepared;supervisedFillFramed=false;supervisedFillCheckPassed=false;const operation=prepared.project.operations.find(item=>item.enabled&&item.kind==="fill");if(!operation||operation.kind!=="fill")throw new Error("Prepared Fill operation disappeared.");return{testId:prepared.testId,hash:ticket.hash,totalLines:ticket.totalLines,bounds:prepared.result.bounds,estimatedSeconds:prepared.result.estimatedSeconds,powerPercent:15,speedMmPerMin:600,passes:operation.passes as 1|2,lineSpacingMm:operation.lineSpacingMm,maxPower:profile.maxPower,laserMode:profile.laserMode,workspaceWidth:profile.widthMm,workspaceHeight:profile.heightMm};})();try{return await supervisedFillPreparePromise;}finally{supervisedFillPreparePromise=undefined;}});
ipcMain.handle("job:check-supervised-fill",async(event)=>{assertTrustedSender(event.sender.id);if(!machineController||!supervisedFillPrepared||!supervisedFillHomed)throw new Error("Prepare and home the supervised Fill job first.");supervisedFillCheckPassed=false;supervisedFillHomed=false;supervisedFillFramed=false;const snapshot=await machineController.runApprovedGeneratedCheck(supervisedFillPrepared.code);supervisedFillCheckPassed=true;return snapshot;});
ipcMain.handle("job:frame-supervised-fill",async(event)=>{assertTrustedSender(event.sender.id);if(!machineController||!supervisedFillPrepared||!supervisedFillHomed||!supervisedFillCheckPassed)throw new Error("Complete the prepared GRBL Check-mode job before framing.");supervisedFillFramed=false;const snapshot=await machineController.frameApprovedJobBounds(supervisedFillPrepared.result.bounds);supervisedFillFramed=true;return snapshot;});
ipcMain.handle("job:start-supervised-fill",async(event,approval:SupervisedFillApproval)=>{assertTrustedSender(event.sender.id);recoveryPolicy.requireFreshIdle();const controller=machineController,prepared=supervisedFillPrepared,guard=supervisedFillGuard,ticket=supervisedFillTicket,previousInputs=supervisedFillInputs;if(!controller||!prepared||!guard||!ticket||!previousInputs||!supervisedFillCheckPassed||!supervisedFillHomed||!supervisedFillFramed){const missing=[!controller&&"connection",!prepared&&"prepared job",(!guard||!ticket||!previousInputs)&&"immutable approval ticket",!supervisedFillCheckPassed&&"Check-mode pass",!supervisedFillHomed&&"post-Check homing",!supervisedFillFramed&&"target frame"].filter((item):item is string=>Boolean(item));throw new Error(`A fresh supervised Fill gate is incomplete. Missing: ${missing.join(", ")}. Close and repeat the full preflight; no job was sent.`);}const approved=approval?.testId===prepared.testId&&approval.supervisedReady===true;if(!approved)throw new Error("Supervised Fill requires the matching test identity and the user's single readiness confirmation.");const profile=await controller.readSupervisedMachineProfile(),rebuilt=buildSupervisedFill(prepared.project,profile);if(rebuilt.testId!==prepared.testId)throw new Error("Supervised Fill test identity changed after approval.");const inputs:JobInputs={...previousInputs,gcode:rebuilt.code,maxPower:profile.maxPower,laserMode:profile.laserMode,machineState:controller.snapshot().state==="Idle"?"Idle":"Unknown",workspaceWidth:profile.widthMm,workspaceHeight:profile.heightMm};guard.start(ticket,inputs);try{return await controller.runApprovedGeneratedJob(rebuilt.code,()=>guard.acknowledge());}catch(error){guard.fail(error instanceof Error?error.message:"Supervised Fill failed.");recordMachineFailure(error);throw error;}finally{clearSupervisedFill(false);}});

ipcMain.handle("job:home-material-test",async(event)=>{assertTrustedSender(event.sender.id);if(!machineController)throw new Error("Connect the supervised machine session first.");firstMarkGuard=undefined;firstMarkTicket=undefined;firstMarkInputs=undefined;firstMarkFramed=false;clearSupervisedFill();clearSupervisedRaster();clearCameraMark();const preserveCheckedPreflight=Boolean(materialTestPrepared&&materialTestCheckPassed);if(!preserveCheckedPreflight)clearMaterialTest();const snapshot=await machineController.execute({type:"home"});materialTestHomed=true;materialTestFramed=false;return snapshot;});
ipcMain.handle("job:prepare-material-test",async(event,settings:MaterialTestSettings):Promise<MaterialTestSummary>=>{assertTrustedSender(event.sender.id);if(materialTestPreparePromise)return materialTestPreparePromise;if(!machineController||!materialTestHomed)throw new Error("Connect and home the machine from this dialog first.");const controller=machineController;materialTestPreparePromise=(async()=>{const profile=await controller.readSupervisedMachineProfile();const prepared=buildMaterialTest(settings,profile),snapshot=controller.snapshot();const inputs:JobInputs={gcode:prepared.code,profileId:"atomstack-x30-pro",connectionId:machineConnectionId,maxPower:profile.maxPower,laserMode:profile.laserMode,maxPowerPercent:Math.max(...prepared.plan.cells.map(cell=>cell.powerPercent)),machineState:snapshot.state==="Idle"?"Idle":"Unknown",workspaceWidth:profile.widthMm,workspaceHeight:profile.heightMm};const guard=new JobGuard(),ticket=guard.prepare(inputs);materialTestGuard=guard;materialTestTicket=ticket;materialTestInputs=inputs;materialTestPrepared=prepared;materialTestSettings=settings;materialTestFramed=false;materialTestCheckPassed=false;return{testId:"H-MATERIAL-01",hash:ticket.hash,totalLines:ticket.totalLines,bounds:prepared.result.bounds,estimatedSeconds:prepared.result.estimatedSeconds,material:prepared.plan.material,thicknessMm:prepared.plan.thicknessMm,cellCount:prepared.plan.cells.length,maxPower:profile.maxPower,laserMode:profile.laserMode,workspaceWidth:profile.widthMm,workspaceHeight:profile.heightMm};})();try{return await materialTestPreparePromise;}finally{materialTestPreparePromise=undefined;}});
ipcMain.handle("job:check-material-test",async(event)=>{assertTrustedSender(event.sender.id);if(!machineController||!materialTestPrepared||!materialTestHomed)throw new Error("Prepare and home the Material Test first.");materialTestCheckPassed=false;materialTestHomed=false;materialTestFramed=false;const snapshot=await machineController.runApprovedGeneratedCheck(materialTestPrepared.code);materialTestCheckPassed=true;return snapshot;});
ipcMain.handle("job:frame-material-test",async(event)=>{assertTrustedSender(event.sender.id);if(!machineController||!materialTestPrepared||!materialTestHomed||!materialTestCheckPassed)throw new Error("Complete the prepared Material Test Check-mode job before framing.");materialTestFramed=false;const snapshot=await machineController.frameApprovedJobBounds(materialTestPrepared.result.bounds);materialTestFramed=true;return snapshot;});
ipcMain.handle("job:start-material-test",async(event,approval:MaterialTestApproval)=>{assertTrustedSender(event.sender.id);recoveryPolicy.requireFreshIdle();const controller=machineController,prepared=materialTestPrepared,guard=materialTestGuard,ticket=materialTestTicket,previousInputs=materialTestInputs,settings=materialTestSettings;if(!controller||!prepared||!guard||!ticket||!previousInputs||!settings||!materialTestCheckPassed||!materialTestHomed||!materialTestFramed)throw new Error("A fresh Material Test Check, homing and target frame are required; no job was sent.");if(approval?.testId!=="H-MATERIAL-01"||approval.supervisedReady!==true||approval.targetFrameConfirmed!==true)throw new Error("H-MATERIAL-01 requires the matching test identity, supervision and confirmed target frame.");const profile=await controller.readSupervisedMachineProfile(),rebuilt=buildMaterialTest(settings,profile);if(rebuilt.plan.cells.length!==prepared.plan.cells.length||rebuilt.plan.material!==prepared.plan.material)throw new Error("Material Test settings changed after approval.");const inputs:JobInputs={...previousInputs,gcode:rebuilt.code,maxPower:profile.maxPower,laserMode:profile.laserMode,machineState:controller.snapshot().state==="Idle"?"Idle":"Unknown",workspaceWidth:profile.widthMm,workspaceHeight:profile.heightMm};guard.start(ticket,inputs);try{return await controller.runApprovedGeneratedJob(rebuilt.code,()=>guard.acknowledge());}catch(error){guard.fail(error instanceof Error?error.message:"Material Test failed.");recordMachineFailure(error);throw error;}finally{clearMaterialTest(false);}});

ipcMain.handle("job:home-supervised-raster",async(event)=>{assertTrustedSender(event.sender.id);if(!machineController)throw new Error("Connect the supervised machine session first.");firstMarkGuard=undefined;firstMarkTicket=undefined;firstMarkInputs=undefined;firstMarkFramed=false;clearSupervisedFill();const preserveCheckedPreflight=Boolean(supervisedRasterPrepared&&supervisedRasterCheckPassed);if(!preserveCheckedPreflight)clearSupervisedRaster();const snapshot=await machineController.execute({type:"home"});supervisedRasterHomed=true;supervisedRasterFramed=false;return snapshot;});
ipcMain.handle("job:prepare-supervised-raster",async(event,project:ProjectDocument):Promise<SupervisedRasterSummary>=>{assertTrustedSender(event.sender.id);if(supervisedRasterPreparePromise)return supervisedRasterPreparePromise;if(!machineController||!supervisedRasterHomed)throw new Error("Connect and home the machine from this dialog first.");const controller=machineController;supervisedRasterPreparePromise=(async()=>{const profile=await controller.readSupervisedMachineProfile();const prepared=await buildSupervisedRaster(project,profile),snapshot=controller.snapshot();const inputs:JobInputs={gcode:prepared.code,profileId:"atomstack-x30-pro",connectionId:machineConnectionId,maxPower:profile.maxPower,laserMode:profile.laserMode,maxPowerPercent:15,machineState:snapshot.state==="Idle"?"Idle":"Unknown",workspaceWidth:profile.widthMm,workspaceHeight:profile.heightMm};const guard=new JobGuard(),ticket=guard.prepare(inputs);supervisedRasterGuard=guard;supervisedRasterTicket=ticket;supervisedRasterInputs=inputs;supervisedRasterPrepared=prepared;supervisedRasterFramed=false;supervisedRasterCheckPassed=false;return{testId:"H-RASTER-BW-01",hash:ticket.hash,totalLines:ticket.totalLines,bounds:prepared.result.bounds,estimatedSeconds:prepared.result.estimatedSeconds,powerPercent:15,speedMmPerMin:600,passes:1,intervalMm:0.5,rasterMode:"threshold",maxPower:profile.maxPower,laserMode:profile.laserMode,workspaceWidth:profile.widthMm,workspaceHeight:profile.heightMm};})();try{return await supervisedRasterPreparePromise;}finally{supervisedRasterPreparePromise=undefined;}});
ipcMain.handle("job:check-supervised-raster",async(event)=>{assertTrustedSender(event.sender.id);if(!machineController||!supervisedRasterPrepared||!supervisedRasterHomed)throw new Error("Prepare and home H-RASTER-BW-01 first.");supervisedRasterCheckPassed=false;supervisedRasterHomed=false;supervisedRasterFramed=false;const snapshot=await machineController.runApprovedGeneratedCheck(supervisedRasterPrepared.code);supervisedRasterCheckPassed=true;return snapshot;});
ipcMain.handle("job:frame-supervised-raster",async(event)=>{assertTrustedSender(event.sender.id);if(!machineController||!supervisedRasterPrepared||!supervisedRasterHomed||!supervisedRasterCheckPassed)throw new Error("Complete the prepared Raster Check-mode job before framing.");supervisedRasterFramed=false;const snapshot=await machineController.frameApprovedJobBounds(supervisedRasterPrepared.result.bounds);supervisedRasterFramed=true;return snapshot;});
ipcMain.handle("job:start-supervised-raster",async(event,approval:SupervisedRasterApproval)=>{assertTrustedSender(event.sender.id);recoveryPolicy.requireFreshIdle();const controller=machineController,prepared=supervisedRasterPrepared,guard=supervisedRasterGuard,ticket=supervisedRasterTicket,previousInputs=supervisedRasterInputs;if(!controller||!prepared||!guard||!ticket||!previousInputs||!supervisedRasterCheckPassed||!supervisedRasterHomed||!supervisedRasterFramed)throw new Error("A fresh H-RASTER-BW-01 Check, homing and target frame are required.");if(approval?.testId!=="H-RASTER-BW-01"||approval.supervisedReady!==true)throw new Error("H-RASTER-BW-01 requires the matching test identity and one supervised start.");const profile=await controller.readSupervisedMachineProfile(),rebuilt=await buildSupervisedRaster(prepared.project,profile);const inputs:JobInputs={...previousInputs,gcode:rebuilt.code,maxPower:profile.maxPower,laserMode:profile.laserMode,machineState:controller.snapshot().state==="Idle"?"Idle":"Unknown",workspaceWidth:profile.widthMm,workspaceHeight:profile.heightMm};guard.start(ticket,inputs);try{return await controller.runApprovedGeneratedJob(rebuilt.code,()=>guard.acknowledge());}catch(error){guard.fail(error instanceof Error?error.message:"Supervised Raster failed.");recordMachineFailure(error);throw error;}finally{clearSupervisedRaster(false);}});

ipcMain.on("app:renderer-ready", (event) => {
  if (!mainWindow || event.sender.id !== mainWindow.webContents.id) return;
  if (readyTimeout) clearTimeout(readyTimeout);
  mainWindow.show();
  if (isSmokeTest) {
    console.log("ATOMburn smoke ready");
    setTimeout(() => app.quit(), 100);
  }
});

app.whenReady().then(() => {
  powerMonitor.on("suspend", () => interruptMachineSession("sleep-wake", "System is suspending; reconnect explicitly after wake."));
  powerMonitor.on("resume", () => interruptMachineSession("sleep-wake", "System resumed; machine state must be synchronized again."));
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit",event=>{
  if(quitAfterDisconnect)return;
  event.preventDefault();
  void disconnectMachineSession().finally(()=>{quitAfterDisconnect=true;app.quit();});
});
