import { gunzipSync } from "node:zlib";
import DxfParserModule from "dxf-parser";
import { XMLParser } from "fast-xml-parser";
import sharp from "sharp";
import SvgPathParserModule, { type SvgCommand } from "svg-path-parser";
import { applyTransform, rasterTransform, type Transform } from "../domain/project-geometry.js";
import type { ProjectDocument, ProjectObject } from "../domain/project.js";
import type { ImportedDocument, ImportDiagnostic } from "../domain/import.js";

export type { ImportedDocument, ImportDiagnostic } from "../domain/import.js";

const XML_LIMIT = 16 * 1024 * 1024;
const RASTER_LIMIT = 5 * 1024 * 1024;
const ID_SAFE = /[^a-zA-Z0-9_-]/g;
const identity: Transform = [1, 0, 0, 1, 0, 0];
interface DxfParserConstructor { new(): { parseSync(source: string): unknown }; }
const DxfParserClass = ((DxfParserModule as unknown as { default?: unknown }).default ?? DxfParserModule) as unknown as DxfParserConstructor;
const { makeAbsolute, parseSVG } = SvgPathParserModule;
type XmlNode = Record<string, unknown>;

function slug(value: string, fallback: string): string {
  const safe = value.normalize("NFKD").replace(ID_SAFE, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return safe && /^[a-zA-Z0-9]/.test(safe) ? safe : fallback;
}

function array<T>(value: T | T[] | undefined): T[] { return value === undefined ? [] : Array.isArray(value) ? value : [value]; }
function record(value: unknown): XmlNode { return value && typeof value === "object" && !Array.isArray(value) ? value as XmlNode : {}; }
function finite(value: unknown, fallback = 0): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function multiply(left: Transform, right: Transform): Transform {
  const [a, b, c, d, e, f] = left; const [g, h, i, j, k, l] = right;
  return [a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f];
}

function parseTransform(value: unknown): Transform {
  if (typeof value !== "string" || !value.trim()) return identity;
  let result: Transform = identity;
  for (const match of value.matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)) {
    const values = (match[2] ?? "").trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
    let next: Transform;
    if (match[1] === "matrix" && values.length >= 6) next = values.slice(0, 6) as unknown as Transform;
    else if (match[1] === "translate") next = [1,0,0,1,values[0] ?? 0,values[1] ?? 0];
    else if (match[1] === "scale") next = [values[0] ?? 1,0,0,values[1] ?? values[0] ?? 1,0,0];
    else if (match[1] === "rotate") { const angle=(values[0]??0)*Math.PI/180; const rotation:Transform=[Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),0,0]; const cx=values[1]??0,cy=values[2]??0; next=multiply([1,0,0,1,cx,cy],multiply(rotation,[1,0,0,1,-cx,-cy])); }
    else continue;
    result = multiply(result, next);
  }
  return result;
}

function parseXml(text: string): XmlNode {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("XML entities and doctypes are blocked.");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", textNodeName: "#text", parseAttributeValue: false, trimValues: true, allowBooleanAttributes: false });
  return record(parser.parse(text));
}

function unitToMm(value: unknown, defaultPx = true): number {
  if (typeof value === "number") return value * (defaultPx ? 25.4/96 : 1);
  if (typeof value !== "string") return 0;
  const match = /^\s*([+-]?(?:\d+\.?\d*|\.\d+))(mm|cm|in|pt|pc|px)?\s*$/i.exec(value);
  if (!match) return 0;
  const number = Number(match[1]); const unit = (match[2] ?? (defaultPx ? "px" : "mm")).toLowerCase();
  return number * ({ mm:1, cm:10, in:25.4, pt:25.4/72, pc:25.4/6, px:25.4/96 }[unit] ?? 1);
}

function cubic(p0:[number,number],p1:[number,number],p2:[number,number],p3:[number,number]): [number,number][] {
  return Array.from({length:12},(_,index)=>{const t=(index+1)/12,u=1-t;return [u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]];});
}

