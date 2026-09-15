import { createHash } from "node:crypto";
import { parseGeneratedGrbl } from "../cam/line-cam.js";

export type JobMachineState="Idle"|"Run"|"Hold"|"Alarm"|"Unknown";
export interface JobInputs {gcode:string;profileId:string;connectionId:string;maxPower:number;laserMode:boolean;maxPowerPercent:number;machineState:JobMachineState;workspaceWidth?:number;workspaceHeight?:number;}
export interface JobTicket {hash:string;fingerprint:string;totalLines:number;maxPowerPercent:number;profileId:string;connectionId:string;}
export interface JobSnapshot {state:"unprepared"|"prepared"|"running"|"held"|"completed"|"aborted"|"failed";confirmedLines:number;totalLines:number;progressPercent:number;fault?:string;}
const sha=(value:string)=>createHash("sha256").update(value,"utf8").digest("hex");
const fingerprint=(value:JobInputs)=>sha(JSON.stringify({hash:sha(value.gcode),profileId:value.profileId,connectionId:value.connectionId,maxPower:value.maxPower,laserMode:value.laserMode,maxPowerPercent:value.maxPowerPercent,workspaceWidth:value.workspaceWidth,workspaceHeight:value.workspaceHeight}));

export class JobGuard{
  #state:JobSnapshot["state"]="unprepared";#ticket?:JobTicket;#confirmed=0;#consumed=false;#fault?:string;
  prepare(input:JobInputs):JobTicket{if(!input.laserMode)throw new Error("Preflight requires $32=1.");if(!Number.isFinite(input.maxPower)||input.maxPower<=0)throw new Error("Preflight requires valid $30.");if(!Number.isFinite(input.maxPowerPercent)||input.maxPowerPercent<0||input.maxPowerPercent>20)throw new Error("Supervised calibration tests are limited to 20% power.");const parsed=parseGeneratedGrbl(input.gcode);const expectedPower=Math.round(input.maxPowerPercent/100*input.maxPower);if(parsed.maxPowerValue!==expectedPower)throw new Error(`G-code power S${parsed.maxPowerValue} does not match ${input.maxPowerPercent}% of controller $30=${input.maxPower}.`);const ticket=Object.freeze({hash:sha(input.gcode),fingerprint:fingerprint(input),totalLines:input.gcode.trim().split(/\r?\n/).length,maxPowerPercent:input.maxPowerPercent,profileId:input.profileId,connectionId:input.connectionId});this.#ticket=ticket;this.#state="prepared";this.#confirmed=0;this.#consumed=false;this.#fault=undefined;return ticket;}
  start(ticket:JobTicket,input:JobInputs){if(this.#state==="running"||this.#state==="held")throw new Error("Job is already active.");if(this.#consumed||this.#state==="aborted"||this.#state==="failed")throw new Error("A fresh preflight is required.");if(input.machineState!=="Idle")throw new Error("Jobs start only from Idle.");if(!input.laserMode)throw new Error("Controller $32 changed.");if(ticket!==this.#ticket||ticket.fingerprint!==fingerprint(input))throw new Error("G-code, connection, profile or controller settings changed after approval.");this.#consumed=true;this.#state="running";}
  acknowledge(){if(this.#state!=="running"||!this.#ticket)return;this.#confirmed=Math.min(this.#ticket.totalLines,this.#confirmed+1);if(this.#confirmed===this.#ticket.totalLines)this.#state="completed";}
  hold(){if(this.#state!=="running")throw new Error("Hold requires a running job.");this.#state="held";}
  resume(machineState:JobMachineState){if(this.#state!=="held"||machineState!=="Hold")throw new Error("Resume requires confirmed Hold.");this.#state="running";}
  abort(){if(this.#state!=="running"&&this.#state!=="held")throw new Error("Abort requires an active job.");this.#state="aborted";this.#fault="Aborted; reconnect and re-home before any new job.";}
  fail(reason:string){this.#state="failed";this.#fault=reason;}
  snapshot():JobSnapshot{const total=this.#ticket?.totalLines??0;return{state:this.#state,confirmedLines:this.#confirmed,totalLines:total,progressPercent:total?Number((this.#confirmed/total*100).toFixed(1)):0,fault:this.#fault};}
}
