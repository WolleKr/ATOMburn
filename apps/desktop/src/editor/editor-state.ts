import { applyTransform, rasterTransform, type Transform } from "../domain/project-geometry.js";
import type { ProjectDocument, ProjectObject } from "../domain/project.js";
import type { ImportedDocument } from "../domain/import.js";
import type { MaterialPreset } from "../domain/material-library.js";
import { applyCutShapes, validateCutShapes } from "./cut-shapes.js";

export interface EditorSnapshot { project: ProjectDocument; selectedIds: string[]; selectionOrder?: string[]; activeObjectId?: string; lastSelectedObjectId?: string; }
export interface EditorHistory { past: EditorSnapshot[]; present: EditorSnapshot; future: EditorSnapshot[]; clipboard: ProjectObject[]; }
export type EditorCommand =
  | { type: "select"; id: string; additive?: boolean }
  | { type: "select-many"; ids: string[]; additive?: boolean }
  | { type: "clear-selection" }
  | { type: "translate"; dxMm: number; dyMm: number }
  | { type: "scale"; scaleX: number; scaleY: number }
  | { type: "rotate"; degrees: number }
  | { type: "mirror"; axis: "x" | "y" }
  | { type: "align"; alignment: "left" | "center-x" | "right" | "top" | "center-y" | "bottom" }
  | { type: "distribute"; axis: "x" | "y" }
  | { type: "reorder"; position: "front" | "back" }
  | { type: "group" | "ungroup" | "auto-group" }
  | { type: "set-object-locked"; locked: boolean }
  | { type: "select-layer" }
  | { type: "move-selection"; target: "origin" | "bed-center" }
  | { type: "outline" }
  | { type: "break-apart" }
  | { type: "array-along-path"; copies: number }
  | { type: "duplicate" }
  | { type: "add-rectangle"; xMm?: number; yMm?: number; widthMm?: number; heightMm?: number; cornerRadiusMm?: number }
  | { type: "set-corner-radius"; radiusMm: number }
  | { type: "add-ellipse" | "add-circle"; xMm?: number; yMm?: number; radiusXMm?: number; radiusYMm?: number }
  | { type: "add-line" | "add-path"; xMm?: number; yMm?: number; lengthMm?: number; endXmm?:number; endYmm?:number }
  | { type: "add-cut-line"; startMm: [number, number]; endMm: [number, number] }
  | { type: "cut-path"; objectId: string; startIndex: number; endIndex: number }
  | { type: "trim-path"; objectId: string; segmentIndex: number }
  | { type: "cut-shapes" }
  | { type: "add-polygon"; pointsMm: Array<[number, number]> }
  | { type: "add-text"; xMm: number; yMm: number; text?: string; heightMm?: number }
  | { type: "add-raster"; name: string; widthMm: number; heightMm: number; mimeType: "image/png" | "image/jpeg" | "image/bmp"; dataBase64: string; xMm?: number; yMm?: number; dpi?: number }
  | { type: "update-text"; objectId: string; text: string; fontFamily: string; fontSizeMm: number; alignment: "left" | "center" | "right"; curveRadiusMm?: number }
  | { type: "curve-text"; objectId?: string; radiusMm: number }
  | { type: "move-node"; objectId: string; nodeIndex: number; pointMm: [number, number] }
  | { type: "add-node"; objectId: string; segmentIndex: number }
  | { type: "delete-node"; objectId: string; nodeIndex: number }
  | { type: "array"; columns: number; rows: number; dxMm: number; dyMm: number; mode?: "rectangular" | "polar"; angleDeg?: number }
  | { type: "split-path"; objectId: string; segmentIndex?: number }
  | { type: "delete" }
  | { type: "copy" }
  | { type: "paste" }
  | { type: "import"; imported: ImportedDocument }
  | { type: "toggle-layer"; layerId: string }
  | { type: "set-layer-mode"; layerId: string; mode: "line" | "fill" | "image" }
  | { type: "set-layer-color"; layerId: string; color: string }
  | { type: "apply-material-preset"; layerId: string; preset: MaterialPreset }
  | { type: "update-layer-process"; layerId: string; color: string; speedMmPerMin: number; powerPercent: number; passes?: number; operationId?: string; mode?: "line" | "fill" | "image" }
  | { type: "add-line-operation" }
  | { type: "update-line-operation"; operationId: string; speedMmPerMin: number; powerPercent: number; passes: number; enabled: boolean }
  | { type: "add-fill-operation" }
  | { type: "update-fill-operation"; operationId: string; speedMmPerMin: number; powerPercent: number; passes: number; lineSpacingMm: number; enabled: boolean }
  | { type: "replace-project"; project: ProjectDocument }
  | { type: "undo" }
  | { type: "redo" };

const MAX_HISTORY = 100;

export function createEditorHistory(project: ProjectDocument): EditorHistory {
  return { past: [], present: { project, selectedIds: [], selectionOrder: [] }, future: [], clipboard: [] };
}

function withSelection(snapshot: EditorSnapshot, selectedIds: string[], order = selectedIds): EditorSnapshot {
  const normalized = [...new Set(order.filter((id) => selectedIds.includes(id)))];
  return { ...snapshot, selectedIds, selectionOrder: normalized, activeObjectId: normalized.at(-1), lastSelectedObjectId: normalized.at(-1) };
}

function multiply(left: Transform, right: Transform): Transform {
  const [a, b, c, d, e, f] = left;
  const [g, h, i, j, k, l] = right;
  return [a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j, a * k + c * l + e, b * k + d * l + f];
}

function transformSelected(snapshot: EditorSnapshot, delta: Transform): EditorSnapshot {
  const selected = new Set(snapshot.selectedIds);
  const editableLayers=new Set(snapshot.project.layers.filter(layer=>layer.visible&&!layer.locked).map(layer=>layer.id));
  return { ...snapshot, project: { ...snapshot.project, objects: snapshot.project.objects.map((object) => selected.has(object.id)&&!object.locked&&editableLayers.has(object.layerId) ? { ...object, transform: multiply(delta, object.transform) } : object) } };
}

function objectPoints(object: ProjectObject): Array<[number, number]> {
  if (object.type === "path") return object.pointsMm.map((point) => applyTransform(object.transform, point));
  if (object.type === "ellipse") return Array.from({ length: 16 }, (_, index) => { const angle = index / 16 * Math.PI * 2; return applyTransform(object.transform, [Math.cos(angle) * object.radiusXMm, Math.sin(angle) * object.radiusYMm]); });
  if (object.type === "text") { const width=Math.max(object.fontSizeMm*.6,object.text.length*object.fontSizeMm*.62),offset=object.alignment==="center"?-width/2:object.alignment==="right"?-width:0;return [[offset,0],[offset+width,0],[offset+width,object.fontSizeMm],[offset,object.fontSizeMm]].map(point=>applyTransform(object.transform,point as [number,number])); }
  const width = object.widthMm, height = object.heightMm;
  return [[0,0],[width,0],[width,height],[0,height]].map((point) => applyTransform(object.transform, point as [number,number]));
}