function flattenSvgPath(data: string, diagnostics: ImportDiagnostic[]): Array<{points:[number,number][];closed:boolean}> {
  let commands: SvgCommand[];
  try { commands = makeAbsolute(parseSVG(data)); } catch { diagnostics.push({severity:"warning",code:"SVG_PATH_INVALID",message:"A malformed SVG path was skipped."}); return []; }
  const paths:Array<{points:[number,number][];closed:boolean}>=[]; let points:[number,number][]=[]; let current:[number,number]=[0,0]; let start:[number,number]=[0,0]; let arcCount=0;
  const finish=(closed=false)=>{if(points.length>=2)paths.push({points,closed});points=[];};
  for(const command of commands){ const end:[number,number]=[command.x??current[0],command.y??current[1]];
    if(command.code==="M"){finish();points=[end];start=end;}
    else if(command.code==="L"||command.code==="H"||command.code==="V")points.push(end);
    else if(command.code==="C")points.push(...cubic(current,[command.x1??current[0],command.y1??current[1]],[command.x2??end[0],command.y2??end[1]],end));
    else if(command.code==="Q"){const p1:[number,number]=[command.x1??current[0],command.y1??current[1]];points.push(...cubic(current,[current[0]+2*(p1[0]-current[0])/3,current[1]+2*(p1[1]-current[1])/3],[end[0]+2*(p1[0]-end[0])/3,end[1]+2*(p1[1]-end[1])/3],end));}
    else if(command.code==="A"){points.push(end);arcCount++;}
    else if(command.code==="Z"){if(points.length&&points.at(-1)!==start)points.push(start);finish(true);}
    current=end;
  }
  finish(); if(arcCount)diagnostics.push({severity:"warning",code:"SVG_ARC_APPROXIMATED",message:"SVG arcs were approximated by straight segments.",count:arcCount}); return paths;
}

