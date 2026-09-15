import { useCallback, useEffect, useState } from "react";
import type { DiagnosticTarget, SafetyAcknowledgement, SerialPortSummary } from "../../../shared/contracts";
import { getBridge } from "../platform";
import { useSerializedPoll } from "../hooks/useSerializedPoll";

const emptyGate: SafetyAcknowledgement = { physicallyPresent: false, workAreaClear: false, emergencyStopReady: false, otherControllersClosed: false };

export function ConnectivityPanel({ onClose }: { onClose: () => void }) {
  const [host, setHost] = useState("192.168.178.71");
  const [port, setPort] = useState("23");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ports, setPorts] = useState<SerialPortSummary[]>([]);
  const [serialPath, setSerialPath] = useState("");
  const [gate, setGate] = useState(emptyGate);
  const [camera, setCamera] = useState<"offline" | "streaming" | "error">("offline");
  const [bridge, setBridge] = useState<"disconnected" | "connected" | "error">("disconnected");
  const [grbl, setGrbl] = useState<"unknown" | "responding" | "error">("unknown");
  const [detail, setDetail] = useState("No hardware connection. Camera and GRBL are independent.");
  const [transcript, setTranscript] = useState<{ direction: "rx" | "tx"; text: string }[]>([]);
  const [image, setImage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);

  const refreshPorts = async () => {
    try { const found = await getBridge().listSerialPorts(); setPorts(found); setSerialPath((current) => current || found[0]?.path || ""); }
    catch (error) { setDetail(error instanceof Error ? error.message : "Could not list COM ports."); }
  };
  useEffect(() => {
    let active = true;
    void Promise.all([getBridge().listSerialPorts(), getBridge().getDeviceProfile()]).then(([found, profile]) => {
      if (!active) return;
      setPorts(found); setHost(profile.host); setPort(String(profile.tcpPort)); setSerialPath(profile.serialPath || found[0]?.path || "");
    }).catch((error: unknown) => { if (active) setDetail(error instanceof Error ? error.message : "Could not list COM ports."); });
    return () => { active = false; };
  }, []);

  const readLiveFrame = useCallback(async (isCurrent: () => boolean) => {
    const result = await getBridge().getCameraFrame({ host, username: username || undefined, password: password || undefined });
    if (!isCurrent()) return;
    if (result.status === "ok") { setImage(result.dataUrl); setCamera("streaming"); }
    else { setCamera("error"); setDetail(result.message); setLive(false); }
  }, [host, password, username]);
  useSerializedPoll(readLiveFrame, 1_000, live);

  const cameraFrame = async () => {
    setBusy(true); setDetail("Reading one camera frame; no GRBL command is sent.");
    const result = await getBridge().getCameraFrame({ host, username: username || undefined, password: password || undefined });
    if (result.status === "ok") { setImage(result.dataUrl); setCamera("streaming"); setDetail("Camera frame received. GRBL remains disconnected."); }
    else { setCamera("error"); setDetail(result.message); }
    setBusy(false);
  };

  const run = async (target: DiagnosticTarget) => {
    setBusy(true); setBridge("connected"); setGrbl("unknown"); setTranscript([]); setDetail("Read-only Gate B diagnostic running: $I, $$, $G, ?");
    try {
      const result = await getBridge().runReadOnlyDiagnostics(target, gate);
      setTranscript(result.transcript); setBridge(result.status.bridge); setGrbl(result.status.grbl); setDetail(result.status.detail);
    } catch (error) { setBridge("error"); setGrbl("error"); setDetail(error instanceof Error ? error.message : "Diagnostic failed."); }
    finally { setBusy(false); }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      await getBridge().saveDeviceProfile({ host, tcpPort: Number(port), cameraPath: "/images/snapshot0.jpg", serialPath: serialPath || undefined });
      setDetail("Local device profile saved without camera credentials.");
    } catch (error) { setDetail(error instanceof Error ? error.message : "Device profile could not be saved."); }
    finally { setBusy(false); }
  };

  const exportDiagnostics = async () => {
    setBusy(true);
    try {
      const exporter = getBridge().exportDiagnostics;
      if (!exporter) throw new Error("Diagnostic export is unavailable.");
      const result = await exporter({ status: { camera, bridge, grbl, detail }, transcript });
      if (result.status === "ok") setDetail(`Diagnostic package saved as ${result.fileName}.`);
      else if (result.status === "error") setDetail(result.message);
    } catch (error) { setDetail(error instanceof Error ? error.message : "Diagnostic package could not be exported."); }
    finally { setBusy(false); }
  };

  const gateReady = Object.values(gate).every(Boolean);
  const setCheck = (key: keyof SafetyAcknowledgement, checked: boolean) => setGate((current) => ({ ...current, [key]: checked }));
  const selectedPort = ports.find((item) => item.path === serialPath);

  return <div className="dialog-backdrop" role="presentation">
    <section className="connectivity-dialog" role="dialog" aria-modal="true" aria-labelledby="connectivity-title">
      <header><div><span className="simulator-dialog__eyebrow">Gate B · read-only connection</span><h2 id="connectivity-title">Device diagnostics</h2></div><button type="button" onClick={onClose}>Close</button></header>
      <div className="simulator-status"><div><span>Camera</span><strong>{camera}</strong></div><div><span>Bridge</span><strong>{bridge}</strong></div><div><span>GRBL</span><strong>{grbl}</strong></div></div>
      <p className="simulator-detail" role="status">{detail}</p>
      <div className="connectivity-grid">
        <section><h3>LaserCam V2</h3><label>Host<input value={host} onChange={(event) => setHost(event.target.value)}/></label><label>TCP port<input inputMode="numeric" value={port} onChange={(event) => setPort(event.target.value)}/></label><label>Camera account<input value={username} autoComplete="username" placeholder="Only if required" onChange={(event) => setUsername(event.target.value)}/></label><label>Camera password<input type="password" value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)}/></label><div className="simulator-actions"><button type="button" disabled={busy || live} onClick={cameraFrame}>Take snapshot</button><button type="button" disabled={busy} onClick={() => setLive((current) => !current)}>{live ? "Stop live view" : "Start live view"}</button><button type="button" disabled={busy || !host || !Number(port)} onClick={() => void saveProfile()}>Save local profile</button></div>{image ? <img className="camera-frame" src={image} alt="Current LaserCam frame"/> : null}</section>
        <section><h3>Direct USB</h3><label>COM port<select value={serialPath} onChange={(event) => setSerialPath(event.target.value)}><option value="">No port selected</option>{ports.map((item) => <option key={item.path} value={item.path}>{item.path}{item.manufacturer ? ` · ${item.manufacturer}` : ""}</option>)}</select></label><button type="button" disabled={busy} onClick={refreshPorts}>Refresh ports</button><p className="port-metadata">{selectedPort?.vendorId ? `VID ${selectedPort.vendorId} · PID ${selectedPort.productId ?? "?"}` : "No USB metadata"}</p></section>
      </div>
      <fieldset className="gate-checks"><legend>Confirm at the machine before GRBL access</legend>
        <label><input type="checkbox" checked={gate.physicallyPresent} onChange={(event) => setCheck("physicallyPresent", event.target.checked)}/>I remain physically at the laser.</label>
        <label><input type="checkbox" checked={gate.workAreaClear} onChange={(event) => setCheck("workAreaClear", event.target.checked)}/>The work area is clear; no movement is planned.</label>
        <label><input type="checkbox" checked={gate.emergencyStopReady} onChange={(event) => setCheck("emergencyStopReady", event.target.checked)}/>The physical emergency stop is checked and reachable.</label>
        <label><input type="checkbox" checked={gate.otherControllersClosed} onChange={(event) => setCheck("otherControllersClosed", event.target.checked)}/>LightBurn, LaserGRBL and BeagleEngrave control are closed.</label>
      </fieldset>
      <div className="simulator-actions"><button type="button" disabled={busy || !gateReady || !host || !Number(port)} onClick={() => run({ kind: "tcp", host, port: Number(port) })}>Run TCP read-only test</button><button type="button" disabled={busy || !gateReady || !serialPath} onClick={() => run({ kind: "serial", path: serialPath })}>Run USB read-only test</button></div>
      <pre className="diagnostic-transcript" aria-label="Read-only GRBL transcript">{transcript.length ? transcript.map((line) => `${line.direction === "tx" ? ">" : "<"} ${line.text}`).join("\n") : "No GRBL transcript."}</pre>
      <div className="simulator-actions"><button type="button" disabled={busy} onClick={() => void exportDiagnostics()}>Export diagnostic package</button></div>
      <p className="simulator-warning">This panel cannot send motion, homing, unlock, laser, configuration-write or job commands. TCP and USB are mutually exclusive.</p>
    </section>
  </div>;
}
