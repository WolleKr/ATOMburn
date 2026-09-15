import { LineDecoder } from "../grbl/line-decoder.js";
import { parseGrblLine } from "../grbl/parser.js";
import { REALTIME, type ByteTransport, type GrblMessage, type GrblState } from "../grbl/protocol.js";
import { assertEmissionFree, assertPosition, buildJog, buildLaserlessFrame, buildMoveTo, type JogDirection, type Position2D, type WorkspaceBounds } from "./motion-safety.js";
import { parseGeneratedGrbl } from "../cam/line-cam.js";
import { H_LASER_02_CODE } from "./approved-calibration.js";
import { buildCameraMarkCode, H_CAM_MARK_01_BOUNDS, H_CAM_MARK_01_FRAME_CODE, type CameraMarkSettings } from "./approved-camera-marks.js";

export type MachineAction =
  | { type: "home" } | { type: "unlock" } | { type: "check" }
  | { type: "jog"; direction: JogDirection; distance: number; feed: number }
  | { type: "move-to"; x: number; y: number; feed: number }
  | { type: "refresh" }
  | { type: "frame"; width: number; height: number; feed: number }
  | { type: "hold" } | { type: "resume" } | { type: "abort" };
export interface MachineSnapshot { connected: boolean; state: GrblState; homed?: boolean; position?: Position2D; fault?: string; transcript: { direction: "rx" | "tx"; text: string }[]; job?: { state:"running"|"held"|"completed"|"failed"|"aborted"; confirmedLines:number; totalLines:number; }; }

export class MachineController {
  private decoder = new LineDecoder();
  private readonly messages: GrblMessage[] = [];
  private readonly waiters = new Set<() => void>();
  private transcript: MachineSnapshot["transcript"] = [];
  private state: GrblState = "Unknown";
  private position?: Position2D;
  private fault?: string;
  private connected = false;
  private homed = false;
  private operationActive = false;
  private synchronizing = false;
  private job?: MachineSnapshot["job"];
  private readonly jobWaiters = new Set<() => void>();
  private offData?: () => void;
  private offDisconnect?: () => void;

  constructor(private readonly transport: ByteTransport, private readonly statusLineEnding: boolean, private readonly bounds: WorkspaceBounds = { width: 400, height: 400, minX: 1, minY: 1 }) {}

  async connect(): Promise<MachineSnapshot> {
    if (this.connected) throw new Error("Machine session is already connected.");
    this.decoder=new LineDecoder();this.fault=undefined;this.homed=false;
    this.offData = this.transport.onData((chunk) => this.receive(chunk));
    this.offDisconnect = this.transport.onDisconnect((reason) => { const moving = new Set<GrblState>(["Run", "Jog", "Hold", "Home"]).has(this.state); this.connected = false; this.state = "Unknown";this.fault??=moving ? `${reason} Accepted motion may continue to its endpoint; use the physical stop and inspect the machine.` : reason; this.wake(); });
    this.synchronizing = true;
    await this.transport.connect(); this.connected = true;
    await this.queryStatus(); this.synchronizing = false;
    return this.snapshot();
  }

  async disconnect(): Promise<void> { this.offData?.(); this.offDisconnect?.(); await this.transport.disconnect(); this.connected = false; this.state = "Unknown";this.homed=false; }

  snapshot(): MachineSnapshot { return { connected: this.connected, state: this.state, homed:this.homed, position: this.position && { ...this.position }, fault: this.fault, transcript: this.transcript.slice(-300), job:this.job&&{...this.job} }; }

  async readLaserSettings():Promise<{maxPower:number;laserMode:boolean}>{
    if(!this.connected||this.state!=="Idle"||this.operationActive)throw new Error("Controller settings require an exclusive Idle session.");
    this.operationActive=true;try{const start=this.messages.length;await this.sendLine("$$");const settings=this.messages.slice(start).filter((message):message is Extract<GrblMessage,{type:"setting"}>=>message.type==="setting");const maxPower=Number(settings.find(({key})=>key===30)?.value),laserMode=Number(settings.find(({key})=>key===32)?.value)===1;if(!Number.isFinite(maxPower)||maxPower<=0)throw new Error("Controller did not return a valid $30.");return{maxPower,laserMode};}finally{this.operationActive=false;}
  }