export function selectionCenter(snapshot:EditorSnapshot):{x:number;y:number}|undefined{const selected=new Set(snapshot.selectedIds),points=snapshot.project.objects.filter(object=>selected.has(object.id)&&!object.locked).flatMap(objectPoints);if(!points.length)return undefined;return{x:(Math.min(...points.map(([x])=>x))+Math.max(...points.map(([x])=>x)))/2,y:(Math.min(...points.map(([,y])=>y))+Math.max(...points.map(([,y])=>y)))/2};}

function aroundSelection(snapshot: EditorSnapshot, delta: Transform): Transform {
  const selected = new Set(snapshot.selectedIds); const points = snapshot.project.objects.filter(({ id }) => selected.has(id)).flatMap(objectPoints);
  if (!points.length) return delta;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const [x,y] of points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  const centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;
  return multiply([1,0,0,1,centerX,centerY],multiply(delta,[1,0,0,1,-centerX,-centerY]));
}

function boundsOf(object: ProjectObject) {
  const points=objectPoints(object),xs=points.map(([x])=>x),ys=points.map(([,y])=>y);
  return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
}

function arrangeSelected(snapshot:EditorSnapshot,command:Extract<EditorCommand,{type:"align"}|{type:"distribute"}>):EditorSnapshot{
  const selected=new Set(snapshot.selectedIds),editable=new Set(snapshot.project.layers.filter(layer=>layer.visible&&!layer.locked).map(layer=>layer.id));
  const entries=snapshot.project.objects.filter(object=>selected.has(object.id)&&editable.has(object.layerId)).map(object=>({object,bounds:boundsOf(object)}));
  if(entries.length<2)return snapshot;
  const shifts=new Map<string,[number,number]>();
  if(command.type==="align"){
    const all=entries.flatMap(({bounds})=>[bounds]);
    const minX=Math.min(...all.map(b=>b.minX)),maxX=Math.max(...all.map(b=>b.maxX)),minY=Math.min(...all.map(b=>b.minY)),maxY=Math.max(...all.map(b=>b.maxY));
    for(const {object,bounds} of entries){let dx=0,dy=0;if(command.alignment==="left")dx=minX-bounds.minX;else if(command.alignment==="right")dx=maxX-bounds.maxX;else if(command.alignment==="center-x")dx=(minX+maxX-bounds.minX-bounds.maxX)/2;else if(command.alignment==="top")dy=minY-bounds.minY;else if(command.alignment==="bottom")dy=maxY-bounds.maxY;else dy=(minY+maxY-bounds.minY-bounds.maxY)/2;shifts.set(object.id,[dx,dy]);}
  }else{
    if(entries.length<3)return snapshot;const horizontal=command.axis==="x",sorted=[...entries].sort((a,b)=>(horizontal?(a.bounds.minX+a.bounds.maxX):(a.bounds.minY+a.bounds.maxY))-(horizontal?(b.bounds.minX+b.bounds.maxX):(b.bounds.minY+b.bounds.maxY))),first=sorted[0]!,last=sorted.at(-1)!,start=horizontal?(first.bounds.minX+first.bounds.maxX)/2:(first.bounds.minY+first.bounds.maxY)/2,end=horizontal?(last.bounds.minX+last.bounds.maxX)/2:(last.bounds.minY+last.bounds.maxY)/2,step=(end-start)/(sorted.length-1);sorted.forEach(({object,bounds},index)=>{const center=horizontal?(bounds.minX+bounds.maxX)/2:(bounds.minY+bounds.maxY)/2,delta=start+step*index-center;shifts.set(object.id,horizontal?[delta,0]:[0,delta]);});
  }
  return {...snapshot,project:{...snapshot.project,objects:snapshot.project.objects.map(object=>{const shift=shifts.get(object.id);return shift?{...object,transform:multiply([1,0,0,1,shift[0],shift[1]],object.transform)}:object;})}};
}

function autoGroupSelection(snapshot:EditorSnapshot):EditorSnapshot{
  const selected=new Set(snapshot.selectedIds),entries=snapshot.project.objects.filter(object=>selected.has(object.id)&&!object.locked).map(object=>({object,bounds:boundsOf(object)}));if(entries.length<2)return snapshot;const parent=entries.map((_,index)=>index),find=(index:number):number=>parent[index]===index?index:(parent[index]=find(parent[index]!));
  for(let a=0;a<entries.length;a++)for(let b=a+1;b<entries.length;b++){const left=entries[a]!,right=entries[b]!;if(left.object.layerId!==right.object.layerId)continue;const near=left.bounds.minX<=right.bounds.maxX+2&&left.bounds.maxX+2>=right.bounds.minX&&left.bounds.minY<=right.bounds.maxY+2&&left.bounds.maxY+2>=right.bounds.minY;if(near)parent[find(b)]=find(a);}
  const clusters=new Map<number,typeof entries>();entries.forEach((entry,index)=>clusters.set(find(index),[...(clusters.get(find(index))??[]),entry]));const used=new Set(snapshot.project.objects.flatMap(object=>object.groupId?[object.groupId]:[])),assigned=new Map<string,string>();let suffix=1;for(const cluster of clusters.values()){if(cluster.length<2)continue;let id=`group-${suffix}`;while(used.has(id))id=`group-${++suffix}`;used.add(id);suffix++;for(const {object} of cluster)assigned.set(object.id,id);}if(!assigned.size)return snapshot;return{...snapshot,project:{...snapshot.project,objects:snapshot.project.objects.map(object=>assigned.has(object.id)?{...object,groupId:assigned.get(object.id)}:object)}};
}

function commit(history: EditorHistory, present: EditorSnapshot): EditorHistory {
  if (present === history.present) return history;
  return { past: [...history.past.slice(-(MAX_HISTORY - 1)), history.present], present, future: [], clipboard: history.clipboard };
}

function nextObjectId(objects: ProjectObject[], prefix: string): string {
  const used = new Set(objects.map(({ id }) => id));
  let suffix = 1;
  let id = `${prefix}-${suffix}`;
  while (used.has(id)) id = `${prefix}-${++suffix}`;
  return id;
}

function activeLayerId(snapshot: EditorSnapshot): string {
  return snapshot.project.layers.find(({ visible, locked }) => visible && !locked)?.id
    ?? snapshot.project.layers.find(({ locked }) => !locked)?.id
    ?? snapshot.project.layers[0]?.id
    ?? "layer-1";
}

function addObject(snapshot: EditorSnapshot, object: ProjectObject): EditorSnapshot {
  return {
    project: { ...snapshot.project, objects: [...snapshot.project.objects, object] },
    selectedIds: [object.id]
  };
}

function addRectangle(snapshot: EditorSnapshot, xMm = 30, yMm = 30, widthMm = 40, heightMm = 25, cornerRadiusMm = 0): EditorSnapshot {
  if (![xMm, yMm, widthMm, heightMm, cornerRadiusMm].every(Number.isFinite) || widthMm <= 0 || heightMm <= 0 || cornerRadiusMm < 0) return snapshot;
  const id = nextObjectId(snapshot.project.objects, "rectangle");
  return addObject(snapshot, { id, name: cornerRadiusMm > 0 ? "Rounded rectangle" : "Rectangle", layerId: activeLayerId(snapshot), type: "rectangle", widthMm, heightMm, cornerRadiusMm: Math.min(cornerRadiusMm, widthMm / 2, heightMm / 2), transform: [1, 0, 0, 1, xMm, yMm] });
}

