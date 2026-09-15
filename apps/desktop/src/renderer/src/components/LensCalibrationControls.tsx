import { useEffect, useState, type RefObject } from "react";
import { detectCameraCalibrationTarget, type GrayImage } from "../../../domain/camera-calibration-target";
import type { LensCalibrationCapturedView } from "../../../domain/camera-lens-capture";
import { MAX_LENS_REPROJECTION_ERROR_PX, MIN_LENS_CALIBRATION_VIEWS, type LensCalibration } from "../../../domain/camera-lens-calibration";
import { getBridge } from "../platform";

type CapturedView = LensCalibrationCapturedView;
const pendingKey = (cameraId: string) => `atomburn:pending-lens-views:v1:${cameraId}`;
const validNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);
function loadPendingViews(cameraId: string): CapturedView[] {
  try {
    const raw = window.localStorage.getItem(pendingKey(cameraId));
    if (!raw) return [];
    const stored = JSON.parse(raw) as { savedAt?: unknown; views?: unknown };
    if (!validNumber(stored.savedAt) || Date.now() - Number(stored.savedAt) > 24 * 60 * 60 * 1_000 || !Array.isArray(stored.views)) return [];
    return stored.views.filter((view): view is CapturedView => {
      if (!view || typeof view !== "object") return false;
      const candidate = view as Partial<CapturedView>;
      return validNumber(candidate.frameId) && candidate.target?.imagePoints?.length === 44 && candidate.target.imagePoints.every((point) => Array.isArray(point) && point.length === 2 && point.every(validNumber)) && validNumber(candidate.target.imageSize?.width) && validNumber(candidate.target.imageSize?.height);
    }).slice(0, MIN_LENS_CALIBRATION_VIEWS);
  } catch { return []; }
}
function saveLocalBackup(cameraId: string, views: CapturedView[]): void {
  try { window.localStorage.setItem(pendingKey(cameraId), JSON.stringify({ savedAt: Date.now(), views })); } catch { /* Persistence is best-effort; calibration still works in memory. */ }
}
type Props = {
  cameraId: string;
  frameLoadedAt?: number;
  imageRef: RefObject<HTMLImageElement | null>;
  lens?: LensCalibration;
  onSaved: (lens: LensCalibration) => void;
};

