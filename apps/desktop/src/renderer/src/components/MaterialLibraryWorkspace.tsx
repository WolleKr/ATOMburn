import { useMemo, useState } from "react";
import { normalizeMaterialLibrary, parseStoredMaterialLibrary, type MaterialLibrary, type MaterialPreset } from "../../../domain/material-library";
import type { EditorCommand, EditorHistory } from "../../../editor/editor-state";
import { getBridge } from "../platform";

function storedLibrary():MaterialLibrary|undefined{
  try{return parseStoredMaterialLibrary(localStorage.getItem("atomburn-material-library")??"");}catch{return undefined;}
}

function rememberLibrary(library:MaterialLibrary):void{
  try{localStorage.setItem("atomburn-material-library",JSON.stringify(library));}catch{/* The native file remains the source of truth if browser storage is unavailable. */}
}

export function MaterialLibraryWorkspace({editor,onCommand,initialLibrary}:{editor:EditorHistory|null;onCommand:(command:EditorCommand)=>void;initialLibrary?:MaterialLibrary}){
  const[library,setLibrary]=useState<MaterialLibrary|undefined>(()=>initialLibrary??storedLibrary());
  const[selected,setSelected]=useState<MaterialPreset>();
  const[message,setMessage]=useState("Open a LightBurn .clb or ATOMburn library.");
  const[busy,setBusy]=useState(false);
  const project=editor?.present.project;
  const selectedObject=project?.objects.find(object=>editor?.present.selectedIds.includes(object.id));
  const targetLayer=project?.layers.find(layer=>layer.id===selectedObject?.layerId)??project?.layers.find(layer=>layer.visible&&!layer.locked);
  const groups=useMemo(()=>{const map=new Map<string,MaterialPreset[]>();for(const preset of library?.presets??[])map.set(preset.material,[...(map.get(preset.material)??[]),preset]);return [...map];},[library]);
  const open=async()=>{
    if(busy)return;
    setBusy(true);setMessage("Opening material library…");
    try{
      const result=await getBridge().openMaterialLibrary();
      if(result.status==="ok"){const next=normalizeMaterialLibrary(result.library);setLibrary(next);setSelected(undefined);rememberLibrary(next);setMessage(`${next.presets.length} presets opened from ${result.fileName}.`);}
      else if(result.status==="error")setMessage(result.message);
      else setMessage("Library open cancelled.");
    }catch(error){setMessage(error instanceof Error?error.message:"Material library open failed.");}finally{setBusy(false);}
  };
  const save=async()=>{
    if(!library||busy)return;
    setBusy(true);setMessage("Saving native ATOMburn library…");
    try{
      const result=await getBridge().saveMaterialLibrary(normalizeMaterialLibrary(library),false);
      if(result.status==="ok"){const next=normalizeMaterialLibrary(result.library);setLibrary(next);rememberLibrary(next);setMessage(`Saved ${result.fileName}.`);}
      else if(result.status==="error")setMessage(result.message);
      else setMessage("Library save cancelled.");
    }catch(error){setMessage(error instanceof Error?error.message:"Material library save failed.");}finally{setBusy(false);}
  };
  const assign=()=>{if(!selected||!targetLayer)return;onCommand({type:"apply-material-preset",layerId:targetLayer.id,preset:selected});setMessage(`Assigned ${selected.material} to ${targetLayer.name}.`);};
  return <section className="material-library" aria-label="Material library">
    <header>
      <div><strong>{library?.name??"ATOMSTACK X30 Pro"}</strong><small>{message}</small></div>
      <div className="material-library__actions"><button type="button" title="Import a LightBurn .clb or open an ATOMburn library" disabled={busy} onClick={()=>void open()}>Open library</button><button type="button" title="Save as versioned .atomburn-materials JSON" disabled={!library||busy} onClick={()=>void save()}>Save native</button></div>
    </header>
    {library?<div className="material-library__meta"><span>{groups.length} materials</span><span>{library.presets.length} presets</span><span>{library.speedUnit??"mm/min"}</span></div>:null}
    <div className="material-library__body">
      <nav aria-label="Materials">{groups.length?groups.map(([material,presets])=><details key={material}><summary>{material}<small>{presets.length}</small></summary>{presets.map(preset=><button type="button" key={preset.id} aria-pressed={selected?.id===preset.id} onClick={()=>setSelected(preset)}>{preset.thicknessMm!==null&&preset.thicknessMm>0?`${preset.thicknessMm} mm · `:""}{preset.description||preset.kind}</button>)}</details>):<p>No library loaded.</p>}</nav>
      <article>{selected?<><h3>{selected.material}</h3><p>{selected.thicknessMm===null?"No thickness":`${selected.thicknessMm||"—"} mm`} · {selected.description||selected.kind}</p><dl><div><dt>Mode</dt><dd>{selected.kind}</dd></div><div><dt>Speed</dt><dd>{selected.speedMmPerMin} mm/min</dd></div><div><dt>Power</dt><dd>{selected.powerPercent}%</dd></div><div><dt>Passes</dt><dd>{selected.passes}</dd></div>{selected.lineSpacingMm!==undefined?<div><dt>Line spacing</dt><dd>{selected.lineSpacingMm} mm</dd></div>:null}</dl><button type="button" disabled={!targetLayer} onClick={assign}>Assign to {targetLayer?.name??"layer"}</button></>:<p>Select a material preset.</p>}</article>
    </div>
  </section>;
}