function setCornerRadius(snapshot: EditorSnapshot, radiusMm: number): EditorSnapshot {
  if (!Number.isFinite(radiusMm) || radiusMm < 0) return snapshot;
  const selected = new Set(snapshot.selectedIds);
  const layers = new Map(snapshot.project.layers.map(layer => [layer.id, layer]));
  let changed = false;
  const objects = snapshot.project.objects.map(object => {
    if (!selected.has(object.id) || object.type !== "rectangle" || object.locked || layers.get(object.layerId)?.locked) return object;
    const next = Math.min(radiusMm, object.widthMm / 2, object.heightMm / 2);
    if (next === object.cornerRadiusMm) return object;
    changed = true;
    return { ...object, cornerRadiusMm: next };
  });
  return changed ? { ...snapshot, project: { ...snapshot.project, objects } } : snapshot;
}

function addEllipse(snapshot: EditorSnapshot, xMm = 55, yMm = 55, radiusXMm = 20, radiusYMm = 15): EditorSnapshot {
  if (![xMm, yMm, radiusXMm, radiusYMm].every(Number.isFinite) || radiusXMm <= 0 || radiusYMm <= 0) return snapshot;
  const id = nextObjectId(snapshot.project.objects, "ellipse");
  return addObject(snapshot, { id, name: "Ellipse", layerId: activeLayerId(snapshot), type: "ellipse", radiusXMm, radiusYMm, transform: [1, 0, 0, 1, xMm, yMm] });
}

function addLine(snapshot: EditorSnapshot, xMm = 35, yMm = 35, lengthMm = 50, endXmm?:number, endYmm?:number): EditorSnapshot {
  if (![xMm, yMm, lengthMm,endXmm??0,endYmm??0].every(Number.isFinite) || lengthMm <= 0) return snapshot;
  const id = nextObjectId(snapshot.project.objects, "line");
  return addObject(snapshot, { id, name: "Line", layerId: activeLayerId(snapshot), type: "path", closed: false, pointsMm: [[0, 0], [endXmm===undefined?lengthMm:endXmm-xMm, endYmm===undefined?0:endYmm-yMm]], transform: [1, 0, 0, 1, xMm, yMm] });
}

function addCutLine(snapshot: EditorSnapshot, startMm: [number, number], endMm: [number, number]): EditorSnapshot {
  if (![...startMm, ...endMm].every(Number.isFinite) || Math.hypot(endMm[0] - startMm[0], endMm[1] - startMm[1]) < 0.01) return snapshot;
  const id = nextObjectId(snapshot.project.objects, "cut-line");
  return addObject(snapshot, { id, name: "Cut line", layerId: activeLayerId(snapshot), type: "path", closed: false, pointsMm: [[0, 0], [endMm[0] - startMm[0], endMm[1] - startMm[1]]], transform: [1, 0, 0, 1, startMm[0], startMm[1]] });
}

function addPolygon(snapshot: EditorSnapshot, pointsMm: Array<[number, number]>): EditorSnapshot {
  if (pointsMm.length < 3 || pointsMm.some((point) => point.length !== 2 || !point.every(Number.isFinite))) return snapshot;
  const id = nextObjectId(snapshot.project.objects, "polygon");
  return addObject(snapshot, { id, name: "Polygon", layerId: activeLayerId(snapshot), type: "path", closed: true, pointsMm: pointsMm.map(([x,y])=>[x,y]), transform: [1,0,0,1,0,0] });
}

function addTextPath(snapshot: EditorSnapshot, xMm: number, yMm: number, text = "Text", heightMm = 10): EditorSnapshot {
  if (![xMm,yMm,heightMm].every(Number.isFinite) || heightMm <= 0 || !text.trim()) return snapshot;
  const id = nextObjectId(snapshot.project.objects, "text");
  return addObject(snapshot,{id,name:`Text: ${text.trim().slice(0,80)}`,layerId:activeLayerId(snapshot),type:"text",text:text.trim(),fontFamily:"Arial",fontSizeMm:heightMm,alignment:"left",transform:[1,0,0,1,xMm,yMm]});
}

function addRaster(snapshot: EditorSnapshot, command: Extract<EditorCommand, { type: "add-raster" }>): EditorSnapshot {
  const { name, widthMm, heightMm, dataBase64, xMm = 30, yMm = 30, dpi } = command;
  if (!name.trim() || ![widthMm, heightMm, xMm, yMm].every(Number.isFinite) || widthMm <= 0 || heightMm <= 0 || xMm < 0 || yMm < 0 || xMm + widthMm > snapshot.project.machine.widthMm || yMm + heightMm > snapshot.project.machine.heightMm || !/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64) || dataBase64.length < 4 || (dpi !== undefined && (!Number.isFinite(dpi) || dpi <= 0))) return snapshot;
  const id = nextObjectId(snapshot.project.objects, "raster");
  return addObject(snapshot, { id, name: name.trim().slice(0, 160), layerId: activeLayerId(snapshot), type: "raster", widthMm, heightMm, mimeType: command.mimeType, dataBase64, ...(dpi === undefined ? {} : { dpi }), transform: rasterTransform(xMm, yMm, heightMm) });
}

function curveText(snapshot: EditorSnapshot, objectId: string | undefined, radiusMm: number): EditorSnapshot {
  if (!Number.isFinite(radiusMm) || radiusMm < 0) return snapshot;
  const selected = new Set(objectId ? [objectId] : snapshot.selectedIds);
  const layers = new Map(snapshot.project.layers.map(layer => [layer.id, layer]));
  let changed = false;
  const objects = snapshot.project.objects.map(object => {
    if (!selected.has(object.id) || object.type !== "text" || object.locked || layers.get(object.layerId)?.locked) return object;
    const width = Math.max(object.fontSizeMm * .6, object.text.length * object.fontSizeMm * .62);
    const nextRadius = radiusMm === 0 ? undefined : Math.max(radiusMm, width / 2 + .01);
    if ((object.curveRadiusMm ?? 0) === (nextRadius ?? 0)) return object;
    changed = true;
    if (nextRadius === undefined) {
      return Object.fromEntries(Object.entries(object).filter(([key]) => key !== "curveRadiusMm")) as ProjectObject;
    }
    return { ...object, curveRadiusMm: nextRadius };
  });
  return changed ? { ...snapshot, project: { ...snapshot.project, objects } } : snapshot;
}

function moveNode(snapshot:EditorSnapshot,objectId:string,nodeIndex:number,pointMm:[number,number]):EditorSnapshot{
  if(!pointMm.every(Number.isFinite))return snapshot;
  const layerById=new Map(snapshot.project.layers.map(layer=>[layer.id,layer]));
  const objects=snapshot.project.objects.map(object=>{
    if(object.id!==objectId||object.type!=="path"||layerById.get(object.layerId)?.locked||!object.pointsMm[nodeIndex])return object;
    const pointsMm=object.pointsMm.map((point,index)=>index===nodeIndex?[pointMm[0],pointMm[1]] as [number,number]:point);
    return{...object,pointsMm};
  });
  return{...snapshot,project:{...snapshot.project,objects}};
}