function importSvg(bytes: Uint8Array, sourceName: string, compressed: boolean): ImportedDocument {
  const raw = compressed ? gunzipSync(bytes) : Buffer.from(bytes);
  if (raw.byteLength > XML_LIMIT) throw new Error("SVG exceeds the 16 MiB import limit.");
  const text=raw.toString("utf8"); const diagnostics:ImportDiagnostic[]=[]; const root=parseXml(text); const svg=record(root.svg);
  if(!Object.keys(svg).length)throw new Error("The file does not contain an SVG root element.");
  if(/<script\b/i.test(text))diagnostics.push({severity:"warning",code:"SVG_SCRIPT_REMOVED",message:"Script elements were removed."});
  if(/(?:href|xlink:href)\s*=\s*["'](?:https?:|file:|\/\/)/i.test(text))diagnostics.push({severity:"warning",code:"SVG_EXTERNAL_REMOVED",message:"External references were removed."});
  const viewBox=String(svg.viewBox??"").trim().split(/[\s,]+/).map(Number); const vb:[number,number,number,number]=viewBox.length===4&&viewBox.every(Number.isFinite)?[viewBox[0]!,viewBox[1]!,viewBox[2]!,viewBox[3]!]:[0,0,unitToMm(svg.width)/(25.4/96),unitToMm(svg.height)/(25.4/96)];
  if(vb[2]===0||vb[3]===0)throw new Error("SVG dimensions are missing or zero.");
  const widthMm=unitToMm(svg.width)||vb[2]*25.4/96; const heightMm=unitToMm(svg.height)||vb[3]*25.4/96; const rootScale:Transform=[widthMm/vb[2],0,0,heightMm/vb[3],-vb[0]*widthMm/vb[2],-vb[1]*heightMm/vb[3]];
  const layers:ProjectDocument["layers"]=[]; const objects:ProjectObject[]=[]; let objectIndex=0; let invalidDimensions=0; const known=new Set(["g","path","polyline","polygon","line","rect","circle","ellipse","svg","defs","title","desc","style","metadata","script"]); const attributes=new Set(["id","transform","d","points","x","y","x1","y1","x2","y2","cx","cy","r","rx","ry","width","height","viewBox","fill","fill-rule","stroke","stroke-opacity","stroke-width","stroke-linecap","stroke-linejoin","font-family","font-size","font-weight","font-style","vector-effect","xmlns","xmlns:xlink","version","baseProfile","inkscape:label","href","xlink:href"]); const unknown=new Map<string,number>();
  const ensureLayer=(name:string)=>{const base=`import-${slug(name,"layer")}`;let id=base,n=1;while(layers.some(layer=>layer.id===id))id=`${base}-${++n}`;layers.push({id,name,visible:true,locked:false});return id;};
  const defaultLayer=ensureLayer("SVG import");
  const addPath=(points:[number,number][],closed:boolean,layerId:string,transform:Transform,name="Path")=>{if(points.length<2)return;objects.push({id:`import-svg-${++objectIndex}`,name:`${name} ${objectIndex}`,layerId,type:"path",closed,pointsMm:points.map(point=>applyTransform(multiply(rootScale,transform),point)),transform:identity});};
  const visit=(node:XmlNode,parent:Transform,layerId:string)=>{
    for(const [tag,value] of Object.entries(node)){
      if(attributes.has(tag))continue;
      if(!known.has(tag)&&tag!=="#text"){unknown.set(tag,(unknown.get(tag)??0)+array(value).length);continue;}
      if(["#text","defs","title","desc","style","metadata","script"].includes(tag))continue;
      for(const rawChild of array(value)){
        const child=record(rawChild);const transform=multiply(parent,parseTransform(child.transform));let activeLayer=layerId;
        if(tag==="g"&&(child["inkscape:label"]||child.id))activeLayer=ensureLayer(String(child["inkscape:label"]??child.id));
        if(tag==="path"&&typeof child.d==="string")for(const path of flattenSvgPath(child.d,diagnostics))addPath(path.points,path.closed,activeLayer,transform);
        else if(tag==="polyline"||tag==="polygon"){
          const values=String(child.points??"").trim().split(/[\s,]+/).map(Number);const points:Array<[number,number]>=[];
          for(let i=0;i+1<values.length;i+=2)if(Number.isFinite(values[i])&&Number.isFinite(values[i+1]))points.push([values[i]!,values[i+1]!]);
          addPath(points,tag==="polygon",activeLayer,transform,tag);
        }else if(tag==="line")addPath([[finite(child.x1),finite(child.y1)],[finite(child.x2),finite(child.y2)]],false,activeLayer,transform,"Line");
        else if(tag==="rect"){
          const width=finite(parseFloat(String(child.width??0))),height=finite(parseFloat(String(child.height??0)));
          if(width<=0||height<=0){invalidDimensions++;continue;}
          const local=multiply(multiply(rootScale,transform),[1,0,0,1,finite(child.x),finite(child.y)]);
          objects.push({id:`import-svg-${++objectIndex}`,name:`Rectangle ${objectIndex}`,layerId:activeLayer,type:"rectangle",widthMm:width,heightMm:height,cornerRadiusMm:Math.max(0,finite(parseFloat(String(child.rx??0)))),transform:local});
        }else if(tag==="circle"||tag==="ellipse"){
          const radiusX=finite(child.r??child.rx),radiusY=finite(child.r??child.ry);
          if(radiusX<=0||radiusY<=0){invalidDimensions++;continue;}
          const local=multiply(multiply(rootScale,transform),[1,0,0,1,finite(child.cx),finite(child.cy)]);
          objects.push({id:`import-svg-${++objectIndex}`,name:`Ellipse ${objectIndex}`,layerId:activeLayer,type:"ellipse",radiusXMm:radiusX,radiusYMm:radiusY,transform:local});
        }
        if(tag==="g"||tag==="svg")visit(child,transform,activeLayer);
      }
    }
  };
  visit(svg,identity,defaultLayer); if(invalidDimensions)diagnostics.push({severity:"warning",code:"SVG_DIMENSIONS_INVALID",message:"SVG shapes with missing or non-positive dimensions were skipped.",count:invalidDimensions}); for(const [tag,count] of unknown)diagnostics.push({severity:"warning",code:"SVG_UNSUPPORTED",message:`Unsupported SVG element <${tag}> was skipped.`,count}); if(!objects.length)diagnostics.push({severity:"error",code:"NO_GEOMETRY",message:"No supported SVG geometry was found."}); return {format:"svg",layers,objects,diagnostics,sourceName};
}

function dxfScale(units: unknown): number { return ({1:25.4,2:304.8,4:1,5:10,6:1000,14:100,9:25.4/1000}[Number(units)]??1); }
interface DxfPoint { x?: number; y?: number; }
interface DxfEntity { type?: string; layer?: string; vertices?: DxfPoint[]; center?: DxfPoint; radius?: number; majorAxisEndPoint?: DxfPoint; axisRatio?: number; shape?: boolean; startAngle?: number; endAngle?: number; name?: string; position?: DxfPoint; xScale?: number; yScale?: number; rotation?: number; closed?: boolean; periodic?: boolean; degreeOfSplineCurve?: number; knotValues?: number[]; controlPoints?: DxfPoint[]; fitPoints?: DxfPoint[]; }
interface DxfDocument { header?: Record<string, unknown>; entities?: DxfEntity[]; blocks?: Record<string, { entities?: DxfEntity[] }>; }
type Point2 = [number, number];

function evaluateDxfSpline(controlPoints: Point2[], knots: number[], degree: number, parameter: number): Point2 {
  const lastControlPoint = controlPoints.length - 1;
  let span = lastControlPoint;
  if (parameter < knots[lastControlPoint + 1]!) {
    let low = degree;
    let high = lastControlPoint + 1;
    let middle = Math.floor((low + high) / 2);
    while (parameter < knots[middle]! || parameter >= knots[middle + 1]!) {
      if (parameter < knots[middle]!) high = middle;
      else low = middle;
      middle = Math.floor((low + high) / 2);
    }
    span = middle;
  }
  const points: Point2[] = [];
  for (let index = 0; index <= degree; index++) points.push(controlPoints[span - degree + index]!);
  for (let order = 1; order <= degree; order++) {
    for (let index = degree; index >= order; index--) {
      const knotIndex = span - degree + index;
      const denominator = knots[knotIndex + degree - order + 1]! - knots[knotIndex]!;
      const alpha = denominator === 0 ? 0 : (parameter - knots[knotIndex]!) / denominator;
      const previous = points[index - 1]!;
      const current = points[index]!;
      points[index] = [
        previous[0] + alpha * (current[0] - previous[0]),
        previous[1] + alpha * (current[1] - previous[1])
      ];
    }
  }
  return points[degree]!;
}

function dxfSplinePoints(entity: DxfEntity): Point2[] | undefined {
  const controlPoints = (entity.controlPoints ?? []).map((point) => [Number(point.x), Number(point.y)] as Point2);
  const degree = Math.trunc(Number(entity.degreeOfSplineCurve));
  const knots = (entity.knotValues ?? []).map(Number);
  if (controlPoints.length < 2 || !Number.isInteger(degree) || degree < 1 || degree >= controlPoints.length || knots.length < controlPoints.length + degree + 1) return undefined;
  if (!controlPoints.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)) || !knots.every(Number.isFinite)) return undefined;
  const start = knots[degree]!;
  const end = knots[controlPoints.length]!;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return undefined;

  const points: Point2[] = [];
  const addPoint = (point: Point2) => {
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) return;
    const previous = points[points.length - 1];
    if (!previous || Math.abs(previous[0] - point[0]) > 1e-9 || Math.abs(previous[1] - point[1]) > 1e-9) points.push(point);
  };
  const samplesPerSpan = 8;
  for (let span = degree; span < controlPoints.length; span++) {
    const left = knots[span]!;
    const right = knots[span + 1]!;
    if (right <= left) continue;
    for (let sample = 0; sample < samplesPerSpan; sample++) addPoint(evaluateDxfSpline(controlPoints, knots, degree, left + (right - left) * sample / samplesPerSpan));
  }
  addPoint(evaluateDxfSpline(controlPoints, knots, degree, end));
  if ((entity.closed || entity.periodic) && points.length > 1) {
    const first = points[0]!;
    const last = points[points.length - 1]!;
    if (Math.abs(first[0] - last[0]) <= 1e-7 && Math.abs(first[1] - last[1]) <= 1e-7) points.pop();
  }
  return points.length >= 2 ? points : undefined;
}

