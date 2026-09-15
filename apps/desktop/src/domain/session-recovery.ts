/** Faults always require a newer, explicitly observed synchronized Idle state. */
export type RecoveryFault =
  | "connection-loss"
  | "app-restart"
  | "renderer-crash"
  | "sleep-wake"
  | "network-change"
  | "timeout"
  | "alarm";
export type RecoveryState = "ready" | "recovery-required";
export interface RecoveryRecord { fault: RecoveryFault; at: number; detail?: string; }

export class SessionRecoveryPolicy {
  private state: RecoveryState = "ready";
  private records: RecoveryRecord[] = [];
  private lastFaultAt = Number.NEGATIVE_INFINITY;

  recordFault(fault: RecoveryFault, at: number, detail?: string): void {
    if (!Number.isFinite(at)) throw new Error("Fault time must be finite.");
    this.state = "recovery-required";
    this.lastFaultAt = Math.max(this.lastFaultAt, at);
    this.records.push({ fault, at, ...(detail ? { detail: detail.slice(0, 500) } : {}) });
    if (this.records.length > 100) this.records.splice(0, this.records.length - 100);
  }

  synchronizedIdle(observedAt: number): void {
    if (!Number.isFinite(observedAt)) throw new Error("Idle observation time must be finite.");
    if (observedAt <= this.lastFaultAt) throw new Error("The synchronized Idle observation must be newer than the last fault.");
    this.state = "ready";
  }

  canStartJob(): boolean { return this.state === "ready"; }

  requireFreshIdle(): void {
    if (!this.canStartJob()) throw new Error("A fresh synchronized Idle state is required; jobs never auto-resume.");
  }

  snapshot(): { state: RecoveryState; records: ReadonlyArray<RecoveryRecord> } {
    return { state: this.state, records: this.records.map((record) => ({ ...record })) };
  }
}
