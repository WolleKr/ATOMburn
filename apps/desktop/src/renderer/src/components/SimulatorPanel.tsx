import { useEffect, useRef, useState } from "react";
import { FakeGrblTransport } from "../../../grbl/fake-controller";
import { LineDecoder } from "../../../grbl/line-decoder";
import { parseGrblLine } from "../../../grbl/parser";
import { GrblSession } from "../../../grbl/session";
import { GrblStreamer } from "../../../grbl/streamer";

interface SimulatorRuntime { transport: FakeGrblTransport; session: GrblSession; streamer: GrblStreamer; dispose: () => void; }

export function SimulatorPanel({ onClose }: { onClose: () => void }) {
  const runtime = useRef<SimulatorRuntime | null>(null);
  const [view, setView] = useState({ session: "disconnected", machine: "Unknown", stream: "idle", detail: "Offline simulator · no hardware access" });

  const refresh = (detail?: string) => {
    const current = runtime.current;
    if (!current) return;
    setView({ session: current.session.state, machine: current.session.machineState, stream: current.streamer.state, detail: detail ?? current.session.fault ?? current.streamer.fault ?? "Simulator ready" });
  };

  useEffect(() => () => runtime.current?.dispose(), []);

  const connect = async () => {
    runtime.current?.dispose();
    const transport = new FakeGrblTransport({ seed: 73, responseDelayMs: 8 });
    const session = new GrblSession();
    const streamer = new GrblStreamer(transport);
    const decoder = new LineDecoder();
    session.beginConnect();
    const offData = transport.onData((chunk) => {
      for (const line of decoder.push(chunk)) {
        const message = parseGrblLine(line);
        session.receive(message);
        void streamer.receive(message).then(() => refresh());
      }
    });
    const offDisconnect = transport.onDisconnect((reason) => { session.disconnected(reason); streamer.transportLost(reason); refresh(reason); });
    runtime.current = { transport, session, streamer, dispose: () => { offData(); offDisconnect(); void transport.disconnect(); } };
    await transport.connect(); session.connected(); session.synchronized(); refresh("Connected to deterministic fake GRBL 1.1h");
  };

  const runJob = async () => {
    const current = runtime.current; if (!current) return;
    current.session.startJob();
    await current.streamer.start(["G90", "G1 X10 Y0 F1000", "G1 X10 Y10", "G1 X0 Y10", "G1 X0 Y0"]);
    refresh("Running a laserless square in memory");
    const timer = window.setInterval(() => {
      if (current.streamer.state === "completed") { window.clearInterval(timer); current.session.completeJob(); refresh("Simulation completed safely"); }
      else if (current.streamer.state === "failed") { window.clearInterval(timer); refresh(); }
    }, 10);
  };

  const hold = async () => { const current = runtime.current; if (!current) return; current.session.requestHold(); await current.streamer.hold(); refresh("Feed hold requested"); };
  const resume = async () => { const current = runtime.current; if (!current) return; current.session.receive({ type: "status", status: { state: "Hold", unknown: {} } }); current.session.requestResume(); await current.streamer.resume(); refresh("Simulation resumed"); };
  const alarm = () => runtime.current?.transport.emitLine("ALARM:2");
  const cableLoss = () => runtime.current?.transport.drop("Injected cable loss");
  const reset = () => runtime.current?.transport.emitLine("Grbl 1.1h ['$' for help]");

  return <div className="dialog-backdrop" role="presentation">
    <section className="simulator-dialog" role="dialog" aria-modal="true" aria-labelledby="simulator-title">
      <header><div><span className="simulator-dialog__eyebrow">Gate A · memory only</span><h2 id="simulator-title">GRBL simulator</h2></div><button type="button" onClick={onClose}>Close</button></header>
      <div className="simulator-status"><div><span>Session</span><strong>{view.session}</strong></div><div><span>Machine</span><strong>{view.machine}</strong></div><div><span>Stream</span><strong>{view.stream}</strong></div></div>
      <p className="simulator-detail" role="status">{view.detail}</p>
      <div className="simulator-actions">
        <button type="button" onClick={connect}>Connect fake</button><button type="button" disabled={view.session !== "idle"} onClick={runJob}>Run dry job</button>
        <button type="button" disabled={view.session !== "running"} onClick={hold}>Hold</button><button type="button" disabled={view.session !== "holding"} onClick={resume}>Resume</button>
        <button type="button" disabled={view.session === "disconnected"} onClick={alarm}>Inject alarm</button><button type="button" disabled={view.session === "disconnected"} onClick={cableLoss}>Cable loss</button><button type="button" disabled={view.session === "disconnected"} onClick={reset}>Controller reset</button>
      </div>
      <p className="simulator-warning">No socket, serial port, motion command or laser command exists in this simulator.</p>
    </section>
  </div>;
}