function dxfEllipsePoints(entity: DxfEntity): { points: Point2[]; closed: boolean } | undefined {
  const center: Point2 = [Number(entity.center?.x), Number(entity.center?.y)];
  const major: Point2 = [Number(entity.majorAxisEndPoint?.x), Number(entity.majorAxisEndPoint?.y)];
  const ratio = Number(entity.axisRatio);
  const start = Number(entity.startAngle ?? 0);
  const rawEnd = Number(entity.endAngle ?? Math.PI * 2);
  if (!center.every(Number.isFinite) || !major.every(Number.isFinite) || !Number.isFinite(ratio) || ratio <= 0 || !Number.isFinite(start) || !Number.isFinite(rawEnd)) return undefined;
  if (Math.hypot(major[0], major[1]) <= 0) return undefined;
  const end = rawEnd >= start ? rawEnd : rawEnd + Math.PI * 2;
  const sweep = end - start;
  if (sweep <= 0) return undefined;
  const minor: Point2 = [-major[1] * ratio, major[0] * ratio];
  const sampleCount = Math.max(24, Math.ceil(sweep / (Math.PI / 12)));
  const points = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const angle = start + sweep * index / sampleCount;
    return [center[0] + major[0] * Math.cos(angle) + minor[0] * Math.sin(angle), center[1] + major[1] * Math.cos(angle) + minor[1] * Math.sin(angle)] as Point2;
  });
  const closed = sweep >= Math.PI * 2 - 1e-7;
  if (closed) points.pop();
  return { points, closed };
}

