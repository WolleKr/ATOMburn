import {useCallback,useEffect,useRef,useState} from "react";
import type {ProjectDocument} from "../../../domain/project";
import type {MachineSnapshot} from "../../../machine/machine-controller";
import type {LocalDeviceProfile,MotionSafetyAcknowledgement,SupervisedRasterSummary} from "../../../shared/contracts";
import {getBridge} from "../platform";

const disconnected:MachineSnapshot={connected:false,state:"Unknown",transcript:[]};
type WorkflowStep="connect"|"home-initial"|"prepare"|"check"|"home-after-check"|"frame"|"start"|"completed"|"failed";
const stamp=()=>new Date().toLocaleTimeString("de-DE",{hour12:false});
const describe=(snapshot:MachineSnapshot)=>{const position=snapshot.position?` · X${snapshot.position.x.toFixed(3)} Y${snapshot.position.y.toFixed(3)}`:"";const job=snapshot.job?` · Job ${snapshot.job.state} ${snapshot.job.confirmedLines}/${snapshot.job.totalLines}`:"";const controller=snapshot.job&&new Set(["running","held"]).has(snapshot.job.state)?`GRBL ${snapshot.state} (letzter bestätigter Status)`:snapshot.state;return `${snapshot.connected?"verbunden":"getrennt"} · ${controller}${position}${job}`;};
const labels:Record<WorkflowStep,{next:string;button:string}>={
 connect:{next:"Testsession zum GRBL-Controller herstellen.",button:"1 · Testsession verbinden"},
 "home-initial":{next:"Referenzfahrt vor dem Raster-Preflight ausführen.",button:"2 · Homing ausführen"},
 prepare:{next:"Feste Schwarzweiß-Testkarte und unveränderliches Jobticket erzeugen.",button:"3 · Raster vorbereiten"},
 check:{next:"Raster-G-Code im GRBL-Checkmodus prüfen.",button:"4 · Checkmodus ausführen"},
 "home-after-check":{next:"Nach dem Checkmodus erneut homen.",button:"5 · Erneutes Homing"},
 frame:{next:"Die 5×5-mm-Grenzen ohne Laser abfahren.",button:"6 · Laserlos framen"},
 start:{next:"Wenn der Rahmen passt, startet der nächste Klick H-RASTER-BW-01.",button:"7 · Rahmen passt – Rastertest starten"},
 completed:{next:"Workflow abgeschlossen. Ergebnis und Protokoll prüfen.",button:"Workflow abgeschlossen"},
 failed:{next:"Workflow gestoppt. Details stehen im Protokoll.",button:"Workflow gestoppt"}
};