function grayscaleFromImage(image: HTMLImageElement): { image: GrayImage; scale: number; original: { width: number; height: number } } {
  const original = { width: image.naturalWidth, height: image.naturalHeight };
  if (!original.width || !original.height) throw new Error("The camera image has no measurable resolution.");
  const scale = Math.min(1, 1200 / original.width);
  const width = Math.max(1, Math.round(original.width * scale));
  const height = Math.max(1, Math.round(original.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Camera image analysis is unavailable.");
  context.drawImage(image, 0, 0, width, height);
  const rgba = context.getImageData(0, 0, width, height).data;
  const gray = new Uint8Array(width * height);
  for (let source = 0, destination = 0; source < rgba.length; source += 4, destination += 1) gray[destination] = Math.round(rgba[source]! * 0.299 + rgba[source + 1]! * 0.587 + rgba[source + 2]! * 0.114);
  return { image: { width, height, data: gray }, scale, original };
}

export function LensCalibrationControls({ cameraId, frameLoadedAt, imageRef, lens, onSaved }: Props) {
  const [views, setViews] = useState<CapturedView[]>([]);
  const [viewsFinalized, setViewsFinalized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(lens ? `Saved lens calibration · ${lens.viewCount} views · ${lens.reprojectionErrorPx.toFixed(3)} px RMS.` : "Loading saved calibration views…");

  useEffect(() => {
    let active = true;
    void getBridge().getCameraLensCaptures().then(async (stored) => {
      if (!active || lens) return;
      const restored = stored?.cameraId === cameraId ? stored.views : loadPendingViews(cameraId);
      setViews(restored);
      setViewsFinalized(stored?.cameraId === cameraId && stored.finalized === true && restored.length === MIN_LENS_CALIBRATION_VIEWS);
      if (restored.length) {
        if (!stored || stored.cameraId !== cameraId) await getBridge().saveCameraLensCaptures({ version: 1, cameraId, savedAt: Date.now(), finalized: false, views: restored });
        if (active) setMessage(`${restored.length}/${MIN_LENS_CALIBRATION_VIEWS} accepted views restored from disk${stored?.finalized ? " and ready to calculate" : ""}.`);
      } else setMessage("No valid lens calibration saved.");
    }).catch((cause) => { if (active) setMessage(cause instanceof Error ? cause.message : "Saved calibration views could not be loaded."); });
    return () => { active = false; };
  }, [cameraId, lens]);

  const persistViews = async (next: CapturedView[], finalized = false) => {
    await getBridge().saveCameraLensCaptures({ version: 1, cameraId, savedAt: Date.now(), finalized, views: next });
    saveLocalBackup(cameraId, next);
  };

  const exportTarget = async () => {
    const result = await getBridge().exportCameraCalibrationTarget();
    setMessage(result.status === "ok" ? `Target saved as ${result.fileName}. Print at 100% and verify the 100 mm control line.` : result.status === "cancelled" ? "Target export cancelled." : result.message);
  };
  const detect = async () => {
    if (views.length >= MIN_LENS_CALIBRATION_VIEWS || viewsFinalized) { setMessage("Eight accepted views are already available. Save them or delete them to start a new series."); return; }
    if (!frameLoadedAt || !imageRef.current) { setMessage("Load a fresh camera snapshot first."); return; }
    if (views.some((view) => view.frameId === frameLoadedAt)) { setMessage("This snapshot is already captured. Move or tilt the target, then refresh the snapshot."); return; }
    setBusy(true);
    setMessage("Detecting 4 × 11 circle grid…");
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    try {
      const analysed = grayscaleFromImage(imageRef.current);
      const detected = detectCameraCalibrationTarget(analysed.image);
      const target = analysed.scale === 1 ? detected : {
        ...detected,
        imageSize: analysed.original,
        imagePoints: detected.imagePoints.map(([x, y]) => [x / analysed.scale, y / analysed.scale] as [number, number]),
        fiducials: detected.fiducials.map(({ x, y }) => ({ x: x / analysed.scale, y: y / analysed.scale })),
        meanRefinementPx: detected.meanRefinementPx / analysed.scale
      };
      const next = [...views, { frameId: frameLoadedAt, target }];
      await persistViews(next);
      setViews(next);
      setMessage(`View ${next.length}/${MIN_LENS_CALIBRATION_VIEWS} accepted and saved · 44 circles · mean refinement ${target.meanRefinementPx.toFixed(2)} px. Move the target before the next snapshot.`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "The calibration target was not detected."); }
    finally { setBusy(false); }
  };
  const saveCapturedViews = async () => {
    if (views.length !== MIN_LENS_CALIBRATION_VIEWS) return;
    setBusy(true);
    try { await persistViews(views, true); setViewsFinalized(true); setMessage(`${views.length}/${MIN_LENS_CALIBRATION_VIEWS} accepted views saved and locked. You can calculate now or restart ATOMburn.`); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Calibration views could not be saved."); }
    finally { setBusy(false); }
  };
  const deleteCapturedViews = async () => {
    setBusy(true);
    try {
      await getBridge().clearCameraLensCaptures();
      window.localStorage.removeItem(pendingKey(cameraId));
      setViews([]);
      setViewsFinalized(false);
      setMessage("Captured views deleted. Refresh the snapshot and begin a new eight-view series.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Captured views could not be deleted."); }
    finally { setBusy(false); }
  };
  const calculate = async () => {
    if (views.length !== MIN_LENS_CALIBRATION_VIEWS || !viewsFinalized) return;
    setBusy(true);
    setMessage("Calculating lens matrix and distortion…");
    try {
      await persistViews(views, true);
      const { calibrateLens } = await import("../camera-lens-calibrator");
      const calculated = await calibrateLens(cameraId, views.map((view) => view.target));
      const saved = await getBridge().saveCameraLensCalibration(calculated);
      await getBridge().clearCameraLensCaptures();
      window.localStorage.removeItem(pendingKey(cameraId));
      setViews([]);
      setViewsFinalized(false);
      onSaved(saved);
      setMessage(`Lens calibration saved · ${saved.viewCount} views · ${saved.reprojectionErrorPx.toFixed(3)} px RMS (limit ${MAX_LENS_REPROJECTION_ERROR_PX.toFixed(1)} px).`);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Lens calibration failed."); }
    finally { setBusy(false); }
  };

  return <fieldset className="camera-lens-step">
    <legend>Step 1 · Lens calibration</legend>
    <p>Use the ATOMburn asymmetric 4 × 11 circle target. Capture at least eight views at different positions, rotations and gentle tilts; keep the complete page visible.</p>
    <div className="camera-lens-actions">
      <button type="button" title="Saves the printable calibration target as a PDF. Print it at 100% scale." onClick={() => void exportTarget()}>Save printable target PDF</button>
      <button type="button" title="Detects the 44 circles in the current snapshot. Every accepted view is protected as an unfinished draft." disabled={busy || !frameLoadedAt || views.length >= MIN_LENS_CALIBRATION_VIEWS || viewsFinalized} onClick={() => void detect()}>{busy ? "Analysing…" : "Detect target in snapshot"}</button>
      {viewsFinalized
        ? <button type="button" title="Deletes all eight captured views and unlocks snapshot detection for a completely new series." disabled={busy} onClick={() => void deleteCapturedViews()}>Delete captured views</button>
        : <button type="button" title="Locks exactly eight accepted views on this computer so they survive closing or restarting ATOMburn." disabled={busy || views.length !== MIN_LENS_CALIBRATION_VIEWS} onClick={() => void saveCapturedViews()}>Save captured views</button>}
      <button type="button" title="Uses the eight saved views to calculate lens distortion and focal parameters, then saves the resulting calibration." disabled={busy || views.length !== MIN_LENS_CALIBRATION_VIEWS || !viewsFinalized} onClick={() => void calculate()}>Calculate lens calibration</button>
    </div>
    <progress max={MIN_LENS_CALIBRATION_VIEWS} value={Math.min(views.length, MIN_LENS_CALIBRATION_VIEWS)} aria-label="Lens calibration views" />
    <p role="status">{message}</p>
  </fieldset>;
}
