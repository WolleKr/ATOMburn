export type ConnectionKind = "tcp" | "serial";

export class ConnectionCoordinator {
  private active?: ConnectionKind;

  acquire(kind: ConnectionKind): () => void {
    if (this.active) throw new Error(`${this.active.toUpperCase()} is already connected. Disconnect it before using ${kind.toUpperCase()}.`);
    this.active = kind;
    let released = false;
    return () => {
      if (!released && this.active === kind) this.active = undefined;
      released = true;
    };
  }

  get activeKind(): ConnectionKind | undefined { return this.active; }
}
