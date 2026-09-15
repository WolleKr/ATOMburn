import { Component, lazy, Suspense, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { createEditorHistory, reduceEditor, selectionCenter, type EditorCommand, type EditorHistory } from "../../editor/editor-state";
import type { AppInfo } from "../../shared/contracts";
import type { ImportedDocument } from "../../domain/import";
import { createProject, type ProjectDocument } from "../../domain/project";
import type { MachineAction, MachineSnapshot } from "../../machine/machine-controller";
import { AboutDialog } from "./components/AboutDialog";
import { ArrangeMenu } from "./components/ArrangeMenu";
import { Brand } from "./components/Brand";
import { CanvasStage } from "./components/CanvasStage";
import { Icon } from "./components/Icon";
import { Inspector, type InspectorTab } from "./components/Inspector";
import { ImportReportDialog } from "./components/ImportReportDialog";
import { ErrorDialog } from "./components/ErrorDialog";
import { MaterialTestDialog } from "./components/MaterialTestDialog";
import { Splash } from "./components/Splash";
import { ToolRail, type DrawingTool } from "./components/ToolRail";
import { getBridge } from "./platform";
import { createErrorReport, type AppErrorReport } from "./error-report";
import { getInitialLanguage, getTranslations, LANGUAGE_STORAGE_KEY, type Language } from "./i18n";

const CamPreviewDialog = lazy(() => import("./components/CamPreviewDialog").then(({ CamPreviewDialog }) => ({ default: CamPreviewDialog })));
const ConnectivityPanel = lazy(() => import("./components/ConnectivityPanel").then(({ ConnectivityPanel }) => ({ default: ConnectivityPanel })));
const MachinePanel = lazy(() => import("./components/MachinePanel").then(({ MachinePanel }) => ({ default: MachinePanel })));
const SupervisedFillDialog = lazy(() => import("./components/SupervisedFillDialog").then(({ SupervisedFillDialog }) => ({ default: SupervisedFillDialog })));
const CameraCalibrationPanel = lazy(() => import("./components/CameraCalibrationPanel").then(({ CameraCalibrationPanel }) => ({ default: CameraCalibrationPanel })));
const CameraMarkDialog = lazy(() => import("./components/CameraMarkDialog").then(({ CameraMarkDialog }) => ({ default: CameraMarkDialog })));

const defaultInfo: AppInfo = { name: "ATOMburn", version: "0.16.7", platform: "Windows", architecture: "unknown", sprint: 16 };
const disconnectedMachine:MachineSnapshot={connected:false,state:"Unknown",transcript:[]};
function loadSoftwareHome(){try{const stored=JSON.parse(localStorage.getItem("atomburn-software-home")??"") as {xMm?:unknown;yMm?:unknown};if(typeof stored.xMm==="number"&&typeof stored.yMm==="number"&&stored.xMm>=0&&stored.xMm<=400&&stored.yMm>=0&&stored.yMm<=400)return{xMm:stored.xMm,yMm:stored.yMm};}catch{/* use safe default */}return{xMm:0,yMm:0};}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("ATOMburn renderer failure", error, info); }
  render() {
    if (this.state.error) return <main className="fatal-error" role="alert"><Brand/><h1>ATOMburn could not start</h1><p>The workspace stayed disconnected. Restart the application and review the local diagnostics.</p><code>{this.state.error.message}</code></main>;
    return this.props.children;
  }
}

