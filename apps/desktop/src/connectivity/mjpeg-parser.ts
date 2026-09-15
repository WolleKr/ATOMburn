export class MjpegParser {
  private buffer = Buffer.alloc(0);
  private readonly marker = Buffer.from("\r\n--");

  push(chunk: Uint8Array): Buffer[] {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(chunk)]);
    const frames: Buffer[] = [];
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) break;
      const header = this.buffer.subarray(0, headerEnd).toString("latin1");
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (match) {
        const length = Number(match[1]);
        const start = headerEnd + 4;
        if (!Number.isSafeInteger(length) || length < 2 || length > 20_000_000) throw new Error("Invalid MJPEG frame length.");
        if (this.buffer.length < start + length) break;
        const frame = this.buffer.subarray(start, start + length);
        this.buffer = this.buffer.subarray(start + length);
        if (isJpeg(frame)) frames.push(frame);
        continue;
      }
      const start = headerEnd + 4;
      const next = this.buffer.indexOf(this.marker, start);
      if (next < 0) break;
      const frame = this.buffer.subarray(start, next);
      this.buffer = this.buffer.subarray(next + 2);
      if (isJpeg(frame)) frames.push(frame);
    }
    if (this.buffer.length > 25_000_000) throw new Error("MJPEG buffer limit exceeded.");
    return frames;
  }
}

function isJpeg(frame: Uint8Array): boolean { return frame.length >= 4 && frame[0] === 0xff && frame[1] === 0xd8 && frame.at(-2) === 0xff && frame.at(-1) === 0xd9; }
