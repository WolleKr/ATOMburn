import { useCallback, useEffect, useRef, useState } from "react";
import { FakeGrblTransport } from "../../../grbl/fake-controller";
import { MachineController, type MachineAction, type MachineSnapshot } from "../../../machine/machine-controller";
import type { DiagnosticTarget, LocalDeviceProfile, MotionSafetyAcknowledgement, SerialPortSummary } from "../../../shared/contracts";
import { getBridge } from "../platform";
import { useSerializedPoll } from "../hooks/useSerializedPoll";

const disconnected: MachineSnapshot = { connected: false, state: "Unknown", transcript: [] };
const emptyGate: MotionSafetyAcknowledgement = { physicallyPresent: false, workAreaClear: false, emergencyStopReady: false, otherControllersClosed: false, motionApproved: false, laserOffConfirmed: false };

export function MachinePanel({ onClose }: { onClose: () => void }) {
  const simulator = useRef<MachineController | null>(null);
  const [profile, setProfile] = useState<LocalDeviceProfile>({ host: "192.168.178.71", tcpPort: 23, cameraPath: "/images/snapshot0.jpg" });
  const [connectionKind, setConnectionKind] = useState<"tcp" | "serial">("tcp");
  const [serialPorts, setSerialPorts] = useState<SerialPortSummary[]>([]);
  const [serialPath, setSerialPath] = useState("");
  const [snapshot, setSnapshot] = useState<MachineSnapshot>(disconnected);
  const [mode, setMode] = useState<"none" | "simulator" | "real">("none");
  const [gate, setGate] = useState(emptyGate);
  const [detail, setDetail] = useState("Disconnected. Use the simulator before requesting real motion.");
  const [motionPending, setMotionPending] = useState(false);
  const [cameraLive, setCameraLive] = useState(false);
  const [cameraState, setCameraState] = useState<"offline" | "connecting" | "live" | "error">("offline");
  const [cameraImage, setCameraImage] = useState<string>();
  const [cameraDetail, setCameraDetail] = useState("Camera is independent from GRBL.");
  const [lastFrame, setLastFrame] = useState<number>();

  useEffect(() => {
    let active = true;
    void Promise.all([getBridge().getDeviceProfile(), getBridge().listSerialPorts()]).then(([storedProfile, ports]) => {
      if (!active) return;
      setProfile(storedProfile);
      setSerialPorts(ports);
      setSerialPath(storedProfile.serialPath || ports[0]?.path || "");
    }).catch((error: unknown) => { if (active) setDetail(error instanceof Error ? error.message : "Machine profiles could not be loaded."); });
    return () => { active = false; void simulator.current?.disconnect(); };
  }, []);
  const readMachineSnapshot = useCallback(async (isCurrent: () => boolean) => {
    const next = await getBridge().getMachineSnapshot();
    if (isCurrent()) setSnapshot(next);
  }, []);
  useSerializedPoll(readMachineSnapshot, 250, mode === "real");
  const loadFrame = useCallback(async (isCurrent: () => boolean) => {
    const result = await getBridge().getCameraFrame({ host: profile.host });
    if (!isCurrent()) return;
    if (result.status === "ok") { setCameraImage(result.dataUrl); setCameraState("live"); setLastFrame(Date.now()); setCameraDetail("Live view active · physical supervision still required."); }
    else { setCameraState("error"); setCameraDetail(result.message); setCameraLive(false); }
  }, [profile.host]);
  useSerializedPoll(loadFrame, 500, cameraLive);

  const connectSimulator = async () => { const controller = new MachineController(new FakeGrblTransport({ responseDelayMs: 5 }), false); simulator.current = controller; setSnapshot(await controller.connect()); setMode("simulator"); setDetail("Offline simulator connected. No hardware access."); };
  const connectReal = async () => {
    const target: DiagnosticTarget = connectionKind === "tcp" ? { kind: "tcp", host: profile.host, port: profile.tcpPort } : { kind: "serial", path: serialPath };
    try {
      setSnapshot(await getBridge().connectMachine(target, gate));
      setMode("real");
      if (connectionKind === "tcp") { setCameraState("connecting"); setCameraLive(true); }
      setDetail(`Real ${connectionKind === "tcp" ? "TCP" : "USB"} motion session connected. Laser output remains blocked.`);
    } catch (error) { setDetail(error instanceof Error ? error.message : "Connection failed."); }
  };
  const disconnect = async () => { setCameraLive(false); setCameraState("offline"); if (mode === "real") await getBridge().disconnectMachine(); else await simulator.current?.disconnect(); simulator.current = null; setSnapshot(disconnected); setMode("none"); setDetail("Disconnected. No automatic resume is possible."); };
  const close = async () => { if (mode !== "none") await disconnect(); onClose(); };
  const action = async (request: MachineAction) => { const urgent = request.type === "hold" || request.type === "resume" || request.type === "abort"; if (!urgent) setMotionPending(true); try { const next = mode === "real" ? await getBridge().machineAction(request) : await simulator.current!.execute(request); setSnapshot(next); setDetail(request.type === "abort" ? "Motion aborted. Reconnect and re-home required." : `${request.type} completed safely.`); } catch (error) { setDetail(error instanceof Error ? error.message : "Machine action failed."); if (mode === "real") setSnapshot(await getBridge().getMachineSnapshot()); } finally { if (!urgent) setMotionPending(false); } };
  const setCheck = (key: keyof MotionSafetyAcknowledgement, checked: boolean) => setGate((current) => ({ ...current, [key]: checked }));
  const gateReady = Object.values(gate).every(Boolean);
  const activeMotion = new Set(["Run", "Jog", "Hold", "Home"]).has(snapshot.state);
  const startCamera = () => { setCameraState("connecting"); setCameraDetail("Connecting to LaserCam video only; no GRBL command is sent."); setCameraLive(true); };
  const stopCamera = () => { setCameraLive(false); setCameraState("offline"); setCameraDetail("Live view stopped. GRBL state was not changed."); };

  return <div className="dialog-backdrop" role="presentation"><section className="machine-dialog" role="dialog" aria-modal="true" aria-labelledby="machine-title">
    <header><div><span className="simulator-dialog__eyebrow">Emission-free controls</span><h2 id="machine-title">Machine motion</h2></div><button type="button" disabled={activeMotion} onClick={() => void close()}>Close</button></header>
    <div className="simulator-status"><div><span>Connection</span><strong>{mode}</strong></div><div><span>GRBL</span><strong>{snapshot.state}</strong></div><div><span>Position</span><strong>{snapshot.position ? `${snapshot.position.x.toFixed(1)}, ${snapshot.position.y.toFixed(1)}` : "unknown"}</strong></div></div>
    <p className="simulator-detail" role="status">{detail}</p>
    <section className="motion-camera" aria-label="LaserCam live monitoring">
      <div className="motion-camera__viewport">{cameraImage ? <img src={cameraImage} alt="Live view from LaserCam"/> : <div className="motion-camera__empty">No camera frame</div>}<span className={`motion-camera__badge motion-camera__badge--${cameraState}`} role="status">Camera {cameraState}</span></div>
      <div className="motion-camera__side"><h3>Supervised live view</h3><p>{cameraDetail}</p>{lastFrame ? <small>Last frame: {new Date(lastFrame).toLocaleTimeString()}</small> : null}<div className="simulator-actions"><button type="button" disabled={cameraLive} onClick={startCamera}>Start live camera</button><button type="button" disabled={!cameraLive} onClick={stopCamera}>Stop camera</button></div><div className="camera-safety-actions"><button className="hold-button" disabled={!snapshot.connected || !new Set(["Run", "Jog"]).has(snapshot.state)} onClick={() => action({ type: "hold" })}>Hold</button><button className="stop-button" disabled={!snapshot.connected || !new Set(["Run", "Jog", "Hold"]).has(snapshot.state)} onClick={() => action({ type: "abort" })}>Stop motion</button></div><strong className="camera-safety-note">Camera and software Stop do not replace the physical emergency stop.</strong></div>
    </section>
    <fieldset className="gate-checks"><legend>Real-motion Gate B</legend>
      <label><input type="checkbox" checked={gate.physicallyPresent} onChange={(event) => setCheck("physicallyPresent", event.target.checked)}/>I remain physically at the laser.</label>
      <label><input type="checkbox" checked={gate.workAreaClear} onChange={(event) => setCheck("workAreaClear", event.target.checked)}/>The complete 400 × 400 mm work area is clear.</label>
      <label><input type="checkbox" checked={gate.emergencyStopReady} onChange={(event) => setCheck("emergencyStopReady", event.target.checked)}/>Physical emergency stop is checked and reachable.</label>
      <label><input type="checkbox" checked={gate.otherControllersClosed} onChange={(event) => setCheck("otherControllersClosed", event.target.checked)}/>Other GRBL controllers are closed.</label>
      <label><input type="checkbox" checked={gate.laserOffConfirmed} onChange={(event) => setCheck("laserOffConfirmed", event.target.checked)}/>Laser emission is off; only motion is expected.</label>
      <label><input type="checkbox" checked={gate.motionApproved} onChange={(event) => setCheck("motionApproved", event.target.checked)}/>I approve homing and bounded test motion.</label>
    </fieldset>
    <fieldset disabled={mode !== "none"}><legend>Machine connection</legend><label><input type="radio" name="machine-connection" checked={connectionKind === "tcp"} onChange={() => setConnectionKind("tcp")}/>LaserCam TCP · {profile.host}:{profile.tcpPort}</label><label><input type="radio" name="machine-connection" checked={connectionKind === "serial"} onChange={() => setConnectionKind("serial")}/>Direct USB · explicit diagnostic fallback</label>{connectionKind === "serial" ? <label>COM port<select aria-label="Machine COM port" value={serialPath} onChange={(event) => setSerialPath(event.target.value)}><option value="">No port selected</option>{serialPorts.map((port) => <option key={port.path} value={port.path}>{port.path}{port.manufacturer ? ` · ${port.manufacturer}` : ""}</option>)}</select></label> : null}</fieldset>
    <div className="simulator-actions"><button type="button" disabled={mode !== "none"} onClick={connectSimulator}>Connect simulator</button><button type="button" disabled={mode !== "none" || !gateReady || (connectionKind === "serial" && !serialPath)} onClick={connectReal}>{connectionKind === "tcp" ? "Connect real TCP" : "Connect real USB"}</button><button type="button" disabled={mode === "none" || activeMotion} onClick={disconnect}>Disconnect</button></div>
    <div className="machine-controls">
      <section><h3>Setup</h3><button disabled={!snapshot.connected || motionPending || !new Set(["Idle", "Alarm"]).has(snapshot.state)} onClick={() => action({ type: "home" })}>Home</button><button disabled={!snapshot.connected || motionPending || snapshot.state !== "Alarm"} onClick={() => action({ type: "unlock" })}>Unlock</button><button disabled={!snapshot.connected || motionPending || !new Set(["Idle", "Check"]).has(snapshot.state)} onClick={() => action({ type: "check" })}>Toggle check mode</button></section>
      <section><h3>Jog · 1 mm · 3000 mm/min</h3><div className="jog-pad"><button disabled={!snapshot.connected || motionPending || snapshot.state !== "Idle"} onClick={() => action({ type: "jog", direction: "y+", distance: 1, feed: 3000 })}>Y+</button><button disabled={!snapshot.connected || motionPending || snapshot.state !== "Idle"} onClick={() => action({ type: "jog", direction: "x-", distance: 1, feed: 3000 })}>X−</button><button disabled={!snapshot.connected || motionPending || snapshot.state !== "Idle"} onClick={() => action({ type: "jog", direction: "x+", distance: 1, feed: 3000 })}>X+</button><button disabled={!snapshot.connected || motionPending || snapshot.state !== "Idle"} onClick={() => action({ type: "jog", direction: "y-", distance: 1, feed: 3000 })}>Y−</button></div></section>
      <section><h3>Laserless control test · 3000 mm/min</h3><button disabled={!snapshot.connected || motionPending || snapshot.state !== "Idle"} onClick={() => action({ type: "frame", width: 10, height: 10, feed: 3000 })}>Frame 10 × 10 mm</button><button disabled={!snapshot.connected || motionPending || snapshot.state !== "Idle"} onClick={() => action({ type: "frame", width: 40, height: 40, feed: 3000 })}>Frame 40 × 40 mm</button><button className="hold-button" disabled={!snapshot.connected || !new Set(["Run", "Jog"]).has(snapshot.state)} onClick={() => action({ type: "hold" })}>Hold</button><button disabled={!snapshot.connected || snapshot.state !== "Hold"} onClick={() => action({ type: "resume" })}>Resume</button><button className="stop-button" disabled={!snapshot.connected || !new Set(["Run", "Jog", "Hold"]).has(snapshot.state)} onClick={() => action({ type: "abort" })}>Stop</button></section>
    </div>
    <pre className="diagnostic-transcript" aria-label="Read-only machine transcript">{snapshot.transcript.length ? snapshot.transcript.map((line) => `${line.direction === "tx" ? ">" : "<"} ${line.text}`).join("\n") : "Read-only transcript. No command input exists."}</pre>
    <p className="simulator-warning">Every jog/frame starts with M5. M3, M4, positive S values and arbitrary console writes are blocked in the main process.</p>
  </section></div>;
}
