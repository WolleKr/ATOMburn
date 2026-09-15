import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { BedMarkerDetectionResult } from "../../../domain/camera-bed-markers";
import { MAX_CALIBRATION_CONTROL_ERROR_MM, calibrationControlError, calibrationStatus, transformMetadata, type Calibration, type CalibrationPoint, type CalibrationProvenance, type Point } from "../../../domain/camera-calibration";
import { validateLensCalibration, type LensCalibration } from "../../../domain/camera-lens-calibration";
import { getBridge } from "../platform";
import { LensCalibrationControls } from "./LensCalibrationControls";

type Props = { onClose: () => void; onOpenCameraMark?: () => void };
type PointSource = "not captured" | "saved" | "manual" | "automatic" | "manually corrected";
type Proposal = { snapshotId: number; detection: BedMarkerDetectionResult; corrected: Set<number>; original: Map<number, Point>; stale: boolean };
const machinePoints: ReadonlyArray<Point> = [{ x: 40, y: 40 }, { x: 360, y: 40 }, { x: 360, y: 360 }, { x: 40, y: 360 }, { x: 200, y: 200 }];
const freshPoints = (): CalibrationPoint[] => machinePoints.map((machine) => ({ machine: { ...machine }, image: { x: 0, y: 0 } }));
const freshSources = (): PointSource[] => machinePoints.map(() => "not captured");

function grayscaleFromImage(image: HTMLImageElement) {
  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height || width * height > 16_000_000) throw new Error("The snapshot resolution is missing or exceeds the 16-megapixel analysis limit.");
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Camera image analysis is unavailable.");
  context.drawImage(image, 0, 0);
  const rgba = context.getImageData(0, 0, width, height).data;
  const data = new Uint8Array(width * height);
  for (let s = 0, d = 0; s < rgba.length; s += 4, d += 1) data[d] = Math.round(rgba[s]! * .299 + rgba[s + 1]! * .587 + rgba[s + 2]! * .114);
  return { width, height, data };
}

