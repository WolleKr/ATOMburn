import { useEffect, useRef, useState } from "react";
import type { AppInfo } from "../../../shared/contracts";
import { buildIssueDraft, type AppErrorReport } from "../error-report";
import { getBridge } from "../platform";

export function ErrorDialog({ report, info, onClose }: { report: AppErrorReport; info: AppInfo; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [handoff, setHandoff] = useState("");
  const draft = buildIssueDraft(report, info);
  useEffect(() => { closeRef.current?.focus(); }, []);
  const prepare = async () => {
    try { const result = await getBridge().openIssueDraft?.(draft); setHandoff(result?.status === "opened" ? "Issue draft opened in your browser." : "Browser unavailable; details copied."); }
    catch { try { await getBridge().copyErrorDetails?.(draft.body); } catch { /* keep the original handoff failure */ } setHandoff("Details copied; browser could not be opened."); }
  };
  return <div className="dialog-backdrop" role="presentation"><section className="about-dialog error-dialog" role="alertdialog" aria-modal="true" aria-labelledby="error-title">
    <h2 id="error-title">{report.operation} failed{report.count > 1 ? ` · ${report.count}×` : ""}</h2>
    <p>{report.message}</p><details><summary>Technical details</summary><pre>{report.details}</pre></details>
    {handoff ? <p role="status">{handoff}</p> : null}
    <div className="dialog-actions"><button type="button" onClick={() => void prepare()}>Prepare GitHub issue</button><button type="button" onClick={() => void (async()=>{await getBridge().copyErrorDetails?.(draft.body);setHandoff("Details copied.");})()}>Copy details</button><button ref={closeRef} type="button" onClick={onClose}>Close</button></div>
  </section></div>;
}