  async readSupervisedMachineProfile():Promise<{maxPower:number;laserMode:boolean;widthMm:number;heightMm:number}>{
    if(!this.connected||this.state!=="Idle"||this.operationActive)throw new Error("Controller profile requires an exclusive Idle session.");
    this.operationActive=true;try{const start=this.messages.length;await this.sendLine("$$");const settings=this.messages.slice(start).filter((message):message is Extract<GrblMessage,{type:"setting"}>=>message.type==="setting");const value=(key:number)=>Number(settings.find(setting=>setting.key===key)?.value);const maxPower=value(30),laserMode=value(32)===1,widthMm=value(130),heightMm=value(131);if(![maxPower,widthMm,heightMm].every(number=>Number.isFinite(number)&&number>0))throw new Error("Controller did not return valid $30/$130/$131 settings.");return{maxPower,laserMode,widthMm,heightMm};}finally{this.operationActive=false;}
  }

  async runApprovedFirstMark(code:string,onProgress?:()=>void):Promise<MachineSnapshot>{
    if(!this.connected||this.state!=="Idle"||this.operationActive)throw new Error("Approved job requires an exclusive Idle session.");
    if(code!==H_LASER_02_CODE)throw new Error("H-LASER-02 must remain byte-for-byte identical to the fixed 10 mm / S200 calibration mark.");
    const parsed=parseGeneratedGrbl(code);const motions=parsed.motions.filter(({mode})=>mode==="G1");if(motions.length!==1||Math.hypot(motions[0]!.x-30,motions[0]!.y-35)!==10)throw new Error("H-LASER-02 motion validation failed.");
    const lines=code.trim().split(/\r?\n/);this.operationActive=true;this.job={state:"running",confirmedLines:0,totalLines:lines.length};
    try{for(const line of lines){await this.waitUntilJobRunnable();await this.sendApprovedJobLine(line);this.job.confirmedLines++;onProgress?.();if(line.startsWith("G1 "))await this.waitForIdle(10_000);}await this.waitUntilJobRunnable();await this.sendLine("M5");await this.sendLine("$H",60_000);await this.queryStatus();this.homed=true;this.job.state="completed";return this.snapshot();}catch(error){if(this.job.state!=="aborted"){this.job.state="failed";this.fault=error instanceof Error?error.message:"Job or final homing failed.";}throw error;}finally{this.operationActive=false;this.wakeJobWaiters();}
  }
  async frameFirstMarkTarget():Promise<MachineSnapshot>{if(!this.connected||this.state!=="Idle"||this.operationActive)throw new Error("Target framing requires an exclusive Idle session.");this.operationActive=true;try{for(const line of ["M5","G21","G90","G0 X30 Y35"]){await this.sendLine(line);}await this.waitForIdle(20_000);if(!this.position)throw new Error("Target position was not confirmed.");for(const line of buildLaserlessFrame(this.position,10,10,3000,this.bounds)){await this.sendLine("M5");await this.sendLine(line);await this.waitForIdle(20_000);}return this.snapshot();}finally{this.operationActive=false;}}

  async frameCameraMarkTarget():Promise<MachineSnapshot>{
    if(!this.connected||this.state!=="Idle"||this.operationActive)throw new Error("Camera-mark framing requires an exclusive Idle session.");
    assertPosition({x:H_CAM_MARK_01_BOUNDS.minX,y:H_CAM_MARK_01_BOUNDS.minY},this.bounds);assertPosition({x:H_CAM_MARK_01_BOUNDS.maxX,y:H_CAM_MARK_01_BOUNDS.maxY},this.bounds);assertEmissionFree(H_CAM_MARK_01_FRAME_CODE);
    this.operationActive=true;try{for(const line of H_CAM_MARK_01_FRAME_CODE){await this.sendLine(line);if(line.startsWith("G0 ")||line.startsWith("$J="))await this.waitForIdle(20_000);}return this.snapshot();}finally{this.operationActive=false;}
  }

  async runApprovedCameraMarks(code:string,settings:CameraMarkSettings,onProgress?:()=>void):Promise<MachineSnapshot>{
    if(!this.connected||this.state!=="Idle"||this.operationActive)throw new Error("Approved camera-mark job requires an exclusive Idle session.");
    if(code!==buildCameraMarkCode(settings))throw new Error("H-CAM-MARK-01 must match the approved five-X settings exactly.");
    const parsed=parseGeneratedGrbl(code);if(parsed.maxFeedMmPerMin!==settings.speedMmPerMin)throw new Error("H-CAM-MARK-01 feed validation failed.");for(const motion of parsed.motions)assertPosition({x:motion.x,y:motion.y},this.bounds);
    const lines=code.trim().split(/\r?\n/);this.operationActive=true;this.job={state:"running",confirmedLines:0,totalLines:lines.length};
    try{for(const line of lines){await this.waitUntilJobRunnable();await this.sendApprovedJobLine(line);this.job.confirmedLines++;onProgress?.();if(line.startsWith("G1 "))await this.waitForIdle(15_000);}await this.waitUntilJobRunnable();await this.sendLine("M5");await this.sendLine("$H",60_000);await this.queryStatus();this.homed=true;this.job.state="completed";return this.snapshot();}catch(error){if(this.job.state!=="aborted"){this.job.state="failed";this.fault=error instanceof Error?error.message:"Camera-mark job failed.";}throw error;}finally{this.operationActive=false;this.wakeJobWaiters();}
  }

