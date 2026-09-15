import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { EditorCommand, EditorHistory } from "../../../editor/editor-state";
import type { ProjectDocument } from "../../../domain/project";
import type { MachineAction, MachineSnapshot } from "../../../machine/machine-controller";
import { CameraWorkspacePanel } from "./CameraWorkspacePanel";
import { MotionWorkspace } from "./MotionWorkspace";
import { LaserWorkspace } from "./LaserWorkspace";
import { MaterialLibraryWorkspace } from "./MaterialLibraryWorkspace";
import { getBridge } from "../platform";
import { DEFAULT_FONT_FAMILIES } from "../../../shared/font-families";
import type { Translator } from "../i18n";

const EMPTY_OBJECTS: readonly { layerId: string }[] = [];
const layerCountCache = new WeakMap<readonly { layerId: string }[], Map<string, number>>();
const objectLayerCache = new WeakMap<object, string>();
const LAYER_COLORS = ["#68c5e8", "#f45ac6", "#7ddc78", "#f4c45e", "#a68cff"];

export type InspectorTab = "properties" | "operations" | "motion" | "camera" | "laser" | "materials";
type Layer = ProjectDocument["layers"][number];
type Operation = ProjectDocument["operations"][number];
type LayerMode = "line" | "fill" | "image";

function layerColor(layer: Layer, index: number): string { return layer.color ?? LAYER_COLORS[index % LAYER_COLORS.length] ?? "#68c5e8"; }
function layerCode(layer: Layer, index: number): string { return (/([0-9]+)$/.exec(layer.id)?.[1] ?? String(index).padStart(2, "0")).slice(-2).padStart(2, "0"); }

function operationForLayer(project: ProjectDocument, layer: Layer): Operation | undefined {
  const objectIds = new Set(project.objects.filter((object) => object.layerId === layer.id).map(({ id }) => id));
  return project.operations.find((operation) => operation.id === `layer-${layer.id}`) ?? project.operations.find((operation) => operation.objectIds.some((id) => objectIds.has(id)));
}

function modeForLayer(project: ProjectDocument, layer: Layer, operation: Operation | undefined): LayerMode {
  if (operation?.kind) return operation.kind;
  return project.objects.some((object) => object.layerId === layer.id && object.type === "raster") ? "image" : "line";
}

function validNumber(raw: string, integer = false): number | undefined {
  const value = Number(raw.trim().replace(",", "."));
  return Number.isFinite(value) ? (integer ? Math.trunc(value) : value) : undefined;
}

