import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

export const MATERIAL_LIBRARY_FORMAT = "ATOMburn-material-library" as const;
export const CURRENT_MATERIAL_LIBRARY_VERSION = 1 as const;
export const MAX_MATERIAL_LIBRARY_BYTES = 8 * 1024 * 1024;
export const MAX_MATERIAL_PRESETS = 10_000;

export interface MaterialPreset { id:string; material:string; thicknessMm:number|null; description:string; kind:"line"|"fill"; speedMmPerMin:number; powerPercent:number; passes:number; lineSpacingMm?:number; }
export interface MaterialLibrarySource { format:"LightBurn"; fileName:string; importedAt:string; speedUnit:"mm/s"|"mm/min"; }
export interface MaterialLibrary {
  name:string;
  presets:MaterialPreset[];
  format?:typeof MATERIAL_LIBRARY_FORMAT;
  version?:typeof CURRENT_MATERIAL_LIBRARY_VERSION;
  units?:"mm";
  speedUnit?:"mm/min";
  source?:MaterialLibrarySource;
}

const presetSchema = z.object({
  id:z.string().min(1).max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  material:z.string().min(1).max(160),
  thicknessMm:z.number().finite().nonnegative().nullable(),
  description:z.string().max(240),
  kind:z.enum(["line","fill"]),
  speedMmPerMin:z.number().finite().positive(),
  powerPercent:z.number().finite().min(0).max(100),
  passes:z.number().int().min(1).max(100),
  lineSpacingMm:z.number().finite().positive().optional()
}).strict();
const sourceSchema = z.object({format:z.literal("LightBurn"),fileName:z.string().min(1).max(160),importedAt:z.string().datetime(),speedUnit:z.enum(["mm/s","mm/min"])}).strict();
const nativeLibrarySchema = z.object({
  format:z.literal(MATERIAL_LIBRARY_FORMAT),
  version:z.literal(CURRENT_MATERIAL_LIBRARY_VERSION),
  name:z.string().min(1).max(160),
  units:z.literal("mm"),
  speedUnit:z.literal("mm/min"),
  source:sourceSchema.optional(),
  presets:z.array(presetSchema).min(1).max(MAX_MATERIAL_PRESETS)
}).strict();

const array=<T>(value:T|T[]|undefined):T[]=>value===undefined?[]:Array.isArray(value)?value:[value];
const scalar=(value:unknown):string=>{if(value&&typeof value==="object"&&"Value" in value)return String((value as{Value:unknown}).Value);return String(value??"");};
const finite=(value:unknown)=>{const number=Number(scalar(value));return Number.isFinite(number)?number:NaN;};

export function parseLightBurnMaterialLibrary(xml:string,name="LightBurn library"):MaterialLibrary{
  if(new TextEncoder().encode(xml).byteLength>MAX_MATERIAL_LIBRARY_BYTES)throw new Error("Material library exceeds 8 MiB.");
  const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:"",parseAttributeValue:false,trimValues:true});
  const root=parser.parse(xml) as{LightBurnLibrary?:{Material?:unknown;DisplayName?:unknown}};
  if(!root.LightBurnLibrary||typeof root.LightBurnLibrary!=="object")throw new Error("The file is not a LightBurn material library.");
  const displayName=String(root.LightBurnLibrary.DisplayName??"");
  const speedUnit:"mm/s"|"mm/min"=/atomstack|x30|diode|grbl/i.test(displayName)?"mm/min":"mm/s";
  const presets:MaterialPreset[]=[];
  for(const material of array(root.LightBurnLibrary?.Material as Record<string,unknown>|Record<string,unknown>[]|undefined)){
    if(!material||typeof material!=="object")continue;
    const materialName=String(material.name??"Unnamed material").trim().slice(0,160)||"Unnamed material";
    for(const entry of array(material.Entry as Record<string,unknown>|Record<string,unknown>[]|undefined)){
      if(!entry||typeof entry!=="object")continue;
      for(const setting of array(entry.CutSetting as Record<string,unknown>|Record<string,unknown>[]|undefined)){
        if(!setting||typeof setting!=="object")continue;
        const speed=finite(setting.speed),power=finite(setting.maxPower);if(!(speed>0)||power<0||power>100)continue;
        const type=String(setting.type??"").toLowerCase(),kind:"line"|"fill"=type.includes("scan")||type.includes("fill")||type.includes("engrave")?"fill":"line",passes=Math.max(1,Math.min(100,Math.round(finite(setting.numPasses)||1))),interval=finite(setting.interval),thickness=finite(entry.Thickness);
        presets.push({id:`preset-${presets.length+1}`,material:materialName,thicknessMm:Number.isFinite(thickness)&&thickness>0?Number(thickness.toFixed(4)):null,description:String(entry.Desc??"").trim().slice(0,240),kind,speedMmPerMin:Number((speed*(speedUnit==="mm/s"?60:1)).toFixed(3)),powerPercent:power,passes,...(kind==="fill"&&interval>0?{lineSpacingMm:Number(interval.toFixed(4))}:{})});
      }
    }
  }
  if(!presets.length)throw new Error("No supported LightBurn cut settings were found.");
  const libraryName=displayName.trim()||name.replace(/\.clb$/i,"");
  return normalizeMaterialLibrary({name:libraryName.slice(0,160),presets},{format:"LightBurn",fileName:name.replace(/[\\/]/g,"").slice(0,160),importedAt:new Date().toISOString(),speedUnit});
}

export function normalizeMaterialLibrary(input:MaterialLibrary,source?:MaterialLibrarySource):MaterialLibrary{
  const candidate={
    format:MATERIAL_LIBRARY_FORMAT,
    version:CURRENT_MATERIAL_LIBRARY_VERSION,
    name:String(input.name??"").trim().slice(0,160)||"Material library",
    units:"mm" as const,
    speedUnit:"mm/min" as const,
    ...(source?{source}:input.source?{source:input.source}:{}),
    presets:input.presets
  };
  return nativeLibrarySchema.parse(candidate);
}

export function parseMaterialLibraryDocument(text:string):MaterialLibrary{
  if(new TextEncoder().encode(text).byteLength>MAX_MATERIAL_LIBRARY_BYTES)throw new Error("Material library exceeds 8 MiB.");
  let value:unknown;
  try{value=JSON.parse(text);}catch{throw new Error("The ATOMburn material library is not valid JSON.");}
  try{return nativeLibrarySchema.parse(value);}catch{throw new Error("The file is not a supported ATOMburn material library.");}
}

export function serializeMaterialLibrary(input:MaterialLibrary):string{
  return `${JSON.stringify(normalizeMaterialLibrary(input),null,2)}\n`;
}

export function parseStoredMaterialLibrary(text:string):MaterialLibrary|undefined{
  try{
    const value=JSON.parse(text) as Partial<MaterialLibrary>;
    if(!value||typeof value!=="object"||!Array.isArray(value.presets))return undefined;
    return normalizeMaterialLibrary(value as MaterialLibrary);
  }catch{return undefined;}
}