  async frameApprovedJobBounds(box:{minX:number;minY:number;maxX:number;maxY:number}):Promise<MachineSnapshot>{
    if(!this.connected||this.state!=="Idle"||this.operationActive)throw new Error("Job framing requires an exclusive Idle session.");
    const start={x:box.minX,y:box.minY};assertPosition(start,this.bounds);assertPosition({x:box.maxX,y:box.maxY},this.bounds);const width=box.maxX-box.minX,height=box.maxY-box.minY;
    this.operationActive=true;try{for(const line of ["M5","G21","G90",`G0 X${Number(box.minX.toFixed(4))} Y${Number(box.minY.toFixed(4))}`])await this.sendLine(line);await this.waitForIdle(20_000);for(const line of buildLaserlessFrame(start,width,height,3000,this.bounds)){await this.sendLine("M5");await this.sendLine(line);await this.waitForIdle(20_000);}return this.snapshot();}finally{this.operationActive=false;}
  }

  async runApprovedGeneratedCheck(code:string,onProgress?:()=>void):Promise<MachineSnapshot>{
    if(!this.connected||this.state!=="Idle"||this.operationActive)throw new Error("Approved Check-mode job requires an exclusive Idle session.");
    const parsed=parseGeneratedGrbl(code);const lines=code.trim().split(/\r?\n/);if(lines.length>5_000)throw new Error("Supervised generated job exceeds the 5000-line limit.");if(parsed.maxFeedMmPerMin>1_000)throw new Error("Supervised generated job exceeds the 1000 mm/min limit.");for(const motion of parsed.motions)assertPosition({x:motion.x,y:motion.y},this.bounds);
    this.operationActive=true;this.job={state:"running",confirmedLines:0,totalLines:lines.length};let checkEntered=false,exitAttempted=false;
    try{
      await this.sendLine("$C");await this.waitForState(new Set(["Check"]),3_000);checkEntered=true;
      for(const line of lines){await this.sendApprovedJobLine(line,10_000);this.job.confirmedLines++;onProgress?.();}
      exitAttempted=true;await this.leaveCheckModeAfterApprovedCheck();
      this.job.state="completed";return this.snapshot();
    }catch(error){
      if(this.connected&&!exitAttempted&&(checkEntered||this.snapshot().state==="Check"))await this.leaveCheckModeAfterApprovedCheck().catch(()=>undefined);
      this.job.state="failed";this.fault=error instanceof Error?error.message:"Check-mode job failed.";throw error;
    }finally{this.operationActive=false;}
  }

  async runApprovedGeneratedJob(code:string,onProgress?:()=>void):Promise<MachineSnapshot>{
    if(!this.connected||this.state!=="Idle"||this.operationActive)throw new Error("Approved generated job requires an exclusive Idle session.");
    const parsed=parseGeneratedGrbl(code);const lines=code.trim().split(/\r?\n/);if(lines.length>5_000)throw new Error("Supervised generated job exceeds the 5000-line limit.");if(parsed.maxFeedMmPerMin>1_000)throw new Error("Supervised generated job exceeds the 1000 mm/min limit.");for(const motion of parsed.motions)assertPosition({x:motion.x,y:motion.y},this.bounds);
    this.operationActive=true;this.job={state:"running",confirmedLines:0,totalLines:lines.length};
    try{for(const line of lines){await this.waitUntilJobRunnable();await this.sendApprovedJobLine(line);this.job.confirmedLines++;onProgress?.();}await this.waitUntilJobRunnable();await this.sendLine("M5");await this.waitForIdle(210_000);this.job.state="completed";return this.snapshot();}catch(error){if(this.job.state!=="aborted"){this.job.state="failed";this.fault=error instanceof Error?error.message:"Generated job failed.";}throw error;}finally{this.operationActive=false;this.wakeJobWaiters();}
  }