function editNodeCount(snapshot:EditorSnapshot,objectId:string,index:number,remove:boolean):EditorSnapshot{
  const layerById=new Map(snapshot.project.layers.map(layer=>[layer.id,layer]));
  const objects=snapshot.project.objects.map(object=>{if(object.id!==objectId||object.type!=="path"||layerById.get(object.layerId)?.locked)return object;const points=[...object.pointsMm];if(remove){if(points.length<=(object.closed?3:2)||!points[index])return object;points.splice(index,1);}else{const next=object.closed?points[(index+1)%points.length]:points[index+1];const current=points[index];if(!current||!next)return object;points.splice(index+1,0,[(current[0]+next[0])/2,(current[1]+next[1])/2]);}return{...object,pointsMm:points};});
  return{...snapshot,project:{...snapshot.project,objects}};
}

function createArray(snapshot:EditorSnapshot,columns:number,rows:number,dxMm:number,dyMm:number,mode:"rectangular"|"polar"="rectangular",angleDeg=30):EditorSnapshot{
  if(![columns,rows].every(value=>Number.isInteger(value)&&value>=1&&value<=100)||![dxMm,dyMm].every(Number.isFinite)||columns*rows<=1)return snapshot;
  const selected=new Set(snapshot.selectedIds),existing=new Set(snapshot.project.objects.map(object=>object.id)),copies:ProjectObject[]=[];
  for(const object of snapshot.project.objects){if(!selected.has(object.id)||object.locked)continue;for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    if(row===0&&column===0)continue;let suffix=1,id=`${object.id}-array`;while(existing.has(id))id=`${object.id}-array-${++suffix}`;existing.add(id);
    const index=row*columns+column,angle=angleDeg*index*Math.PI/180,delta:Transform=mode==="polar"?[Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),dxMm*Math.cos(angle),dyMm*Math.sin(angle)]:[1,0,0,1,column*dxMm,row*dyMm];
    copies.push({...object,id,name:`${object.name} array ${column+1},${row+1}`,transform:multiply(delta,object.transform)});
  }}
  return copies.length?{project:{...snapshot.project,objects:[...snapshot.project.objects,...copies]},selectedIds:copies.map(({id})=>id)}:snapshot;
}

function arrayAlongPath(snapshot:EditorSnapshot,copies:number):EditorSnapshot{
  if(!Number.isInteger(copies)||copies<2||copies>100)return snapshot;const selected=new Set(snapshot.selectedIds),guide=snapshot.project.objects.find(object=>selected.has(object.id)&&object.type==="path");if(!guide||guide.type!=="path")return snapshot;
  const sources=snapshot.project.objects.filter(object=>selected.has(object.id)&&object.id!==guide.id&&!object.locked);if(!sources.length)return snapshot;const points=guide.pointsMm.map(point=>applyTransform(guide.transform,point));if(guide.closed)points.push(points[0]!);const segments=points.slice(0,-1).map((point,index)=>({a:point,b:points[index+1]!,length:Math.hypot(points[index+1]![0]-point[0],points[index+1]![1]-point[1])})),total=segments.reduce((sum,segment)=>sum+segment.length,0);if(total<=0)return snapshot;
  const centerPoints=sources.flatMap(objectPoints),center:[number,number]=[(Math.min(...centerPoints.map(([x])=>x))+Math.max(...centerPoints.map(([x])=>x)))/2,(Math.min(...centerPoints.map(([,y])=>y))+Math.max(...centerPoints.map(([,y])=>y)))/2],used=new Set(snapshot.project.objects.map(({id})=>id)),created:ProjectObject[]=[];
  for(let index=0;index<copies;index++){let distance=total*index/(copies-1),segment=segments[0]!;for(const candidate of segments){if(distance<=candidate.length){segment=candidate;break;}distance-=candidate.length;}const ratio=segment.length?distance/segment.length:0,target:[number,number]=[segment.a[0]+(segment.b[0]-segment.a[0])*ratio,segment.a[1]+(segment.b[1]-segment.a[1])*ratio];for(const source of sources){let suffix=1,id=`${source.id}-path`;while(used.has(id))id=`${source.id}-path-${++suffix}`;used.add(id);created.push({...source,id,name:`${source.name} path ${index+1}`,groupId:undefined,transform:multiply([1,0,0,1,target[0]-center[0],target[1]-center[1]],source.transform)});}}
  return created.length?{project:{...snapshot.project,objects:[...snapshot.project.objects,...created]},selectedIds:created.map(({id})=>id)}:snapshot;
}

function splitPath(snapshot:EditorSnapshot,objectId:string,segmentIndex?:number):EditorSnapshot{
  const object=snapshot.project.objects.find(item=>item.id===objectId);if(!object||object.type!=="path"||object.closed||object.pointsMm.length<3)return snapshot;
  const index=Math.min(object.pointsMm.length-2,Math.max(1,segmentIndex??Math.floor(object.pointsMm.length/2)));
  const first={...object,pointsMm:object.pointsMm.slice(0,index+1)};let id=`${object.id}-split`,suffix=1;const used=new Set(snapshot.project.objects.map(item=>item.id));while(used.has(id))id=`${object.id}-split-${++suffix}`;
  const second={...object,id,name:`${object.name} split`,pointsMm:object.pointsMm.slice(index)};
  return{project:{...snapshot.project,objects:snapshot.project.objects.flatMap(item=>item.id===objectId?[first,second]:[item])},selectedIds:[first.id,second.id]};
}

function cutPath(snapshot: EditorSnapshot, objectId: string, startIndex: number, endIndex: number): EditorSnapshot {
  const object = snapshot.project.objects.find(item => item.id === objectId);
  if (!object || (object.type !== "path" && object.type !== "rectangle") || object.locked || !Number.isInteger(startIndex) || !Number.isInteger(endIndex)) return snapshot;
  const cuttable = object.type === "path" ? object : {
    id: object.id,
    name: object.name,
    layerId: object.layerId,
    type: "path" as const,
    closed: true,
    pointsMm: [[0, 0], [object.widthMm, 0], [object.widthMm, object.heightMm], [0, object.heightMm]] as Array<[number, number]>,
    transform: object.transform,
    groupId: object.groupId
  };
  if (startIndex < 0 || endIndex < 0 || startIndex >= cuttable.pointsMm.length || endIndex >= cuttable.pointsMm.length || startIndex === endIndex) return snapshot;

  const low = Math.min(startIndex, endIndex);
  const high = Math.max(startIndex, endIndex);
  const parts = cuttable.closed
    ? [
        cuttable.pointsMm.slice(low, high + 1),
        [...cuttable.pointsMm.slice(high), ...cuttable.pointsMm.slice(0, low + 1)]
      ]
    : [
        cuttable.pointsMm.slice(0, low + 1),
        cuttable.pointsMm.slice(low, high + 1),
        cuttable.pointsMm.slice(high)
      ].filter(points => points.length >= 2);
  if (parts.length < 2 || parts.some(points => points.length < 2)) return snapshot;

  const used = new Set(snapshot.project.objects.map(item => item.id));
  const ids = parts.map((_, index) => {
    if (index === 0) return object.id;
    let suffix = 1;
    let id = `${object.id}-cut-${suffix}`;
    while (used.has(id)) id = `${object.id}-cut-${++suffix}`;
    used.add(id);
    return id;
  });
  const replacements = new Map([[object.id, ids]]);
  const created = parts.map((points, index) => ({
    ...cuttable,
    id: ids[index]!,
    name: `${cuttable.name} cut ${index + 1}`,
    closed: false,
    pointsMm: points,
    groupId: undefined
  }));
  const objects = snapshot.project.objects.flatMap(item => item.id === object.id ? created : [item]);
  const operations = snapshot.project.operations.map(operation => ({
    ...operation,
    objectIds: operation.objectIds.flatMap(id => replacements.get(id) ?? [id])
  }));
  return { project: { ...snapshot.project, objects, operations }, selectedIds: ids };
}