function LayerProcessRow({ layer, index, count, operation, mode, onCommand, t }: { layer: Layer; index: number; count: number; operation?: Operation; mode: LayerMode; onCommand: (command: EditorCommand) => void; t: Translator }) {
  const color = layerColor(layer, index);
  const speed = operation?.speedMmPerMin ?? 1000;
  const power = operation?.powerPercent ?? 10;
  const passes = operation?.passes ?? 1;
  const [speedDraft, setSpeedDraft] = useState(String(speed));
  const [powerDraft, setPowerDraft] = useState(String(power));
  const [passesDraft, setPassesDraft] = useState(String(passes));

  const update = (next: { speed?: number; power?: number; passes?: number }) => onCommand({ type: "update-layer-process", layerId: layer.id, color, speedMmPerMin: next.speed ?? speed, powerPercent: next.power ?? power, passes: next.passes ?? passes, operationId: operation?.id, mode });
  const editNumber = (raw: string, setDraft: (value: string) => void, options: { integer?: boolean; min: number; max?: number }, field: "speed" | "power" | "passes") => {
    setDraft(raw);
    const value = validNumber(raw, options.integer);
    if (value === undefined || value < options.min || (options.max !== undefined && value > options.max)) return;
    update({ [field]: value });
  };
  const commitNumber = (raw: string, setDraft: (value: string) => void, fallback: number, options: { integer?: boolean; min: number; max?: number }, field: "speed" | "power" | "passes") => {
    const value = validNumber(raw, options.integer);
    if (value === undefined || value < options.min || (options.max !== undefined && value > options.max)) { setDraft(String(fallback)); return; }
    setDraft(String(value));
    update({ [field]: value });
  };
  const passesKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const next = Math.max(1, Math.min(100, passes + (event.key === "ArrowUp" ? 1 : -1)));
    setPassesDraft(String(next));
    update({ passes: next });
  };

  return <div className={`layer-table__row${layer.visible ? "" : " layer-table__row--hidden"}`} data-layer-id={layer.id}>
    <div className="layer-table__identity" title={layer.name}><span className="layer-table__cut-code">C{layerCode(layer, index)}</span><label className="layer-table__color" title={`${layer.name} color`}><input aria-label={`${layer.name} color`} type="color" value={color} onChange={(event) => onCommand({ type: "set-layer-color", layerId: layer.id, color: event.target.value })}/><span style={{ backgroundColor: color }}>{layerCode(layer, index)}</span></label><span className="layer-table__name">{layer.name}</span><small>{count}</small></div>
    <div className="layer-table__mode"><select aria-label={`${layer.name} Modus`} value={mode} onChange={(event) => onCommand({ type: "set-layer-mode", layerId: layer.id, mode: event.target.value as LayerMode })}><option value="line">Linie</option><option value="fill">Füllung</option><option value="image">Raster</option></select></div>
    <div className="layer-table__settings"><label><span>{t.speed}</span><input aria-label={`${layer.name} ${t.speed}`} type="text" inputMode="decimal" value={speedDraft} onChange={(event) => editNumber(event.target.value, setSpeedDraft, { min: 1 }, "speed")} onBlur={() => commitNumber(speedDraft, setSpeedDraft, speed, { min: 1 }, "speed")} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}/></label><label><span>{t.power}</span><input aria-label={`${layer.name} ${t.power}`} type="text" inputMode="decimal" value={powerDraft} onChange={(event) => editNumber(event.target.value, setPowerDraft, { min: 0, max: 100 }, "power")} onBlur={() => commitNumber(powerDraft, setPowerDraft, power, { min: 0, max: 100 }, "power")} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}/></label></div>
    <div className="layer-table__passes"><label><span>{t.passes}</span><input aria-label={`${layer.name} ${t.passes}`} type="text" inputMode="numeric" value={passesDraft} onChange={(event) => editNumber(event.target.value, setPassesDraft, { integer: true, min: 1, max: 100 }, "passes")} onBlur={() => commitNumber(passesDraft, setPassesDraft, passes, { integer: true, min: 1, max: 100 }, "passes")} onKeyDown={passesKey}/></label><button type="button" aria-label={`${layer.name} ${t.increasePasses}`} title={t.increasePasses} onClick={() => { const next = Math.min(100, passes + 1); setPassesDraft(String(next)); update({ passes: next }); }}>+</button></div>
    <label className="layer-table__visibility" title={`${layer.name}: ${layer.visible ? t.show : t.hide}`}><input type="checkbox" aria-label={`${layer.name} ${t.show}`} checked={layer.visible} onChange={() => onCommand({ type: "toggle-layer", layerId: layer.id })}/><span aria-hidden="true"/></label>
  </div>;
}

function LayerOperationTable({ project, layerCounts, onCommand, t }: { project: ProjectDocument; layerCounts: Map<string, number>; onCommand: (command: EditorCommand) => void; t: Translator }) {
  return <section className="layer-table" aria-label={`${t.layers} / ${t.mode}`}><header className="layer-table__heading"><div><span className="layer-table__eyebrow">{t.processPalette}</span><h3>{t.layers}</h3></div><small>{project.layers.length} {t.layersCount}</small></header><div className="layer-table__scroll"><div className="layer-table__grid layer-table__header" role="row"><span># / {t.layer}</span><span>{t.mode}</span><span>{t.speedPower}</span><span>{t.passes}</span><span>{t.show}</span></div>{project.layers.map((layer, index) => { const operation = operationForLayer(project, layer); const rowKey = `${layer.id}-${operation?.id ?? "none"}-${operation?.speedMmPerMin ?? 1000}-${operation?.powerPercent ?? 10}-${operation?.passes ?? 1}`; return <LayerProcessRow key={rowKey} layer={layer} index={index} count={layerCounts.get(layer.id) ?? 0} operation={operation} mode={modeForLayer(project, layer, operation)} onCommand={onCommand} t={t}/>; })}</div>{project.operations.some((operation) => operation.kind === "fill") ? <section className="layer-table__advanced" aria-label={t.fillSettings}>{project.operations.filter((operation) => operation.kind === "fill").map((operation) => operation.kind === "fill" ? <label key={operation.id}>{t.lineSpacing}<input type="number" min="0.01" step="0.01" value={operation.lineSpacingMm} onChange={(event) => onCommand({ type: "update-fill-operation", operationId: operation.id, speedMmPerMin: operation.speedMmPerMin, powerPercent: operation.powerPercent, passes: operation.passes, lineSpacingMm: Number(event.target.value), enabled: operation.enabled })}/></label> : null)}</section> : <span className="layer-table__empty">{t.noAdditionalOperations}</span>}<footer className="layer-table__actions"><button type="button" disabled={!project.objects.some((object) => object.type !== "raster")} onClick={() => onCommand({ type: "add-line-operation" })}>{t.addLineOperation}</button><button type="button" disabled={!project.objects.some((object) => object.type === "rectangle" || object.type === "ellipse" || object.type === "text" || (object.type === "path" && object.closed))} onClick={() => onCommand({ type: "add-fill-operation" })}>{t.addFillOperation}</button></footer></section>;
}

