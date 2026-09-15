import { applyTransform } from "../domain/project-geometry.js";
import { parseProject, type ProjectDocument, type ProjectObject } from "../domain/project.js";
import { prepareRaster, type GrayImage, type RasterDither } from "../domain/raster.js";

export interface CamControllerProfile { maxPower:number; laserMode:boolean; }
export interface CamPath { operationId:string; objectId:string; pass:number; feedMmPerMin:number; powerValue:number; powerValues?:number[]; points:Array<[number,number]>; closed:boolean; }
export type RasterCamSources = ReadonlyMap<string, GrayImage> | Readonly<Record<string, GrayImage>>;
export interface CamResult { paths:CamPath[]; bounds:{minX:number;minY:number;maxX:number;maxY:number}; frame:Array<[number,number]>; estimatedSeconds:number; maxPowerPercent:number; controller:CamControllerProfile; }

export class CamPreflightError extends Error { constructor(message:string){super(message);this.name="CamPreflightError";} }
const clean=(value:number)=>Math.abs(value)<0.0000005?0:Number(value.toFixed(4));
const point=(object:ProjectObject,p:[number,number]):[number,number]=>applyTransform(object.transform,p);
const MAX_SCANLINES=100_000;
const MAX_FILL_SEGMENTS=250_000;
const MAX_INTERSECTION_CHECKS=5_000_000;

function objectPath(object:ProjectObject):{points:Array<[number,number]>;closed:boolean}|undefined{
  if(object.type==="raster")return undefined;
  if(object.type==="path"){
    const points=object.pointsMm.map(p=>point(object,p));const first=points[0],last=points.at(-1);
    if(object.closed&&points.length>2&&first&&last&&distance(first,last)<=1e-9)points.pop();
    return{points,closed:object.closed};
  }
  if(object.type==="rectangle"){
    const radius=Math.min(object.cornerRadiusMm,object.widthMm/2,object.heightMm/2);
    const local:Array<[number,number]>=radius===0?[[0,0],[object.widthMm,0],[object.widthMm,object.heightMm],[0,object.heightMm]]:[
      ...([[object.widthMm-radius,radius,-Math.PI/2],[object.widthMm-radius,object.heightMm-radius,0],[radius,object.heightMm-radius,Math.PI/2],[radius,radius,Math.PI]] as const).flatMap(([cx,cy,start])=>Array.from({length:8},(_,index)=>[cx+Math.cos(start+index*Math.PI/16)*radius,cy+Math.sin(start+index*Math.PI/16)*radius] as [number,number]))
    ];
    return{points:local.map(p=>point(object,p)),closed:true};
  }
  if(object.type==="text"){
    const width=Math.max(object.fontSizeMm*.6,object.text.length*object.fontSizeMm*.62),offset=object.alignment==="center"?-width/2:object.alignment==="right"?-width:0;
    return{points:[[offset,0],[offset+width,0],[offset+width,object.fontSizeMm],[offset,object.fontSizeMm]].map(p=>point(object,p as [number,number])),closed:true};
  }
  return{points:Array.from({length:64},(_,index)=>{const angle=index/64*Math.PI*2;return point(object,[Math.cos(angle)*object.radiusXMm,Math.sin(angle)*object.radiusYMm]);}),closed:true};
}

function bounds(points:Array<[number,number]>) {let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const [x,y] of points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return{minX,minY,maxX,maxY};}
function distance(a:[number,number],b:[number,number]){return Math.hypot(b[0]-a[0],b[1]-a[1]);}

function scanlineFill(contours:Array<{points:Array<[number,number]>;closed:boolean}>,spacing:number):Array<Array<[number,number]>>{
  if(!Number.isFinite(spacing)||spacing<=0)throw new CamPreflightError("Fill line spacing must be a positive finite value.");
  if(contours.some(path=>!path.closed||path.points.length<3))throw new CamPreflightError("Fill operations require closed vector geometry.");
  const closed=contours;
  if(!closed.length)throw new CamPreflightError("Fill operations require closed vector geometry.");
  const box=bounds(closed.flatMap(path=>path.points));const height=box.maxY-box.minY;
  if(height<=0)throw new CamPreflightError("Fill geometry has no positive area.");
  const rowCount=Math.max(1,Math.ceil(height/spacing));const edgeCount=closed.reduce((total,path)=>total+path.points.length,0);
  if(!Number.isSafeInteger(rowCount)||rowCount>MAX_SCANLINES||rowCount*edgeCount>MAX_INTERSECTION_CHECKS)throw new CamPreflightError("Fill resolution exceeds the safe scanline work budget.");
  const firstY=box.minY+(height-(rowCount-1)*spacing)/2;
  const rows:Array<Array<[number,number]>>=[];
  for(let row=0;row<rowCount;row++){
    const y=firstY+row*spacing;const intersections:number[]=[];
    for(const contour of closed)for(let index=0;index<contour.points.length;index++){
      const a=contour.points[index]!,b=contour.points[(index+1)%contour.points.length]!;
      if(a[1]===b[1])continue;
      const low=Math.min(a[1],b[1]),high=Math.max(a[1],b[1]);
      if(y<low||y>=high)continue;
      intersections.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
    }
    intersections.sort((a,b)=>a-b);
    if(intersections.length%2!==0)throw new CamPreflightError("Fill contour produced an odd number of scanline intersections.");
    const segments:Array<Array<[number,number]>>=[];
    for(let index=0;index+1<intersections.length;index+=2){const left=intersections[index]!,right=intersections[index+1]!;if(right-left>0.000001)segments.push([[clean(left),clean(y)],[clean(right),clean(y)]]);}
    if(rows.length+segments.length>MAX_FILL_SEGMENTS)throw new CamPreflightError("Fill path count exceeds the safe output budget.");
    if(row%2===1)segments.reverse().forEach(segment=>segment.reverse());
    rows.push(...segments);
  }
  if(!rows.length)throw new CamPreflightError("Fill geometry produced no finite scanlines.");
  return rows;
}