export function CameraCalibrationPanel({ onClose, onOpenCameraMark }: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const runId = useRef(0), busyRef = useRef(false);
  const [profile, setProfile] = useState<{ host: string; cameraPath: "/images/snapshot0.jpg" } | null>(null);
  const [lens, setLens] = useState<LensCalibration>();
  const [frame, setFrame] = useState<string | null>(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [frameLoadedAt, setFrameLoadedAt] = useState<number>();
  const [refreshing, setRefreshing] = useState(false), [error, setError] = useState("");
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0), [mirrorX, setMirrorX] = useState(false), [mirrorY, setMirrorY] = useState(false);
  const [transformSettingsOpen, setTransformSettingsOpen] = useState(false), [imageZoom, setImageZoom] = useState(1), [activePoint, setActivePoint] = useState(0);
  const [points, setPoints] = useState(freshPoints), [captured, setCaptured] = useState(() => machinePoints.map(() => false)), [pointSources, setPointSources] = useState<PointSource[]>(freshSources);
  const [proposal, setProposal] = useState<Proposal>(), [detectState, setDetectState] = useState<"idle" | "busy" | "success" | "partial" | "error">("idle");
  const [detectMessage, setDetectMessage] = useState("Automatic detection has not been run."), [replaceConfirmation, setReplaceConfirmation] = useState(false);
  const [machineCoordinatesConfirmed, setMachineCoordinatesConfirmed] = useState(false), [capturedAt, setCapturedAt] = useState(Date.now), [now, setNow] = useState(Date.now);
  const [saveMessage, setSaveMessage] = useState(""), [alignmentSaved, setAlignmentSaved] = useState(false), [lensResetVersion, setLensResetVersion] = useState(0);
  const [savedForReview, setSavedForReview] = useState<{ lens: LensCalibration; alignment?: Calibration }>();
  const [detectionProvenance, setDetectionProvenance] = useState<CalibrationProvenance>();

  const refresh = useCallback(async () => {
    setRefreshing(true); setError("");
    try {
      const nextProfile = await getBridge().getDeviceProfile(); setProfile(nextProfile); setNow(Date.now());
      const result = await getBridge().getCameraFrame({ host: nextProfile.host });
      if (result.status === "ok") {
        const id = Date.now(); runId.current += 1; setFrameSize({ width: 0, height: 0 }); setFrame(result.dataUrl); setFrameLoadedAt(id);
        setProposal((current) => current ? { ...current, stale: true } : current); setReplaceConfirmation(false);
        setDetectState("idle"); setDetectMessage("A new snapshot was loaded. Previous suggestions are stale; detect again or discard them.");
      } else setError(result.message);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Camera snapshot failed."); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => { runId.current += 1; window.clearTimeout(timer); }; }, [refresh]);
  const applySaved = useCallback((savedLens: LensCalibration, saved?: Calibration) => {
    setLens(savedLens);
    if (!saved) { setSaveMessage("Saved lens calibration loaded. Bed alignment is not yet saved."); return; }
    if (!saved.lens || saved.lens.capturedAt !== savedLens.capturedAt) { setSaveMessage("Older bed alignment ignored because it has no matching lens calibration."); return; }
    setPoints(machinePoints.map((machine, i) => ({ machine: { ...machine }, image: { ...(saved.points[i]?.image ?? { x: 0, y: 0 }) }, ...(saved.points[i]?.origin ? { origin: saved.points[i].origin } : {}) })));
    setDetectionProvenance(saved.provenance); setCaptured(machinePoints.map((_, i) => Boolean(saved.points[i]))); setPointSources(machinePoints.map((_, i) => saved.points[i] ? "saved" : "not captured"));
    setCapturedAt(saved.capturedAt); setNow(Date.now()); setMachineCoordinatesConfirmed(saved.points.length >= 5); setAlignmentSaved(saved.points.length >= 5); setSaveMessage("Saved lens-matched bed alignment loaded.");
  }, []);
  useEffect(() => { let active = true; void Promise.all([getBridge().getCameraLensCalibration(), getBridge().getCameraCalibration()]).then(([savedLens, saved]) => { if (active && savedLens) setSavedForReview({ lens: savedLens, ...(saved ? { alignment: saved } : {}) }); }).catch((cause) => { if (active) setSaveMessage(cause instanceof Error ? cause.message : "Saved camera calibration could not be loaded."); }); return () => { active = false; }; }, []);

  const calibration: Calibration = useMemo(() => ({ version: detectionProvenance ? 2 : 1, points, capturedAt, cameraId: profile?.host ?? "preview-camera", uncertaintyMm: .25, ...(lens ? { lens } : {}), ...(detectionProvenance ? { provenance: detectionProvenance } : {}) }), [points, capturedAt, profile, lens, detectionProvenance]);
  const status = calibrationStatus(calibration, now, profile?.host ?? "preview-camera"), allCaptured = captured.every(Boolean);
  const controlError = useMemo(() => { if (!allCaptured) return null; try { return calibrationControlError(calibration); } catch { return null; } }, [allCaptured, calibration]);
  const controlAccepted = Boolean(lens && controlError && controlError.maxMm <= MAX_CALIBRATION_CONTROL_ERROR_MM);
  const lensProblem = useMemo(() => {
    if (!lens) return "Save a valid lens calibration first.";
    try { validateLensCalibration(lens); } catch { return "The saved lens calibration is invalid."; }
    if (!profile || lens.cameraId !== profile.host) return "The lens calibration belongs to another camera.";
    if (!frameLoadedAt || !frameSize.width || !frameSize.height) return "Load a complete camera snapshot first.";
    if (lens.imageSize.width !== frameSize.width || lens.imageSize.height !== frameSize.height) return `Snapshot resolution ${frameSize.width} × ${frameSize.height} does not match lens calibration ${lens.imageSize.width} × ${lens.imageSize.height}.`;
    return undefined;
  }, [frameLoadedAt, frameSize, lens, profile]);
  const proposalPoints = proposal ? [...proposal.detection.markers].sort((a, b) => a.id - b.id) : undefined;
  const showProposal = Boolean(proposal && !proposal.stale && proposal.detection.status === "complete" && proposalPoints?.length === 5);
  const shown = showProposal ? proposalPoints!.map((marker, i) => ({ machine: machinePoints[i]!, image: marker.imageCenter })) : points;
  const shownCaptured = showProposal ? machinePoints.map(() => true) : captured;
  const shownSources: PointSource[] = showProposal ? proposalPoints!.map((marker) => proposal!.corrected.has(marker.id) ? "manually corrected" : "automatic") : pointSources;

  const runDetection = async (confirmed = false) => {
    if (busyRef.current || lensProblem || !lens || !profile || !frameLoadedAt || !imageRef.current) return;
    if (!confirmed && proposal && proposal.corrected.size) { setReplaceConfirmation(true); return; }
    busyRef.current = true; const currentRun = ++runId.current, snapshotId = frameLoadedAt; setReplaceConfirmation(false); setDetectState("busy"); setDetectMessage("Analysing five bed marks…");
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    try {
      const { detectBedMarkers } = await import("../../../domain/camera-bed-markers");
      const detection = detectBedMarkers(grayscaleFromImage(imageRef.current), { snapshotId: String(snapshotId), cameraId: profile.host, lensCalibration: lens });
      if (currentRun !== runId.current) return;
      setDetectState(detection.status === "complete" ? "success" : detection.status === "partial" ? "partial" : "error");
      setDetectMessage(detection.status === "complete" ? `5/5 detected · RMS ${detection.quality.rmsPx.toFixed(3)} px · maximum ${detection.quality.maxPx.toFixed(3)} px. Review every crosshair before accepting.` : `${detection.markers.length}/5 detected. ${detection.diagnostics.join(" ")}`);
      setProposal(detection.status === "complete" ? { snapshotId, detection, corrected: new Set(), original: new Map(detection.markers.map((marker) => [marker.id, { ...marker.imageCenter }])), stale: false } : undefined);
    } catch (cause) { if (currentRun === runId.current) { setProposal(undefined); setDetectState("error"); setDetectMessage(cause instanceof Error ? cause.message : "The five bed marks could not be detected."); } }
    finally { busyRef.current = false; }
  };
  const updateImage = (index: number, axis: "x" | "y", value: number) => {
    if (!Number.isFinite(value)) return; setSaveMessage(""); setAlignmentSaved(false); setMachineCoordinatesConfirmed(false);
    if (showProposal) { setProposal((current) => { if (!current) return current; const markers = current.detection.markers.map((marker) => marker.id === index ? { ...marker, imageCenter: { ...marker.imageCenter, [axis]: value } } : marker); const corrected = new Set(current.corrected); corrected.add(index); return { ...current, detection: { ...current.detection, markers }, corrected }; }); return; }
    setPoints((current) => current.map((point, i) => i === index ? { ...point, image: { ...point.image, [axis]: value }, origin: { ...(point.origin ?? { source: "manual" as const }), source: "manual" as const, modifiedAt: Date.now() } } : point));
    setDetectionProvenance((current) => current ? { ...current, manualChanges: [...current.manualChanges, { markerId: index as 0|1|2|3|4, from: { ...points[index]!.image }, to: { ...points[index]!.image, [axis]: value }, changedAt: Date.now() }] } : current);
    setCaptured((current) => current.map((v, i) => i === index ? true : v)); setPointSources((current) => current.map((v, i) => i === index ? "manual" : v));
  };
  const placePoint = (event: PointerEvent<HTMLImageElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect(); if (!bounds.width || !bounds.height) return;
    const vx = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)), vy = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)); let x = vx, y = vy;
    if (rotation === 90) [x, y] = [vy, 1 - vx]; else if (rotation === 180) [x, y] = [1 - vx, 1 - vy]; else if (rotation === 270) [x, y] = [1 - vy, vx];
    if (mirrorX) x = 1 - x; if (mirrorY) y = 1 - y;
    updateImage(activePoint, "x", x * event.currentTarget.naturalWidth); updateImage(activePoint, "y", y * event.currentTarget.naturalHeight);
  };
  const zoomCameraImage = (event: WheelEvent<HTMLDivElement>) => { if (frame) { event.preventDefault(); setImageZoom((z) => Math.min(4, Math.max(1, z + (event.deltaY < 0 ? .25 : -.25)))); } };
  const resetPoints = () => { setPoints(freshPoints()); setCaptured(machinePoints.map(() => false)); setPointSources(freshSources()); setProposal(undefined); setDetectionProvenance(undefined); setDetectState("idle"); setDetectMessage("Automatic detection has not been run."); setActivePoint(0); setMachineCoordinatesConfirmed(false); setAlignmentSaved(false); setSaveMessage("Recommended layout restored. Capture points 1–5 again."); };
  const acceptProposal = () => {
    if (!proposal || proposal.stale || !proposalPoints || proposalPoints.length !== 5 || proposal.detection.status !== "complete") return;
    const changedAt = Date.now();
    setPoints(proposalPoints.map((marker, i) => ({ machine: { ...machinePoints[i]! }, image: { ...marker.imageCenter }, origin: { source: proposal.corrected.has(marker.id) ? "manual" : "automatic", markerId: marker.id, detectedImage: { ...(proposal.original.get(marker.id) ?? marker.imageCenter) }, quality: { bitMargin: marker.bitMargin, contourResidualPx: marker.contourResidualPx }, ...(proposal.corrected.has(marker.id) ? { modifiedAt: changedAt } : {}) } })));
    setDetectionProvenance({ ...proposal.detection.provenance, manualChanges: proposalPoints.filter((marker) => proposal.corrected.has(marker.id)).map((marker) => ({ markerId: marker.id, from: { ...(proposal.original.get(marker.id) ?? marker.imageCenter) }, to: { ...marker.imageCenter }, changedAt })) });
    setCaptured(machinePoints.map(() => true)); setPointSources(proposalPoints.map((marker) => proposal.corrected.has(marker.id) ? "manually corrected" : "automatic")); setProposal(undefined); setMachineCoordinatesConfirmed(false); setAlignmentSaved(false); setSaveMessage("Detected points accepted for review. Confirm the fixed machine coordinates, then save separately.");
  };
  const discardProposal = () => { setProposal(undefined); setReplaceConfirmation(false); setDetectState("idle"); setDetectMessage("Automatic suggestions discarded. Existing calibration points are unchanged."); };
  const save = async () => { if (!allCaptured || !machineCoordinatesConfirmed || !controlAccepted || !controlError) return; setSaveMessage("Saving calibration…"); try { const saved = await getBridge().saveCameraCalibration({ ...calibration, capturedAt: Date.now() }); setCapturedAt(saved.capturedAt); setNow(Date.now()); setAlignmentSaved(true); setSaveMessage(`Calibration saved · control RMS ${controlError.rmsMm.toFixed(3)} mm · max ${controlError.maxMm.toFixed(3)} mm.`); } catch (cause) { setSaveMessage(cause instanceof Error ? cause.message : "Calibration could not be saved."); } };
  const clearBed = async () => { await getBridge().clearCameraCalibration(); resetPoints(); setSaveMessage("Bed alignment cleared. The saved lens calibration remains valid."); };
  const clearAll = async () => { await Promise.all([getBridge().clearCameraCalibration(), getBridge().clearCameraLensCalibration(), getBridge().clearCameraLensCaptures()]); setLens(undefined); setLensResetVersion((v) => v + 1); resetPoints(); setSaveMessage("Lens and bed calibration were cleared. Start again with Step 1."); };
  const effectiveStatus = !lens ? { state: "missing", reason: "Lens calibration is required first" } : !allCaptured ? { state: "missing", reason: "Alignment has not been captured" } : !controlAccepted ? { state: "invalid", reason: "Control error exceeds the alignment limit" } : status;
  const saveStatus = saveMessage || (!lens ? "Complete and save Step 1 before measuring the bed alignment." : !allCaptured ? "Capture all five points." : !machineCoordinatesConfirmed ? "Confirm the fixed machine coordinates." : !controlAccepted ? `Control error must be no more than ${MAX_CALIBRATION_CONTROL_ERROR_MM.toFixed(1)} mm.` : "Ready to save.");
  const metadata = transformMetadata(rotation, mirrorX, mirrorY, 1, { x: 0, y: 0 }, `camera:${profile?.host ?? "preview"}`);

  if (savedForReview) return <div className="dialog-backdrop" role="presentation"><section className="camera-calibration" role="dialog" aria-modal="true" aria-labelledby="camera-calibration-review-title"><header><div><span className="simulator-dialog__eyebrow">Saved camera calibration</span><h2 id="camera-calibration-review-title">Has the camera setup changed?</h2></div><button onClick={onClose}>Close</button></header><p>A saved lens calibration exists from {new Date(savedForReview.lens.capturedAt).toLocaleString()} at {savedForReview.lens.imageSize.width} × {savedForReview.lens.imageSize.height} px.</p><div className="calibration-change-options"><button onClick={() => { applySaved(savedForReview.lens, savedForReview.alignment); setSavedForReview(undefined); }}><strong>Nothing changed</strong><span>Load the saved lens and bed alignment.</span></button><button onClick={() => void getBridge().clearCameraCalibration().then(() => { setLens(savedForReview.lens); setSavedForReview(undefined); resetPoints(); setSaveMessage("Lens calibration kept; recapture Step 2."); })}><strong>Only position or working height changed</strong><span>Keep lens calibration and redo bed alignment.</span></button><button onClick={() => void clearAll().then(() => setSavedForReview(undefined))}><strong>Camera, focus or resolution changed</strong><span>Delete both calibrations.</span></button></div></section></div>;

  return <div className="dialog-backdrop" role="presentation"><section className="camera-calibration" role="dialog" aria-modal="true" aria-labelledby="camera-calibration-title" aria-busy={detectState === "busy"}><header><div><span className="simulator-dialog__eyebrow">Kamerakalibrierung</span><h2 id="camera-calibration-title">Kamera- und Bettkalibrierung</h2></div><button onClick={onClose}>Close</button></header><p className="camera-warning" role="note"><strong>Camera is not a safety boundary.</strong> Detection only proposes local geometry; it cannot authorize motion, emission, or saving.</p>
    <div className="camera-calibration__grid"><div className="camera-calibration__visual"><div className="camera-frame" onWheel={zoomCameraImage}><button className="camera-transform-toggle" aria-label="Open camera image orientation settings" aria-expanded={transformSettingsOpen} onClick={() => setTransformSettingsOpen((v) => !v)}>⚙</button>{transformSettingsOpen ? <fieldset className="camera-transform-menu"><legend>Camera image orientation</legend><label>Rotation <select value={rotation} onChange={(e) => setRotation(Number(e.target.value) as typeof rotation)}>{[0, 90, 180, 270].map((v) => <option key={v}>{v}</option>)}</select></label><label><input type="checkbox" checked={mirrorX} onChange={(e) => setMirrorX(e.target.checked)} /> Mirror horizontally</label><label><input type="checkbox" checked={mirrorY} onChange={(e) => setMirrorY(e.target.checked)} /> Mirror vertically</label></fieldset> : null}{frame ? <div className="camera-frame__surface" style={{ width: `${imageZoom * 100}%`, maxWidth: "none", transform: `rotate(${rotation}deg) scaleX(${mirrorX ? -1 : 1}) scaleY(${mirrorY ? -1 : 1})` }}><img ref={imageRef} src={frame} alt="Latest camera snapshot" draggable={false} onLoad={(e) => setFrameSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} onPointerDown={placePoint} />{shown.map((point, i) => shownCaptured[i] ? <span key={i} className={`camera-marker camera-marker--${shownSources[i]!.replaceAll(" ", "-")}${i === activePoint ? " camera-marker--active" : ""}`} style={{ left: `${point.image.x / frameSize.width * 100}%`, top: `${point.image.y / frameSize.height * 100}%` }} aria-hidden="true"><b>{i + 1}</b></span> : null)}</div> : <span>{error || "Loading snapshot…"}</span>}</div><div className="camera-frame__actions"><button disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh snapshot"}</button><label className="camera-zoom">Zoom <select aria-label="Camera image zoom" value={imageZoom} onChange={(e) => setImageZoom(Number(e.target.value))}>{[1, 1.5, 2.5, 4].map((z) => <option key={z} value={z}>{z * 100}%</option>)}</select></label><span role="status">Point {activePoint + 1} selected · zoom {imageZoom * 100}%.</span></div>{error ? <p role="alert">{error}</p> : null}</div>
      <div className="camera-controls"><LensCalibrationControls key={`${lens?.capturedAt ?? "new"}-${lensResetVersion}`} cameraId={profile?.host ?? "preview-camera"} frameLoadedAt={frameLoadedAt} imageRef={imageRef} lens={lens} onSaved={(saved) => { setLens(saved); resetPoints(); }} /><fieldset disabled={!lens}><legend>Step 2 · Bed alignment</legend><p className="camera-points-help">Place the printed 400 × 400 mm five-marker card, refresh the snapshot, then detect and inspect every crosshair. Manual placement remains available after any detection failure.</p><div className="bed-detection-actions"><button aria-describedby="bed-detection-prerequisite" title={lensProblem} disabled={Boolean(lensProblem) || detectState === "busy"} onClick={() => void runDetection()}>{detectState === "busy" ? "Analysing five bed marks…" : "Detect five bed marks"}</button>{proposal ? <><button disabled={proposal.stale} onClick={acceptProposal}>Accept detected points</button><button onClick={discardProposal}>Discard</button></> : null}</div><p id="bed-detection-prerequisite" className="camera-points-help">{lensProblem ?? "Snapshot and matching lens calibration are ready."}</p><p className={`bed-detection-status bed-detection-status--${proposal?.stale ? "stale" : detectState}`} role={detectState === "error" || detectState === "partial" ? "alert" : "status"} aria-live="polite">{proposal?.stale ? "Suggestions are stale because a newer snapshot was loaded. Detect again or discard; stale points cannot be accepted." : detectMessage}</p>{replaceConfirmation ? <div className="bed-detection-confirm" role="group" aria-label="Replace manually corrected suggestions"><p>Re-detection will replace manually corrected suggestions.</p><button onClick={() => void runDetection(true)}>Replace and detect again</button><button onClick={() => setReplaceConfirmation(false)}>Keep corrected points</button></div> : null}<button onClick={resetPoints}>Reset all working points</button>
        {shown.map((point, i) => <div key={i} className={`camera-point camera-point--${shownSources[i]!.replaceAll(" ", "-")}${i === activePoint ? " camera-point--active" : ""}`}><button aria-pressed={i === activePoint} aria-label={`Select ${i < 4 ? "corner" : "control"} point ${i + 1}, ${shownSources[i]}`} onClick={() => setActivePoint(i)}>Select {i < 4 ? "corner" : "control"} point {i + 1}<small>{shownSources[i]}</small></button><div className="camera-machine-coordinate"><span>machine</span><output aria-label={`machine ${i + 1} coordinates`}>{point.machine.x.toFixed(2)}, {point.machine.y.toFixed(2)} mm</output></div><label>image x<input aria-label={`image ${i + 1} x`} type="number" step="any" value={point.image.x} onChange={(e) => updateImage(i, "x", Number(e.target.value))} /></label><label>image y<input aria-label={`image ${i + 1} y`} type="number" step="any" value={point.image.y} onChange={(e) => updateImage(i, "y", Number(e.target.value))} /></label></div>)}<div className="camera-save"><label><input type="checkbox" checked={machineCoordinatesConfirmed} onChange={(e) => setMachineCoordinatesConfirmed(e.target.checked)} />I captured all five laser marks or printed card centers and verified the fixed machine coordinates.</label><button aria-label="Save verified camera-to-laser alignment / camera-to-bed alignment" title="Save the verified camera-to-bed alignment." disabled={!allCaptured || !machineCoordinatesConfirmed || !controlAccepted} onClick={() => void save()}>Save verified camera-to-bed alignment</button><p role="status">{saveStatus}</p></div><details><summary>Legacy supervised laser-mark workflow</summary><p className="camera-points-help">This separate workflow can move the machine and emit laser light. It is never started by automatic detection.</p><button disabled={!onOpenCameraMark} onClick={onOpenCameraMark}>Open supervised five-X test</button></details></fieldset><fieldset><legend>Calibration maintenance</legend><button disabled={!alignmentSaved} onClick={() => void clearBed()}>Delete bed alignment only</button><button disabled={!lens} onClick={() => void clearAll()}>Delete lens and bed calibration</button></fieldset></div></div>
    <dl className="camera-metadata"><div><dt>Compatibility</dt><dd data-testid="calibration-status">{effectiveStatus.state} · {effectiveStatus.reason}</dd></div><div><dt>Calibration age</dt><dd>{status.ageDays?.toFixed(1) ?? "—"} days</dd></div><div><dt>Control RMS</dt><dd data-testid="control-rms">{controlError ? `${controlError.rmsMm.toFixed(3)} mm` : "Unavailable"}</dd></div><div><dt>Control maximum</dt><dd>{controlError ? `${controlError.maxMm.toFixed(3)} mm` : "Unavailable"}</dd></div><div><dt>Detection RMS</dt><dd>{proposal ? `${proposal.detection.quality.rmsPx.toFixed(3)} px` : "Unavailable"}</dd></div><div><dt>Transform metadata</dt><dd><code>{JSON.stringify(metadata)}</code></dd></div></dl>
  </section></div>;
}