  async execute(action: MachineAction): Promise<MachineSnapshot> {
    if (!this.connected) throw new Error("Machine is not connected.");
    const urgent = action.type === "hold" || action.type === "resume" || action.type === "abort";
    if (!urgent && this.operationActive) throw new Error("Another machine operation is already active.");
    if (!urgent) this.operationActive = true;
    try { return await this.executeAction(action); }
    finally { if (!urgent) this.operationActive = false; }
  }

  private async executeAction(action: MachineAction): Promise<MachineSnapshot> {
    if (action.type === "abort") { if(this.job?.state==="running"||this.job?.state==="held")this.job.state="aborted";this.wakeJobWaiters();await this.abort();return this.snapshot(); }
    if (action.type === "hold") {
      const activeJob=this.job?.state==="running";
      if (!activeJob&&!new Set<GrblState>(["Run", "Jog"]).has(this.state)) throw new Error("Hold requires Run or Jog, or an active job session.");
      if(activeJob)this.job!.state="held";
      try{await this.writeRealtime(REALTIME.hold, "!");await this.waitForState(new Set(["Hold"]),3_000);return this.snapshot();}
      catch(error){if(this.job?.state==="held")this.job.state="failed";this.wakeJobWaiters();throw error;}
    }
    if (action.type === "resume") { if (this.state !== "Hold"||this.job?.state==="running") throw new Error("Resume requires a confirmed Hold for the active motion or job."); await this.writeRealtime(REALTIME.resume, "~"); await this.waitForState(new Set(["Run", "Jog", "Idle"]), 3_000);if(this.job?.state==="held")this.job.state="running";this.wakeJobWaiters();return this.snapshot(); }
    if (action.type === "home") { if (!new Set<GrblState>(["Idle", "Alarm"]).has(this.state)) throw new Error("Home requires Idle or Alarm."); await this.sendLine("$H", 60_000); await this.queryStatus();this.homed=true; return this.snapshot(); }
    if (action.type === "unlock") { if (this.state !== "Alarm") throw new Error("Unlock requires Alarm and physical inspection."); await this.sendLine("$X"); await this.queryStatus(); return this.snapshot(); }
    if (action.type === "check") { if (!new Set<GrblState>(["Idle", "Check"]).has(this.state)) throw new Error("Check mode requires Idle or Check."); await this.sendLine("$C"); await this.queryStatus(); return this.snapshot(); }
    if (action.type === "refresh") { await this.queryStatus(); return this.snapshot(); }
    if (this.state !== "Idle" || !this.position) throw new Error("Motion requires confirmed Idle state and position.");
    await this.sendLine("M5");
    const lines = action.type === "jog" ? [buildJog(this.position, action.direction, action.distance, action.feed, this.bounds)] : action.type === "move-to" ? [buildMoveTo({x:action.x,y:action.y},action.feed,this.bounds)] : buildLaserlessFrame(this.position, action.width, action.height, action.feed, this.bounds);
    assertEmissionFree(lines);
    for (const line of lines) { await this.sendLine(line); await this.waitForIdle(20_000); }
    return this.snapshot();
  }

  private async abort(): Promise<void> {
    if (!new Set<GrblState>(["Run", "Jog", "Hold"]).has(this.state)&&this.job?.state!=="running"&&this.job?.state!=="held"&&this.job?.state!=="aborted") throw new Error("Abort requires active or held motion, or an active job session.");
    await this.writeRealtime(REALTIME.hold, "!");
    await new Promise((resolve) => setTimeout(resolve, 100));
    await this.writeRealtime(REALTIME.reset, "CTRL-X");
    this.connected = false; this.state = "Unknown";this.homed=false; this.fault = "Motion aborted; reconnect and re-home required.";
    await this.transport.disconnect().catch(() => undefined);
  }

