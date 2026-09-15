import { mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { MAX_MATERIAL_LIBRARY_BYTES, parseMaterialLibraryDocument, serializeMaterialLibrary, type MaterialLibrary } from "../domain/material-library.js";

export interface LoadedMaterialLibrary { library: MaterialLibrary; }

async function durableWrite(path:string,content:string):Promise<void>{
  const handle=await open(path,"w");
  try{await handle.writeFile(content,"utf8");await handle.sync();}finally{await handle.close();}
}

export async function loadMaterialLibraryFile(path:string):Promise<LoadedMaterialLibrary>{
  if((await stat(path)).size>MAX_MATERIAL_LIBRARY_BYTES)throw new Error("Material library exceeds 8 MiB.");
  return{library:parseMaterialLibraryDocument(await readFile(path,"utf8"))};
}

export async function saveMaterialLibraryFile(path:string,input:MaterialLibrary):Promise<void>{
  const content=serializeMaterialLibrary(input),temp=`${path}.tmp`;
  await mkdir(dirname(path),{recursive:true});
  await durableWrite(temp,content);
  try{await rename(temp,path);}catch{await rm(path,{force:true});await rename(temp,path);}
}