export function SupervisedRasterDialog({project,onClose,initialMachine=disconnected,initialStep="connect"}:{project:ProjectDocument;onClose:()=>void;initialMachine?:MachineSnapshot;initialStep?:WorkflowStep}){
 const [profile,setProfile]=useState<LocalDeviceProfile>({host:"192.168.178.71",tcpPort:23,cameraPath:"/images/snapshot0.jpg"});
 const [machine,setMachine]=useState(initialMachine);const [step,setStep]=useState<WorkflowStep>(initialStep);const [summary,setSummary]=useState<SupervisedRasterSummary>();const [busy,setBusy]=useState(false);const [camera,setCamera]=useState<{data?:string;error?:string}>({});const [entries,setEntries]=useState<string[]>(()=>[`[${stamp()}] Sprint-14-Raster-Workflow geöffnet.`]);const lastStatus=useRef("");
 const record=useCallback((message:string)=>setEntries(current=>[...current,`[${stamp()}] ${message}`]),[]);
 const applySnapshot=useCallback((snapshot:MachineSnapshot,force=false)=>{setMachine(snapshot);const signature=describe(snapshot);if(force||lastStatus.current!==signature){lastStatus.current=signature;record(`Status: ${signature}`);}},[record]);
 useEffect(()=>{void getBridge().getDeviceProfile().then(setProfile);return()=>{void getBridge().disconnectMachine();};},[]);
 useEffect(()=>{let active=true;const poll=async()=>{const [snapshot,frame]=await Promise.all([machine.connected?getBridge().getMachineSnapshot():Promise.resolve(undefined),getBridge().getCameraFrame({host:profile.host})]);if(!active)return;if(snapshot)applySnapshot(snapshot);if(frame.status==="ok")setCamera({data:frame.dataUrl});else setCamera(current=>({...current,error:frame.message}));};void poll();const timer=window.setInterval(()=>void poll(),1000);return()=>{active=false;window.clearInterval(timer);};},[machine.connected,profile.host,applySnapshot]);
 const canRun=!busy&&step!=="completed"&&step!=="failed"&&(step==="connect"?true:step==="home-initial"||step==="home-after-check"?machine.connected&&(machine.state==="Idle"||machine.state==="Alarm"):machine.connected&&machine.state==="Idle");
 const run=async()=>{if(!canRun)return;setBusy(true);record(`START ${labels[step].button}`);try{
   if(step==="connect"){const gate:MotionSafetyAcknowledgement={physicallyPresent:true,workAreaClear:true,emergencyStopReady:true,otherControllersClosed:true,motionApproved:true,laserOffConfirmed:true};const snapshot=await getBridge().connectMachine({kind:"tcp",host:profile.host,port:profile.tcpPort},gate);applySnapshot(snapshot,true);setStep("home-initial");record("OK Testsession verbunden.");}
   else if(step==="home-initial"||step==="home-after-check"){const afterCheck=step==="home-after-check";const snapshot=await getBridge().homeSupervisedRaster();applySnapshot(snapshot,true);setStep(afterCheck?"frame":"prepare");record(`OK ${afterCheck?"Homing nach Check-Reset":"erstes Homing"} abgeschlossen.`);}
   else if(step==="prepare"){const next=await getBridge().prepareSupervisedRaster(project);setSummary(next);setStep("check");record(`OK Preflight ${next.testId}: Bounds ${next.bounds.minX},${next.bounds.minY} → ${next.bounds.maxX},${next.bounds.maxY} mm · ${next.speedMmPerMin} mm/min · ${next.powerPercent}% · S${Math.round(next.powerPercent/100*next.maxPower)} · ${next.intervalMm} mm Intervall · ${next.totalLines} Zeilen · ≈${next.estimatedSeconds}s.`);record(`Maschinenprofil: $30=${next.maxPower} · $32=${next.laserMode?1:0} · $130=${next.workspaceWidth} · $131=${next.workspaceHeight}.`);record(`SHA-256 ${next.hash}`);}
   else if(step==="check"){const snapshot=await getBridge().checkSupervisedRaster();applySnapshot(snapshot,true);setStep("home-after-check");record("OK Checkmodus vollständig verarbeitet.");}
   else if(step==="frame"){const snapshot=await getBridge().frameSupervisedRaster();applySnapshot(snapshot,true);setStep("start");record("OK laserloses Framing abgeschlossen.");}
   else if(step==="start"){if(!summary)throw new Error("Preflight summary is missing.");record(`Nutzerstart ${summary.testId} bestätigt.`);const snapshot=await getBridge().startSupervisedRaster({testId:"H-RASTER-BW-01",supervisedReady:true});applySnapshot(snapshot,true);setStep("completed");record(`OK ${summary.testId} abgeschlossen. Endstatus: ${describe(snapshot)}.`);}
  }catch(error){record(`FEHLER bei ${labels[step].button}: ${error instanceof Error?error.message:"Unbekannter Fehler"}`);if(step!=="connect")setStep("failed");}finally{setBusy(false);}};
 const action=async(type:"hold"|"resume"|"abort")=>{try{const snapshot=await getBridge().machineAction({type});applySnapshot(snapshot,true);if(type==="abort")setStep("failed");record(`OK ${type.toUpperCase()}.`);}catch(error){record(`FEHLER ${type.toUpperCase()}: ${error instanceof Error?error.message:"Unbekannter Fehler"}`);}};
 const current=labels[step];
 return <div className="dialog-backdrop" role="presentation"><section className="first-mark-dialog" role="dialog" aria-modal="true" aria-labelledby="raster-job-title"><header><div><span className="simulator-dialog__eyebrow">Guided machine workflow</span><h2 id="raster-job-title">Supervised Raster test</h2></div><button disabled={busy} onClick={onClose}>Close</button></header>
  <p role="status"><strong>Nächster Schritt:</strong> {current.next}</p><p><strong>Machine:</strong> {describe(machine)}</p>
  <button className={`workflow-next${step==="start"?" workflow-emission":""}`} disabled={!canRun} onClick={()=>void run()}>{busy?"Schritt läuft …":current.button}</button>
  <div className="first-mark-layout"><section>{summary?<section className="first-mark-summary"><h3>{summary.testId} Preflight</h3><dl><div><dt>Bounds</dt><dd>{summary.bounds.minX},{summary.bounds.minY} → {summary.bounds.maxX},{summary.bounds.maxY} mm</dd></div><div><dt>Speed</dt><dd>{summary.speedMmPerMin} mm/min</dd></div><div><dt>Power</dt><dd>{summary.powerPercent}% / S{Math.round(summary.powerPercent/100*summary.maxPower)}</dd></div><div><dt>Raster</dt><dd>{summary.rasterMode}, {summary.intervalMm} mm, {summary.passes} Pass</dd></div><div><dt>GRBL profile</dt><dd>$30={summary.maxPower}, $32={summary.laserMode?1:0}, {summary.workspaceWidth}×{summary.workspaceHeight} mm</dd></div><div><dt>Estimate</dt><dd>≈ {summary.estimatedSeconds} s</dd></div></dl><code>SHA-256 {summary.hash}</code></section>:<p>Die festen Testparameter erscheinen nach der Vorbereitung.</p>}</section><section className="first-mark-camera">{camera.data?<img src={camera.data} alt="LaserCam supervised Raster view"/>:<div>No camera frame</div>}<strong>{camera.error?`Camera: ${camera.error}`:"LaserCam snapshot live"}</strong></section></div>
  <div className="camera-safety-actions"><button disabled={machine.job?.state!=="running"&&!new Set(["Run","Jog"]).has(machine.state)} onClick={()=>void action("hold")}>Hold</button><button disabled={machine.job?.state!=="held"||machine.state!=="Hold"} onClick={()=>void action("resume")}>Resume</button><button className="stop-button" disabled={!new Set(["running","held"]).has(machine.job?.state??"")&&!new Set(["Run","Jog","Hold"]).has(machine.state)} onClick={()=>void action("abort")}>Stop job</button></div>{machine.job?<progress max={machine.job.totalLines} value={machine.job.confirmedLines} aria-label="Confirmed Raster job lines"/>:null}
  <label className="workflow-log">Workflow log<textarea aria-label="Raster workflow log" readOnly value={entries.join("\n")}/></label>
 </section></div>;
}