function importDxf(bytes:Uint8Array,sourceName:string):ImportedDocument{
  if(bytes.byteLength>XML_LIMIT)throw new Error("DXF exceeds the 16 MiB import limit.");
  const diagnostics:ImportDiagnostic[]=[];let parsed:DxfDocument;
  try{parsed=(new DxfParserClass().parseSync(Buffer.from(bytes).toString("utf8"))??{}) as DxfDocument;}
  catch(error){throw new Error(`DXF parse failed: ${error instanceof Error?error.message:"invalid data"}`,{cause:error});}
  const scale=dxfScale(parsed.header?.$INSUNITS);
  if(parsed.header?.$INSUNITS===undefined)diagnostics.push({severity:"warning",code:"DXF_UNITS_ASSUMED",message:"DXF has no $INSUNITS; millimetres were assumed."});
  const layerNames=new Set<string>((parsed.entities??[]).map((entity)=>String(entity.layer??"0")));
  const layers=[...layerNames].map((name,index)=>({id:`import-dxf-layer-${index+1}`,name:`DXF ${name}`,visible:true,locked:false}));
  if(!layers.length)layers.push({id:"import-dxf-layer-1",name:"DXF 0",visible:true,locked:false});
  const layerId=(name:unknown)=>layers[[...layerNames].indexOf(String(name??"0"))]?.id??layers[0]!.id;
  const objects:ProjectObject[]=[];let unsupported=0;
  const addEntity=(entity:DxfEntity,parent:Transform=identity,depth=0)=>{
    if(depth>8){unsupported++;return;}
    const id=`import-dxf-${objects.length+1}`;
    if(entity.type==="LINE"){
      const vertices=entity.vertices??[];
      if(vertices.length>=2)objects.push({id,name:"DXF line",layerId:layerId(entity.layer),type:"path",closed:false,pointsMm:vertices.slice(0,2).map((point)=>applyTransform(parent,[finite(point.x)*scale,finite(point.y)*scale])),transform:identity});else unsupported++;
    }else if(entity.type==="LWPOLYLINE"||entity.type==="POLYLINE"){
      const points=(entity.vertices??[]).map((point)=>applyTransform(parent,[finite(point.x)*scale,finite(point.y)*scale]));
      if(points.length>=2)objects.push({id,name:"DXF polyline",layerId:layerId(entity.layer),type:"path",closed:Boolean(entity.shape),pointsMm:points,transform:identity});else unsupported++;
    }else if(entity.type==="CIRCLE")objects.push({id,name:"DXF circle",layerId:layerId(entity.layer),type:"ellipse",radiusXMm:finite(entity.radius)*scale,radiusYMm:finite(entity.radius)*scale,transform:multiply(parent,[1,0,0,1,finite(entity.center?.x)*scale,finite(entity.center?.y)*scale])});
    else if(entity.type==="SPLINE"){
      const points=dxfSplinePoints(entity);
      if(points)objects.push({id,name:"DXF spline",layerId:layerId(entity.layer),type:"path",closed:Boolean(entity.closed||entity.periodic),pointsMm:points.map((point)=>applyTransform(parent,[point[0]*scale,point[1]*scale])),transform:identity});else unsupported++;
    }
    else if(entity.type==="ELLIPSE"){
      const ellipse=dxfEllipsePoints(entity);
      if(ellipse)objects.push({id,name:"DXF ellipse",layerId:layerId(entity.layer),type:"path",closed:ellipse.closed,pointsMm:ellipse.points.map((point)=>applyTransform(parent,[point[0]*scale,point[1]*scale])),transform:identity});else unsupported++;
    }
    else if(entity.type==="ARC"){
      const start=finite(entity.startAngle),end=finite(entity.endAngle);const sweep=end>=start?end-start:end+Math.PI*2-start;const center:[number,number]=[finite(entity.center?.x)*scale,finite(entity.center?.y)*scale];const radius=finite(entity.radius)*scale;
      const points=Array.from({length:25},(_,index)=>{const angle=start+sweep*index/24;return applyTransform(parent,[center[0]+Math.cos(angle)*radius,center[1]+Math.sin(angle)*radius]);});
      objects.push({id,name:"DXF arc",layerId:layerId(entity.layer),type:"path",closed:false,pointsMm:points,transform:identity});
    }else if(entity.type==="INSERT"&&entity.name&&parsed.blocks?.[entity.name]){
      const angle=finite(entity.rotation)*Math.PI/180;const sx=finite(entity.xScale,1),sy=finite(entity.yScale,1);const insert:Transform=[Math.cos(angle)*sx,Math.sin(angle)*sx,-Math.sin(angle)*sy,Math.cos(angle)*sy,finite(entity.position?.x)*scale,finite(entity.position?.y)*scale];
      for(const child of parsed.blocks[entity.name]?.entities??[])addEntity({...child,layer:child.layer??entity.layer},multiply(parent,insert),depth+1);
    }
    else unsupported++;
  };
  for(const entity of parsed.entities??[])addEntity(entity);
  if(unsupported)diagnostics.push({severity:"warning",code:"DXF_UNSUPPORTED",message:"Unsupported DXF entities were skipped; file corruption was not inferred.",count:unsupported});
  return{format:"dxf",layers,objects,diagnostics,sourceName};
}

