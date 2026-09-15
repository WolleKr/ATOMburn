import { useCallback, useEffect, useRef, useState } from "react";
import type { MachineSnapshot } from "../../../machine/machine-controller";
import { getBridge } from "../platform";

export function CameraWorkspacePanel({ onClose, machine }: { onClose?: () => void; machine?: MachineSnapshot }) {
  const [image, setImage] = useState<string>();
  const [message, setMessage] = useState("Loading camera…");
  const [capturedAt, setCapturedAt] = useState<number>();
  const [clock, setClock] = useState(0);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [stopPending, setStopPending] = useState(false);
  const [stopMessage, setStopMessage] = useState<string>();
  const busyRef = useRef(false);
  const expandedCloseRef = useRef<HTMLButtonElement>(null);

  const reload = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const profile = await getBridge().getDeviceProfile();
      const result = await getBridge().getCameraFrame({ host: profile.host });
      const now = Date.now();
      setClock(now);
      if (result.status === "ok") {
        setImage(result.dataUrl);
        setCapturedAt(now);
        setMessage("Live snapshot");
      } else {
        setImage(undefined);
        setMessage(`Offline · ${result.message}`);
      }
    } catch (error) {
      setImage(undefined);
      setMessage(`Error · ${error instanceof Error ? error.message : "Camera unavailable"}`);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (paused) return;
    const initial = window.setTimeout(() => void reload(), 0);
    const timer = window.setInterval(() => void reload(), 2_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [paused, reload]);

  useEffect(() => {
    if (!expanded) return;
    expandedCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expanded]);

  const motionActive = Boolean(
    machine?.connected &&
      (new Set(["Run", "Jog", "Hold"]).has(machine.state) ||
        new Set(["running", "held"]).has(machine.job?.state ?? ""))
  );

  const triggerEmergencyStop = async () => {
    if (!motionActive || stopPending) return;
    setStopPending(true);
    setStopMessage("Sending emergency stop…");
    try {
      await getBridge().machineAction({ type: "abort" });
      setStopMessage("Emergency stop sent · reconnect and re-home before motion.");
    } catch (error) {
      setStopMessage(`${error instanceof Error ? error.message : "Emergency stop failed."} Use the physical emergency stop if danger exists.`);
    } finally {
      setStopPending(false);
    }
  };

  const age = capturedAt ? Math.max(0, Math.round((clock - capturedAt) / 1_000)) : undefined;
  const cameraStatus = `${paused ? "Paused" : message}${age === undefined ? "" : ` · ${age}s old`}`;
  const emergencyStopButton = (expandedButton = false) => (
    <button
      className={`camera-emergency-stop${expandedButton ? " camera-emergency-stop--expanded" : ""}`}
      type="button"
      disabled={!motionActive || stopPending}
      onClick={() => void triggerEmergencyStop()}
      title="Stops active software motion. Use the physical emergency stop if danger exists."
    >
      <span className="camera-emergency-stop__icon" aria-hidden="true">!</span>
      <span>{stopPending ? "Stopping…" : "Emergency stop"}</span>
    </button>
  );

  return (
    <aside className="camera-workspace" aria-label="Camera workspace">
      <header>
        <strong>LaserCam</strong>
        {onClose ? <button type="button" onClick={onClose} aria-label="Close camera">×</button> : <span className={`camera-live-dot camera-live-dot--${image ? "online" : "offline"}`} aria-label={`Camera ${image ? "online" : "offline"}`} />}
      </header>
      <div className="camera-workspace__image">{image ? <img src={image} alt="Current LaserCam snapshot" /> : <span>{message}</span>}</div>
      <p>{cameraStatus}</p>
      <div className="camera-workspace__actions">
        <button type="button" onClick={() => setPaused(value => !value)}>{paused ? "Resume" : "Pause"}</button>
        <button type="button" disabled={busy} onClick={() => void reload()}>Reload</button>
        <button className="camera-expand-button" type="button" onClick={() => setExpanded(true)} aria-haspopup="dialog">⤢ Enlarge view</button>
      </div>
      <div className="camera-workspace__safety">
        <div>{emergencyStopButton()}<small>Software stop for active motion</small></div>
        <span>Physical emergency stop remains required.</span>
      </div>
      {stopMessage ? <p className="camera-workspace__stop-message" role="status">{stopMessage}</p> : null}
      <small>Monitoring only — supervision and emergency stop remain required.</small>
      {expanded ? (
        <div className="camera-viewer-backdrop">
          <section className="camera-viewer" role="dialog" aria-modal="true" aria-labelledby="camera-viewer-title">
            <header className="camera-viewer__header">
              <div><span className="camera-viewer__eyebrow">Live inspection</span><h2 id="camera-viewer-title">LaserCam expanded view</h2></div>
              <button ref={expandedCloseRef} type="button" onClick={() => setExpanded(false)}>Close view</button>
            </header>
            <div className="camera-viewer__body">
              <div className="camera-viewer__frame">{image ? <img src={image} alt="Expanded current LaserCam snapshot" /> : <span>{message}</span>}</div>
              <aside className="camera-viewer__controls">
                <div className="camera-viewer__status"><span className={`camera-live-dot camera-live-dot--${image ? "online" : "offline"}`} aria-hidden="true" /><strong>{cameraStatus}</strong></div>
                {emergencyStopButton(true)}
                <p>Use this software stop for active machine motion. If there is any danger, use the physical emergency stop immediately.</p>
                {stopMessage ? <span className="camera-viewer__stop-message" role="status">{stopMessage}</span> : null}
              </aside>
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}
