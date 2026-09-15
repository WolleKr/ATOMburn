import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";

const schema = z.object({ host: z.string().trim().min(1).max(253), tcpPort: z.number().int().min(1).max(65535), cameraPath: z.literal("/images/snapshot0.jpg"), serialPath: z.string().max(128).optional() }).strict();
export type LocalDeviceProfile = z.infer<typeof schema>;
export const DEFAULT_DEVICE_PROFILE: LocalDeviceProfile = Object.freeze({ host: "192.168.178.71", tcpPort: 23, cameraPath: "/images/snapshot0.jpg" });

export async function loadDeviceProfile(path: string): Promise<LocalDeviceProfile> {
  try { return schema.parse(JSON.parse(await readFile(path, "utf8"))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...DEFAULT_DEVICE_PROFILE };
    await rename(path, `${path}.invalid`).catch(() => undefined);
    return { ...DEFAULT_DEVICE_PROFILE };
  }
}

export async function saveDeviceProfile(path: string, value: unknown): Promise<LocalDeviceProfile> {
  const profile = schema.parse(value);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(profile, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
  return profile;
}