function parseLbTransform(value:unknown):Transform{const values=String(value??"").trim().split(/\s+/).map(Number);return values.length>=6&&values.slice(0,6).every(Number.isFinite)?values.slice(0,6) as unknown as Transform:identity;}
function lightBurnVertices(value:string):Array<{point:[number,number];c0?:[number,number];c1?:[number,number]}> {const result:Array<{point:[number,number];c0?:[number,number];c1?:[number,number]}>=[];for(const part of value.split(/(?=V)/).filter(Boolean)){const match=/^V([+-]?[\d.]+)\s+([+-]?[\d.]+)/.exec(part);if(!match)continue;const c0x=/c0x([+-]?[\d.]+)/.exec(part),c0y=/c0y([+-]?[\d.]+)/.exec(part),c1x=/c1x([+-]?[\d.]+)/.exec(part),c1y=/c1y([+-]?[\d.]+)/.exec(part);result.push({point:[Number(match[1]),Number(match[2])],c0:c0x&&c0y?[Number(c0x[1]),Number(c0y[1])]:undefined,c1:c1x&&c1y?[Number(c1x[1]),Number(c1y[1])]:undefined});}return result;}
function importLightBurn(bytes:Uint8Array,sourceName:string):ImportedDocument{
  if(bytes.byteLength>XML_LIMIT)throw new Error("LightBurn project exceeds the 16 MiB import limit.");
  const root=parseXml(Buffer.from(bytes).toString("utf8"));const project=record(root.LightBurnProject);
  if(!Object.keys(project).length)throw new Error("The file does not contain a LightBurnProject root.");
  const diagnostics:ImportDiagnostic[]=[];const cutSettings=array(project.CutSetting).map(record);
  const layers=cutSettings.map((setting,index)=>({id:`import-lb-layer-${index}`,name:String(record(setting.name).Value??setting.name??`C${index.toString().padStart(2,"0")}`),visible:true,locked:false}));
  if(!layers.length)layers.push({id:"import-lb-layer-0",name:"LightBurn import",visible:true,locked:false});
  const objects:ProjectObject[]=[];let malformedPaths=0;let invalidDimensions=0;const unsupportedTypes=new Map<string,number>();const vertexLists=new Map<string,string>();const primitiveLists=new Map<string,string>();
  const visit=(shapes:unknown,parent:Transform)=>{
    for(const raw of array(shapes)){
      const shape=record(raw);const transform=multiply(parent,parseLbTransform(shape.XForm));const type=String(shape.Type??"");
      if(type==="Group")visit(record(shape.Children).Shape,transform);
      else if(type==="Rect"){
        const width=finite(shape.W),height=finite(shape.H);
        if(width<=0||height<=0){invalidDimensions++;continue;}
        objects.push({id:`import-lb-${objects.length+1}`,name:`LightBurn rectangle ${objects.length+1}`,layerId:layers[finite(shape.CutIndex,0)]?.id??layers[0]!.id,type:"rectangle",widthMm:width,heightMm:height,cornerRadiusMm:Math.max(0,finite(shape.Cr)),transform});
      }else if(type==="Ellipse"){
        const radiusX=finite(shape.Rx),radiusY=finite(shape.Ry);
        if(radiusX<=0||radiusY<=0){invalidDimensions++;continue;}
        objects.push({id:`import-lb-${objects.length+1}`,name:`LightBurn ellipse ${objects.length+1}`,layerId:layers[finite(shape.CutIndex,0)]?.id??layers[0]!.id,type:"ellipse",radiusXMm:radiusX,radiusYMm:radiusY,transform});
      }
      else if(type==="Text"&&Object.keys(record(shape.BackupPath)).length)visit(shape.BackupPath,transform);
      else if(type==="Path"){
        const vertexId=String(shape.VertID??"");const primitiveId=String(shape.PrimID??"");
        if(typeof shape.VertList==="string"&&vertexId)vertexLists.set(vertexId,shape.VertList);
        if(typeof shape.PrimList==="string"&&primitiveId)primitiveLists.set(primitiveId,shape.PrimList);
        const vertices=lightBurnVertices(String(shape.VertList??vertexLists.get(vertexId)??""));const primitives=String(shape.PrimList??primitiveLists.get(primitiveId)??"");const points:[number,number][]=[];
        if(vertices[0])points.push(applyTransform(transform,vertices[0].point));
        for(let i=1;i<vertices.length;i++){
          const previous=vertices[i-1]!;const current=vertices[i]!;
          if(primitives.includes(`B${i-1} ${i}`)&&previous.c0&&current.c1)points.push(...cubic(previous.point,previous.c0,current.c1,current.point).map(point=>applyTransform(transform,point)));
          else points.push(applyTransform(transform,current.point));
        }
        if(points.length>=2)objects.push({id:`import-lb-${objects.length+1}`,name:`LightBurn path ${objects.length+1}`,layerId:layers[finite(shape.CutIndex,0)]?.id??layers[0]!.id,type:"path",closed:/\s0\s*$/.test(primitives),pointsMm:points,transform:identity});else malformedPaths++;
      }else unsupportedTypes.set(type||"unknown",(unsupportedTypes.get(type||"unknown")??0)+1);
    }
  };
  visit(project.Shape,identity);
  if(malformedPaths)diagnostics.push({severity:"warning",code:"LIGHTBURN_PATH_MISSING",message:"LightBurn paths with missing vertex data were skipped.",count:malformedPaths});
  if(invalidDimensions)diagnostics.push({severity:"warning",code:"LIGHTBURN_DIMENSIONS_INVALID",message:"LightBurn shapes with missing or non-positive dimensions were skipped.",count:invalidDimensions});
  for(const [type,count] of unsupportedTypes)diagnostics.push({severity:"warning",code:"LIGHTBURN_UNSUPPORTED",message:`Unsupported LightBurn shape ${type} was skipped.`,count});
  return{format:"lightburn",layers,objects,diagnostics,sourceName};
}