function trimPath(snapshot: EditorSnapshot, objectId: string, segmentIndex: number): EditorSnapshot {
  const object = snapshot.project.objects.find(item => item.id === objectId);
  if (!object || object.locked || (object.type !== "path" && object.type !== "rectangle") || !Number.isInteger(segmentIndex)) return snapshot;
  const cuttable = object.type === "path" ? object : { ...object, type: "path" as const, closed: true, pointsMm: [[0, 0], [object.widthMm, 0], [object.widthMm, object.heightMm], [0, object.heightMm]] as Array<[number, number]> };
  const pointCount = cuttable.pointsMm.length;
  const segmentCount = cuttable.closed ? pointCount : pointCount - 1;
  if (segmentIndex < 0 || segmentIndex >= segmentCount) return snapshot;
  const parts = cuttable.closed
    ? [[...cuttable.pointsMm.slice(segmentIndex + 1), ...cuttable.pointsMm.slice(0, segmentIndex + 1)]]
    : [cuttable.pointsMm.slice(0, segmentIndex + 1), cuttable.pointsMm.slice(segmentIndex + 1)].filter(points => points.length >= 2);
  if (!parts.length || parts.some(points => points.length < 2)) return snapshot;
  const used = new Set(snapshot.project.objects.map(item => item.id));
  const ids = parts.map((_, index) => {
    if (index === 0) return object.id;
    let suffix = 1, id = `${object.id}-trim-${suffix}`;
    while (used.has(id)) id = `${object.id}-trim-${++suffix}`;
    used.add(id);
    return id;
  });
  const replacements = new Map([[object.id, ids]]);
  const created = parts.map((points, index) => ({ ...cuttable, id: ids[index]!, name: `${cuttable.name} trim ${index + 1}`, closed: false, pointsMm: points, groupId: undefined }));
  const objects = snapshot.project.objects.flatMap(item => item.id === object.id ? created : [item]);
  const operations = snapshot.project.operations.map(operation => ({ ...operation, objectIds: operation.objectIds.flatMap(id => replacements.get(id) ?? [id]) }));
  return { project: { ...snapshot.project, objects, operations }, selectedIds: ids };
}

function deleteSelected(snapshot: EditorSnapshot): EditorSnapshot {
  const deleted = new Set(snapshot.project.objects.filter(object=>snapshot.selectedIds.includes(object.id)&&!object.locked).map(({id})=>id));
  if (!deleted.size) return snapshot;
  return {
    project: {
      ...snapshot.project,
      objects: snapshot.project.objects.filter(({ id }) => !deleted.has(id)),
      operations: snapshot.project.operations.map((operation) => ({ ...operation, objectIds: operation.objectIds.filter((id) => !deleted.has(id)) }))
    },
    selectedIds: []
  };
}

function paste(snapshot: EditorSnapshot, clipboard: ProjectObject[]): EditorSnapshot {
  if (!clipboard.length) return snapshot;
  const existing = new Set(snapshot.project.objects.map(({ id }) => id));
  const copies = clipboard.map((object) => {
    let id = `${object.id}-copy`;
    let suffix = 1;
    while (existing.has(id)) id = `${object.id}-copy-${++suffix}`;
    existing.add(id);
    return { ...object, id, name: `${object.name} copy`, transform: multiply([1, 0, 0, 1, 5, 5], object.transform) };
  });
  return { project: { ...snapshot.project, objects: [...snapshot.project.objects, ...copies] }, selectedIds: copies.map(({ id }) => id) };
}

function duplicate(snapshot: EditorSnapshot): EditorSnapshot {
  const selected = new Set(snapshot.selectedIds);
  const existing = new Set(snapshot.project.objects.map((object) => object.id));
  const copies: ProjectObject[] = [];
  for (const object of snapshot.project.objects) {
    if (!selected.has(object.id)||object.locked) continue;
    let suffix = 1;
    let id = `${object.id}-copy`;
    while (existing.has(id)) id = `${object.id}-copy-${++suffix}`;
    existing.add(id);
    copies.push({ ...object, id, name: `${object.name} copy`, transform: multiply([1, 0, 0, 1, 5, 5], object.transform) });
  }
  if (copies.length === 0) return snapshot;
  return { project: { ...snapshot.project, objects: [...snapshot.project.objects, ...copies] }, selectedIds: copies.map(({ id }) => id) };
}

function importIntoProject(snapshot: EditorSnapshot, imported: ImportedDocument): EditorSnapshot {
  const usedLayers = new Set(snapshot.project.layers.map(({ id }) => id));
  const usedObjects = new Set(snapshot.project.objects.map(({ id }) => id));
  const layerMap = new Map<string, string>();
  const layers = imported.layers.map((layer) => {
    let id = layer.id, suffix = 1;
    while (usedLayers.has(id)) id = `${layer.id}-${++suffix}`;
    usedLayers.add(id); layerMap.set(layer.id, id); return { ...layer, id };
  });
  const objects = imported.objects.map((object) => {
    let id = object.id, suffix = 1;
    while (usedObjects.has(id)) id = `${object.id}-${++suffix}`;
    usedObjects.add(id); return { ...object, id, layerId: layerMap.get(object.layerId) ?? layers[0]?.id ?? snapshot.project.layers[0]?.id ?? "layer-1" };
  });
  return { project: { ...snapshot.project, layers: [...snapshot.project.layers, ...layers], objects: [...snapshot.project.objects, ...objects] }, selectedIds: objects.map(({ id }) => id) };
}

