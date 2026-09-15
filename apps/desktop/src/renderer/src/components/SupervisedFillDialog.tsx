import {useCallback,useEffect,useRef,useState} from "react";
import type {ProjectDocument} from "../../../domain/project";
import type {MachineSnapshot} from "../../../machine/machine-controller";
import type {LocalDeviceProfile,MotionSafetyAcknowledgement,SupervisedFillSummary} from "../../../shared/contracts";
import {getBridge} from "../platform";

const disconnected:MachineSnapshot={connected:false,state:"Unknown",transcript:[]};
type WorkflowStep="connect"|"home-initial"|"prepare"|"check"|"home-after-check"|"frame"|"start"|"completed"|"failed";
const stamp=()=>new Date().toLocaleTimeString("de-DE",{hour12:false});
const describe=(snapshot:MachineSnapshot)=>{const position=snapshot.position?` · X${snapshot.position.x.toFixed(3)} Y${snapshot.position.y.toFixed(3)}`:"";const job=snapshot.job?` · Job ${snapshot.job.state} ${snapshot.job.confirmedLines}/${snapshot.job.totalLines}`:"";const controller=snapshot.job&&new Set(["running","held"]).has(snapshot.job.state)?`GRBL ${snapshot.state} (last confirmed status)`:snapshot.state;return `${snapshot.connected?"connected":"disconnected"} · ${controller}${position}${job}`;};
const labels:Record<WorkflowStep,{next:string;button:string}>={
 connect:{next:"Verbindung zum GRBL-Controller herstellen.",button:"1 · Verbinden"},
 "home-initial":{next:"Referenzfahrt vor dem Preflight ausführen.",button:"2 · Homing ausführen"},
 prepare:{next:"Fill-G-Code und unveränderliches Freigabeticket erzeugen.",button:"3 · Fill vorbereiten"},
 check:{next:"G-Code im GRBL-Checkmodus ohne Bewegung und ohne Laser prüfen.",button:"4 · Checkmodus ausführen"},
 "home-after-check":{next:"GRBL setzt sich beim Verlassen des Checkmodus zurück. Jetzt erneut homen.",button:"5 · Erneutes Homing"},
 frame:{next:"Die 5×5-mm-Grenzen ohne Laser abfahren.",button:"6 · Laserlos framen"},
 start:{next:"Rahmen visuell prüfen. Wenn er passt, startet der nächste Klick den angezeigten Lasertest.",button:"7 · Rahmen passt – Lasertest starten"},
 completed:{next:"Workflow abgeschlossen. Ergebnis prüfen; das vollständige Protokoll steht unten.",button:"Workflow abgeschlossen"},
 failed:{next:"Workflow gestoppt. Details stehen im Protokoll; Dialog schließen und neu beginnen.",button:"Workflow gestoppt"}
};