export function App({ initialSplash }: { initialSplash?: "show" | "skip" }) {
  const params = new URLSearchParams(window.location.search);
  const keepSplash = params.get("splash") === "1";
  const skipSplash = initialSplash === "skip" || params.get("skipSplash") === "1";
  const [splashVisible, setSplashVisible] = useState(!skipSplash);
  const [activeInspector, setActiveInspector] = useState<InspectorTab>("properties");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo>(defaultInfo);
  const [status, setStatus] = useState<string>();
  const [editor, setEditor] = useState<EditorHistory>(() => createEditorHistory(createProject()));
  const [connectivityOpen, setConnectivityOpen] = useState(false);
  const [machineOpen, setMachineOpen] = useState(false);
  const [importReport, setImportReport] = useState<ImportedDocument | null>(null);
  const [camOpen,setCamOpen]=useState(false);
  const [supervisedFillProject,setSupervisedFillProject]=useState<ProjectDocument|null>(null);
  const [cameraCalibrationOpen, setCameraCalibrationOpen] = useState(false);
  const [cameraMarkOpen, setCameraMarkOpen] = useState(false);
  const [materialTestOpen, setMaterialTestOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawingTool>("select");
  const [errorReport, setErrorReport] = useState<AppErrorReport>();
  const [machine, setMachine] = useState<MachineSnapshot>(disconnectedMachine);
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  const [softwareHome, setSoftwareHome] = useState(loadSoftwareHome);
  const t = getTranslations(language);
  const project = editor.present.project;
  const dispatchEditor = useCallback((command: EditorCommand) => setEditor((current) => current ? reduceEditor(current, command) : current), []);
  const reportError = useCallback((operation: string, error: unknown) => {
    setErrorReport(previous => createErrorReport(operation, error, previous));
    setStatus(`${operation} failed`);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* continue without persistence */ }
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    void getBridge().getAppInfo().then(setAppInfo);
    if (keepSplash || skipSplash) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setSplashVisible(false), reduceMotion ? 80 : 1_150);
    return () => window.clearTimeout(timer);
  }, [keepSplash, skipSplash]);

  useEffect(() => {
    const reportOffline = () => getBridge().reportNetworkChange?.(false);
    const reportOnline = () => getBridge().reportNetworkChange?.(true);
    window.addEventListener("offline", reportOffline);
    window.addEventListener("online", reportOnline);
    return () => {
      window.removeEventListener("offline", reportOffline);
      window.removeEventListener("online", reportOnline);
    };
  }, []);

  useEffect(()=>{let active=true;const poll=async()=>{try{const snapshot=await getBridge().getMachineSnapshot();if(active)setMachine(snapshot);}catch{if(active)setMachine(disconnectedMachine);}};void poll();const timer=window.setInterval(()=>void poll(),2_000);return()=>{active=false;window.clearInterval(timer);};},[]);
  useEffect(()=>{localStorage.setItem("atomburn-software-home",JSON.stringify(softwareHome));},[softwareHome]);
  useEffect(()=>{let active=true;void getBridge().getDeviceProfile().then(profile=>getBridge().getCameraFrame({host:profile.host})).then(result=>{if(active&&result.status==="ok")setActiveInspector("camera");}).catch(()=>undefined);return()=>{active=false;};},[]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editingText = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && !editingText) {
        if (key === "z") { event.preventDefault(); dispatchEditor({ type: event.shiftKey ? "redo" : "undo" }); }
        else if (key === "y") { event.preventDefault(); dispatchEditor({ type: "redo" }); }
        else if (key === "d") { event.preventDefault(); dispatchEditor({ type: "duplicate" }); }
        else if (key === "c") { event.preventDefault(); dispatchEditor({ type: "copy" }); }
        else if (key === "v") { event.preventDefault(); dispatchEditor({ type: "paste" }); }
      } else if (!editingText && (key === "delete" || key === "backspace")) {
        event.preventDefault();
        dispatchEditor({ type: "delete" });
      } else if (!editingText && ["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
        event.preventDefault();
        const step = event.altKey ? 0.1 : event.shiftKey ? 10 : 1;
        dispatchEditor({ type: "translate", dxMm: key === "arrowleft" ? -step : key === "arrowright" ? step : 0, dyMm: key === "arrowup" ? -step : key === "arrowdown" ? step : 0 });
      } else if (!editingText && key === "escape") {
        setActiveTool("select");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatchEditor]);

  const handleProjectAction = useCallback(async (action: "new" | "open") => {
    const bridge = getBridge();
    if (action === "new") {
      try { const created = await bridge.createProject();
      setEditor(createEditorHistory(created));
      setActiveInspector("properties");
      setStatus(t.newProjectNotSaved);
      return; } catch (error) { reportError("New project", error); return; }
    }
    try { const result = await bridge.openProject();
    if (result.status === "ok") {
      setEditor(createEditorHistory(result.project));
      setActiveInspector("properties");
      setStatus(result.recoveredFrom && result.recoveredFrom !== "primary" ? `Recovered ${result.fileName ?? "project"} from ${result.recoveredFrom}` : `Opened ${result.fileName ?? "project"}`);
    } else if (result.status === "error") reportError("Open project", new Error(result.message));
    } catch (error) { reportError("Open project", error); }
  }, [reportError, t.newProjectNotSaved]);

  const handleSave = useCallback(async (saveAs: boolean) => {
    if (!project) return;
    try { const result = await (saveAs ? getBridge().saveProjectAs(project) : getBridge().saveProject(project));
    if (result.status === "ok") {
      setEditor((current) => current ? { ...current, present: { ...current.present, project: result.project } } : createEditorHistory(result.project));
      setStatus(`Saved ${result.fileName ?? "project"}`);
    } else if (result.status === "error") reportError(saveAs ? "Save project as" : "Save project", new Error(result.message));
    } catch (error) { reportError(saveAs ? "Save project as" : "Save project", error); }
  }, [project, reportError]);

  const handleRename = useCallback((name: string) => {
    setEditor((current) => current ? reduceEditor(current, { type: "replace-project", project: { ...current.present.project, name } }) : current);
  }, []);
  const handleTool = useCallback((tool: DrawingTool) => {
    setActiveTool(tool);
    if (tool === "text") setActiveInspector("properties");
  }, []);
  const handleImport = useCallback(async () => {
    if (!editor) return;
    try { const result = await getBridge().importDocument();
    if (result.status === "ok") {
      dispatchEditor({ type: "import", imported: result.imported });
      setImportReport(result.imported);
      const { warnings, errors } = result.imported.diagnostics.reduce((counts, { severity }) => {
        if (severity === "warning") counts.warnings += 1;
        else if (severity === "error") counts.errors += 1;
        return counts;
      }, { warnings: 0, errors: 0 });
      setStatus(`Imported ${result.fileName} · ${result.imported.objects.length} objects · ${warnings} warnings · ${errors} errors`);
    } else if (result.status === "error") reportError("Import artwork", new Error(result.message));
    } catch (error) { reportError("Import artwork", error); }
  }, [dispatchEditor, editor, reportError]);
  const handleMachineAction=useCallback(async(action:MachineAction)=>{
    if(action.type==="home"&&!machine.connected){
      reportError("Machine home",new Error("Laser is not connected. Connect the laser before homing."));
      return;
    }
    try{const snapshot=await getBridge().machineAction(action);setMachine(snapshot);setStatus(`${action.type} completed safely`);}catch(error){reportError(`Machine ${action.type}`,error);}},[machine.connected,reportError]);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <Brand compact/>
        <nav aria-label={t.project}>
          <details className="nav-menu project-menu"><summary>{t.project}</summary><div>
            <button type="button" onClick={() => handleProjectAction("new")}><Icon name="document"/>{t.newProject}</button>
            <button type="button" onClick={() => handleProjectAction("open")}><Icon name="open"/>{t.openProject}</button>
            <button type="button" disabled={!project} onClick={() => handleSave(false)}><Icon name="document"/>{t.save}</button>
            <button type="button" disabled={!project} onClick={() => handleSave(true)}><Icon name="document"/>{t.saveAs}</button>
            <button type="button" disabled={!project} onClick={() => void handleImport()}><Icon name="open"/>{t.import}</button>
          </div></details>
          <button type="button" aria-label={t.undo} title={`${t.undo} (Ctrl+Z)`} disabled={!editor.past.length} onClick={() => dispatchEditor({ type: "undo" })}><Icon name="undo"/>{t.undo}</button>
          <button type="button" aria-label={t.redo} title={`${t.redo} (Ctrl+Y)`} disabled={!editor.future.length} onClick={() => dispatchEditor({ type: "redo" })}><Icon name="redo"/>{t.redo}</button>
          <button type="button" disabled={!project?.operations.some(operation=>operation.enabled&&operation.kind!=="image")} onClick={()=>setCamOpen(true)}>{t.previewExport}</button>
          <ArrangeMenu label={t.arrange} editor={editor} onCommand={dispatchEditor} canMoveLaser={Boolean(editor&&machine.connected&&machine.state==="Idle"&&selectionCenter(editor.present))} onMoveLaser={()=>{if(!editor)return;const center=selectionCenter(editor.present);if(center)void handleMachineAction({type:"move-to",x:center.x,y:center.y,feed:1000});}}/>
          <details className="nav-menu"><summary>{t.machine}</summary><div><button type="button" onClick={() => setConnectivityOpen(true)}>{t.device}</button><button type="button" onClick={() => setMachineOpen(true)}>{t.motion}</button></div></details>
          <details className="nav-menu"><summary>{t.camera}</summary><div><button type="button" onClick={() => setActiveInspector("camera")}>{t.workspaceCamera}</button><button type="button" onClick={() => setCameraCalibrationOpen(true)}>{t.calibration}</button></div></details>
          <details className="nav-menu"><summary>{t.laserTools}</summary><div><button type="button" onClick={() => setMaterialTestOpen(true)}>{t.materialTest}</button><button type="button" disabled>{t.intervalTest} · {t.planned}</button><button type="button" disabled>{t.focusTest} · {t.planned}</button></div></details>
          <details className="nav-menu settings-menu"><summary>{t.settings}</summary><div>
            <label className="language-menu-item"><span>{t.language}</span><select aria-label={t.language} value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="en">{t.english}</option><option value="de">{t.german}</option></select></label>
            <small>{t.languageSystem}</small>
          </div></details>
        </nav>
        <button className="about-button" type="button" onClick={() => setAboutOpen(true)}><Icon name="about"/>{t.about}</button>
      </header>
      <div className={`workspace workspace--inspector-${activeInspector}`}><ToolRail activeTool={activeTool} onTool={handleTool} onHome={()=>void handleMachineAction({type:"home"})}/><CanvasStage key={activeTool} editor={editor} activeTool={activeTool} machineHome={{connected:machine.connected,xMm:softwareHome.xMm,yMm:softwareHome.yMm}} onAction={handleProjectAction} onCommand={dispatchEditor} t={t}/><div className="inspector-stack"><Inspector active={activeInspector} editor={editor} onChange={setActiveInspector} onRename={handleRename} onCommand={dispatchEditor} machine={machine} machineHome={softwareHome} onSetMachineHome={setSoftwareHome} onOpenMachine={()=>setMachineOpen(true)} onMachineAction={action=>void handleMachineAction(action)} onOpenPreview={()=>project&&setCamOpen(true)} t={t}/></div></div>
      <footer className="status-bar"><span>{status ?? t.newProjectNotSaved}</span><span className="status-bar__version">ATOMburn {appInfo.version}</span></footer>
      {aboutOpen ? <AboutDialog info={appInfo} onClose={() => setAboutOpen(false)}/> : null}
      {errorReport ? <ErrorDialog report={errorReport} info={appInfo} onClose={() => setErrorReport(undefined)}/> : null}
      <Suspense fallback={<div role="status">Loading optional feature…</div>}>
        {connectivityOpen ? <ConnectivityPanel onClose={() => setConnectivityOpen(false)}/> : null}
        {machineOpen ? <MachinePanel onClose={() => setMachineOpen(false)}/> : null}
        {importReport ? <ImportReportDialog imported={importReport} onClose={() => setImportReport(null)}/> : null}
        {camOpen&&project?<CamPreviewDialog project={project} onClose={()=>setCamOpen(false)} onStatus={setStatus} onSupervise={()=>{setCamOpen(false);setSupervisedFillProject(project);}}/>:null}
        {supervisedFillProject?<SupervisedFillDialog project={supervisedFillProject} onClose={()=>setSupervisedFillProject(null)}/>:null}
        {cameraCalibrationOpen ? <CameraCalibrationPanel onClose={() => setCameraCalibrationOpen(false)} onOpenCameraMark={() => { setCameraCalibrationOpen(false); setCameraMarkOpen(true); }} /> : null}
        {cameraMarkOpen ? <CameraMarkDialog onClose={() => { setCameraMarkOpen(false); setCameraCalibrationOpen(true); }} /> : null}
        {materialTestOpen ? <MaterialTestDialog onClose={() => setMaterialTestOpen(false)} onCommand={dispatchEditor} /> : null}
      </Suspense>
      <Splash visible={splashVisible}/>
    </div>
  );
}