export function Inspector({ active, editor, onChange, onRename, onCommand, machine, machineHome, onSetMachineHome, onOpenMachine, onMachineAction, onOpenPreview, t }: { active: InspectorTab; editor: EditorHistory | null; onChange: (tab: InspectorTab) => void; onRename: (name: string) => void; onCommand: (command: EditorCommand) => void; machine?: MachineSnapshot; machineHome?: {xMm:number;yMm:number}; onSetMachineHome?: (home:{xMm:number;yMm:number})=>void; onOpenMachine?:()=>void; onMachineAction?:(action:MachineAction)=>void;onOpenPreview?:()=>void; t: Translator }) {
  const project = editor?.present.project ?? null;
  const selected = editor?.present.selectedIds ?? [];
  const selectedObject = project?.objects.find((object) => selected.length === 1 && object.id === selected[0]);
  const selectedText = selectedObject?.type === "text" ? selectedObject : undefined;
  const selectedRectangle = selectedObject?.type === "rectangle" ? selectedObject : undefined;
  const [fontFamilies, setFontFamilies] = useState<string[]>(() => [...DEFAULT_FONT_FAMILIES]);
  const textInputRef = useRef<HTMLInputElement>(null);
  const selectedTextId = selectedText?.id;
  const selectedFontFamily = selectedText?.fontFamily;
  useEffect(() => { if (active === "properties" && selectedTextId) { textInputRef.current?.focus(); textInputRef.current?.select(); } }, [active, selectedTextId]);
  useEffect(() => { let mounted = true; void getBridge().listSystemFonts().then((fonts) => { if (mounted && fonts.length) setFontFamilies(fonts); }).catch(() => undefined); return () => { mounted = false; }; }, []);
  const availableFontFamilies = useMemo(() => selectedFontFamily && !fontFamilies.includes(selectedFontFamily) ? [selectedFontFamily, ...fontFamilies] : fontFamilies, [fontFamilies, selectedFontFamily]);
  const layerCounts = useMemo(() => { const objects = project?.objects ?? EMPTY_OBJECTS; const cached = layerCountCache.get(objects); if (cached) return cached; const counts = new Map<string, number>(); for (const object of objects) { const layerId = objectLayerCache.get(object) ?? object.layerId; objectLayerCache.set(object, layerId); counts.set(layerId, (counts.get(layerId) ?? 0) + 1); } layerCountCache.set(objects, counts); return counts; }, [project?.objects]);
  return <aside className="inspector" aria-label={t.inspector}><div className="inspector__tabs" role="tablist" aria-label={t.inspector}><button role="tab" type="button" aria-selected={active === "properties"} onClick={() => onChange("properties")}>{t.properties}</button><button role="tab" type="button" aria-label={t.layers} aria-selected={active === "operations"} onClick={() => onChange("operations")}>{t.layers}</button><button role="tab" type="button" aria-selected={active === "motion"} onClick={() => onChange("motion")}>{t.move}</button><button role="tab" type="button" aria-selected={active === "camera"} onClick={() => onChange("camera")}>{t.camera}</button></div><div className={project && (active === "properties" || active === "operations") ? "inspector__content" : new Set(["motion", "camera", "laser", "materials"]).has(active) ? "inspector__content inspector__workspace-content" : "inspector__empty"} role="tabpanel">
    {project && active === "properties" ? <><label>{t.projectName}<input value={project.name} maxLength={160} onChange={(event) => onRename(event.target.value)}/></label><dl><div><dt>{t.machine}</dt><dd>X30 Pro</dd></div><div><dt>{t.workArea}</dt><dd>400 × 400 mm</dd></div><div><dt>{t.objects}</dt><dd>{project.objects.length}</dd></div><div><dt>{t.selected}</dt><dd>{selected.length}</dd></div></dl>{selectedText ? <section className="text-properties"><h3>{t.text}</h3><label>{t.content}<input ref={textInputRef} aria-label={t.content} value={selectedText.text} onChange={(event) => onCommand({ type: "update-text", objectId: selectedText.id, text: event.target.value, fontFamily: selectedText.fontFamily, fontSizeMm: selectedText.fontSizeMm, alignment: selectedText.alignment, curveRadiusMm: selectedText.curveRadiusMm })}/></label><small>{t.replacePlaceholder}</small><label>{t.font}<select aria-label={t.font} value={selectedText.fontFamily} onChange={(event) => onCommand({ type: "update-text", objectId: selectedText.id, text: selectedText.text, fontFamily: event.target.value, fontSizeMm: selectedText.fontSizeMm, alignment: selectedText.alignment, curveRadiusMm: selectedText.curveRadiusMm })}>{availableFontFamilies.map((font) => <option key={font} value={font}>{font}</option>)}</select></label><small>{t.installedFonts}</small><label>{t.sizeMm}<input type="number" min="0.1" step="0.1" value={selectedText.fontSizeMm} onChange={(event) => onCommand({ type: "update-text", objectId: selectedText.id, text: selectedText.text, fontFamily: selectedText.fontFamily, fontSizeMm: Number(event.target.value), alignment: selectedText.alignment, curveRadiusMm: selectedText.curveRadiusMm })}/></label><label>{t.alignment}<select value={selectedText.alignment} onChange={(event) => onCommand({ type: "update-text", objectId: selectedText.id, text: selectedText.text, fontFamily: selectedText.fontFamily, fontSizeMm: selectedText.fontSizeMm, alignment: event.target.value as "left" | "center" | "right", curveRadiusMm: selectedText.curveRadiusMm })}><option value="left">{t.left}</option><option value="center">{t.center}</option><option value="right">{t.right}</option></select></label><label>{t.curveRadius}<input aria-label={t.curveRadius} type="number" min="0" step="0.1" value={selectedText.curveRadiusMm ?? 0} onChange={(event) => onCommand({ type: "curve-text", objectId: selectedText.id, radiusMm: Number(event.target.value) })}/></label><small>{t.straightText}</small></section> : null}{selectedRectangle ? <section className="rectangle-properties"><h3>{t.rectangle}</h3><label>{t.cornerRadius}<input aria-label={t.cornerRadius} type="number" min="0" max={Math.min(selectedRectangle.widthMm, selectedRectangle.heightMm) / 2} step="0.1" value={selectedRectangle.cornerRadiusMm} onChange={(event) => onCommand({ type: "set-corner-radius", radiusMm: Number(event.target.value) })}/></label><small>{t.radiusClamped}</small></section> : null}<section className="layer-list" aria-label={t.layers}><h3>{t.layers}</h3>{project.layers.map((layer, index) => { const color = layerColor(layer, index); return <button type="button" key={layer.id} aria-label={`${layer.name} ${layerCounts.get(layer.id) ?? 0}`} aria-pressed={layer.visible} onClick={() => onCommand({ type: "toggle-layer", layerId: layer.id })}><span className={layer.visible ? "layer-dot layer-dot--visible" : "layer-dot"} style={{ borderColor: color, backgroundColor: layer.visible ? color : "transparent", boxShadow: layer.visible ? `0 0 5px ${color}99` : "none" }}/><span>{layer.name}</span><small>{layerCounts.get(layer.id) ?? 0}</small></button>; })}</section></> : project && active === "operations" ? <LayerOperationTable project={project} layerCounts={layerCounts} onCommand={onCommand} t={t}/> : active === "motion" ? <MotionWorkspace machine={machine} machineHome={machineHome} onSetMachineHome={onSetMachineHome} onOpenMachine={onOpenMachine} onMachineAction={onMachineAction}/> : active === "camera" ? <CameraWorkspacePanel machine={machine}/> : active === "laser" ? <LaserWorkspace machine={machine} project={project} machineHome={machineHome} onSetMachineHome={onSetMachineHome} onMachineAction={onMachineAction} onOpenMachine={onOpenMachine} onOpenPreview={onOpenPreview}/> : active === "materials" ? <MaterialLibraryWorkspace editor={editor} onCommand={onCommand}/> : <span>{active === "properties" ? t.noProjectOpen : t.noLayers}</span>}
  </div><div className="inspector__dock-tabs" role="tablist" aria-label={t.laserTools}><button role="tab" aria-selected={active === "laser"} onClick={() => onChange("laser")}>{t.laserTools}</button><button role="tab" aria-selected={active === "materials"} onClick={() => onChange("materials")}>{t.materialLibrary}</button></div></aside>;
}