export function SupervisedFillDialog({project,onClose}:{project:ProjectDocument;onClose:()=>void}){
 const [profile,setProfile]=useState<LocalDeviceProfile>({host:"192.168.178.71",tcpPort:23,cameraPath:"/images/snapshot0.jpg"});
 const [machine,setMachine]=useState(disconnected);const [ready,setReady]=useState(false);const [step,setStep]=useState<WorkflowStep>("connect");const [summary,setSummary]=useState<SupervisedFillSummary>();const [busy,setBusy]=useState(false);const [camera,setCamera]=useState<{data?:string;error?:string}>({});const [entries,setEntries]=useState<string[]>(()=>[`[${stamp()}] Sprint-10-Fill-Workflow geöffnet.`]);const lastStatus=useRef("");
 const record=useCallback((message:string)=>setEntries(current=>[...current,`[${stamp()}] ${message}`]),[]);
 const applySnapshot=useCallback((snapshot:MachineSnapshot,force=false)=>{setMachine(snapshot);const signature=describe(snapshot);if(force||lastStatus.current!==signature){lastStatus.current=signature;record(`Status: ${signature}`);}},[record]);
 useEffect(()=>{void getBridge().getDeviceProfile().then(setProfile);return()=>{void getBridge().disconnectMachine();};},[]);
 useEffect(()=>{let active=true;const poll=async()=>{const [snapshot,frame]=await Promise.all([machine.connected?getBridge().getMachineSnapshot():Promise.resolve(undefined),getBridge().getCameraFrame({host:profile.host})]);if(!active)return;if(snapshot)applySnapshot(snapshot);if(frame.status==="ok")setCamera({data:frame.dataUrl});else setCamera(current=>({...current,error:frame.message}));};void poll();const timer=window.setInterval(()=>void poll(),1000);return()=>{active=false;window.clearInterval(timer);};},[machine.connected,profile.host,applySnapshot]);
 const canRun=!busy&&step!=="completed"&&step!=="failed"&&(step==="connect"?ready:step==="home-initial"||step==="home-after-check"?machine.connected&&(machine.state==="Idle"||machine.state==="Alarm"):machine.connected&&machine.state==="Idle");
 const run=async()=>{
  if(!canRun)return;
  setBusy(true);record(`START ${labels[step].button}`);
  try{
   if(step==="connect"){
    const gate:MotionSafetyAcknowledgement={physicallyPresent:ready,workAreaClear:ready,emergencyStopReady:ready,otherControllersClosed:ready,motionApproved:true,laserOffConfirmed:true};
    const snapshot=await getBridge().connectMachine({kind:"tcp",host:profile.host,port:profile.tcpPort},gate);applySnapshot(snapshot,true);setStep("home-initial");record("OK Verbindung hergestellt.");
   }else if(step==="home-initial"||step==="home-after-check"){
    const afterCheck=step==="home-after-check";const snapshot=await getBridge().homeSupervisedFill();applySnapshot(snapshot,true);setStep(afterCheck?"frame":"prepare");record(`OK ${afterCheck?"Homing nach Check-Reset":"erstes Homing"} abgeschlossen.`);
   }else if(step==="prepare"){
    const next=await getBridge().prepareSupervisedFill(project);setSummary(next);setStep("check");record(`OK Preflight ${next.testId}: Bounds ${next.bounds.minX},${next.bounds.minY} → ${next.bounds.maxX},${next.bounds.maxY} mm · ${next.speedMmPerMin} mm/min · ${next.powerPercent}% · S${Math.round(next.powerPercent/100*next.maxPower)} · ${next.passes} Pass · Abstand ${next.lineSpacingMm} mm · ${next.totalLines} Zeilen · ≈${next.estimatedSeconds}s.`);record(`Maschinenprofil: $30=${next.maxPower} · $32=${next.laserMode?1:0} · $130=${next.workspaceWidth} · $131=${next.workspaceHeight}.`);record(`SHA-256 ${next.hash}`);
   }else if(step==="check"){
    const snapshot=await getBridge().checkSupervisedFill();applySnapshot(snapshot,true);setStep("home-after-check");record("OK Checkmodus vollständig verarbeitet; keine Bewegung und keine Emission angefordert.");
   }else if(step==="frame"){
    const snapshot=await getBridge().frameSupervisedFill();applySnapshot(snapshot,true);setStep("start");record("OK laserloses Framing abgeschlossen. Rahmen jetzt visuell prüfen.");
   }else if(step==="start"){
    if(!summary)throw new Error("Preflight summary is missing.");record(`Nutzerstart ${summary.testId} bestätigt; bewachter Job wird angefordert.`);const snapshot=await getBridge().startSupervisedFill({testId:summary.testId,supervisedReady:ready});applySnapshot(snapshot,true);setStep("completed");record(`OK ${summary.testId} abgeschlossen. Endstatus: ${describe(snapshot)}.`);
   }
  }catch(error){const message=error instanceof Error?error.message:"Unbekannter Fehler";record(`FEHLER bei ${labels[step].button}: ${message}`);if(step!=="connect")setStep("failed");}
  finally{setBusy(false);}
 };
 const action=async(type:"hold"|"resume"|"abort")=>{try{record(`START ${type.toUpperCase()}`);const snapshot=await getBridge().machineAction({type});applySnapshot(snapshot,true);record(`OK ${type.toUpperCase()}.`);if(type==="abort")setStep("failed");}catch(error){record(`FEHLER ${type.toUpperCase()}: ${error instanceof Error?error.message:"Unbekannter Fehler"}`);}};
 const current=labels[step];
 return <div className="dialog-backdrop" role="presentation"><section className="first-mark-dialog" role="dialog" aria-modal="true" aria-labelledby="fill-job-title"><header><div><span className="simulator-dialog__eyebrow">Guided machine workflow</span><h2 id="fill-job-title">Supervised Fill test</h2></div><button disabled={busy} onClick={onClose}>Close</button></header>
  <p role="status"><strong>Nächster Schritt:</strong> {current.next}</p><p><strong>Machine:</strong> {describe(machine)}</p>
  <label className="workflow-ready"><input type="checkbox" checked={ready} disabled={busy||step!=="connect"} onChange={event=>setReady(event.target.checked)}/>Ich bin am Gerät; Arbeitsbereich und Material sind vorbereitet, Absaugung/Air Assist laufen und der Not-Aus ist erreichbar.</label>
  <button className={`workflow-next${step==="start"?" workflow-emission":""}`} disabled={!canRun} onClick={()=>void run()}>{busy?"Schritt läuft …":current.button}</button>
  <div className="first-mark-layout"><section>{summary?<section className="first-mark-summary"><h3>{summary.testId} Preflight</h3><dl><div><dt>Bounds</dt><dd>{summary.bounds.minX},{summary.bounds.minY} → {summary.bounds.maxX},{summary.bounds.maxY} mm</dd></div><div><dt>Speed</dt><dd>{summary.speedMmPerMin} mm/min</dd></div><div><dt>Power</dt><dd>{summary.powerPercent}% / S{Math.round(summary.powerPercent/100*summary.maxPower)}</dd></div><div><dt>Passes</dt><dd>{summary.passes}</dd></div><div><dt>Line spacing</dt><dd>{summary.lineSpacingMm} mm</dd></div><div><dt>GRBL profile</dt><dd>$30={summary.maxPower}, $32={summary.laserMode?1:0}, {summary.workspaceWidth}×{summary.workspaceHeight} mm</dd></div><div><dt>Estimate</dt><dd>≈ {summary.estimatedSeconds} s</dd></div></dl><code>SHA-256 {summary.hash}</code></section>:<p>Die Testparameter werden beim Vorbereitungsschritt angezeigt und protokolliert.</p>}</section><section className="first-mark-camera">{camera.data?<img src={camera.data} alt="LaserCam supervised Fill view"/>:<div>No camera frame</div>}<strong>{camera.error?`Camera: ${camera.error}`:"LaserCam snapshot live"}</strong></section></div>
  <div className="camera-safety-actions"><button disabled={machine.job?.state!=="running"&&!new Set(["Run","Jog"]).has(machine.state)} onClick={()=>void action("hold")}>Hold</button><button disabled={machine.job?.state!=="held"||machine.state!=="Hold"} onClick={()=>void action("resume")}>Resume</button><button className="stop-button" disabled={!new Set(["running","held"]).has(machine.job?.state??"")&&!new Set(["Run","Jog","Hold"]).has(machine.state)} onClick={()=>void action("abort")}>Stop job</button></div>{machine.job?<progress max={machine.job.totalLines} value={machine.job.confirmedLines} aria-label="Confirmed Fill job lines"/>:null}
  <label className="workflow-log">Workflow log<textarea aria-label="Workflow log" readOnly value={entries.join("\n")}/></label>
 </section></div>;
}