type GeometryBounds={minX:number;minY:number;maxX:number;maxY:number};
type LineCandidate={object:ProjectObject;path:{points:Array<[number,number]>;closed:boolean};box:GeometryBounds};
function onSegment(point:[number,number],a:[number,number],b:[number,number]):boolean{
  const cross=(point[0]-a[0])*(b[1]-a[1])-(point[1]-a[1])*(b[0]-a[0]);
  return Math.abs(cross)<=1e-9&&point[0]>=Math.min(a[0],b[0])-1e-9&&point[0]<=Math.max(a[0],b[0])+1e-9&&point[1]>=Math.min(a[1],b[1])-1e-9&&point[1]<=Math.max(a[1],b[1])+1e-9;
}
function pointInPolygon(point:[number,number],polygon:Array<[number,number]>):"inside"|"boundary"|"outside"{
  let inside=false;
  for(let index=0;index<polygon.length;index++){
    const a=polygon[index]!,b=polygon[(index+1)%polygon.length]!;if(onSegment(point,a,b))return "boundary";
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside?"inside":"outside";
}
function containsPath(outer:LineCandidate,inner:LineCandidate):boolean{
  if(!outer.path.closed||!inner.path.closed||outer===inner)return false;
  const outerBox=outer.box,innerBox=inner.box;
  if(innerBox.minX<outerBox.minX||innerBox.minY<outerBox.minY||innerBox.maxX>outerBox.maxX||innerBox.maxY>outerBox.maxY)return false;
  let hasInside=false;
  for(const point of inner.path.points){const state=pointInPolygon(point,outer.path.points);if(state==="outside")return false;if(state==="inside")hasInside=true;}
  return hasInside;
}
function orientCandidate(candidate:LineCandidate,current:[number,number]):LineCandidate{
  const points=candidate.path.points;
  if(!candidate.path.closed){const reverse=distance(current,points.at(-1)!)<distance(current,points[0]!);return reverse?{...candidate,path:{...candidate.path,points:[...points].reverse()}}:candidate;}
  let nearest=0;for(let index=1;index<points.length;index++)if(distance(current,points[index]!)<distance(current,points[nearest]!))nearest=index;
  return nearest?{...candidate,path:{...candidate.path,points:[...points.slice(nearest),...points.slice(0,nearest)]}}:candidate;
}
function planLineCandidates(input:LineCandidate[],start:[number,number]):LineCandidate[]{
  const depths=new Map(input.map(candidate=>[candidate,input.filter(outer=>containsPath(outer,candidate)).length]));const remaining=[...input];const planned:LineCandidate[]=[];let current=start;
  while(remaining.length){
    const maxDepth=Math.max(...remaining.map(candidate=>depths.get(candidate)??0));let selectedIndex=-1,selected:LineCandidate|undefined,selectedDistance=Infinity;
    for(let index=0;index<remaining.length;index++){
      const candidate=remaining[index]!;if((depths.get(candidate)??0)!==maxDepth)continue;const oriented=orientCandidate(candidate,current);const entryDistance=distance(current,oriented.path.points[0]!);
      if(entryDistance<selectedDistance-1e-9||(Math.abs(entryDistance-selectedDistance)<=1e-9&&(!selected||candidate.object.id<selected.object.id))){selectedIndex=index;selected=oriented;selectedDistance=entryDistance;}
    }
    const chosen=selected!;remaining.splice(selectedIndex,1);planned.push(chosen);current=chosen.path.closed?chosen.path.points[0]!:chosen.path.points.at(-1)!;
  }
  return planned;
}

function rasterSource(sources: RasterCamSources | undefined, id: string): GrayImage | undefined {
  if (!sources) return undefined;
  return sources instanceof Map ? sources.get(id) : (sources as Readonly<Record<string, GrayImage>>)[id];
}
function rasterPowerValues(values: ReadonlyArray<number>, operationPower: number, maxPower: number): number[] {
  return values.map((value) => Math.max(0, Math.min(maxPower, Math.round(value / 100 * operationPower / 100 * maxPower))));
}

export function buildLineCam(input:ProjectDocument,controller:CamControllerProfile, rasterSources?: RasterCamSources):CamResult{
  const project=parseProject(input);
  if(!Number.isFinite(controller.maxPower)||controller.maxPower<=0)throw new CamPreflightError("Controller $30 must be a positive finite value.");
  if(!controller.laserMode)throw new CamPreflightError("Controller preflight requires $32=1 laser mode.");
  const objects=new Map(project.objects.map(object=>[object.id,object]));const paths:CamPath[]=[];const geometryPoints:Array<[number,number]>=[];let maxPowerPercent=0;
  for(const operation of project.operations){
    if(!operation.enabled)continue;
    if(operation.kind==="image") {
      const mode: RasterDither = operation.rasterMode ?? "grayscale";
      const intervalMm = operation.intervalMm;
      for (const id of operation.objectIds) {
        const object = objects.get(id);
        if (!object || object.type !== "raster") throw new CamPreflightError(`Image operation ${operation.name} contains unsupported geometry.`);
        const image = rasterSource(rasterSources, id);
        if (!image) throw new CamPreflightError(`Raster source for image object ${id} is unavailable; CAM is blocked.`);
        const plan = prepareRaster(image, { dpi: object.dpi ?? 300, intervalMm, mode });
        for (let pass = 1; pass <= operation.passes; pass++) for (let row = 0; row < plan.rows.length; row++) {
          const source = plan.rows[row]!;
          const points = source.map(({ xMm, yMm }) => point(object, [xMm, yMm]));
          if (points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) throw new CamPreflightError("CAM contains non-finite coordinates.");
          const candidateBounds = bounds(points);
          if (candidateBounds.minX < 0 || candidateBounds.minY < 0 || candidateBounds.maxX > project.machine.widthMm || candidateBounds.maxY > project.machine.heightMm) throw new CamPreflightError("Toolpath bounds exceed the configured workspace.");
          const powers = rasterPowerValues(source.map((p) => p.power), operation.powerPercent, controller.maxPower);
          maxPowerPercent = Math.max(maxPowerPercent, operation.powerPercent);
          paths.push({ operationId: operation.id, objectId: id, pass, feedMmPerMin: operation.speedMmPerMin, powerValue: powers[0] ?? 0, powerValues: powers, points, closed: false });
          geometryPoints.push(...points);
        }
      }
      continue;
    }
    const candidates=operation.objectIds.map(id=>{const object=objects.get(id);const path=object&&objectPath(object);if(!object||!path)throw new CamPreflightError(`${operation.kind==="fill"?"Fill":"Line"} operation ${operation.name} contains unsupported geometry.`);return{object,path,box:bounds(path.points)};}).filter(({path})=>path.points.length>=2);
    const candidatePoints=candidates.flatMap(({path})=>path.points);if(candidatePoints.some(p=>p.some(v=>!Number.isFinite(v))))throw new CamPreflightError("CAM contains non-finite coordinates.");
    if(candidatePoints.length){const candidateBounds=bounds(candidatePoints);if(candidateBounds.minX<0||candidateBounds.minY<0||candidateBounds.maxX>project.machine.widthMm||candidateBounds.maxY>project.machine.heightMm)throw new CamPreflightError("Toolpath bounds exceed the configured workspace.");}
    const powerValue=Math.round(operation.powerPercent/100*controller.maxPower);maxPowerPercent=Math.max(maxPowerPercent,operation.powerPercent);
    geometryPoints.push(...candidates.flatMap(({path})=>path.points));
    if(operation.kind==="line"){
      const last=paths.at(-1);const start:[number,number]=last?(last.closed?last.points[0]!:last.points.at(-1)!):[0,0];
      const planned=planLineCandidates(candidates,start);
      for(let pass=1;pass<=operation.passes;pass++)for(const {object,path} of planned)paths.push({operationId:operation.id,objectId:object.id,pass,feedMmPerMin:operation.speedMmPerMin,powerValue,points:path.points,closed:path.closed});
      continue;
    }
    const rows=scanlineFill(candidates.map(({path})=>path),operation.lineSpacingMm??Number.NaN);
    for(let pass=1;pass<=operation.passes;pass++)for(let row=0;row<rows.length;row++)paths.push({operationId:operation.id,objectId:`${operation.id}-scanline-${row+1}`,pass,feedMmPerMin:operation.speedMmPerMin,powerValue,points:rows[row]!,closed:false});
  }
  if(!paths.length)throw new CamPreflightError("No enabled CAM geometry exists for export.");
  const all=[...geometryPoints,...paths.flatMap(path=>path.points)];if(all.some(p=>p.some(v=>!Number.isFinite(v))))throw new CamPreflightError("CAM contains non-finite coordinates.");
  const box=bounds(all);if(box.minX<0||box.minY<0||box.maxX>project.machine.widthMm||box.maxY>project.machine.heightMm)throw new CamPreflightError("Toolpath bounds exceed the configured workspace.");
  let seconds=0;let current:[number,number]=[0,0];for(const path of paths){seconds+=distance(current,path.points[0]!)/6000*60;for(let i=1;i<path.points.length;i++)seconds+=distance(path.points[i-1]!,path.points[i]!)/path.feedMmPerMin*60;if(path.closed)seconds+=distance(path.points.at(-1)!,path.points[0]!)/path.feedMmPerMin*60;current=path.closed?path.points[0]!:path.points.at(-1)!;}
  return{paths,bounds:box,frame:[[box.minX,box.minY],[box.maxX,box.minY],[box.maxX,box.maxY],[box.minX,box.maxY],[box.minX,box.minY]],estimatedSeconds:clean(seconds),maxPowerPercent,controller};
}

export function buildRasterCam(input: ProjectDocument, controller: CamControllerProfile, sources: RasterCamSources): CamResult {
  return buildLineCam(input, controller, sources);
}

const n=(value:number)=>clean(value).toString();
export function generateGrbl(result:CamResult):string{
  const lines=["M5","S0","G21","G90","M4 S0"];
  for(const path of result.paths){const start=path.points[0]!;const powers=path.powerValues;lines.push("M5",`G0 X${n(start[0])} Y${n(start[1])}`,`M4 S${powers?.[0] ?? path.powerValue}`);for(let index=1;index<path.points.length;index++){const power=powers?.[index];if(power!==undefined && power!==(powers?.[index-1] ?? path.powerValue))lines.push(`M4 S${power}`);const p=path.points[index]!;lines.push(`G1 X${n(p[0])} Y${n(p[1])} F${n(path.feedMmPerMin)}`);}if(path.closed)lines.push(`G1 X${n(start[0])} Y${n(start[1])} F${n(path.feedMmPerMin)}`);lines.push("M5");}
  lines.push("S0","M5","S0");return `${lines.join("\n")}\n`;
}

export function parseGeneratedGrbl(code:string):{motions:Array<{mode:"G0"|"G1";x:number;y:number}>;maxPowerValue:number;maxFeedMmPerMin:number}{
  const lines=code.trim().split(/\r?\n/);const allowed=/^(?:M5|S0|G21|G90|M4 S\d+|G[01] X-?\d+(?:\.\d+)? Y-?\d+(?:\.\d+)?(?: F\d+(?:\.\d+)?)?)$/;const motions:Array<{mode:"G0"|"G1";x:number;y:number}>=[];
  if(lines.slice(0,5).join("\n")!=="M5\nS0\nG21\nG90\nM4 S0"||lines.slice(-3).join("\n")!=="S0\nM5\nS0")throw new CamPreflightError("Generated G-code requires the safe ATOMburn header and footer.");
  let laserOff=true,positioned=false,maxPowerValue=0,maxFeedMmPerMin=0;
  for(const line of lines){
    if(!allowed.test(line))throw new CamPreflightError(`Generated G-code parser rejected: ${line}`);
    if(line==="M5"){laserOff=true;positioned=false;}
    else if(line==="S0"||line==="M4 S0"){laserOff=true;}
    else {const power=/^M4 S([1-9]\d*)$/.exec(line);if(power){if(!positioned)throw new CamPreflightError("Laser power was enabled before positioning.");laserOff=false;maxPowerValue=Math.max(maxPowerValue,Number(power[1]));}}
    const match=/^(G[01]) X(-?\d+(?:\.\d+)?) Y(-?\d+(?:\.\d+)?)(?: F(\d+(?:\.\d+)?))?$/.exec(line);
    if(match){if(match[1]==="G0"&&!laserOff)throw new CamPreflightError("Rapid motion requires laser off.");if(match[1]==="G0")positioned=true;if(match[1]==="G1"&&!match[4])throw new CamPreflightError("Linear engraving motion requires an explicit feed rate.");if(match[4])maxFeedMmPerMin=Math.max(maxFeedMmPerMin,Number(match[4]));motions.push({mode:match[1] as "G0"|"G1",x:Number(match[2]),y:Number(match[3])});}
  }
  return{motions,maxPowerValue,maxFeedMmPerMin};
}