  private receive(chunk: Uint8Array): void {try{for (const line of this.decoder.push(chunk)) { const message = parseGrblLine(line); this.messages.push(message); this.transcript.push({ direction: "rx", text: line }); if (message.type === "status") { this.state = message.status.state; const point = message.status.workPosition ?? message.status.machinePosition; if (point) this.position = { x: point[0], y: point[1] }; } else if (message.type === "alarm") { this.state = "Alarm"; this.fault = `ALARM:${message.code}`; } else if (message.type === "welcome") { this.state = "Unknown"; this.position = undefined; if (!this.synchronizing) { this.connected = false; this.fault = "Unexpected controller reset."; } } this.wake(); }}catch{this.connected=false;this.state="Unknown";this.fault="Invalid non-UTF-8 data received on the GRBL channel; the session was disconnected without sending a job.";this.wake();void this.transport.disconnect().catch(()=>undefined);}}
  private wake(): void { for (const waiter of this.waiters) waiter(); }
  private wakeJobWaiters():void{for(const waiter of this.jobWaiters)waiter();this.jobWaiters.clear();}
  private async waitUntilJobRunnable():Promise<void>{while(this.job?.state==="held")await new Promise<void>(resolve=>this.jobWaiters.add(resolve));if(this.job?.state==="aborted"||!this.connected)throw new Error("Job aborted; reconnect and re-home required.");}
  private async waitAfter(start: number, predicate: (message: GrblMessage) => boolean, timeoutMs: number): Promise<GrblMessage> { const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { const found = this.messages.slice(start).find(predicate); if (found) return found; if (!this.connected) throw new Error(this.fault ?? "Transport disconnected."); await new Promise<void>((resolve) => { const timer = setTimeout(() => { this.waiters.delete(done); resolve(); }, Math.max(1, Math.min(50, deadline - Date.now()))); const done = () => { clearTimeout(timer); this.waiters.delete(done); resolve(); }; this.waiters.add(done); }); } throw new Error("Controller response timed out."); }
  private async leaveCheckModeAfterApprovedCheck():Promise<void>{
    const start=this.messages.length;this.synchronizing=true;
    try{
      this.transcript.push({direction:"tx",text:"$C"});await this.transport.write(new TextEncoder().encode("$C\n"));
      const response=await this.waitAfter(start,message=>message.type==="ok"||message.type==="error"||message.type==="alarm"||message.type==="welcome",5_000);
      if(response.type==="error")throw new Error(`Controller error:${response.code}`);if(response.type==="alarm")throw new Error(`Controller ALARM:${response.code}`);
      const resetDeadline=Date.now()+750;while(Date.now()<resetDeadline&&!this.messages.slice(start).some(message=>message.type==="welcome"))await new Promise(resolve=>setTimeout(resolve,25));
      await this.waitForState(new Set(["Idle","Alarm"]),5_000);
    }finally{this.synchronizing=false;}
  }
  private async sendLine(line: string, timeoutMs = 5_000): Promise<void> { assertEmissionFree([line]); const start = this.messages.length; this.transcript.push({ direction: "tx", text: line }); await this.transport.write(new TextEncoder().encode(`${line}\n`)); const response = await this.waitAfter(start, (message) => message.type === "ok" || message.type === "error" || message.type === "alarm" || message.type === "welcome", timeoutMs); if (response.type !== "ok") throw new Error(response.type === "error" ? `Controller error:${response.code}` : response.type === "alarm" ? `Controller ALARM:${response.code}` : "Controller reset unexpectedly."); }
  private async sendApprovedJobLine(line:string,timeoutMs=5_000):Promise<void>{const start=this.messages.length;this.transcript.push({direction:"tx",text:line});await this.transport.write(new TextEncoder().encode(`${line}\n`));const response=await this.waitAfter(start,message=>message.type==="ok"||message.type==="error"||message.type==="alarm"||message.type==="welcome",timeoutMs);if(response.type!=="ok")throw new Error(response.type==="error"?`Controller error:${response.code}`:response.type==="alarm"?`Controller ALARM:${response.code}`:"Controller reset unexpectedly.");}
  private async queryStatus(): Promise<void> { const start = this.messages.length; this.transcript.push({ direction: "tx", text: "?" }); await this.transport.write(this.statusLineEnding ? Uint8Array.of(REALTIME.status, 0x0a) : Uint8Array.of(REALTIME.status)); const status = await this.waitAfter(start, (message) => message.type === "status", 3_000); if (this.statusLineEnding && status.type === "status" && status.status.state !== "Run" && status.status.state !== "Hold") await this.waitAfter(start, (message) => message.type === "ok", 250).catch(() => undefined); }
  private async writeRealtime(byte: number, label: string): Promise<void> { this.transcript.push({ direction: "tx", text: label }); await this.transport.write(this.statusLineEnding ? Uint8Array.of(byte, 0x0a) : Uint8Array.of(byte)); }
  private async waitForState(states: Set<GrblState>, timeoutMs: number): Promise<void> { const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { await this.queryStatus(); if (states.has(this.state)) return; await new Promise((resolve) => setTimeout(resolve, 75)); } throw new Error("Machine state transition timed out."); }
  private async waitForIdle(timeoutMs: number): Promise<void> { await this.waitForState(new Set(["Idle"]), timeoutMs); }
}
