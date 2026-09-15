import { useEffect, useRef, useState } from "react";
import type { CameraMarkApproval, CameraMarkSummary, LocalDeviceProfile, MotionSafetyAcknowledgement } from "../../../shared/contracts";
import type { MachineSnapshot } from "../../../machine/machine-controller";
import { getBridge } from "../platform";
import { logger } from "../logger";

const disconnected: MachineSnapshot = { connected: false, state: "Unknown", transcript: [] };
const empty: CameraMarkApproval = { testId: "H-CAM-MARK-01", supervisedReady: false, targetFrameConfirmed: false };

export function CameraMarkDialog({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<LocalDeviceProfile>({ host: "192.168.178.71", tcpPort: 23, cameraPath: "/images/snapshot0.jpg" });
  const [approval, setApproval] = useState(empty);
  const [machine, setMachine] = useState(disconnected);
  const [framed, setFramed] = useState(false);
  const [summary, setSummary] = useState<CameraMarkSummary>();
  const [detail, setDetail] = useState("No connection. No motion or emission is possible.");
  const [camera, setCamera] = useState<{ data?: string; last?: number; error?: string }>({});
  const [clock, setClock] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [speedMmPerMin, setSpeedMmPerMin] = useState(800);
  const [powerPercent, setPowerPercent] = useState(10);
  const connectInFlight = useRef(false);
  const prepareInFlight = useRef(false);

  useEffect(() => { void getBridge().getDeviceProfile().then(setProfile); return () => { void getBridge().disconnectMachine(); }; }, []);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const [snapshot, frame] = await Promise.all([machine.connected ? getBridge().getMachineSnapshot() : Promise.resolve(undefined), getBridge().getCameraFrame({ host: profile.host })]);
      if (!active) return;
      setClock(Date.now());
      if (snapshot) setMachine(snapshot);
      if (frame.status === "ok") setCamera({ data: frame.dataUrl, last: Date.now() });
      else setCamera((current) => ({ ...current, error: frame.message }));
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [machine.connected, profile.host]);

  const set = (key: keyof CameraMarkApproval, value: boolean) => setApproval((current) => ({ ...current, [key]: value }));
  const settingsValid = speedMmPerMin >= 100 && speedMmPerMin <= 3_000 && powerPercent >= 1 && powerPercent <= 30;
  const startBlockReason = attempted ? "Start already attempted; close and repeat the complete test." : starting ? "Command is running." : !summary ? "Prepare the test first." : !approval.supervisedReady || !approval.targetFrameConfirmed ? "Confirm supervision and the laserless frame." : machine.state !== "Idle" ? `Machine must be Idle; current state is ${machine.state}.` : undefined;

  const connect = async () => {
    if (connectInFlight.current) return;
    connectInFlight.current = true; setConnecting(true); setDetail("Connecting to the supervised machine session…");
    try {
      const gate: MotionSafetyAcknowledgement = { physicallyPresent: approval.supervisedReady, workAreaClear: approval.supervisedReady, emergencyStopReady: approval.supervisedReady, otherControllersClosed: approval.supervisedReady, motionApproved: true, laserOffConfirmed: true };
      const snapshot = await getBridge().connectMachine({ kind: "tcp", host: profile.host, port: profile.tcpPort }, gate);
      setMachine(snapshot); setDetail(`Connected · ${snapshot.state}. Run the laserless full-area frame next.`);
    } catch (error) { const message=error instanceof Error ? error.message : "Connection failed.";logger.error("bed-calibration.connect", message);setMachine(await getBridge().getMachineSnapshot()); setDetail(message); }
    finally { connectInFlight.current = false; setConnecting(false); }
  };
  const frame = async () => {
    try { set("targetFrameConfirmed", false); setDetail("Laserless 324 × 324 mm framing is running. Watch the physical machine."); const snapshot = await getBridge().frameCameraMark(); setMachine(snapshot); setFramed(true); setDetail("Laserless frame completed. Confirm only if the complete path stayed on the material."); }
    catch (error) { const message=error instanceof Error ? error.message : "Framing failed.";logger.error("bed-calibration.frame", message);setFramed(false); set("targetFrameConfirmed", false); setDetail(message); }
  };
  const prepare = async () => {
    if (prepareInFlight.current) return;
    prepareInFlight.current = true; setPreparing(true); setDetail("Checking $30/$32/$130/$131 and preparing the fixed four-X program…");
    try { setSummary(await getBridge().prepareCameraMark({ speedMmPerMin, powerPercent })); setDetail("Preflight prepared. Review the selected values, then start the supervised test."); }
    catch (error) { const message=error instanceof Error ? error.message : "Preflight failed.";logger.error("bed-calibration.preflight", message);setDetail(message); }
    finally { prepareInFlight.current = false; setPreparing(false); }
  };
  const start = async () => {
    if (attempted || startBlockReason) return;
    setAttempted(true); setStarting(true); setDetail("H-CAM-MARK-01 sent. Remain at the machine; M5/S0 and homing follow automatically.");
    try { setMachine(await getBridge().startCameraMark(approval)); setDetail("Five X marks and final homing completed. Close this dialog, refresh the calibration snapshot and capture points 1–5 on the laser marks."); }
    catch (error) { const message=error instanceof Error ? error.message : "camera mark failed.";logger.error("bed-calibration.mark", message);setDetail(`Test did not complete: ${message} Use the physical stop if motion is unsafe.`); setMachine(await getBridge().getMachineSnapshot()); }
    finally { setStarting(false); }
  };
  const stop = async () => { try { setMachine(await getBridge().machineAction({ type: "abort" })); setDetail("Software Stop sent. Inspect, reconnect and re-home."); } catch (error) { setDetail(error instanceof Error ? error.message : "Stop failed; use the physical emergency stop if danger exists."); } };

  return <div className="dialog-backdrop" role="presentation"><section className="first-mark-dialog" role="dialog" aria-modal="true" aria-labelledby="camera-mark-title">
    <header><div><span className="simulator-dialog__eyebrow">Kamera-/Laserabgleich</span><h2 id="camera-mark-title">Fünfpunkt-Kalibrierung des Arbeitsbereichs</h2></div><button disabled={starting || connecting} onClick={onClose}>Close</button></header>
    <p role="status">{detail}</p><p aria-label="Machine connection state"><strong>Machine:</strong> {connecting ? "Connecting" : machine.connected ? `Connected · ${machine.state}` : "Disconnected"}</p>
    <div className="first-mark-layout"><section><fieldset className="gate-checks"><legend>Supervised test</legend><label><input type="checkbox" checked={approval.supervisedReady} onChange={(event) => set("supervisedReady", event.target.checked)} />I am at the machine; material is secured, the motion area is clear, extraction is running and the physical emergency stop is reachable.</label>{framed ? <label><input type="checkbox" checked={approval.targetFrameConfirmed} onChange={(event) => set("targetFrameConfirmed", event.target.checked)} />The laserless 38–362 mm frame stayed entirely on the material.</label> : null}</fieldset><fieldset><legend>Mark settings</legend><label>Speed (100–3000 mm/min)<input type="number" min="100" max="3000" step="100" disabled={Boolean(summary)} value={speedMmPerMin} onChange={(event) => setSpeedMmPerMin(Number(event.target.value))} /></label><label>Power (1–30 %)<input type="number" min="1" max="30" step="1" disabled={Boolean(summary)} value={powerPercent} onChange={(event) => setPowerPercent(Number(event.target.value))} /></label></fieldset>
      <div className="simulator-actions"><button disabled={connecting || machine.connected || !approval.supervisedReady} onClick={() => void connect()}>Connect supervised TCP</button><button disabled={connecting || preparing || !machine.connected || machine.state !== "Idle" || framed} onClick={() => void frame()}>Frame bed calibration area at 3000 mm/min</button><button title={settingsValid ? "Prepare the five-X job with the selected speed and power." : "Speed must be 100–3000 mm/min and power 1–30 %."} disabled={preparing || !framed || !approval.targetFrameConfirmed || machine.state !== "Idle" || Boolean(summary) || !settingsValid} onClick={() => void prepare()}>{preparing ? "Preparing test…" : "Prepare bed calibration test"}</button></div></section>
      <section className="first-mark-camera">{camera.data ? <img src={camera.data} alt="LaserCam supervised live view" /> : <div>No camera frame</div>}<strong>{camera.error ? `Camera warning: ${camera.error}` : camera.last ? `Camera age ${Math.max(0, clock - camera.last)} ms` : "Camera offline"}</strong><p>The camera does not replace physical supervision.</p></section></div>
    {summary ? <section className="first-mark-summary"><h3>Prepared bed calibration test</h3><dl><div><dt>Marks</dt><dd>5 × X at 40/40, 360/40, 360/360, 40/360 and 200/200 mm</dd></div><div><dt>Size</dt><dd>4 × 4 mm each</dd></div><div><dt>Speed</dt><dd>{summary.speedMmPerMin} mm/min</dd></div><div><dt>Power</dt><dd>{summary.powerPercent} % · S{Math.round(summary.powerPercent / 100 * summary.maxPower)} / $30={summary.maxPower}</dd></div></dl><code>SHA-256 {summary.hash}</code><button className="first-mark-start" disabled={Boolean(startBlockReason)} onClick={() => void start()}>{attempted ? "Bed calibration start locked" : "Start supervised bed calibration test"}</button><p aria-label="H-CAM-MARK-01 start availability">{startBlockReason ?? "Start enabled: the next click sends the one-shot command."}</p></section> : null}
    <div className="camera-safety-actions"><button disabled={machine.job?.state!=="running"&&!new Set(["Run","Jog"]).has(machine.state)} onClick={() => void getBridge().machineAction({ type: "hold" }).then(setMachine)}>Hold</button><button disabled={machine.job?.state!=="held"||machine.state!=="Hold"} onClick={() => void getBridge().machineAction({type:"resume"}).then(setMachine)}>Resume</button><button className="stop-button" disabled={!new Set(["running","held"]).has(machine.job?.state??"")&&!new Set(["Run","Jog","Hold"]).has(machine.state)} onClick={() => void stop()}>Stop job</button></div>{machine.job ? <progress max={machine.job.totalLines} value={machine.job.confirmedLines} aria-label="Confirmed camera-mark job lines" /> : null}<p className="simulator-warning">This test emits laser light. Software Stop is not an emergency stop.</p>
  </section></div>;
}
