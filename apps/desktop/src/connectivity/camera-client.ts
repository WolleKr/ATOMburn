import { get } from "node:http";
import { MjpegParser } from "./mjpeg-parser.js";

export interface CameraProfile { host: string; port?: number; path?: string; username?: string; password?: string; timeoutMs?: number; }
export interface CameraFrame { contentType: "image/jpeg"; bytes: Uint8Array; }

export async function fetchMjpegFrame(profile: CameraProfile): Promise<CameraFrame> {
  if (!profile.host.trim()) throw new Error("Camera host is required.");
  const parser = new MjpegParser();
  return new Promise<CameraFrame>((resolve, reject) => {
    let settled = false;
    const finishError = (error: Error) => { if (!settled) { settled = true; reject(error); } };
    const request = get({
      hostname: profile.host,
      port: profile.port ?? 80,
      path: profile.path ?? "/images/snapshot0.jpg",
      headers: profile.username ? { Authorization: `Basic ${Buffer.from(`${profile.username}:${profile.password ?? ""}`).toString("base64")}` } : undefined
    }, (response) => {
      if (response.statusCode !== 200) { response.resume(); finishError(new Error(`Camera returned HTTP ${response.statusCode ?? "unknown"}.`)); return; }
      const contentType = response.headers["content-type"] ?? "";
      if (!contentType.toLowerCase().includes("multipart") && !contentType.toLowerCase().includes("image/jpeg")) { response.resume(); finishError(new Error("Camera response is neither JPEG nor MJPEG.")); return; }
      const jpegChunks: Buffer[] = [];
      let jpegBytes = 0;
      response.on("data", (chunk: Buffer) => {
        try {
          if (contentType.toLowerCase().includes("image/jpeg")) {
            jpegBytes += chunk.length;
            if (jpegBytes > 8 * 1024 * 1024) throw new Error("Camera image exceeds the 8 MiB safety limit.");
            jpegChunks.push(chunk);
            return;
          }
          const frame = parser.push(chunk)[0];
          if (frame && !settled) { settled = true; resolve({ contentType: "image/jpeg", bytes: new Uint8Array(frame) }); request.destroy(); }
        } catch (error) { request.destroy(); finishError(error instanceof Error ? error : new Error("Invalid camera stream.")); }
      });
      response.on("end", () => {
        if (settled || !contentType.toLowerCase().includes("image/jpeg")) return;
        const bytes = Buffer.concat(jpegChunks);
        if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) { finishError(new Error("Camera returned an incomplete JPEG image.")); return; }
        settled = true; resolve({ contentType: "image/jpeg", bytes: new Uint8Array(bytes) });
      });
      response.on("error", finishError);
    });
    request.setTimeout(profile.timeoutMs ?? 4_000, () => request.destroy(new Error("Camera frame timed out.")));
    request.on("error", finishError);
  });
}
