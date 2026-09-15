import { copyFile, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { deserializeProject, parseProject, serializeProject, type ProjectDocument } from "../domain/project.js";

export interface LoadedProject { project: ProjectDocument; recoveredFrom: "primary" | "recovery" | "backup"; }

async function readCandidate(path: string): Promise<ProjectDocument | undefined> {
  try { return deserializeProject(await readFile(path, "utf8")); } catch { return undefined; }
}

export async function loadProjectFile(path: string): Promise<LoadedProject> {
  const primary = await readCandidate(path);
  if (primary) return { project: primary, recoveredFrom: "primary" };
  const recovery = await readCandidate(`${path}.recovery`);
  if (recovery) return { project: recovery, recoveredFrom: "recovery" };
  const backup = await readCandidate(`${path}.bak`);
  if (backup) return { project: backup, recoveredFrom: "backup" };
  throw new Error("The project and its recovery copies are missing or damaged.");
}

async function durableWrite(path: string, content: string): Promise<void> {
  const handle = await open(path, "w");
  try { await handle.writeFile(content, "utf8"); await handle.sync(); } finally { await handle.close(); }
}

export async function saveProjectFile(path: string, input: ProjectDocument): Promise<void> {
  const project = parseProject(input);
  const content = serializeProject(project);
  const temp = `${path}.tmp`;
  const recovery = `${path}.recovery`;
  const backup = `${path}.bak`;
  await mkdir(dirname(path), { recursive: true });
  // Start all durable preparation writes together. The commit must wait for every
  // write, but a missing primary is a normal first-save condition.
  const backupCopy = copyFile(path, backup).catch(() => undefined);
  const recoveryWrite = durableWrite(recovery, content);
  const temporaryWrite = durableWrite(temp, content);
  await Promise.all([recoveryWrite, temporaryWrite, backupCopy]);
  try {
    await rename(temp, path);
  } catch {
    await rm(path, { force: true });
    await rename(temp, path);
  }
  await rm(recovery, { force: true });
}
