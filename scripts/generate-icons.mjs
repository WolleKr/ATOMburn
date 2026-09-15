import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const source = resolve("apps/desktop/assets/app-icon.svg");
const destination = resolve("apps/desktop/assets/icons");
const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
const svg = await readFile(source);
await mkdir(destination, { recursive: true });
await Promise.all(sizes.map((size) => sharp(svg, { density: 384 }).resize(size, size).png().toFile(resolve(destination, `app-icon-${size}.png`))));
await sharp(svg, { density: 384 }).resize(1024, 1024).png().toFile(resolve("apps/desktop/assets/app-icon.png"));
console.log(`ATOMburn icons generated: ${sizes.join(", ")} px`);
