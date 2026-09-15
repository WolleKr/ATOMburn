export interface Position2D { x: number; y: number; }
export interface WorkspaceBounds { width: number; height: number; minX?: number; minY?: number; }
export type JogDirection = "x+" | "x-" | "y+" | "y-" | "x+y+" | "x-y+" | "x+y-" | "x-y-";

const finitePositive = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be finite and positive.`);
};

export function assertPosition(position: Position2D, bounds: WorkspaceBounds): void {
  finitePositive(bounds.width, "Workspace width"); finitePositive(bounds.height, "Workspace height");
  if (![position.x, position.y].every(Number.isFinite)) throw new Error("Position must contain finite coordinates.");
  if (position.x < (bounds.minX ?? 0) || position.y < (bounds.minY ?? 0) || position.x > bounds.width || position.y > bounds.height) throw new Error("Motion exceeds the configured workspace.");
}

export function buildJog(position: Position2D, direction: JogDirection, distance: number, feed: number, bounds: WorkspaceBounds): string {
  finitePositive(distance, "Jog distance"); finitePositive(feed, "Jog feed");
  if (distance > 10) throw new Error("Jog distance exceeds the 10 mm safety limit.");
  if (feed > 3_000) throw new Error("Jog feed exceeds the 3000 mm/min safety limit.");
  const delta = { x: 0, y: 0 };
  if (direction.includes("x+")) delta.x = distance; else if (direction.includes("x-")) delta.x = -distance;
  if (direction.includes("y+")) delta.y = distance; else if (direction.includes("y-")) delta.y = -distance;
  assertPosition({ x: position.x + delta.x, y: position.y + delta.y }, bounds);
  const axes = [delta.x ? `X${format(delta.x)}` : "", delta.y ? `Y${format(delta.y)}` : ""].filter(Boolean).join(" ");
  return `$J=G91 G21 ${axes} F${format(feed)}`;
}

export function buildMoveTo(position:Position2D,feed:number,bounds:WorkspaceBounds):string{
  finitePositive(feed,"Move feed");
  if(feed>3_000)throw new Error("Move feed exceeds the 3000 mm/min safety limit.");
  assertPosition(position,bounds);
  return `$J=G90 G21 X${format(position.x)} Y${format(position.y)} F${format(feed)}`;
}

export function buildLaserlessFrame(position: Position2D, width: number, height: number, feed: number, bounds: WorkspaceBounds): string[] {
  finitePositive(width, "Frame width"); finitePositive(height, "Frame height"); finitePositive(feed, "Frame feed");
  if (width > 50 || height > 50) throw new Error("Diagnostic frame exceeds the 50 mm safety limit.");
  if (feed > 3_000) throw new Error("Frame feed exceeds the 3000 mm/min safety limit.");
  assertPosition(position, bounds); assertPosition({ x: position.x + width, y: position.y + height }, bounds);
  return [
    `$J=G91 G21 X${format(width)} F${format(feed)}`,
    `$J=G91 G21 Y${format(height)} F${format(feed)}`,
    `$J=G91 G21 X-${format(width)} F${format(feed)}`,
    `$J=G91 G21 Y-${format(height)} F${format(feed)}`
  ];
}

export function assertEmissionFree(lines: readonly string[]): void {
  for (const line of lines) {
    const normalized = line.toUpperCase();
    if (/\bM0?3\b|\bM0?4\b/.test(normalized) || /(?:^|\s)S(?:\s*)?(?!0(?:\.0+)?(?:\s|$))\d/.test(normalized)) throw new Error("Laser emission command blocked.");
  }
}

const format = (value: number) => Number(value.toFixed(3)).toString();