export function reduceEditor(history: EditorHistory, command: EditorCommand): EditorHistory {
  if (command.type === "undo") {
    const previous = history.past.at(-1);
    return previous ? { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future], clipboard: history.clipboard } : history;
  }
  if (command.type === "redo") {
    const next = history.future[0];
    return next ? { past: [...history.past, history.present], present: next, future: history.future.slice(1), clipboard: history.clipboard } : history;
  }
  if (command.type === "select") {
    const object=history.present.project.objects.find(item=>item.id===command.id);if(!object||object.locked)return history;
    const members=object.groupId?history.present.project.objects.filter(item=>item.groupId===object.groupId&&!item.locked).map(({id})=>id):[command.id];
    const allSelected=members.every(id=>history.present.selectedIds.includes(id));
    const selectedIds = command.additive
      ? allSelected ? history.present.selectedIds.filter((id) => !members.includes(id)) : [...history.present.selectedIds,...members.filter(id=>!history.present.selectedIds.includes(id))]
      : members;
    const previousOrder = history.present.selectionOrder ?? history.present.selectedIds;
    const order = command.additive
      ? allSelected ? previousOrder.filter((id) => selectedIds.includes(id)) : [...previousOrder.filter((id) => !members.includes(id)), ...members]
      : members;
    return { ...history, present: withSelection(history.present, selectedIds, order) };
  }
  if (command.type === "select-many") {
    const allowed = new Set(history.present.project.objects.filter(object=>!object.locked).map(({ id }) => id));
    const direct = command.ids.filter((id, index) => allowed.has(id) && command.ids.indexOf(id) === index),groups=new Set(history.present.project.objects.filter(object=>direct.includes(object.id)).flatMap(object=>object.groupId?[object.groupId]:[]));
    const incoming=[...new Set([...direct,...history.present.project.objects.filter(object=>object.groupId&&groups.has(object.groupId)&&!object.locked).map(({id})=>id)])];
    const selectedIds = command.additive
      ? [...history.present.selectedIds, ...incoming.filter((id) => !history.present.selectedIds.includes(id))]
      : incoming;
    const previousOrder = history.present.selectionOrder ?? history.present.selectedIds;
    const order = command.additive ? [...previousOrder.filter((id) => !incoming.includes(id)), ...incoming] : incoming;
    return { ...history, present: withSelection(history.present, selectedIds, order) };
  }
  if (command.type === "clear-selection") return { ...history, present: withSelection(history.present, []) };
  if(command.type==="select-layer"){
    const selectedLayers=new Set(history.present.project.objects.filter(object=>history.present.selectedIds.includes(object.id)).map(({layerId})=>layerId));
    const selectedIds=history.present.project.objects.filter(object=>selectedLayers.has(object.layerId)&&!object.locked).map(({id})=>id);return selectedIds.length?{...history,present:withSelection(history.present,selectedIds)}:history;
  }
  if (command.type === "replace-project") return commit(history, { project: command.project, selectedIds: [] });
  if (command.type === "duplicate") return commit(history, duplicate(history.present));
  if(command.type==="array-along-path")return commit(history,arrayAlongPath(history.present,command.copies));
  if (command.type === "add-rectangle") {
    const next = addRectangle(history.present, command.xMm, command.yMm, command.widthMm, command.heightMm, command.cornerRadiusMm);
    return commit(history, next);
  }
  if (command.type === "set-corner-radius") return commit(history, setCornerRadius(history.present, command.radiusMm));
  if (command.type === "add-ellipse" || command.type === "add-circle") {
    const next = addEllipse(history.present, command.xMm, command.yMm, command.radiusXMm, command.radiusYMm);
    return commit(history, next);
  }
  if (command.type === "add-line" || command.type === "add-path") {
    const next = addLine(history.present, command.xMm, command.yMm, command.lengthMm,command.endXmm,command.endYmm);
    return commit(history, next);
  }
  if (command.type === "add-cut-line") return commit(history, addCutLine(history.present, command.startMm, command.endMm));
  if (command.type === "cut-path") return commit(history, cutPath(history.present, command.objectId, command.startIndex, command.endIndex));
  if (command.type === "trim-path") return commit(history, trimPath(history.present, command.objectId, command.segmentIndex));
  if (command.type === "cut-shapes") {
    const validation = validateCutShapes(history.present);
    if (!validation.valid) return history;
    const result = applyCutShapes(history.present);
    return commit(history, result);
  }
  if(command.type==="add-polygon")return commit(history,addPolygon(history.present,command.pointsMm));
  if(command.type==="add-text")return commit(history,addTextPath(history.present,command.xMm,command.yMm,command.text,command.heightMm));
  if(command.type==="add-raster")return commit(history,addRaster(history.present,command));
  if(command.type==="curve-text")return commit(history,curveText(history.present,command.objectId,command.radiusMm));
  if(command.type==="update-text"){if(!command.text.trim()||!command.fontFamily.trim()||!Number.isFinite(command.fontSizeMm)||command.fontSizeMm<=0)return history;const radius=command.curveRadiusMm??0;if(!Number.isFinite(radius)||radius<0)return history;return commit(history,{...history.present,project:{...history.present.project,objects:history.present.project.objects.map(object=>object.id===command.objectId&&object.type==="text"?{...object,text:command.text,fontFamily:command.fontFamily,fontSizeMm:command.fontSizeMm,alignment:command.alignment,curveRadiusMm:radius===0?undefined:Math.max(radius,Math.max(command.fontSizeMm*.6,command.text.length*command.fontSizeMm*.62)/2+.01),name:`Text: ${command.text.slice(0,80)}`}:object)}});}
  if(command.type==="move-node")return commit(history,moveNode(history.present,command.objectId,command.nodeIndex,command.pointMm));
  if(command.type==="add-node")return commit(history,editNodeCount(history.present,command.objectId,command.segmentIndex,false));
  if(command.type==="delete-node")return commit(history,editNodeCount(history.present,command.objectId,command.nodeIndex,true));
  if(command.type==="array")return commit(history,createArray(history.present,command.columns,command.rows,command.dxMm,command.dyMm,command.mode,command.angleDeg));
  if(command.type==="split-path")return commit(history,splitPath(history.present,command.objectId,command.segmentIndex));
  if (command.type === "delete") return commit(history, deleteSelected(history.present));
  if (command.type === "copy") {
    const selected = new Set(history.present.selectedIds);
    const clipboard = history.present.project.objects.filter(({ id }) => selected.has(id)).map((object) => ({ ...object, transform: [...object.transform] as Transform, ...(object.type === "path" ? { pointsMm: object.pointsMm.map(([x, y]) => [x, y] as [number, number]) } : {}) }));
    return clipboard.length ? { ...history, clipboard } : history;
  }
  if (command.type === "paste") return commit(history, paste(history.present, history.clipboard));
  if (command.type === "import") return commit(history, importIntoProject(history.present, command.imported));
  if (command.type === "toggle-layer") return commit(history, { ...history.present, project: { ...history.present.project, layers: history.present.project.layers.map((layer) => layer.id === command.layerId ? { ...layer, visible: !layer.visible } : layer) } });
  if (command.type === "set-layer-mode") {
    const layer = history.present.project.layers.find(({ id }) => id === command.layerId);
    if (!layer) return history;
    const layerObjects = history.present.project.objects.filter((object) => object.layerId === command.layerId);
    const objectIds = command.mode === "image"
      ? layerObjects.filter((object) => object.type === "raster").map(({ id }) => id)
      : command.mode === "fill"
        ? layerObjects.filter((object) => object.type === "rectangle" || object.type === "ellipse" || object.type === "text" || (object.type === "path" && object.closed)).map(({ id }) => id)
        : layerObjects.filter((object) => object.type !== "raster").map(({ id }) => id);
    if (!objectIds.length) return history;
    const operationId = `layer-${command.layerId}`;
    const existing = history.present.project.operations.find((operation) => operation.id === operationId);
    const base = { id: operationId, name: existing?.name ?? layer.name, objectIds, enabled: existing?.enabled ?? true, speedMmPerMin: existing?.speedMmPerMin ?? 1000, powerPercent: existing?.powerPercent ?? 10, passes: existing?.passes ?? 1 };
    const next = command.mode === "fill" ? { ...base, kind: "fill" as const, lineSpacingMm: existing?.kind === "fill" ? existing.lineSpacingMm : 0.1 } : command.mode === "image" ? { ...base, kind: "image" as const, rasterMode: existing?.kind === "image" ? existing.rasterMode : "grayscale" as const } : { ...base, kind: "line" as const };
    const operations = existing ? history.present.project.operations.map((operation) => operation.id === operationId ? next : operation) : [...history.present.project.operations, next];
    return commit(history, { ...history.present, project: { ...history.present.project, operations } });
  }
  if (command.type === "set-layer-color") {
    if (!/^#[0-9a-fA-F]{6}$/.test(command.color) || !history.present.project.layers.some((layer) => layer.id === command.layerId)) return history;
    return commit(history, { ...history.present, project: { ...history.present.project, layers: history.present.project.layers.map((layer) => layer.id === command.layerId ? { ...layer, color: command.color } : layer) } });
  }
  if(command.type==="apply-material-preset"){
    const {preset}=command;if(!Number.isFinite(preset.speedMmPerMin)||preset.speedMmPerMin<=0||!Number.isFinite(preset.powerPercent)||preset.powerPercent<0||preset.powerPercent>100||!Number.isInteger(preset.passes)||preset.passes<1||preset.passes>100)return history;
    const objectIds=history.present.project.objects.filter(object=>object.layerId===command.layerId&&object.type!=="raster"&&(preset.kind==="line"||object.type!=="path"||object.closed)).map(({id})=>id),operationId=`layer-${command.layerId}`;
    if(!objectIds.length)return history;
    const operationName=`${preset.material} · ${preset.description||(preset.kind==="fill"?"Fill":"Line")}`.slice(0,160);
    const next=preset.kind==="fill"?{id:operationId,name:operationName,kind:"fill" as const,objectIds,enabled:true,speedMmPerMin:preset.speedMmPerMin,powerPercent:preset.powerPercent,passes:preset.passes,lineSpacingMm:preset.lineSpacingMm??.1}:{id:operationId,name:operationName,kind:"line" as const,objectIds,enabled:true,speedMmPerMin:preset.speedMmPerMin,powerPercent:preset.powerPercent,passes:preset.passes};
    const exists=history.present.project.operations.some(operation=>operation.id===operationId),operations=exists?history.present.project.operations.map(operation=>operation.id===operationId?next:operation):[...history.present.project.operations,next];return commit(history,{...history.present,project:{...history.present.project,operations}});
  }
  if (command.type === "update-layer-process") {
    const passes = command.passes ?? history.present.project.operations.find((operation) => operation.id === (command.operationId ?? `layer-${command.layerId}`))?.passes ?? 1;
    if (!/^#[0-9a-fA-F]{6}$/.test(command.color) || !Number.isFinite(command.speedMmPerMin) || command.speedMmPerMin <= 0 || !Number.isFinite(command.powerPercent) || command.powerPercent < 0 || command.powerPercent > 100 || !Number.isInteger(passes) || passes < 1 || passes > 100) return history;
    const operationId = command.operationId ?? `layer-${command.layerId}`;
    const existing = history.present.project.operations.find((operation) => operation.id === operationId);
    const layerObjects = history.present.project.objects.filter((object) => object.layerId === command.layerId);
    const mode = command.mode ?? existing?.kind ?? (layerObjects.some((object) => object.type === "raster") && !layerObjects.some((object) => object.type !== "raster") ? "image" : "line");
    const objectIds = command.operationId ? (existing?.objectIds ?? []) : mode === "image" ? layerObjects.filter((object) => object.type === "raster").map(({ id }) => id) : mode === "fill" ? layerObjects.filter((object) => object.type === "rectangle" || object.type === "ellipse" || object.type === "text" || (object.type === "path" && object.closed)).map(({ id }) => id) : layerObjects.filter((object) => object.type !== "raster").map(({ id }) => id);
    if (!objectIds.length && !existing) return history;
    const updated = existing ? (mode === "fill" ? { ...existing, kind: "fill" as const, objectIds, speedMmPerMin: command.speedMmPerMin, powerPercent: command.powerPercent, passes, lineSpacingMm: existing.kind === "fill" ? existing.lineSpacingMm : 0.1 } : mode === "image" ? { ...existing, kind: "image" as const, objectIds, speedMmPerMin: command.speedMmPerMin, powerPercent: command.powerPercent, passes, rasterMode: existing.kind === "image" ? existing.rasterMode : "grayscale" as const } : { ...existing, kind: "line" as const, objectIds, speedMmPerMin: command.speedMmPerMin, powerPercent: command.powerPercent, passes }) : mode === "fill" ? { id: operationId, name: history.present.project.layers.find(({ id }) => id === command.layerId)?.name ?? "Layer", kind: "fill" as const, objectIds, enabled: true, speedMmPerMin: command.speedMmPerMin, powerPercent: command.powerPercent, passes, lineSpacingMm: 0.1 } : mode === "image" ? { id: operationId, name: history.present.project.layers.find(({ id }) => id === command.layerId)?.name ?? "Layer", kind: "image" as const, objectIds, enabled: true, speedMmPerMin: command.speedMmPerMin, powerPercent: command.powerPercent, passes, rasterMode: "grayscale" as const } : { id: operationId, name: history.present.project.layers.find(({ id }) => id === command.layerId)?.name ?? "Layer", kind: "line" as const, objectIds, enabled: true, speedMmPerMin: command.speedMmPerMin, powerPercent: command.powerPercent, passes };
    const operations = existing
      ? history.present.project.operations.map((operation) => operation.id === operationId ? updated : operation)
      : [...history.present.project.operations, updated];
    return commit(history, { ...history.present, project: { ...history.present.project, layers: history.present.project.layers.map((layer) => layer.id === command.layerId ? { ...layer, color: command.color } : layer), operations } });
  }
  if (command.type === "add-line-operation") {
    const eligible = history.present.project.objects.filter((object) => object.type !== "raster").map(({ id }) => id);
    const objectIds = history.present.selectedIds.filter((id) => eligible.includes(id));
    const assigned = objectIds.length ? objectIds : eligible;
    if (!assigned.length) return history;
    const used = new Set(history.present.project.operations.map(({ id }) => id)); let suffix=1,id="line-1";while(used.has(id))id=`line-${++suffix}`;
    return commit(history,{...history.present,project:{...history.present.project,operations:[...history.present.project.operations,{id,name:`Line ${suffix}`,kind:"line",objectIds:assigned,enabled:true,speedMmPerMin:1000,powerPercent:10,passes:1}]}});
  }
  if (command.type === "update-line-operation") {
    if (![command.speedMmPerMin,command.powerPercent,command.passes].every(Number.isFinite)||command.speedMmPerMin<=0||command.powerPercent<0||command.powerPercent>100||!Number.isInteger(command.passes)||command.passes<1||command.passes>100)return history;
    return commit(history,{...history.present,project:{...history.present.project,operations:history.present.project.operations.map(operation=>operation.id===command.operationId&&operation.kind==="line"?{...operation,speedMmPerMin:command.speedMmPerMin,powerPercent:command.powerPercent,passes:command.passes,enabled:command.enabled}:operation)}});
  }
  if (command.type === "add-fill-operation") {
    const eligible=history.present.project.objects.filter(object=>object.type==="rectangle"||object.type==="ellipse"||object.type==="text"||(object.type==="path"&&object.closed)).map(({id})=>id);
    const selected=history.present.selectedIds.filter(id=>eligible.includes(id));const objectIds=selected.length?selected:eligible;
    if(!objectIds.length)return history;
    const used=new Set(history.present.project.operations.map(({id})=>id));let suffix=1,id="fill-1";while(used.has(id))id=`fill-${++suffix}`;
    return commit(history,{...history.present,project:{...history.present.project,operations:[...history.present.project.operations,{id,name:`Fill ${suffix}`,kind:"fill",objectIds,enabled:true,speedMmPerMin:1000,powerPercent:10,passes:1,lineSpacingMm:0.1}]}});
  }
  if (command.type === "update-fill-operation") {
    if(![command.speedMmPerMin,command.powerPercent,command.passes,command.lineSpacingMm].every(Number.isFinite)||command.speedMmPerMin<=0||command.powerPercent<0||command.powerPercent>100||!Number.isInteger(command.passes)||command.passes<1||command.passes>100||command.lineSpacingMm<=0)return history;
    return commit(history,{...history.present,project:{...history.present.project,operations:history.present.project.operations.map(operation=>operation.id===command.operationId&&operation.kind==="fill"?{...operation,speedMmPerMin:command.speedMmPerMin,powerPercent:command.powerPercent,passes:command.passes,lineSpacingMm:command.lineSpacingMm,enabled:command.enabled}:operation)}});
  }
  if (!history.present.selectedIds.length) return history;
  if (command.type === "translate") return commit(history, transformSelected(history.present, [1, 0, 0, 1, command.dxMm, command.dyMm]));
  if (command.type === "scale") {
    if (![command.scaleX, command.scaleY].every((value) => Number.isFinite(value) && value !== 0)) return history;
    return commit(history, transformSelected(history.present, aroundSelection(history.present,[command.scaleX, 0, 0, command.scaleY, 0, 0])));
  }
  if (command.type === "rotate") {
    if (!Number.isFinite(command.degrees)) return history;
    const radians = command.degrees * Math.PI / 180;
    return commit(history, transformSelected(history.present, aroundSelection(history.present,[Math.cos(radians), Math.sin(radians), -Math.sin(radians), Math.cos(radians), 0, 0])));
  }
  if (command.type === "mirror") return commit(history, transformSelected(history.present, aroundSelection(history.present,command.axis === "x" ? [-1, 0, 0, 1, 0, 0] : [1, 0, 0, -1, 0, 0])));
  if(command.type==="align"||command.type==="distribute")return commit(history,arrangeSelected(history.present,command));
  if(command.type==="reorder"){
    const selected=new Set(history.present.selectedIds),chosen=history.present.project.objects.filter(object=>selected.has(object.id)),rest=history.present.project.objects.filter(object=>!selected.has(object.id));
    return commit(history,{...history.present,project:{...history.present.project,objects:command.position==="front"?[...rest,...chosen]:[...chosen,...rest]}});
  }
  if(command.type==="auto-group")return commit(history,autoGroupSelection(history.present));
  if(command.type==="group"){
    if(history.present.selectedIds.length<2)return history;const used=new Set(history.present.project.objects.flatMap(object=>object.groupId?[object.groupId]:[]));let suffix=1,groupId="group-1";while(used.has(groupId))groupId=`group-${++suffix}`;const chosen=new Set(history.present.selectedIds);
    return commit(history,{...history.present,project:{...history.present.project,objects:history.present.project.objects.map(object=>chosen.has(object.id)&&!object.locked?{...object,groupId}:object)}});
  }
  if(command.type==="ungroup"){
    const chosenGroups=new Set(history.present.project.objects.filter(object=>history.present.selectedIds.includes(object.id)).flatMap(object=>object.groupId?[object.groupId]:[]));if(!chosenGroups.size)return history;
    return commit(history,{...history.present,project:{...history.present.project,objects:history.present.project.objects.map(object=>object.groupId&&chosenGroups.has(object.groupId)?Object.fromEntries(Object.entries(object).filter(([key])=>key!=="groupId")) as ProjectObject:object)}});
  }
  if(command.type==="set-object-locked"){
    const chosen=new Set(history.present.selectedIds);if(!chosen.size&&command.locked)return history;const objects=history.present.project.objects.map(object=>(chosen.has(object.id)||(!command.locked&&object.locked))?{...object,locked:command.locked||undefined}:object);
    return commit(history,{...history.present,project:{...history.present.project,objects}});
  }
  if(command.type==="move-selection"){
    const selected=new Set(history.present.selectedIds),points=history.present.project.objects.filter(object=>selected.has(object.id)&&!object.locked).flatMap(objectPoints);if(!points.length)return history;const minX=Math.min(...points.map(([x])=>x)),maxX=Math.max(...points.map(([x])=>x)),minY=Math.min(...points.map(([,y])=>y)),maxY=Math.max(...points.map(([,y])=>y));
    return commit(history,transformSelected(history.present,[1,0,0,1,command.target==="origin"?-minX:200-(minX+maxX)/2,command.target==="origin"?-minY:200-(minY+maxY)/2]));
  }
  if(command.type==="outline"){
    const chosen=new Set(history.present.selectedIds),sources=history.present.project.objects.filter(object=>chosen.has(object.id)&&!object.locked),points=sources.flatMap(objectPoints);if(!points.length)return history;const used=new Set(history.present.project.objects.map(({id})=>id));let id="selection-outline",suffix=1;while(used.has(id))id=`selection-outline-${++suffix}`;const minX=Math.min(...points.map(([x])=>x)),maxX=Math.max(...points.map(([x])=>x)),minY=Math.min(...points.map(([,y])=>y)),maxY=Math.max(...points.map(([,y])=>y)),outline:ProjectObject={id,name:"Selection outline",layerId:sources[0]!.layerId,type:"path",closed:true,pointsMm:[[minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY]],transform:[1,0,0,1,0,0]};return commit(history,{project:{...history.present.project,objects:[...history.present.project.objects,outline]},selectedIds:[id]});
  }
  if(command.type==="break-apart"){
    const chosen=new Set(history.present.selectedIds),used=new Set(history.present.project.objects.map(({id})=>id)),selectedIds:string[]=[],replacements=new Map<string,string[]>();
    const objects=history.present.project.objects.flatMap(object=>{if(!chosen.has(object.id)||object.locked||object.type!=="path"||object.pointsMm.length<3)return[object];const ids:string[]=[],points=object.closed?[...object.pointsMm,object.pointsMm[0]!]:object.pointsMm,parts=points.slice(0,-1).map((point,index)=>{let id=`${object.id}-part-${index+1}`,suffix=1;while(used.has(id))id=`${object.id}-part-${index+1}-${++suffix}`;used.add(id);ids.push(id);selectedIds.push(id);return{...object,id,name:`${object.name} part ${index+1}`,closed:false,pointsMm:[point,points[index+1]!],groupId:undefined};});replacements.set(object.id,ids);return parts;});
    const operations=history.present.project.operations.map(operation=>({...operation,objectIds:operation.objectIds.flatMap(id=>replacements.get(id)??[id])}));return selectedIds.length?commit(history,{project:{...history.present.project,objects,operations},selectedIds}):history;
  }
  return history;
}