async function importRaster(bytes: Uint8Array, sourceName: string, extension: string): Promise<ImportedDocument> {
  if (bytes.byteLength > RASTER_LIMIT) throw new Error("Raster image exceeds the 5 MiB embeddable import limit.");
  const metadata = await sharp(bytes, { limitInputPixels: 50_000_000 }).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Raster dimensions could not be read.");
  const mimeType = extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "bmp" ? "image/bmp" : "image/png";
  const density = metadata.density && metadata.density > 0 ? metadata.density : 96;
  const widthMm = metadata.width / density * 25.4;
  const heightMm = metadata.height / density * 25.4;
  const layerId = "raster-layer";
  return {
    format: "raster",
    sourceName,
    layers: [{ id: layerId, name: "Raster import", visible: true, locked: false }],
    objects: [{
      id: "raster-1",
      name: sourceName,
      layerId,
      type: "raster",
      widthMm,
      heightMm,
      mimeType,
      dataBase64: Buffer.from(bytes).toString("base64"),
      transform: rasterTransform(0, 0, heightMm)
    }],
    diagnostics: metadata.density ? [] : [{ severity: "warning", code: "RASTER_DPI_ASSUMED", message: "Raster has no DPI metadata; 96 DPI was assumed." }]
  };
}

export async function importDocument(sourceName:string,bytes:Uint8Array):Promise<ImportedDocument>{const extension=sourceName.toLowerCase().split(".").pop()??"";if(extension==="svg"||extension==="svgz")return importSvg(bytes,sourceName,extension==="svgz");if(extension==="dxf")return importDxf(bytes,sourceName);if(extension==="lbrn"||extension==="lbrn2")return importLightBurn(bytes,sourceName);if(["png","jpg","jpeg","bmp"].includes(extension))return importRaster(bytes,sourceName,extension);throw new Error(`Unsupported import format: .${extension||"unknown"}`);}
