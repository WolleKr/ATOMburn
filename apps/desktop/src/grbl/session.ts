import type { GrblMessage, GrblState } from "./protocol.js";

export type SessionState = "disconnected" | "connecting" | "synchronizing" | "idle" | "running" | "holding" | "alarm" | "faulted";

export class GrblSession {
  state: SessionState = "disconnected";
  machineState: GrblState = "Unknown";
  fault?: string;

  beginConnect(): void { if (this.state !== "disconnected") throw new Error("Session is already active."); this.state = "connecting"; }
  connected(): void { if (this.state !== "connecting") throw new Error("Unexpected connection."); this.state = "synchronizing"; }
  synchronized(): void { if (this.state !== "synchronizing" || this.machineState !== "Idle") throw new Error("Controller is not safely idle."); this.state = "idle"; }
  startJob(): void { if (this.state !== "idle") throw new Error("Jobs may start only from idle."); this.state = "running"; }
  requestHold(): void { if (this.state !== "running") throw new Error("Hold requires a running job."); this.state = "holding"; }
  requestResume(): void { if (this.state !== "holding" || this.machineState !== "Hold") throw new Error("Resume requires confirmed hold."); this.state = "running"; }
  completeJob(): void { if (this.state !== "running") throw new Error("No running job."); this.state = "idle"; }

  receive(message: GrblMessage): void {
    if (message.type === "status") {
      this.machineState = message.status.state;
      if (message.status.state === "Alarm") this.fail("Controller entered alarm.", "alarm");
      return;
    }
    if (message.type === "alarm") { this.machineState = "Alarm"; this.fail(`ALARM:${message.code}`, "alarm"); }
    else if (message.type === "error" && this.state === "running") this.fail(`error:${message.code}`);
    else if (message.type === "welcome" && (this.state === "running" || this.state === "holding")) this.fail("Unexpected controller reset.");
  }

  disconnected(reason = "Transport disconnected."): void {
    if (this.state === "running" || this.state === "holding") this.fail(reason);
    else { this.state = "disconnected"; this.machineState = "Unknown"; }
  }

  private fail(reason: string, state: "faulted" | "alarm" = "faulted"): void { this.fault = reason; this.state = state; }
}
